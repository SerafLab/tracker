import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${process.env.E2E_PORT ?? '4173'}/tracker/`,
    browserName: 'chromium',
    locale: 'ru-RU',
  },
  webServer: {
    command: 'node e2e/server.mjs',
    url: `http://127.0.0.1:${process.env.E2E_PORT ?? '4173'}/tracker/`,
    reuseExistingServer: !process.env.CI,
  },
})
