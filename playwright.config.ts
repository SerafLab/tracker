import { defineConfig } from '@playwright/test'
import { dismissedInstallInvitation, e2eBaseURL } from './e2e/storage-state'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  // Failing tests keep their output (trace, extra-context traces); passing ones leave nothing behind.
  preserveOutput: 'failures-only',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: e2eBaseURL,
    browserName: 'chromium',
    locale: 'ru-RU',
    // Invitation tests opt out with an empty storage state.
    storageState: dismissedInstallInvitation,
    // First failure is traced without retries; also covers contexts from browser.newContext().
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/server.mjs',
    url: e2eBaseURL,
    // An occupied E2E_PORT is an error, never a silent attach to another checkout's server.
    reuseExistingServer: false,
  },
})
