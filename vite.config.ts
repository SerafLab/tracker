import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { buildDefine } from './build-define.ts'

export default defineConfig({
  base: '/tracker/',
  define: buildDefine,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      includeAssets: ['manifest.*.webmanifest', 'icons/*.png'],
      workbox: {
        runtimeCaching: [],
        navigateFallbackDenylist: [/^\/tracker\/(?:mcp-transport|webmcp)-probe\.html(?:\?|$)/],
      },
    }),
  ],
})
