import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const normalizedId = id.replace(/\\/g, '/')

          if (
            normalizedId.includes('/node_modules/three/') ||
            normalizedId.includes('/node_modules/@react-three/')
          ) {
            return 'three-vendor'
          }

          if (
            normalizedId.includes('/node_modules/react-globe.gl/') ||
            normalizedId.includes('/node_modules/three-globe/') ||
            normalizedId.includes('/node_modules/dotted-map/')
          ) {
            return 'globe-vendor'
          }

          if (
            normalizedId.includes('/node_modules/framer-motion/') ||
            normalizedId.includes('/node_modules/gsap/')
          ) {
            return 'animation-vendor'
          }

          if (normalizedId.includes('/node_modules/recharts/')) {
            return 'charts-vendor'
          }

          if (normalizedId.includes('/node_modules/@tanstack/react-query/')) {
            return 'query-vendor'
          }
        },
      },
    },
  },
})
