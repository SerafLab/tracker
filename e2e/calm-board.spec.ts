import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`calm board keeps four columns and reachable controls in ${language} at ${width}px`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await page.goto('/tracker/')
    if (en) { await page.getByRole('button', {name: 'Настройки'}).click(); await page.getByRole('combobox').selectOption('en'); await page.keyboard.press('Escape') }
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
      await first.locator(index % 2 === 0 ? '.add-card-header' : '.add-card').click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('textbox')).toBeFocused()
      await dialog.getByRole('textbox').fill(names[index])
      if (index < 2) await dialog.getByRole('checkbox', { name: en ? 'Important' : 'Важная' }).check()
      if (index === 0 || index === 2) await dialog.getByRole('checkbox', { name: en ? 'Urgent' : 'Срочная' }).check()
      await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(first.locator(index % 2 === 0 ? '.add-card-header' : '.add-card')).toBeFocused()
    }
    for (const column of [first, page.locator('.status-column').last()]) {
      const header = column.locator('.add-card-header')
      await header.hover()
      await expect(header).toHaveAccessibleName(en ? 'Add card' : 'Добавить карточку')
      const tooltip = await header.evaluate(element => {
        const hint = getComputedStyle(element, '::after')
        const button = element.getBoundingClientRect()
        const scroller = element.closest('.status-columns')!.getBoundingClientRect()
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
      const cards = Array.from(first.querySelectorAll('.work-card'))
      const create = first.querySelector('.add-card')!
      return {
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        boardOverflow: element.scrollWidth > element.clientWidth,
        widths: columns.map(column => column.getBoundingClientRect().width),
        boundedColumns: columns.every(column => getComputedStyle(column).borderTopWidth === '1px'),
        listStarts: columns.map(column => column.querySelector('.card-list')!.getBoundingClientRect().top),
        longestLines: Math.max(...columns.map(column => { const title = column.querySelector('.column-title')!; return title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight) })),
        createAfterCards: create.getBoundingClientRect().top >= cards.at(-1)!.getBoundingClientRect().bottom,
        headingsClear: columns.every(column => {
          const title = column.querySelector('.column-heading')!.getBoundingClientRect()
          const plus = column.querySelector('.add-card-header')!.getBoundingClientRect()
          const menu = column.querySelector('.column-header .menu')!.getBoundingClientRect()
          return title.right <= plus.left && plus.right <= menu.left
        }),
        headerBeforeMenu: first.querySelector('.add-card-header')!.nextElementSibling?.classList.contains('menu'),
        plusStyles: [document.querySelector('.app-bar .button-primary')!, first.querySelector('.add-card-header')!, first.querySelector('.add-card-symbol')!].map(element => {
          const style = getComputedStyle(element), box = element.getBoundingClientRect()
          return { width: box.width, height: box.height, background: style.backgroundColor, radius: style.borderRadius, svg: element.querySelector('path')!.getAttribute('d') }
        }),
        footerStops: first.querySelector('.add-card')!.querySelectorAll('button, a, [tabindex]').length,
        targets: Array.from(first.querySelectorAll('button')).map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      }
    })
    expect(geometry.headingsClear).toBe(true)
    expect(geometry.headerBeforeMenu).toBe(true)
    expect(geometry.footerStops).toBe(0)
    expect(geometry.plusStyles[0]).toEqual(geometry.plusStyles[1])
    expect(geometry.plusStyles[0]).toEqual(geometry.plusStyles[2])
    expect(geometry.plusStyles[0].width).toBe(44)
    expect(geometry.plusStyles[0].height).toBe(44)
    expect(geometry.pageOverflow).toBe(false)
    expect(geometry.boardOverflow).toBe(width < 1280)
    expect(geometry.widths).toHaveLength(4)
    expect(Math.min(...geometry.widths)).toBeGreaterThanOrEqual(260)
    expect(geometry.boundedColumns).toBe(true)
    expect(geometry.longestLines).toBeGreaterThanOrEqual(4)
    expect(Math.max(...geometry.listStarts) - Math.min(...geometry.listStarts)).toBeLessThan(1)
    expect(geometry.createAfterCards).toBe(true)
    for (const target of geometry.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44) }
    await page.getByRole('button', {name: en ? 'Settings' : 'Настройки'}).click()
    const locale = page.getByRole('combobox', { name: en ? 'Application language' : 'Язык приложения' })
    await expect(locale).toHaveCount(1)
    await expect(locale.locator('option')).toHaveText(['RU', 'EN'])
    await page.keyboard.press('Escape')
    await expect(first.locator('.card-badge')).toHaveCount(4)
    if (width < 1280) {
      expect(await page.locator('.install-help').evaluate(element => getComputedStyle(element).position)).toBe('static')
      expect(await page.locator('.install-help').evaluate(element => element.closest('main') !== null && element.getBoundingClientRect().top >= document.querySelector('.status-columns')!.getBoundingClientRect().bottom)).toBe(true)
    }
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
    await page.screenshot({ path: testInfo.outputPath(`calm-${language}-${width}.png`), fullPage: true })

    // A lower card menu must escape the horizontal scroller, remain inside the
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

    // The last column's empty list still has a creation entry below it.
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
      board: element.scrollWidth > element.clientWidth,
      readable: Array.from(element.children).every(column => column.getBoundingClientRect().width >= 260 && column.scrollWidth <= column.clientWidth),
    }))
    expect(overflow).toEqual({ page: false, board: true, readable: true })

    if (width === 320) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('button', { name: en ? 'Settings' : 'Настройки', exact: true }).click()
      await expect(page.getByRole('region', {name: en ? 'Settings' : 'Настройки'})).toBeVisible()
      await page.locator('.board-workspace > main').evaluate(element => { element.scrollTop = 250 })
      await expect.poll(() => page.locator('.board-workspace > main').evaluate(element => element.scrollTop)).toBeGreaterThan(100)
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

for (const language of ['ru', 'en'] as const) {
  test(`creation entries preserve keyboard focus at the end of a long list in ${language}`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tracker/')
    if (en) { await page.getByRole('button', { name: 'Настройки' }).click(); await page.getByRole('combobox').selectOption('en'); await page.keyboard.press('Escape') }
    await page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('Long list')
    await page.getByRole('dialog').getByRole('combobox', { name: en ? 'Status set' : 'Набор статусов' }).selectOption('empty')
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
    await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('Todo')
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Todo', exact: true })).toBeVisible()
    const column = page.locator('.status-column').filter({ has: page.getByRole('heading', { name: 'Todo', exact: true }) })
    for (let index = 0; index < 14; index++) {
      await column.locator('.add-card').click()
      await page.getByRole('dialog').getByRole('textbox').fill(`Card ${index + 1}`)
      await page.getByRole('dialog').getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    for (const entry of ['.add-card-header', '.add-card']) for (const key of ['Enter', 'Space']) {
      const trigger = column.locator(entry)
      await trigger.scrollIntoViewIfNeeded()
      await trigger.focus()
      const before = await page.evaluate(() => window.scrollY)
      await page.keyboard.press(key)
      await expect(page.getByRole('dialog').getByRole('textbox')).toBeFocused()
      if (entry === '.add-card' && key === 'Enter') {
        await page.getByRole('dialog').getByRole('textbox').fill('Created after reviewing the list')
        await page.getByRole('dialog').getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
      } else if (key === 'Enter') await page.getByRole('dialog').getByRole('button', { name: en ? 'Cancel' : 'Отмена' }).click()
      else await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
      await expect(trigger).toBeFocused()
      expect(Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(180)
      if (entry === '.add-card') {
        expect(await column.locator('.add-card-header').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(0)
        await page.screenshot({ path: testInfo.outputPath(`creation-long-list-${language}-${key}.png`), fullPage: false })
      }
    }
    await expect(column.locator('.work-card')).toHaveCount(15)
  })
}

for (const width of [1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`column boundaries and list starts hold beside the card panel with expanded note previews in ${language} at ${width}px`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/tracker/')
    await expect(page.getByRole('button', { name: 'Создать проект', exact: true })).toBeVisible()
    if (en) { await page.getByRole('button', { name: 'Настройки', exact: true }).click(); await page.getByRole('combobox').selectOption('en'); await page.keyboard.press('Escape') }
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
        boardClipped: board.getBoundingClientRect().right <= main.getBoundingClientRect().right + 1,
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
