import { expect, type Page } from '@playwright/test'

/** Switches the interface language through the settings menu and closes the menu. */
export async function selectLanguage(page: Page, language: 'ru' | 'en') {
  await page.getByRole('button', { name: /^(Настройки|Settings)$/ }).click()
  const item = page.getByRole('menuitemradio', { name: language === 'ru' ? 'Русский' : 'English' })
  await item.click()
  await expect(item).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}
