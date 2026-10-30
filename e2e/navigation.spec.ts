import { expect, test } from '@playwright/test'

test('keeps the selected project consistent through history and reloads', async ({ page }) => {
  await page.goto('/tracker/')
  for (const name of ['Первый проект', 'Второй проект']) {
    await page.getByRole('button', { name: 'Создать проект', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox').fill(name)
    await dialog.getByRole('button', { name: 'Создать проект', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'EasyTrack — Все проекты', exact: true }).click()
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  }

  await page.getByRole('button', { name: 'Первый проект', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Первый проект', exact: true })).toBeVisible()
  const firstProjectUrl = page.url()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Первый проект', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: 'Первый проект', exact: true })).toBeVisible()
  await expect(page).toHaveURL(firstProjectUrl)

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Первый проект', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'EasyTrack — Все проекты', exact: true }).click()
  await page.getByRole('button', { name: 'Второй проект', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Второй проект', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Второй проект', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'EasyTrack — Все проекты', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Второй проект', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Первый проект', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Второй проект', exact: true })).toBeVisible()
})
