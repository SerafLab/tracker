import { expect, test, type Page } from '@playwright/test'
import { selectLanguage } from './language'
import { viewportFor } from './viewports'

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`shares app bar controls in ${language} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewportFor(width))
    await page.goto('/tracker/')
    const en = language === 'en'
    if (en) { await selectLanguage(page, 'en') }
    const createName = en ? 'Create project' : 'Создать проект'
    const addName = en ? 'Add status' : 'Добавить статус'
    const create = page.getByRole('button', { name: createName, exact: true })
    await expect(create).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await page.screenshot({path: testInfo.outputPath(`catalogue-${language}-${width}.png`), fullPage: true})
    await create.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('textbox')).toBeFocused()
    await expect(dialog.getByRole('combobox', { name: en ? 'Status set' : 'Набор статусов' })).toHaveValue('simple')
    await expect(page.getByRole('group', { name: en ? 'Application language' : 'Язык приложения' })).toHaveCount(0)
    for (let count = 0; count < 7; count++) {
      await page.keyboard.press(count % 2 ? 'Shift+Tab' : 'Tab')
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
    await create.click()
    const name = 'ОченьДлинноеИмяПроектаБезПробелов'.repeat(3)
    await dialog.getByRole('textbox').fill(name)
    await page.getByRole('dialog').getByRole('combobox').selectOption('empty')
    await dialog.getByRole('button', { name: createName, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    const heading = page.getByRole('heading', {level: 1})
    const longHeight = await page.locator('.app-bar').evaluate(element => element.getBoundingClientRect().height)
    await expect(heading).toHaveAttribute('tabindex', '0')
    expect(await heading.evaluate(element => {
      const style = getComputedStyle(element)
      return style.whiteSpace === 'nowrap' && style.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth && element.getBoundingClientRect().height <= parseFloat(style.lineHeight) + 1
    })).toBe(true)
    await heading.hover()
    const titleHint = page.locator('.page-title-hint')
    await expect(titleHint).toBeVisible()
    await expect(titleHint).toHaveText(name)
    expect(await titleHint.evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
    await page.mouse.move(0, 400)
    await expect(titleHint).toBeHidden()
    await heading.focus()
    await expect(titleHint).toBeVisible()
    await page.keyboard.press('Tab')
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
    expect(await page.locator('.app-bar-inner').evaluate(element => {
      const title = element.querySelector('.page-title-wrap')!.getBoundingClientRect(), brand = element.querySelector('.app-brand')!.getBoundingClientRect(), controls = element.querySelector('.app-bar-controls')!.getBoundingClientRect()
      return title.bottom <= controls.top || title.top >= controls.bottom || (title.left >= brand.right && title.right <= controls.left)
    })).toBe(true)
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
    const settings = page.getByRole('menu', {name: en ? 'Settings' : 'Настройки'})
    await expect(settings).toBeVisible()
    expect(await page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return element.matches(':popover-open') && b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`settings-${language}-${width}.png`), fullPage: true})
    await settings.getByRole('menuitem', {name: en ? 'Rename project' : 'Переименовать проект'}).click()
    await expect(page.locator('.settings-panel')).toHaveCount(0)
    await expect(dialog.getByRole('textbox')).toBeFocused()
    await page.keyboard.press('Escape'); await expect(gear).toBeFocused()
    await gear.click()
    await settings.getByRole('menuitem', {name: en ? 'Rename project' : 'Переименовать проект'}).click()
    await dialog.getByRole('textbox').fill('Project')
    await dialog.getByRole('button', {name: en ? 'Save' : 'Сохранить', exact: true}).click()
    await expect(gear).toBeFocused()
    await expect(heading).not.toHaveAttribute('tabindex')
    await expect(titleHint).toHaveCount(0)
    expect(await page.locator('.app-bar').evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(longHeight, 0)
    const layout = await page.locator('.app-bar-inner').evaluate(element => {
      const brand = element.querySelector('.app-brand')!.getBoundingClientRect(), title = element.querySelector('h1')!.getBoundingClientRect(), controls = element.querySelector('.app-bar-controls')!.getBoundingClientRect()
      return {brand: brand.top, title: title.top, controls: controls.top, titleWidth: title.width, innerWidth: element.clientWidth - parseFloat(getComputedStyle(element).paddingLeft) - parseFloat(getComputedStyle(element).paddingRight)}
    })
    if (width <= 650) { expect(layout.title).toBeGreaterThan(layout.controls); expect(layout.titleWidth).toBeCloseTo(layout.innerWidth, 0) }
    else expect(Math.abs(layout.title - layout.controls)).toBeLessThan(15)
    await page.screenshot({path: testInfo.outputPath(`short-board-${language}-${width}.png`), fullPage: true})
    await page.setViewportSize({ width, height: 200 })
    await page.locator('.board-workspace > main').evaluate(element => { element.scrollTop = 200 })
    await expect.poll(() => page.locator('.board-workspace > main').evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    expect(await page.locator('.app-bar').evaluate(element => element.getBoundingClientRect().top)).toBe(0)
    await page.getByRole('button', { name: en ? /All projects/ : /Все проекты/ }).click()
    await expect(create).toHaveCount(1)
    await create.click(); await expect(dialog.getByRole('textbox')).toBeFocused()
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
  })
}

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) for (const state of ['loading', 'unavailable', 'restart'] as const) {
  test(`service ${state} settings in ${language} at ${width}px`, async ({page}, testInfo) => {
    await page.setViewportSize(viewportFor(width))
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
        const request = indexedDB.open('personal-project-tracker', 40)
        request.onsuccess = () => { request.result.close(); resolve() }
        request.onerror = () => reject(request.error)
      }))
    }
    await expect(page.getByRole('heading', {level: 1})).toHaveText(state === 'loading' ? (en ? 'Opening workspace…' : 'Открываем рабочее пространство…') : state === 'unavailable' ? (en ? 'Project board unavailable' : 'Рабочая доска недоступна') : (en ? 'Restart EasyTrack' : 'Нужно перезапустить EasyTrack'))
    await expect(page.getByRole('button', {name: /^(Создать проект|Create project|Добавить статус|Add status)$/})).toHaveCount(0)
    await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
    await expect(page.getByRole('group')).toHaveCount(2)
    await expect(page.getByRole('group', {name: en ? 'Application color theme' : 'Цветовая тема приложения'})).toHaveCount(1)
    await expect(page.getByRole('menuitemradio', {name: en ? 'English' : 'Русский'})).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('menuitem', {name: /^(Переименовать проект|Rename project|Удалить проект|Delete project)$/})).toHaveCount(0)
    await expect(page.getByRole('menuitem', {name: /^(Выгрузить резервную копию|Export backup|Восстановить из резервной копии|Restore from backup)$/})).toHaveCount(0)
    expect(await page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path: testInfo.outputPath(`${state}-${language}-${width}.png`), fullPage: true})
    await page.getByRole('menuitemradio', {name: en ? 'Русский' : 'English'}).click()
    await expect(page.getByRole('menuitemradio', {name: en ? 'Русский' : 'English'})).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.settings-panel')).toBeVisible()
    await expect.poll(() => page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
  })
}


test('repositions settings after language and preference warning resize', async ({page}) => {
  await page.setViewportSize({width: 320, height: 250})
  await page.addInitScript(() => { localStorage.setItem('easytrack.locale', 'en'); Storage.prototype.setItem = () => {throw Error('blocked')} })
  await page.goto('/tracker/')
  await page.getByRole('button', {name: 'Settings'}).click()
  const select = page.getByRole('menuitemradio', {name: 'Русский'})
  await select.focus()
  await page.keyboard.press('Enter')
  await expect(select).toHaveAttribute('aria-checked', 'true')
  await expect(select).toBeFocused()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить язык')
  await expect.poll(() => page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
})

for (const language of ['ru', 'en'] as const) test(`remeasures a renamed title and scrolls its full hint in ${language}`, async ({page}, testInfo) => {
  await page.setViewportSize(viewportFor(1440))
  await page.addInitScript(language => localStorage.setItem('easytrack.locale', language), language)
  await page.goto('/tracker/')
  const en = language === 'en'
  await page.getByRole('button', {name: en ? 'Create project' : 'Создать проект', exact: true}).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Medium project title changes across viewport')
  await dialog.getByRole('combobox').selectOption('empty')
  await dialog.getByRole('button', {name: en ? 'Create project' : 'Создать проект', exact: true}).click()
  const heading = page.getByRole('heading', {level: 1})
  await expect(heading).not.toHaveAttribute('tabindex')
  await page.setViewportSize(viewportFor(320))
  await expect(heading).toHaveAttribute('tabindex', '0')
  await page.setViewportSize(viewportFor(1440))
  await expect(heading).not.toHaveAttribute('tabindex')
  await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
  await page.getByRole('menuitem', {name: en ? 'Rename project' : 'Переименовать проект'}).click()
  const fullName = 'ДлинноеИмяБезПробелов'.repeat(200)
  await dialog.getByRole('textbox').fill(fullName)
  await dialog.getByRole('button', {name: en ? 'Save' : 'Сохранить', exact: true}).click()
  await page.setViewportSize({width: 320, height: 300})
  await expect(heading).toHaveAttribute('tabindex', '0')
  await heading.focus()
  const hint = page.locator('.page-title-hint')
  await expect(hint).toBeVisible()
  await expect(hint).toHaveText(fullName)
  expect(await hint.evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight && element.scrollHeight > element.clientHeight})).toBe(true)
  await page.keyboard.press('End')
  expect(await hint.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await page.keyboard.press('Home')
  expect(await hint.evaluate(element => element.scrollTop)).toBe(0)
  await page.keyboard.press('Escape')
  await expect(hint).toBeHidden()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(hint).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({path: testInfo.outputPath(`scrolling-title-hint-${language}.png`)})
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', {name: en ? 'Add status' : 'Добавить статус', exact: true})).toBeFocused()
  await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
  await expect(page.getByRole('group', {name: en ? 'Application language' : 'Язык приложения'})).toBeVisible()
})

for (const width of [320, 1280]) for (const language of ['ru', 'en'] as const) for (const screen of ['catalogue', 'board'] as const) {
  test(`aligns settings menu labels to the start edge on the ${screen} in ${language} at ${width}px`, async ({page}, testInfo) => {
    await page.setViewportSize(viewportFor(width))
    await page.addInitScript(language => localStorage.setItem('easytrack.locale', language), language)
    await page.goto('/tracker/')
    const en = language === 'en'
    if (screen === 'board') {
      await page.getByRole('button', {name: en ? 'Create project' : 'Создать проект', exact: true}).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('textbox').fill('Project')
      await dialog.getByRole('combobox').selectOption('empty')
      await dialog.getByRole('button', {name: en ? 'Create project' : 'Создать проект', exact: true}).click()
      await expect(page.getByRole('heading', {level: 1})).toHaveText('Project')
    }
    await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
    const menu = page.getByRole('menu', {name: en ? 'Settings' : 'Настройки'})
    const caption = menu.getByText(en ? 'Application language' : 'Язык приложения', {exact: true})
    await expect(caption).toBeVisible()
    await expect(menu.getByRole('separator')).toHaveCount(2)
    await expect(menu.getByRole('menuitem')).toHaveCount(screen === 'board' ? 5 : 3)
    await expect(menu.getByRole('group')).toHaveCount(2)
    await expect(menu.getByRole('group', {name: en ? 'Application language' : 'Язык приложения'})).toHaveCount(1)
    await expect(menu.getByRole('group', {name: en ? 'Application color theme' : 'Цветовая тема приложения'})).toHaveCount(1)
    await expect(menu.getByRole('group', {name: en ? 'Application language' : 'Язык приложения'}).getByRole('menuitemradio')).toHaveText(['Русский', 'English'])
    await expect(menu.getByRole('group', {name: en ? 'Application color theme' : 'Цветовая тема приложения'}).getByRole('menuitemradio')).toHaveText(en ? ['Green', 'Ink'] : ['Зелёная', 'Чернильная'])
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    // Text starts at the item's inline start plus its padding; the caption shares that edge.
    const starts = await menu.locator('.menu-item, .menu-caption').evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingLeft))))
    expect(new Set(starts).size).toBe(1)
    expect(await menu.locator('.menu-item').evaluateAll(elements => elements.every(element => getComputedStyle(element).textAlign === 'left' || getComputedStyle(element).textAlign === 'start'))).toBe(true)
    expect(await page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight})).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await menu.getByRole('menuitemradio').last().focus()
    await expect(menu.getByRole('menuitemradio').last()).toBeFocused()
    await page.screenshot({path: testInfo.outputPath(`settings-menu-${screen}-${language}-${width}.png`)})
  })
}

test('shows the preference warning below the settings menu', async ({page}, testInfo) => {
  await page.setViewportSize(viewportFor(320))
  await page.addInitScript(() => { Storage.prototype.setItem = () => {throw Error('blocked')} })
  await page.goto('/tracker/')
  await page.getByRole('button', {name: 'Настройки'}).click()
  await page.getByRole('menuitemradio', {name: 'English'}).click()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Could not save your language')
  await expect(page.getByRole('menu')).toBeVisible()
  expect(await page.getByRole('menu').evaluate((menu, alert) => !menu.contains(alert) && !!(menu.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING), await alert.elementHandle())).toBe(true)
  await page.screenshot({path: testInfo.outputPath('settings-menu-warning-320.png')})
})

test('shows the theme warning below the menu alongside the language warning', async ({page}) => {
  await page.setViewportSize(viewportFor(320))
  await page.addInitScript(() => { Storage.prototype.setItem = () => {throw Error('blocked')} })
  await page.goto('/tracker/')
  await page.getByRole('button', {name: 'Настройки'}).click()
  await page.getByRole('menuitemradio', {name: 'Чернильная'}).click()
  await page.getByRole('menuitemradio', {name: 'English'}).click()
  await expect(page.getByRole('alert')).toHaveCount(2)
  await expect(page.getByRole('alert').first()).toContainText('Could not save your language')
  await expect(page.getByRole('alert').last()).toContainText('Could not save your color theme')
  expect(await page.locator('.settings-panel').evaluate(element => {const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight})).toBe(true)
})

async function seedCardPage(page: Page, en: boolean, project: string, status: string) {
  await page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill(project)
  await dialog.getByRole('combobox', { name: en ? 'Status set' : 'Набор статусов' }).selectOption('empty')
  await dialog.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
  await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
  await dialog.getByRole('textbox').fill(status)
  await dialog.getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.locator('.status-column .add-card-header').click()
  await dialog.getByRole('textbox').fill('Context card')
  await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('link', { name: 'Context card', exact: true }).click()
  await page.getByRole('button', { name: en ? 'Open full page' : 'Открыть на всю страницу', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Context card', exact: true })).toBeVisible()
}

for (const width of [320, 1280]) for (const en of [false, true]) {
  test(`Card page has a long project and status in ${en ? 'en' : 'ru'} at ${width}px`, async ({ page }) => {
    await page.setViewportSize(viewportFor(width))
    await page.goto('/tracker/')
    if (en) await selectLanguage(page, 'en')
    await seedCardPage(page, en, 'Short', 'Todo')
    const bar = page.locator('.card-page .app-bar')
    await expect(bar.locator('h1')).toHaveCount(0)
    await expect(bar).toContainText('Short›Todo')
    await expect(bar.locator('.app-bar-context-text[tabindex]')).toHaveCount(0)
    const shortHeight = await bar.evaluate(element => element.getBoundingClientRect().height)
    await page.getByRole('button', { name: /^EasyTrack —/ }).click()
    const project = 'ОченьДлинноеИмяПроектаБезПробелов'.repeat(6), status = 'ОченьДлинныйСтатусБезПробелов'.repeat(6)
    await seedCardPage(page, en, project, status)
    await expect(bar.locator('.app-bar-context-text[tabindex="0"]')).toHaveCount(2)
    expect(await bar.evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(shortHeight, 0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const parts = bar.locator('.app-bar-context-text')
    const geometry = await bar.locator('.app-bar-context').evaluate(element => {
      const [first, second] = Array.from(element.querySelectorAll('.app-bar-context-text')).map(node => node.getBoundingClientRect())
      const line = parseFloat(getComputedStyle(element.querySelector('.app-bar-context-text')!).lineHeight)
      return { oneLine: first.height <= line + 1 && second.height <= line + 1, separator: element.querySelector('.app-bar-context-separator')!.getBoundingClientRect().width, firstWidth: first.width, secondWidth: second.width, inside: second.right <= element.getBoundingClientRect().right + 1 }
    })
    expect(geometry).toMatchObject({ oneLine: true, inside: true })
    expect(geometry.separator).toBeGreaterThan(0); expect(geometry.firstWidth).toBeGreaterThan(geometry.secondWidth); expect(geometry.secondWidth).toBeGreaterThan(20)
    const hint = bar.locator('.page-title-hint')
    for (const [index, text] of [project, status].entries()) {
      await parts.nth(index).hover()
      await expect(hint.filter({ hasText: text })).toBeVisible()
      await page.mouse.move(0, 400)
      await expect(hint.filter({ hasText: text })).toBeHidden()
      await parts.nth(index).focus()
      await expect(hint.filter({ hasText: text })).toBeVisible()
      expect(await hint.filter({ hasText: text }).evaluate(element => { const b = element.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth })).toBe(true)
    }
  })
}
