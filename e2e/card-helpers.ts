import { expect, type Locator, type Page } from '@playwright/test'

/** The read-only "Overview" block of the open card (panel or page). */
export function summaryOf(page: Page, en = false): Locator {
  return page.getByRole('region', { name: en ? 'Overview' : 'Основное', exact: true })
}

/** Enters editing of the card summary with the pencil and returns the edit form. */
export async function enterEdit(page: Page, en = false): Promise<Locator> {
  await page.getByRole('button', { name: en ? 'Edit overview' : 'Редактировать основное', exact: true }).click()
  const form = page.getByRole('form', { name: en ? 'Edit overview' : 'Редактировать основное', exact: true })
  await expect(form.getByLabel(en ? 'Card name' : 'Название карточки', { exact: true })).toBeFocused()
  return form
}

/** Saves the edit form and waits until the summary is read-only again. */
export async function saveEdit(page: Page, form: Locator, en = false) {
  await form.getByRole('button', { name: en ? 'Save' : 'Сохранить', exact: true }).click()
  await expect(form).toBeHidden()
}

/** Leaves the open card: the panel closes, the full page returns to the board. */
export async function leaveCard(page: Page, en = false) {
  await page.getByRole('button', { name: en ? /^(Back to board|Close card)$/ : /^(Назад к доске|Закрыть карточку)$/ }).click()
}
