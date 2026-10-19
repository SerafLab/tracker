import { expect, test } from '@playwright/test'

for (const width of [320, 1280]) {
  test(`keeps card move controls readable and keyboard focus on the card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/tracker/')
    await page.getByLabel('Новый проект').fill('Доска')
    await page.getByRole('button', { name: 'Создать проект' }).click()
    for (const name of ['Первый', 'Средний', 'Последний']) {
      await page.getByRole('button', { name: 'Добавить статус' }).first().click()
      await page.getByLabel('Название статуса').fill(name)
      await page.getByRole('button', { name: 'Создать статус' }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    const name = 'ОченьДлинноеНазваниеКарточкиБезПробелов'.repeat(4)
    const first = page.locator('.status-column').filter({ has: page.getByRole('heading', { name: 'Первый', exact: true }) })
    await first.getByRole('button', { name: /Добавить карточку/ }).click()
    await page.getByLabel('Название карточки').fill(name)
    await page.getByRole('button', { name: 'Создать карточку' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    const card = page.locator('.work-card').filter({ hasText: name })
    const geometry = await card.evaluate(element => {
      const text = element.querySelector('.card-name')!.getBoundingClientRect()
      const controls = element.querySelector('.card-controls')!.getBoundingClientRect()
      return { fits: element.scrollWidth <= element.clientWidth, separate: text.bottom <= controls.top, sizes: Array.from(element.querySelectorAll('button')).map(button => ({ width: button.clientWidth, height: button.clientHeight })) }
    })
    expect(geometry.fits).toBe(true)
    expect(geometry.separate).toBe(true)
    for (const size of geometry.sizes) { expect(size.width).toBeGreaterThanOrEqual(42); expect(size.height).toBeGreaterThanOrEqual(42) }
    const right = card.getByRole('button', { name: 'Переместить вправо в «Средний»' })
    await right.focus()
    const scroll = await page.locator('.status-columns').evaluate(element => element.scrollLeft)
    await page.keyboard.press('Enter')
    await expect(card.getByRole('button', { name: 'Переместить вправо в «Последний»' })).toBeFocused()
    expect(await page.locator('.status-columns').evaluate(element => element.scrollLeft)).toBe(scroll)
    await card.getByRole('button', { name: `Действия карточки ${name}` }).click()
    await page.getByRole('menuitem', { name: 'Переместить в…' }).click()
    const dialog = page.getByRole('dialog', { name: 'Переместить карточку' })
    await expect(dialog.getByRole('combobox')).toBeFocused()
    await expect(dialog.getByRole('option')).toHaveCount(2)
    await dialog.getByRole('combobox').selectOption({ label: 'Последний' })
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(card.getByRole('button', { name: `Действия карточки ${name}` })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
    await expect(card.getByRole('button', { name: `Действия карточки ${name}` })).toBeFocused()
  })
}
