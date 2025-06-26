import React from 'react';

interface VolumeBarProps {
  volume: number; // 0 (silent) to 1 (max)
}

const VolumeBar: React.FC<VolumeBarProps> = ({ volume }) => {
  const percent = Math.min(Math.max(volume, 0), 1) * 100;
  return (
    <div style={{ width: '100%', height: 12, background: '#eee', borderRadius: 6, margin: '8px 0' }}>
      <div
        style={{
          width: `${percent}%`,
          height: '100%',
          background: percent > 10 ? '#4caf50' : '#f44336',
          borderRadius: 6,
          transition: 'width 0.1s',
        }}
      />
    </div>
  );
};

export default VolumeBar; 