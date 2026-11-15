import { expect, type Page } from '@playwright/test'

/** Switches the interface language through the settings page and returns to the previous screen. */
export async function selectLanguage(page: Page, language: 'ru' | 'en') {
  await page.getByRole('button', { name: /^(Настройки|Settings)$/ }).click()
  const item = page.getByRole('radio', { name: language === 'ru' ? 'Русский' : 'English' })
  await item.click()
  await expect(item).toBeChecked()
  await page.getByRole('button', { name: /^(Назад|Back)$/ }).click()
  await expect(page.getByRole('button', { name: /^(Настройки|Settings)$/ })).toBeVisible()
}
