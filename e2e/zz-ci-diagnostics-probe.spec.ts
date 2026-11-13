import { expect, test } from '@playwright/test'

// TEMPORARY: controlled CI failure to verify the browser-diagnostics upload. Removed before merge.
test('temporary CI diagnostics upload probe', async ({ page }) => {
  test.skip(!process.env.GITHUB_ACTIONS, 'runs only in GitHub Actions')
  await page.goto('./')
  expect(1, 'controlled diagnostic failure').toBe(2)
})
