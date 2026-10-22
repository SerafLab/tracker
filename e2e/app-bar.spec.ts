import { expect, test } from '@playwright/test'

for (const width of [320, 1280]) for (const language of ['ru', 'en'] as const) {
  test(`shares app bar controls in ${language} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 740 })
    await page.goto('/tracker/')
    const en = language === 'en'
    if (en) await page.getByRole('combobox').selectOption('en')
    const createName = en ? 'Create project' : 'Создать проект'
    const addName = en ? 'Add status' : 'Добавить статус'
    const create = page.getByRole('button', { name: createName, exact: true })
    await expect(create).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await create.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('textbox')).toBeFocused()
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(0)
    for (let count = 0; count < 7; count++) {
      await page.keyboard.press(count % 2 ? 'Shift+Tab' : 'Tab')
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
    await create.click()
    const name = 'ОченьДлинноеИмяПроектаБезПробелов'.repeat(3)
    await dialog.getByRole('textbox').fill(name)
    await dialog.getByRole('button', { name: createName, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    const add = page.getByRole('button', { name: addName, exact: true })
    await expect(add).toHaveCount(1)
    for (const status of ['Todo', 'Done']) {
      await add.click()
      await expect(dialog.getByRole('textbox')).toBeFocused()
      await dialog.getByRole('textbox').fill(status)
      await dialog.getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
      await expect(dialog).toBeHidden(); await expect(add).toBeFocused()
    }
    const geometry = await page.locator('.app-bar').evaluate(element => {
      const inner = element.querySelector('.app-bar-inner')!
      const title = element.querySelector('h1')!.getBoundingClientRect()
      const locale = element.querySelector('select')!.getBoundingClientRect()
      const controls = element.querySelector('.app-bar-controls')!.getBoundingClientRect()
      const main = document.querySelector('main')!.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth > window.innerWidth, rows: getComputedStyle(inner).gridTemplateRows.split(' ').length, title: title.width, locale: locale.width, controls: controls.width, mainLeft: main.left + parseFloat(getComputedStyle(document.querySelector('main')!).paddingLeft), titleLeft: title.left }
    })
    expect(geometry.overflow).toBe(false)
    expect(geometry.rows).toBeLessThanOrEqual(2)
    expect(geometry.title).toBeGreaterThan(0); expect(geometry.locale).toBeGreaterThan(0); expect(geometry.controls).toBeGreaterThan(0)
    expect(geometry.titleLeft).toBe(geometry.mainLeft)
    await page.screenshot({ path: testInfo.outputPath(`app-bar-${language}-${width}.png`), fullPage: true })
    await page.setViewportSize({ width, height: 200 })
    await page.evaluate(() => window.scrollTo(0, 200))
    expect(await page.locator('.app-bar').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(0)
    await page.getByRole('button', { name: en ? /All projects/ : /Все проекты/ }).click()
    await expect(create).toHaveCount(1)
    await create.click(); await expect(dialog.getByRole('textbox')).toBeFocused()
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
  })
}
