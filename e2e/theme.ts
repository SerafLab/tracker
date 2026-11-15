import { expect, type Page } from '@playwright/test'

/** Switches the colour theme through the settings page and returns to the previous screen. */
export async function selectTheme(page: Page, theme: 'green' | 'ink', language: 'ru' | 'en' = 'en') {
  await page.getByRole('button', { name: /^(Настройки|Settings)$/ }).click()
  const group = page.getByRole('group', { name: language === 'ru' ? 'Цветовая тема приложения' : 'Application color theme' })
  const item = group.getByRole('radio', { name: theme === 'ink' ? (language === 'ru' ? 'Чернильная' : 'Ink') : (language === 'ru' ? 'Зелёная' : 'Green') })
  await item.click()
  await expect(item).toBeChecked()
  await page.getByRole('button', { name: /^(Назад|Back)$/ }).click()
  await expect(page.getByRole('button', { name: /^(Настройки|Settings)$/ })).toBeVisible()
}
