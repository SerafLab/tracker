import { expect, test, type Page } from '@playwright/test'

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`calm board keeps four columns and reachable controls in ${language} at ${width}px`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await page.goto('/tracker/')
    if (en) { await page.getByRole('button', {name: 'Настройки'}).click(); await page.getByRole('combobox', { name: 'Язык приложения' }).selectOption('en'); await page.keyboard.press('Escape') }
    await expect(page.getByRole('heading', { name: en ? 'Start with your first project' : 'Начните с первого проекта' })).toBeVisible()
    await page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('Поиск квартиры')
    await page.getByRole('dialog').getByRole('combobox').selectOption('empty')
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
    await expect(page.getByRole('heading', { name: en ? 'Add your first status' : 'Добавьте первый статус' })).toBeVisible()
    for (const name of ['Найдено — длинное название для переноса', 'Связаться', 'Просмотр', 'Решение — длинное название статуса с несколькими дополнительными словами для проверки четырёх строк и выравнивания карточек']) {
      await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
      await page.getByRole('dialog').getByRole('textbox').fill(name)
      await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    const first = page.locator('.status-column').first()
    const names = ['Квартира у парка', 'Уточнить документы', 'Назначить просмотр', 'Сравнить варианты']
    for (let index = 0; index < names.length; index++) {
      await first.locator('.add-card-header').click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('textbox')).toBeFocused()
      await dialog.getByRole('textbox').fill(names[index])
      if (index < 2) await dialog.getByRole('checkbox', { name: en ? 'Important' : 'Важная' }).check()
      if (index === 0 || index === 2) await dialog.getByRole('checkbox', { name: en ? 'Urgent' : 'Срочная' }).check()
      await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(first.locator('.add-card-header')).toBeFocused()
    }
    for (const column of [first, page.locator('.status-column').last()]) {
      const header = column.locator('.add-card-header')
      await header.hover()
      await expect(header).toHaveAccessibleName(en ? 'Add card' : 'Добавить карточку')
      const tooltip = await header.evaluate(element => {
        const hint = getComputedStyle(element, '::after')
        const button = element.getBoundingClientRect()
        const scroller = element.closest('[data-board-scroller]')!.getBoundingClientRect()
        const width = parseFloat(hint.width)
        const height = parseFloat(hint.height)
        const right = button.right - parseFloat(hint.right)
        const top = button.top + parseFloat(hint.top)
        return { visible: hint.visibility, content: hint.content, unclipped: right - width >= Math.max(0, scroller.left) && right <= Math.min(innerWidth, scroller.right) && top >= scroller.top && top + height <= scroller.bottom }
      })
      expect(tooltip.visible).toBe('visible')
      expect(tooltip.content).toContain(en ? 'Add card' : 'Добавить карточку')
      expect(tooltip.unclipped).toBe(true)
      await header.focus()
      await page.mouse.move(0, 0)
      expect(await header.evaluate(element => getComputedStyle(element, '::after').visibility)).toBe('visible')
      await page.screenshot({ path: testInfo.outputPath(`creation-tooltip-${column === first ? 'first' : 'last'}-${language}-${width}.png`), fullPage: false })
      await header.blur()
    }
    await first.locator('.add-card-header').scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo(0, 0))
    const geometry = await page.locator('.status-columns').evaluate(element => {
      const columns = Array.from(element.querySelectorAll('.status-column'))
      const first = columns[0]
      const scroller = element.closest('[data-board-scroller]')!
      return {
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        boardOverflow: scroller.scrollWidth > scroller.clientWidth,
        widths: columns.map(column => column.getBoundingClientRect().width),
        boundedColumns: columns.every(column => getComputedStyle(column).borderTopWidth === '1px'),
        listStarts: columns.map(column => column.querySelector('.card-list')!.getBoundingClientRect().top),
        longestLines: Math.max(...columns.map(column => { const title = column.querySelector('.column-title')!; return title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight) })),
        lowerEntries: element.querySelectorAll('.add-card').length,
        headerEntries: columns.map(column => column.querySelectorAll('button.add-card-header').length),
        headingsClear: columns.every(column => {
          const title = column.querySelector('.column-heading')!.getBoundingClientRect()
          const plus = column.querySelector('.add-card-header')!.getBoundingClientRect()
          const menu = column.querySelector('.column-header .menu')!.getBoundingClientRect()
          return title.right <= plus.left && plus.right <= menu.left
        }),
        headerBeforeMenu: first.querySelector('.add-card-header')!.nextElementSibling?.classList.contains('menu'),
        plusStyles: [document.querySelector('.app-bar .button-primary')!, first.querySelector('.add-card-header')!].map(element => {
          const style = getComputedStyle(element), box = element.getBoundingClientRect()
          return { width: box.width, height: box.height, background: style.backgroundColor, radius: style.borderRadius, svg: element.querySelector('path')!.getAttribute('d') }
        }),
        targets: Array.from(first.querySelectorAll('button')).map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      }
    })
    expect(geometry.headingsClear).toBe(true)
    expect(geometry.headerBeforeMenu).toBe(true)
    expect(geometry.lowerEntries).toBe(0)
    expect(geometry.headerEntries).toEqual([1, 1, 1, 1])
    expect(geometry.plusStyles[0]).toEqual(geometry.plusStyles[1])
    expect(geometry.plusStyles[0].width).toBe(44)
    expect(geometry.plusStyles[0].height).toBe(44)
    expect(geometry.pageOverflow).toBe(false)
    expect(geometry.boardOverflow).toBe(width < 1280)
    expect(geometry.widths).toHaveLength(4)
    expect(Math.min(...geometry.widths)).toBeGreaterThanOrEqual(260)
    expect(geometry.boundedColumns).toBe(true)
    expect(geometry.longestLines).toBeGreaterThanOrEqual(4)
    expect(Math.max(...geometry.listStarts) - Math.min(...geometry.listStarts)).toBeLessThan(1)
    for (const target of geometry.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44) }
    await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
    const locale = page.getByRole('combobox', { name: en ? 'Application language' : 'Язык приложения' })
    await expect(locale).toHaveCount(1)
    await expect(locale.locator('option')).toHaveText(['RU', 'EN'])
    await page.keyboard.press('Escape')
    await expect(first.locator('.card-badge')).toHaveCount(4)
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
    await page.screenshot({ path: testInfo.outputPath(`calm-${language}-${width}.png`), fullPage: true })

    // A lower card menu must escape the board scroller, remain inside the
    // viewport, and restore focus. This uses the actual browser top layer.
    const menuTrigger = first.locator('.work-card').last().getByRole('button', { name: /^(Действия карточки|Card actions)/ })
    await menuTrigger.click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    expect(await menu.evaluate(element => {
      const box = element.getBoundingClientRect()
      return element.matches(':popover-open') && box.left >= 0 && box.right <= window.innerWidth && box.top >= 0 && box.bottom <= window.innerHeight
    })).toBe(true)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(menuTrigger).toBeFocused()

    // The last column's empty list is still reachable through its header plus.
    const last = page.locator('.status-column').last()
    await last.locator('.add-card-header').focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('textbox')).toBeFocused()
    expect(await dialog.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.top >= 0 && bounds.bottom <= window.innerHeight
    })).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`calm-form-${language}-${width}.png`), fullPage: false })
    await page.keyboard.press('Escape')
    await expect(last.locator('.add-card-header')).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const longStatus = 'ДлинноеНазваниеСтатусаБезПробелов'.repeat(4)
    await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill(longStatus)
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    const fifth = page.locator('.status-column').last()
    await fifth.locator('.add-card-header').scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
    await page.screenshot({ path: testInfo.outputPath(`creation-long-status-${language}-${width}.png`), fullPage: false })
    await fifth.getByRole('button', { name: en ? `Status actions for ${longStatus}` : `Действия статуса ${longStatus}`, exact: true }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    const overflow = await page.locator('.status-columns').evaluate(element => ({
      page: document.documentElement.scrollWidth > window.innerWidth,
      board: element.closest('[data-board-scroller]')!.scrollWidth > element.closest('[data-board-scroller]')!.clientWidth,
      readable: Array.from(element.children).every(column => column.getBoundingClientRect().width >= 260 && column.scrollWidth <= column.clientWidth),
    }))
    expect(overflow).toEqual({ page: false, board: true, readable: true })

    if (width === 320) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true }).click()
      await expect(page.getByRole('region', {name: en ? 'Settings' : 'Настройки'})).toBeVisible()
      await page.locator('[data-board-scroller]').evaluate(element => { element.scrollTop = 250 })
      await expect.poll(() => page.locator('[data-board-scroller]').evaluate(element => element.scrollTop)).toBeGreaterThan(50)
      const settingsAfterScroll = page.getByRole('region', {name: en ? 'Settings' : 'Настройки'})
      await expect(settingsAfterScroll).toBeVisible()
      expect(await settingsAfterScroll.evaluate(element => { const box = element.getBoundingClientRect(); return box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth })).toBe(true)
      await page.keyboard.press('Escape')
      // Nested board scrolling leaves the anchored bar settings available.
      await page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true }).click()
      await expect(page.getByRole('region', {name: en ? 'Settings' : 'Настройки'})).toBeVisible()
      await page.keyboard.press('Escape')
    }
  })
}

type SeedStatus = { name: string; cards: number }
/** Writes a project straight into IndexedDB; the lists are long enough to scroll without driving the form for each card. */
async function seedBoard(page: Page, statuses: SeedStatus[], project = 'long') {
  await page.goto('/tracker/')
  await expect(page.getByRole('button', { name: 'Создать проект', exact: true })).toBeVisible()
  await page.evaluate(async ({ statuses, project }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('personal-project-tracker'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'statuses', 'cards'], 'readwrite')
      tx.objectStore('projects').put({ id: project, name: 'Long', createdAt: '2026-11-04T00:00:00Z' })
      statuses.forEach((status, index) => {
        tx.objectStore('statuses').put({ id: `s${index}`, projectId: project, name: status.name, position: index })
        for (let card = 0; card < status.cards; card++) tx.objectStore('cards').put({ id: `c${index}-${card}`, statusId: `s${index}`, name: `${status.name} card ${card + 1}`, description: '', important: false, urgent: false, position: card })
      })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { statuses, project })
  await page.goto(`/tracker/#project/${project}`)
  await page.reload()
  await expect(page.locator('.status-columns')).toBeVisible()
}
const statusColumn = (page: Page, name: string) => page.locator('.status-column').filter({ has: page.getByRole('heading', { name, exact: true }) })
const scroller = (page: Page) => page.locator('[data-board-scroller]')
const scrollState = (page: Page) => scroller(page).evaluate(element => ({ top: element.scrollTop, left: element.scrollLeft, maxTop: element.scrollHeight - element.clientHeight, maxLeft: element.scrollWidth - element.clientWidth }))
/** Viewport geometry of the board scroller and of every status header, for sticky and focus checks. */
const boardGeometry = (page: Page) => scroller(page).evaluate(element => {
  const box = element.getBoundingClientRect()
  return {
    scroller: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
    headers: Array.from(element.querySelectorAll('.column-header')).map(header => { const rect = header.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } }),
    columns: Array.from(element.querySelectorAll('.status-column')).map(column => { const rect = column.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, height: rect.height } }),
    documentScrolls: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
    scrollY,
    barTop: document.querySelector('.app-bar')!.getBoundingClientRect().top,
    barBottom: document.querySelector('.app-bar')!.getBoundingClientRect().bottom,
  }
})

for (const language of ['ru', 'en'] as const) {
  test(`creates a card from a sticky header while the board is scrolled in ${language}`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width: 390, height: 844 })
    await seedBoard(page, [{ name: 'Todo', cards: 14 }, { name: 'Done', cards: 14 }])
    if (en) { await page.getByRole('button', { name: 'Настройки' }).click(); await page.getByRole('combobox', { name: 'Язык приложения' }).selectOption('en'); await page.keyboard.press('Escape') }
    const column = statusColumn(page, 'Todo')
    const header = column.locator('.add-card-header'), count = column.locator('.card-count [aria-hidden="true"]')
    for (const [key, action] of [['Enter', 'create'], ['Enter', 'cancel'], ['Space', 'escape']] as const) {
      await scroller(page).evaluate(element => { element.scrollTop = element.scrollHeight })
      const before = await scrollState(page), cards = Number(await count.textContent())
      expect(before.top).toBeGreaterThan(0)
      // The plus stays reachable in its stuck header right below the application bar.
      const geometry = await boardGeometry(page)
      expect(Math.abs(geometry.headers[0].top - geometry.scroller.top)).toBeLessThan(1)
      await expect(header).toBeInViewport()
      await header.focus()
      await page.keyboard.press(key)
      await expect(page.getByRole('dialog').getByRole('textbox')).toBeFocused()
      if (action === 'create') {
        await page.getByRole('dialog').getByRole('textbox').fill('Created while scrolled')
        await page.getByRole('dialog').getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
      } else if (action === 'cancel') await page.getByRole('dialog').getByRole('button', { name: en ? 'Cancel' : 'Отмена' }).click()
      else await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
      await expect(header).toBeFocused()
      // The counter is the only cue; the board neither scrolls to the new card nor moves the page.
      await expect(count).toHaveText(String(action === 'create' ? cards + 1 : cards))
      expect(Math.abs((await scrollState(page)).top - before.top)).toBeLessThan(1)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
      if (action === 'create') await page.screenshot({ path: testInfo.outputPath(`creation-scrolled-${language}.png`), fullPage: false })
    }
    await expect(column.locator('.work-card')).toHaveCount(15)
  })
}

test('only the header creation entry exists on empty and populated boards', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seedBoard(page, [{ name: 'One', cards: 0 }, { name: 'Two', cards: 0 }, { name: 'Three', cards: 0 }])
  const expectHeaderOnly = async () => {
    await expect(page.locator('.add-card')).toHaveCount(0)
    for (const name of ['One', 'Two', 'Three']) {
      await expect(statusColumn(page, name).locator('.column-header .add-card-header')).toBeVisible()
      await expect(statusColumn(page, name).getByRole('button', { name: 'Добавить карточку', exact: true })).toHaveCount(1)
    }
    await expect(page.getByRole('button', { name: 'Добавить статус', exact: true })).toBeVisible()
  }
  await expectHeaderOnly()
  await statusColumn(page, 'Two').locator('.add-card-header').click()
  await page.getByRole('dialog').getByRole('textbox').fill('The only card')
  await page.getByRole('dialog').getByRole('button', { name: 'Создать карточку', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(statusColumn(page, 'Two').locator('.add-card-header')).toBeFocused()
  await expectHeaderOnly()
  await page.getByRole('button', { name: 'Действия карточки The only card' }).click()
  await page.getByRole('menuitem', { name: 'Удалить' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.locator('.work-card')).toHaveCount(0)
  await expectHeaderOnly()
})

for (const [width, height] of [[390, 844], [320, 568], [1280, 800], [1440, 900], [568, 320]]) test(`the whole board scrolls in one workspace with sticky status headers at ${width}x${height}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Doing', cards: 25 }, { name: 'Short', cards: 1 }, { name: 'Done', cards: 0 }])
  const start = await boardGeometry(page)
  expect(start.documentScrolls).toBe(false); expect(start.scrollY).toBe(0); expect(start.barTop).toBe(0)
  // No list or grid scrolls on its own; the workspace is the only scroller.
  expect(await page.locator('.card-list').evaluateAll(lists => lists.every(list => getComputedStyle(list).overflowY === 'visible'))).toBe(true)
  expect(await page.locator('.status-columns').evaluate(element => getComputedStyle(element).overflowX)).toBe('visible')
  const state = await scrollState(page)
  expect(state.maxTop).toBeGreaterThan(0)
  expect(state.maxLeft > 0).toBe(width < 1280)
  // Every status, short or empty, is as tall as the longest one.
  expect(Math.max(...start.columns.map(column => column.height)) - Math.min(...start.columns.map(column => column.height))).toBeLessThan(1)
  // Headers are opaque and keep a constant rule below them.
  const style = await page.locator('.column-header').first().evaluate(element => { const computed = getComputedStyle(element); return { position: computed.position, color: computed.backgroundColor, image: computed.backgroundImage, border: computed.borderBottomWidth } })
  expect(style).toEqual({ position: 'sticky', color: 'rgb(245, 244, 240)', image: expect.stringContaining('linear-gradient'), border: '1px' })

  // Scrolling moves every status together; all headers stick under the bar while the document stays put.
  await scroller(page).evaluate(element => { element.scrollTop = element.scrollHeight })
  const bottom = await boardGeometry(page)
  expect(bottom.documentScrolls).toBe(false); expect(bottom.scrollY).toBe(0); expect(bottom.barTop).toBe(0)
  for (const header of bottom.headers) expect(Math.abs(header.top - bottom.scroller.top)).toBeLessThan(1)
  expect(Math.abs(bottom.scroller.top - bottom.barBottom)).toBeLessThan(1)
  for (const column of bottom.columns) expect(column.bottom).toBeLessThanOrEqual(bottom.scroller.bottom + 1)
  await expect(statusColumn(page, 'Todo').locator('.work-card').last()).toBeInViewport()
  if (width >= 1280) await expect(statusColumn(page, 'Short').locator('.column-header')).toBeInViewport()
  // Cards that passed under a header are hidden by it, not painted over it.
  const covered = await page.evaluate(() => {
    const header = document.querySelector('.status-column .column-header')!.getBoundingClientRect()
    const target = document.elementFromPoint(header.left + header.width / 2, header.bottom - 4)
    return !!target?.closest('.column-header')
  })
  expect(covered).toBe(true)
  // The plus and the status menu in a stuck header stay operable.
  await statusColumn(page, 'Short').getByRole('button', { name: 'Действия статуса Short', exact: true }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.screenshot({ path: testInfo.outputPath(`unified-board-${width}x${height}.png`), fullPage: false })

  // On narrow screens the same scroller reaches the last status horizontally, and its header is still stuck.
  if (width < 1280) {
    await scroller(page).evaluate(element => { element.scrollLeft = element.scrollWidth })
    await expect.poll(async () => (await scrollState(page)).left).toBeGreaterThan(0)
    await expect(statusColumn(page, 'Done').locator('.add-card-header')).toBeInViewport()
    const sideways = await boardGeometry(page)
    expect(Math.abs(sideways.headers.at(-1)!.top - sideways.scroller.top)).toBeLessThan(1)
    expect(sideways.documentScrolls).toBe(false)
    await page.screenshot({ path: testInfo.outputPath(`unified-board-sideways-${width}x${height}.png`), fullPage: false })
  }
  // A smaller viewport (for example a mobile browser bar) keeps the document unscrolled.
  await page.setViewportSize({ width, height: height - 120 })
  await expect.poll(async () => (await boardGeometry(page)).documentScrolls).toBe(false)
})

test('a short board stretches its statuses to the workspace bottom without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seedBoard(page, [{ name: 'Todo', cards: 1 }, { name: 'Done', cards: 0 }])
  const geometry = await boardGeometry(page), state = await scrollState(page)
  expect(state.maxTop).toBe(0)
  const padding = await scroller(page).evaluate(element => parseFloat(getComputedStyle(element).paddingBottom) + parseFloat(getComputedStyle(element.querySelector('.status-columns')!).paddingBottom))
  for (const column of geometry.columns) expect(Math.abs(column.bottom - (geometry.scroller.bottom - padding))).toBeLessThan(2)
})

for (const [width, height] of [[320, 568], [1440, 900]]) test(`keyboard focus is never hidden under a status header at ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Done — длинное название статуса, которое переносится на несколько строк', cards: 2 }])
  const unobscured = () => page.evaluate(() => {
    const focused = document.activeElement!.getBoundingClientRect(), main = document.querySelector('[data-board-scroller]')!.getBoundingClientRect()
    const header = document.activeElement!.closest('.status-column')!.querySelector('.column-header')!.getBoundingClientRect()
    return focused.top >= header.bottom - 1 && focused.bottom <= main.bottom + 1
  })
  const card = (index: number) => statusColumn(page, 'Todo').locator('.work-card').nth(index).getByRole('link')
  // Upwards from the end of a long status.
  await scroller(page).evaluate(element => { element.scrollTop = element.scrollHeight })
  await card(20).evaluate(element => (element as HTMLElement).focus({ preventScroll: true }))
  for (let step = 0; step < 6; step++) { await page.keyboard.press('Shift+Tab'); expect(await unobscured()).toBe(true) }
  // Downwards from the top.
  await scroller(page).evaluate(element => { element.scrollTop = 0 })
  await card(0).focus()
  for (let step = 0; step < 24; step++) { await page.keyboard.press('Tab'); expect(await unobscured()).toBe(true) }
})

test('a card can be dropped into a scrolled board, the workspace autoscrolls and a header places at the visible top', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Target', cards: 30 }])
  const target = statusColumn(page, 'Target'), targetHeader = target.locator('.column-header')
  await scroller(page).evaluate(element => { element.scrollTop = 600 })
  // Drag the first Todo card that is fully visible below its stuck header.
  const sourceName = await page.evaluate(() => {
    const header = document.querySelector('.column-header')!.getBoundingClientRect()
    return Array.from(document.querySelector('.status-column')!.querySelectorAll('.work-card')).find(card => card.getBoundingClientRect().top >= header.bottom)!.querySelector('.card-detail-link')!.textContent!.trim()
  })
  const source = page.locator('.work-card').filter({ has: page.getByRole('link', { name: sourceName, exact: true }) })
  await expect(source).toBeInViewport()
  const sourceBox = (await source.boundingBox())!, main = (await scroller(page).boundingBox())!
  await page.mouse.move(sourceBox.x + 25, sourceBox.y + 25); await page.mouse.down()
  await page.mouse.move(sourceBox.x + 40, sourceBox.y + 25, { steps: 3 })
  const targetBox = (await target.boundingBox())!
  await page.mouse.move(targetBox.x + 60, main.y + main.height / 2, { steps: 15 })
  await expect(page.locator('.card-placement-marker')).toBeVisible()
  // Holding near the lower edge scrolls the whole workspace.
  const before = (await scrollState(page)).top
  await page.mouse.move(targetBox.x + 60, main.y + main.height - 6, { steps: 5 })
  await expect.poll(async () => (await scrollState(page)).top, { timeout: 5000 }).toBeGreaterThan(before)
  // Over the sticky header the marker sits at the top of the visible list, never among the hidden cards, and the workspace scrolls up.
  const headerBox = (await targetHeader.boundingBox())!
  const atHeader = (await scrollState(page)).top
  await page.mouse.move(targetBox.x + 60, headerBox.y + headerBox.height / 2, { steps: 8 })
  await expect.poll(async () => (await scrollState(page)).top, { timeout: 5000 }).toBeLessThan(atHeader)
  const markerVisible = () => page.evaluate(() => {
    const marker = document.querySelector('.card-placement-marker')!.getBoundingClientRect()
    const header = document.querySelector('.card-placement-marker')!.closest('.status-column')!.querySelector('.column-header')!.getBoundingClientRect()
    return marker.top >= header.bottom - 1
  })
  expect(await markerVisible()).toBe(true)
  await page.mouse.move(targetBox.x + 60, main.y + main.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(target.getByRole('link', { name: sourceName, exact: true })).toHaveCount(1)
  await expect(statusColumn(page, 'Todo').getByRole('link', { name: sourceName, exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

for (const width of [390, 1440]) test(`board menus close once their trigger is hidden by scrolling at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Doing', cards: 4 }, { name: 'Review', cards: 2 }, { name: 'Done', cards: 2 }])
  const trigger = (name: string) => page.getByRole('button', { name: `Действия карточки ${name}`, exact: true })
  // A visible trigger keeps its menu open next to it while the board scrolls a little.
  await trigger('Todo card 5').click()
  await expect(page.getByRole('menu')).toBeVisible()
  await scroller(page).evaluate(element => { element.scrollTop += 40 })
  await expect(page.getByRole('menu')).toBeVisible()
  const near = await page.evaluate(() => { const menu = document.querySelector('[role="menu"]')!.getBoundingClientRect(), button = document.querySelector('[aria-expanded="true"]')!.getBoundingClientRect(); return Math.abs(menu.top - Math.max(8, Math.min(innerHeight - menu.height - 8, button.bottom + 6))) < 2 })
  expect(near).toBe(true)
  // Scrolling the trigger under the sticky status header closes the menu.
  const offset = await page.evaluate(() => {
    const button = document.querySelector('[aria-expanded="true"]')!.getBoundingClientRect()
    const header = document.querySelector('[aria-expanded="true"]')!.closest('.status-column')!.querySelector('.column-header')!.getBoundingClientRect()
    return button.top - header.bottom + button.height
  })
  await scroller(page).evaluate((element, offset) => { element.scrollTop += offset }, offset)
  await expect(page.getByRole('menu')).toBeHidden()
  if (width < 1280) {
    // Scrolling a status menu trigger out of the workspace sideways closes it too.
    await scroller(page).evaluate(element => { element.scrollTop = 0; element.scrollLeft = 0 })
    await page.getByRole('button', { name: 'Действия статуса Todo', exact: true }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    await scroller(page).evaluate(element => { element.scrollLeft = element.scrollWidth })
    await expect(page.getByRole('menu')).toBeHidden()
  }
})

for (const width of [1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`column boundaries and list starts hold beside the card panel with expanded note previews in ${language} at ${width}px`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/tracker/')
    await expect(page.getByRole('button', { name: 'Создать проект', exact: true })).toBeVisible()
    if (en) { await page.getByRole('button', { name: 'Настройки', exact: true }).click(); await page.getByRole('combobox', { name: 'Язык приложения' }).selectOption('en'); await page.keyboard.press('Escape') }
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('personal-project-tracker'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['projects', 'statuses', 'cards', 'notes'], 'readwrite')
        tx.objectStore('projects').put({ id: 'cols', name: 'Columns', createdAt: '2026-11-04T00:00:00Z' })
        const names = ['Todo', 'Doing', 'Review', 'Решение — длинное название статуса с несколькими дополнительными словами для проверки четырёх строк и выравнивания карточек']
        names.forEach((name, index) => tx.objectStore('statuses').put({ id: `s${index}`, projectId: 'cols', name, position: index }))
        for (let index = 0; index < 3; index++) tx.objectStore('cards').put({ id: `c${index}`, statusId: 's0', name: `Card ${index}`, description: index === 0 ? 'Описание '.repeat(40) : '', important: false, urgent: false, position: index })
        tx.objectStore('cards').put({ id: 'c3', statusId: 's1', name: 'Other', description: '', important: false, urgent: false, position: 0 })
        for (let n = 1; n <= 6; n++) tx.objectStore('notes').put({ id: `n${n}`, cardId: 'c0', text: `Note ${n} https://example.com/${'long-path-'.repeat(12)}\nsecond\nthird\nfourth`, createdAt: `2026-11-02T00:00:0${n}.000Z` })
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
      })
      db.close()
    })
    await page.goto('/tracker/#project/cols')
    await page.reload()
    const toggle = page.locator('.work-card').first().locator('.card-notes-toggle')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const measure = () => page.locator('.status-columns').evaluate(board => {
      const columns = Array.from(board.querySelectorAll('.status-column'))
      const main = board.closest('main')!
      return {
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        columns: columns.length,
        listStarts: columns.map(column => column.querySelector('.card-list')!.getBoundingClientRect().top),
        borders: columns.map(column => getComputedStyle(column).borderTopWidth),
        widths: columns.map(column => column.getBoundingClientRect().width),
        scrollsX: board.scrollWidth > board.clientWidth || main.scrollWidth > main.clientWidth,
        mainRight: main.getBoundingClientRect().right,
        boardClipped: getComputedStyle(main).overflowX === 'auto',
      }
    })
    const check = (state: Awaited<ReturnType<typeof measure>>) => {
      expect(state.pageOverflow).toBe(false)
      expect(state.columns).toBe(4)
      expect(Math.max(...state.listStarts) - Math.min(...state.listStarts)).toBeLessThan(1)
      expect(state.borders.every(border => border === '1px')).toBe(true)
      expect(Math.min(...state.widths)).toBeGreaterThanOrEqual(260)
    }
    const closed = await measure(); check(closed)
    await page.getByRole('link', { name: 'Card 1', exact: true }).click()
    const panel = page.locator('.card-panel')
    await expect(panel).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const open = await measure(); check(open)
    expect(open.mainRight).toBeLessThanOrEqual((await panel.boundingBox())!.x + 1)
    expect(open.boardClipped).toBe(true)
    // The narrowed board scrolls horizontally instead of squeezing columns, and the last column is reachable.
    expect(open.scrollsX).toBe(true)
    await page.locator('.status-column').last().scrollIntoViewIfNeeded()
    await expect(page.locator('.status-column').last().locator('.add-card-header')).toBeVisible()
    check(await measure())
    await page.screenshot({ path: testInfo.outputPath(`panel-columns-${language}-${width}.png`) })
  })
}

for (const count of [2, 3]) test(`${count} statuses sit together at the left with the design gap at 1440px`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tracker/')
  await expect(page.getByRole('button', { name: 'Создать проект', exact: true })).toBeVisible()
  await page.evaluate(async count => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('personal-project-tracker'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'statuses'], 'readwrite')
      tx.objectStore('projects').put({ id: 'gap', name: 'Gap', createdAt: '2026-11-04T00:00:00Z' })
      for (let index = 0; index < count; index++) tx.objectStore('statuses').put({ id: `s${index}`, projectId: 'gap', name: `Status ${index}`, position: index })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, count)
  await page.goto('/tracker/#project/gap')
  await page.reload()
  const geometry = await page.locator('.status-columns').evaluate(board => {
    const boxes = Array.from(board.querySelectorAll('.status-column')).map(column => column.getBoundingClientRect())
    return { boxes: boxes.map(box => ({ left: box.left, right: box.right, width: box.width })), gap: parseFloat(getComputedStyle(board).columnGap), boardLeft: board.getBoundingClientRect().left, padding: parseFloat(getComputedStyle(board).paddingLeft) }
  })
  expect(geometry.boxes).toHaveLength(count)
  expect(Math.abs(geometry.boxes[0].left - geometry.boardLeft - geometry.padding)).toBeLessThan(1)
  for (let index = 1; index < count; index++) expect(Math.abs(geometry.boxes[index].left - geometry.boxes[index - 1].right - geometry.gap)).toBeLessThanOrEqual(1)
  for (const box of geometry.boxes) expect(box.width).toBeLessThanOrEqual(24 * 16 + 1)
})

/** Fails the next write or read of one object store once, after the board has loaded. */
const failOnce = (page: Page, store: string, method: 'put' | 'get') => page.evaluate(({ store, method }) => {
  const original = IDBObjectStore.prototype[method]
  let fail = true
  IDBObjectStore.prototype[method] = function (this: IDBObjectStore, ...args: unknown[]) {
    if (this.name === store && fail) { fail = false; throw new DOMException('Injected failure', 'UnknownError') }
    return (original as (...args: unknown[]) => IDBRequest).apply(this, args)
  } as never
}, { store, method })
const alertStrip = (page: Page) => page.evaluate(() => {
  const strip = document.querySelector('.board-alerts')!.getBoundingClientRect(), bar = document.querySelector('.app-bar')!.getBoundingClientRect(), main = document.querySelector('[data-board-scroller]')!.getBoundingClientRect()
  return { belowBar: Math.abs(strip.top - bar.bottom) < 1, aboveBoard: strip.bottom <= main.top + 1, inside: strip.left >= 0 && strip.right <= innerWidth && strip.bottom <= innerHeight, outsideScroller: !document.querySelector('[data-board-scroller] [role="alert"]'), pageFits: document.documentElement.scrollWidth <= innerWidth }
})

test('a save error appears under the bar while the board is scrolled down', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Done', cards: 2 }])
  await scroller(page).evaluate(element => { element.scrollTop = element.scrollHeight })
  await failOnce(page, 'cards', 'put')
  await page.getByRole('button', { name: 'Действия карточки Todo card 28', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Опустить ниже', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить изменения')
  await expect(page.getByRole('alert')).toBeInViewport()
  expect(await alertStrip(page)).toEqual({ belowBar: true, aboveBoard: true, inside: true, outsideScroller: true, pageFits: true })
})

test('a refresh error stays whole on a sideways-scrolled narrow board and leaves the scroll position on retry', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Doing', cards: 2 }, { name: 'Done', cards: 12 }])
  await scroller(page).evaluate(element => { element.scrollTop = 200; element.scrollLeft = element.scrollWidth })
  await expect(page.getByRole('button', { name: 'Действия карточки Done card 6', exact: true })).toBeInViewport()
  const before = await scrollState(page)
  await failOnce(page, 'projects', 'get')
  await page.getByRole('button', { name: 'Действия карточки Done card 6', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Опустить ниже', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Расположение сохранено, но не удалось обновить доску')
  const retry = page.getByRole('button', { name: 'Обновить доску', exact: true })
  await expect(retry).toBeInViewport({ ratio: 1 })
  expect(await alertStrip(page)).toEqual({ belowBar: true, aboveBoard: true, inside: true, outsideScroller: true, pageFits: true })
  await page.screenshot({ path: testInfo.outputPath('board-alert-390.png'), fullPage: false })
  await retry.click()
  await expect(page.getByRole('alert')).toBeHidden()
  await expect(page.locator('.board-alerts')).toHaveCount(0)
  const after = await scrollState(page)
  expect(Math.abs(after.top - before.top)).toBeLessThan(1)
  expect(Math.abs(after.left - before.left)).toBeLessThan(1)
})

test('a narrow board keeps both scroll offsets around an opened, expanded and closed card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedBoard(page, [{ name: 'Todo', cards: 30 }, { name: 'Doing', cards: 25 }, { name: 'Done', cards: 3 }])
  await scroller(page).evaluate(element => { element.scrollLeft = element.querySelectorAll('.status-column')[1].getBoundingClientRect().left - element.getBoundingClientRect().left; element.scrollTop = 900 })
  await expect.poll(async () => (await scrollState(page)).left).toBeGreaterThan(100)
  const name = await page.evaluate(() => {
    const column = document.querySelectorAll('.status-column')[1], header = column.querySelector('.column-header')!.getBoundingClientRect()
    return Array.from(column.querySelectorAll('.card-detail-link')).find(link => link.getBoundingClientRect().top >= header.bottom)!.textContent!.trim()
  })
  const before = await scrollState(page)
  const expectSame = async () => { const now = await scrollState(page); expect(Math.abs(now.top - before.top)).toBeLessThan(1); expect(Math.abs(now.left - before.left)).toBeLessThan(1) }
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page.locator('.card-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Открыть на всю страницу', exact: true }).click()
  await expect(page.locator('.board-workspace')).toBeHidden()
  await page.goBack(); await expect(page.locator('.card-panel')).toBeVisible()
  await page.goBack(); await expect(page.locator('.card-panel')).toHaveCount(0)
  await expectSame()
  // The explicit return from the expanded page restores the same position.
  await page.getByRole('link', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Открыть на всю страницу', exact: true }).click()
  await expect(page.locator('.board-workspace')).toBeHidden()
  await page.getByRole('button', { name: 'Назад к доске', exact: true }).click()
  await expect(page.locator('.board-workspace')).toBeVisible()
  await expectSame()
})
