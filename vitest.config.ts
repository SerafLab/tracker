import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { buildDefine } from './build-define.ts'

export default defineConfig({
  define: buildDefine,
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/pwa-register.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: './src/test/setup.ts',
    // The pre-push check runs while other worktrees run theirs, and long UI tests are CPU-bound under that load.
    // This is a per-test budget only; tests wait for conditions with Testing Library's default 1 s timeout.
    testTimeout: 15_000,
  },
})
