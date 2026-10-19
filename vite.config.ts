import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      includeAssets: ['manifest.*.webmanifest', 'icons/*.png'],
      workbox: {
        runtimeCaching: [],
      },
    }),
  ],
})
