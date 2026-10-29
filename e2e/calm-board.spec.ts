import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`calm board keeps four columns and reachable controls in ${language} at ${width}px`, async ({ page }, testInfo) => {
    const en = language === 'en'
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await page.goto('/tracker/')
    if (en) await page.getByRole('combobox').selectOption('en')
    await expect(page.getByRole('heading', { name: en ? 'Start with your first project' : 'Начните с первого проекта' })).toBeVisible()
    await page.getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('Поиск квартиры')
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create project' : 'Создать проект', exact: true }).click()
    await expect(page.getByRole('heading', { name: en ? 'Add your first status' : 'Добавьте первый статус' })).toBeVisible()
    for (const name of ['Найдено', 'Связаться', 'Просмотр', 'Решение']) {
      await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
      await page.getByRole('dialog').getByRole('textbox').fill(name)
      await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    const first = page.locator('.status-column').first()
    const names = ['Квартира у парка', 'Уточнить документы', 'Назначить просмотр', 'Сравнить варианты']
    for (let index = 0; index < names.length; index++) {
      await first.getByRole('button', { name: en ? 'Add card' : 'Добавить карточку', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('textbox')).toBeFocused()
      await dialog.getByRole('textbox').fill(names[index])
      if (index < 2) await dialog.getByRole('checkbox', { name: en ? 'Important' : 'Важная' }).check()
      if (index === 0 || index === 2) await dialog.getByRole('checkbox', { name: en ? 'Urgent' : 'Срочная' }).check()
      await dialog.getByRole('button', { name: en ? 'Create card' : 'Создать карточку', exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(first.getByRole('button', { name: en ? 'Add card' : 'Добавить карточку', exact: true })).toBeFocused()
    }
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
        openColumns: columns.every(column => getComputedStyle(column).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(column).borderTopWidth === '0px'),
        createAfterCards: create.getBoundingClientRect().top >= cards.at(-1)!.getBoundingClientRect().bottom,
        targets: Array.from(first.querySelectorAll('button')).map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      }
    })
    expect(geometry.pageOverflow).toBe(false)
    expect(geometry.boardOverflow).toBe(width < 1280)
    expect(geometry.widths).toHaveLength(4)
    expect(Math.min(...geometry.widths)).toBeGreaterThanOrEqual(260)
    expect(geometry.openColumns).toBe(true)
    expect(geometry.createAfterCards).toBe(true)
    for (const target of geometry.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44) }
    const locale = page.getByRole('combobox', { name: en ? 'Interface language' : 'Язык интерфейса' })
    await expect(locale).toHaveCount(1)
    await expect(locale.locator('option')).toHaveText(['RU', 'EN'])
    await expect(first.locator('.card-badge')).toHaveCount(4)
    if (width < 1280) {
      expect(await page.locator('.install-help').evaluate(element => getComputedStyle(element).position)).toBe('static')
      expect(await page.locator('.install-help').evaluate(element => element.getBoundingClientRect().top >= document.querySelector('main')!.getBoundingClientRect().bottom)).toBe(true)
    }
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
    await last.getByRole('button', { name: en ? 'Add card' : 'Добавить карточку', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('textbox')).toBeFocused()
    expect(await dialog.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.top >= 0 && bounds.bottom <= window.innerHeight
    })).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`calm-form-${language}-${width}.png`), fullPage: false })
    await page.keyboard.press('Escape')
    await expect(last.getByRole('button', { name: en ? 'Add card' : 'Добавить карточку', exact: true })).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const longStatus = 'ДлинноеНазваниеСтатусаБезПробелов'.repeat(4)
    await page.getByRole('button', { name: en ? 'Add status' : 'Добавить статус', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill(longStatus)
    await page.getByRole('dialog').getByRole('button', { name: en ? 'Create status' : 'Создать статус', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    const fifth = page.locator('.status-column').last()
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
      await page.getByRole('button', { name: en ? 'Project actions for Поиск квартиры' : 'Действия проекта Поиск квартиры', exact: true }).click()
      await expect(page.getByRole('menu')).toBeVisible()
      await page.keyboard.press('PageDown')
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
      await expect(page.getByRole('menu')).toBeHidden()
      // Reopening after the viewport change must still give a correctly placed menu.
      await page.getByRole('button', { name: en ? 'Project actions for Поиск квартиры' : 'Действия проекта Поиск квартиры', exact: true }).click()
      await expect(page.getByRole('menu')).toBeVisible()
      await page.keyboard.press('Escape')
    }
  })
}
