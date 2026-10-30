import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`shares app bar controls in ${language} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 740 })
    await page.goto('/tracker/')
    const en = language === 'en'
    if (en) { await page.getByRole('button', {name: 'Настройки'}).click(); await page.getByRole('combobox').selectOption('en'); await page.keyboard.press('Escape') }
    const createName = en ? 'Create project' : 'Создать проект'
    const addName = en ? 'Add status' : 'Добавить статус'
    const create = page.getByRole('button', { name: createName, exact: true })
    await expect(create).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await page.screenshot({path: testInfo.outputPath(`catalogue-${language}-${width}.png`), fullPage: true})
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
    await expect(add).toBeFocused()
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
      const brand = element.querySelector('.app-brand')!.getBoundingClientRect()
      const controls = element.querySelector('.app-bar-controls')!.getBoundingClientRect()
      const main = document.querySelector('main')!.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth > window.innerWidth, rows: getComputedStyle(inner).gridTemplateRows.split(' ').length, title: title.width, brand: brand.width, controls: controls.width, mainLeft: main.left + parseFloat(getComputedStyle(document.querySelector('main')!).paddingLeft), barLeft: inner.getBoundingClientRect().left + parseFloat(getComputedStyle(inner).paddingLeft) }
    })
    expect(geometry.overflow).toBe(false)
    expect(geometry.rows).toBe(width <= 650 ? 2 : 1)
    expect(geometry.title).toBeGreaterThan(0); expect(geometry.brand).toBeGreaterThan(0); expect(geometry.controls).toBeGreaterThan(0)
    expect(geometry.barLeft).toBe(geometry.mainLeft)
    await page.screenshot({ path: testInfo.outputPath(`app-bar-${language}-${width}.png`), fullPage: true })
    const gear = page.getByRole('button', {name: en ? 'Settings' : 'Настройки'})
    for (const button of [add, gear, page.getByRole('button', {name: /^EasyTrack —/})]) {
      const bounds = (await button.boundingBox())!
      expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44)
    }
    await gear.focus()
    expect(await gear.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible')
    await page.screenshot({path: testInfo.outputPath(`focus-hint-${language}-${width}.png`)})
    await gear.hover()
    expect(await gear.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible')
    await gear.click()
    const settings = page.getByRole('region', {name: en ? 'Settings' : 'Настройки'})
    await expect(settings).toBeVisible()
    expect(await settings.evaluate(element => {const b = element.getBoundingClientRect(); return element.matches(':popover-open') && b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`settings-${language}-${width}.png`), fullPage: true})
    await settings.getByRole('button', {name: en ? 'Rename project' : 'Переименовать проект'}).click()
    await expect(page.locator('.settings-panel')).toHaveCount(0)
    await expect(dialog.getByRole('textbox')).toBeFocused()
    await page.keyboard.press('Escape'); await expect(gear).toBeFocused()
    await gear.click()
    await settings.getByRole('button', {name: en ? 'Rename project' : 'Переименовать проект'}).click()
    await dialog.getByRole('textbox').fill('Project')
    await dialog.getByRole('button', {name: en ? 'Save' : 'Сохранить', exact: true}).click()
    await expect(gear).toBeFocused()
    const layout = await page.locator('.app-bar-inner').evaluate(element => {
      const brand = element.querySelector('.app-brand')!.getBoundingClientRect(), title = element.querySelector('h1')!.getBoundingClientRect(), controls = element.querySelector('.app-bar-controls')!.getBoundingClientRect()
      return {brand: brand.top, title: title.top, controls: controls.top, titleWidth: title.width, innerWidth: element.clientWidth - parseFloat(getComputedStyle(element).paddingLeft) - parseFloat(getComputedStyle(element).paddingRight)}
    })
    if (width <= 650) { expect(layout.title).toBeGreaterThan(layout.controls); expect(layout.titleWidth).toBeCloseTo(layout.innerWidth, 0) }
    else expect(Math.abs(layout.title - layout.controls)).toBeLessThan(15)
    await page.screenshot({path: testInfo.outputPath(`short-board-${language}-${width}.png`), fullPage: true})
    await page.setViewportSize({ width, height: 200 })
    await page.evaluate(() => window.scrollTo(0, 200))
    expect(await page.locator('.app-bar').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(0)
    await page.getByRole('button', { name: en ? /All projects/ : /Все проекты/ }).click()
    await expect(create).toHaveCount(1)
    await create.click(); await expect(dialog.getByRole('textbox')).toBeFocused()
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
  })
}

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) for (const state of ['loading', 'unavailable', 'restart'] as const) {
  test(`service ${state} settings in ${language} at ${width}px`, async ({page}, testInfo) => {
    await page.setViewportSize({width, height: 740})
    await page.addInitScript(({language, state}) => {
      localStorage.setItem('easytrack.locale', language)
      if (state === 'loading') indexedDB.open = () => new EventTarget() as IDBOpenDBRequest
      if (state === 'unavailable') indexedDB.open = () => { throw Error('Storage unavailable') }
    }, {language, state})
    await page.goto('/tracker/')
    const en = language === 'en'
    if (state === 'restart') {
      await expect(page.getByRole('button', {name: en ? 'Create project' : 'Создать проект'})).toBeVisible()
      await page.evaluate(() => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('personal-project-tracker', 30)
        request.onsuccess = () => { request.result.close(); resolve() }
        request.onerror = () => reject(request.error)
      }))
    }
    await expect(page.getByRole('heading', {level: 1})).toHaveText(state === 'loading' ? (en ? 'Opening workspace…' : 'Открываем рабочее пространство…') : state === 'unavailable' ? (en ? 'Project board unavailable' : 'Рабочая доска недоступна') : (en ? 'Restart EasyTrack' : 'Нужно перезапустить EasyTrack'))
    await expect(page.getByRole('button', {name: /^(Создать проект|Create project|Добавить статус|Add status)$/})).toHaveCount(0)
    await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
    await expect(page.getByRole('combobox')).toHaveValue(language)
    await expect(page.getByRole('button', {name: /^(Переименовать проект|Rename project)$/})).toHaveCount(0)
    expect(await page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`${state}-${language}-${width}.png`), fullPage: true})
    await page.getByRole('combobox').selectOption(en ? 'ru' : 'en')
    await expect(page.getByRole('combobox')).toHaveValue(en ? 'ru' : 'en')
    await expect(page.locator('.settings-panel')).toBeVisible()
    await expect.poll(() => page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
  })
}


test('repositions settings after language and preference warning resize', async ({page}) => {
  await page.setViewportSize({width: 320, height: 250})
  await page.addInitScript(() => { localStorage.setItem('easytrack.locale', 'en'); Storage.prototype.setItem = () => {throw Error('blocked')} })
  await page.goto('/tracker/')
  await page.getByRole('button', {name: 'Settings'}).click()
  const select = page.getByRole('combobox')
  await select.focus()
  await select.selectOption('ru')
  await expect(select).toBeFocused()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить язык')
  await expect.poll(() => page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
})
