import { expect, type Page } from '@playwright/test'

/** Switches the colour theme through the settings menu and closes the menu. */
export async function selectTheme(page: Page, theme: 'green' | 'ink', language: 'ru' | 'en' = 'en') {
  await page.getByRole('button', { name: /^(Настройки|Settings)$/ }).click()
  const group = page.getByRole('group', { name: language === 'ru' ? 'Цветовая тема приложения' : 'Application color theme' })
  const item = group.getByRole('menuitemradio', { name: theme === 'ink' ? (language === 'ru' ? 'Чернильная' : 'Ink') : (language === 'ru' ? 'Зелёная' : 'Green') })
  await item.click()
  await expect(item).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}
