import { cn } from "@/lib/utils"

// TODO: Make its colors dependent on dark/light theme
// TODO: Hide circle when no frequncy and adjust colros accordingly
type Props = {
  value?: number // in cents
  min?: number
  max?: number
  note?: string
  className?: string
  labelBelow?: boolean
}

/**
 * Responsive tuner gauge using SVG. The arc and dot scale with the container.
 * Color maps from green at center to orange/red toward the edges.
 */
export default function Tuner({
  value = 0,
  min = -50,
  max = 50,
  note = "—",
  className,
  labelBelow = true,
}: Props) {
  // Geometry (viewBox units). SVG auto-scales responsively.
  const vb = { w: 420, h: 280 }
  const cx = vb.w / 2
  const cy = 240 // center below the visible arc
  const r = 200
  const sweep = 180 - 40 // visible sweep across the top (smaller than 180 for margins)
  const startAngle = -sweep / 2
  const endAngle = sweep / 2

  const clamped = Math.max(min, Math.min(max, value))
  const range = max - min
  // Normalize to [-1, 1]
  const t = (2 * (clamped - min)) / range - 1 // -1..1
  // Map to angle across the arc
  const angle = startAngle + ((t + 1) / 2) * (endAngle - startAngle)

  // Color mapping: green at center, then orange, then red near edges.
  // Use a gentle easing so it stays green-ish around the center longer.
  const distance = Math.abs(t) // 0..1 (0 is center)
  const eased = Math.pow(distance, 0.7) // more sensitivity near edges
  const hue = 120 * (1 - eased) // 120 (green) -> 0 (red)
  const color = `hsl(${hue} 90% 55%)`

  const dotRadius = 16
  const gapPadding = 6 // extra space on each side of the dot
  const gapArcLength = 2 * (dotRadius + gapPadding)
  const gapAngleDeg = (gapArcLength / r) * (180 / Math.PI)

  // Gap for the fixed "0" ring as well
  const zeroRingRadius = 18
  const zeroGapPadding = 6
  const zeroGapArcLength = 2 * (zeroRingRadius + zeroGapPadding)
  const zeroGapAngleDeg = (zeroGapArcLength / r) * (180 / Math.PI)

  type Segment = { start: number; end: number }
  const fullStart = startAngle
  const fullEnd = endAngle

  // Build and clamp the two gap ranges
  const rawGaps: Segment[] = [
    { start: angle - gapAngleDeg / 2, end: angle + gapAngleDeg / 2 }, // moving dot
    { start: 0 - zeroGapAngleDeg / 2, end: 0 + zeroGapAngleDeg / 2 }, // zero ring
  ]
    .map(g => ({
      start: Math.max(fullStart, g.start),
      end: Math.min(fullEnd, g.end),
    }))
    .filter(g => g.end > g.start)

  // Merge overlapping gaps
  rawGaps.sort((a, b) => a.start - b.start)
  const mergedGaps: Segment[] = []
  for (const g of rawGaps) {
    const last = mergedGaps[mergedGaps.length - 1]
    if (!last || g.start > last.end) {
      mergedGaps.push({ ...g })
    } else {
      last.end = Math.max(last.end, g.end)
    }
  }

  // Subtract gaps from the full arc to get drawable segments
  const drawSegments: Segment[] = []
  let cursor = fullStart
  for (const g of mergedGaps) {
    if (g.start > cursor) drawSegments.push({ start: cursor, end: g.start })
    cursor = Math.max(cursor, g.end)
  }
  if (cursor < fullEnd) drawSegments.push({ start: cursor, end: fullEnd })

  // Create path data for each drawable segment (ignore tiny ones)
  const arcSegments: string[] = drawSegments
    .filter(seg => seg.end - seg.start > 0.5)
    .map(seg => describeArc(cx, cy, r, seg.start, seg.end))

  const zeroPos = polarToCartesian(cx, cy, r, 0)
  const startPos = polarToCartesian(cx, cy, r, startAngle)
  const endPos = polarToCartesian(cx, cy, r, endAngle)
  const dotPos = polarToCartesian(cx, cy, r, angle)

  const svgPadding = 12
  const trimmedHeight = Math.min(
    vb.h,
    Math.max(startPos.y + 24, endPos.y + 24, zeroPos.y) + svgPadding
  )

  const labelGap = "clamp(12px, 3.2vh, 28px)";

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${vb.w} ${trimmedHeight}`}
          className="w-full h-auto"
          role="img"
          aria-label="Tuner gauge"
          preserveAspectRatio="xMidYMin meet"
        >
          {/* Arc background split to leave gaps under the indicator and the 0 ring */}
          {arcSegments.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="hsl(0 0% 35% / 0.8)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
          {/* End caps (subtle) */}



          {/* Labels: -50, 0, +50 */}
          <text x={startPos.x - 16} y={startPos.y + 20} fontSize={18} fill="hsl(0 0% 70%)">{"-50"}</text>
          <text x={zeroPos.x - 6} y={zeroPos.y - 25} fontSize={18} fill="hsl(0 0% 70%)">{"0"}</text>
          <text x={endPos.x - 12} y={endPos.y + 20} textAnchor="start" fontSize={18} fill="hsl(0 0% 70%)">{"+50"}</text>

          {/* Indicator ring at 0 (for visual target) */}
          <circle
            cx={zeroPos.x}
            cy={zeroPos.y}
            r={18}
            fill="transparent"
            stroke={color}
            strokeWidth={2}
            style={{ transition: "none" }}
          />

          {/* Moving dot */}
          <circle cx={dotPos.x} cy={dotPos.y} r={14} fill={color} />
        </svg>
        {/* Note and cents readout */}
        {labelBelow ? (
          <div
            className="text-center select-none"
            style={{ marginTop: labelGap, marginBottom: labelGap }}
          >
            <div className="font-extrabold leading-none" style={{ color }}>
              <span
                className="block leading-none tracking-tight"
                style={{
                  // Doubled from 48/10vw/14vh/112 to 96/20vw/28vh/224
                  fontSize: "clamp(96px, min(20vw, 28vh), 224px)",
                }}
                aria-label={`Detected note ${note}`}
              >
                {note}
              </span>
            </div>
            <div className="mt-1.5 font-semibold" style={{ color }}>
              <span className="text-[clamp(1.5rem,6vw,3rem)]">
                {(clamped >= 0 ? "+" : "") + clamped.toFixed(1)}{" "}ct
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Helpers

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ")
}
