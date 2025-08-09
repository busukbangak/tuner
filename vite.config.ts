import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA(
      {
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        // add this to cache all the imports
        workbox: {
          globPatterns: ["**/*"],
        },
        // add this to cache all the
        // static assets in the public folder
        includeAssets: [
          "**/*",
        ],
        manifest: {
          name: 'Tuner',
          short_name: 'Tuner',
          description: 'Tuning App',
          theme_color: '#f9f9f9',
          display: "standalone",
          icons: [
            {
              "src": "/pwa-192x192.png",
              "sizes": "192x192",
              "type": "image/png",
              "purpose": "any"
            },
            {
              "src": "/pwa-512x512.png",
              "sizes": "512x512",
              "type": "image/png",
              "purpose": "any"
            },
            {
              "src": "/pwa-maskable-192x192.png",
              "sizes": "192x192",
              "type": "image/png",
              "purpose": "maskable"
            },
            {
              "src": "/pwa-maskable-512x512.png",
              "sizes": "512x512",
              "type": "image/png",
              "purpose": "maskable"
            }
          ],
        }
      }
    )],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
