import { defineConfig } from '@playwright/test'
import { dismissedInstallInvitation, e2eBaseURL } from './e2e/storage-state'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: e2eBaseURL,
    browserName: 'chromium',
    locale: 'ru-RU',
    // Invitation tests opt out with an empty storage state.
    storageState: dismissedInstallInvitation,
  },
  webServer: {
    command: 'node e2e/server.mjs',
    url: e2eBaseURL,
    reuseExistingServer: !process.env.CI,
  },
})
