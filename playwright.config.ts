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
  projects: [
    { name: 'chromium' },
    // WebKit covers the real IndexedDB, downloads and file chooser behind backup. E2E_SKIP_WEBKIT=1 skips it on a machine where WebKit cannot launch.
    ...(process.env.E2E_SKIP_WEBKIT ? [] : [{ name: 'webkit', testMatch: /backup\.spec\.ts/, use: { browserName: 'webkit' as const } }]),
  ],
  webServer: {
    command: 'node e2e/server.mjs',
    url: e2eBaseURL,
    reuseExistingServer: !process.env.CI,
  },
})
