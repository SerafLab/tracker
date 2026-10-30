import { expect, test } from '@playwright/test'

for (const width of [320, 1280]) for (const language of ['ru', 'en'] as const) {
  test(`persists card groups, stable order and keyboard focus in ${language} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/tracker/')
    if (language === 'en') { await page.getByRole('button', {name: 'Настройки'}).click(); await page.getByRole('combobox', { name: 'Язык приложения' }).selectOption('en'); await page.keyboard.press('Escape') }
    const en = language === 'en'
    const label = { project: en ? 'Project name' : 'Название проекта', createProject: en ? 'Create project' : 'Создать проект', addStatus: en ? 'Add status' : 'Добавить статус', status: en ? 'Status name' : 'Название статуса', createStatus: en ? 'Create status' : 'Создать статус', addCard: en ? 'Add card' : 'Добавить карточку', name: en ? 'Card name' : 'Название карточки', create: en ? 'Create card' : 'Создать карточку', important: en ? 'Important' : 'Важная', urgent: en ? 'Urgent' : 'Срочная', edit: en ? 'Edit' : 'Редактировать', save: en ? 'Save' : 'Сохранить' }
    await page.getByRole('button', { name: label.createProject, exact: true }).click()
    await page.getByLabel(label.project, { exact: true }).fill('Priority')
    await page.getByRole('button', { name: label.createProject, exact: true }).click()
    for (const name of ['Todo', 'Doing', 'Done']) {
      await page.getByRole('button', { name: label.addStatus, exact: true }).first().click()
      await page.getByLabel(label.status).fill(name)
      await page.getByRole('button', { name: label.createStatus, exact: true }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    const first = page.locator('.status-column').nth(0)
    for (const [name, important, urgent] of [['None', false, false], ['Urgent', false, true], ['Important', true, false], ['Both', true, true], ['Peer', true, true]] as const) {
      const create = first.getByRole('button', { name: label.addCard, exact: true })
      await create.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByLabel(label.name)).toBeFocused()
      await expect(dialog.getByLabel(label.important, { exact: true })).not.toBeChecked()
      await expect(dialog.getByLabel(label.urgent, { exact: true })).not.toBeChecked()
      await dialog.getByLabel(label.name).fill(name)
      if (important) { await dialog.getByLabel(label.important, { exact: true }).focus(); await page.keyboard.press('Space') }
      if (urgent) { await dialog.getByLabel(label.urgent, { exact: true }).focus(); await page.keyboard.press('Space') }
      if (width === 320 && language === 'ru' && name === 'Peer') await page.screenshot({ path: testInfo.outputPath('card-priority-form-320.png'), fullPage: true })
      await dialog.getByRole('button', { name: label.create, exact: true }).click()
      await expect(dialog).toBeHidden(); await expect(create).toBeFocused()
    }
    const names = first.locator('.card-name')
    await expect(names).toHaveText(['Both', 'Peer', 'Important', 'Urgent', 'None'])
    if (width === 1280 && language === 'ru') await page.screenshot({ path: testInfo.outputPath('card-priority-board-1280.png'), fullPage: true })
    const findCard = (name: string) => page.locator('.work-card').filter({ has: page.locator('.card-name', { hasText: new RegExp(`^${name}$`) }) })
    const badgeCount = [2, 2, 1, 1, 0]
    for (let index = 0; index < badgeCount.length; index++) await expect(first.locator('.work-card').nth(index).locator('.card-badge')).toHaveCount(badgeCount[index])
    const edit = async (name: string, nextName: string, toggle = false) => {
      await findCard(name).getByRole('button', { name: en ? `Card actions for ${name}` : `Действия карточки ${name}`, exact: true }).click()
      await page.getByRole('menuitem', { name: label.edit, exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByLabel(label.name)).toBeFocused()
      await dialog.getByLabel(label.name).fill(nextName)
      if (toggle) await dialog.getByLabel(label.urgent, { exact: true }).uncheck()
      await dialog.getByRole('button', { name: label.save, exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(findCard(nextName).getByRole('button', { name: en ? `Card actions for ${nextName}` : `Действия карточки ${nextName}`, exact: true })).toBeFocused()
    }
    await edit('Both', 'Changed', true)
    await expect(names).toHaveText(['Peer', 'Important', 'Changed', 'Urgent', 'None'])
    await edit('Important', 'Renamed')
    await expect(names).toHaveText(['Peer', 'Renamed', 'Changed', 'Urgent', 'None'])
    const changed = findCard('Changed')
    await changed.getByRole('button', { name: en ? 'Move right to “Doing”' : 'Переместить вправо в «Doing»', exact: true }).focus()
    const scroll = await page.locator('.status-columns').evaluate(element => element.scrollLeft)
    await page.keyboard.press('Enter')
    await expect(changed.getByRole('button', { name: en ? 'Move right to “Done”' : 'Переместить вправо в «Done»', exact: true })).toBeFocused()
    expect(await page.locator('.status-columns').evaluate(element => element.scrollLeft)).toBe(scroll)
    await changed.getByRole('button', { name: en ? 'Card actions for Changed' : 'Действия карточки Changed', exact: true }).click()
    await page.getByRole('menuitem', { name: en ? 'Move to…' : 'Переместить в…', exact: true }).click()
    const moving = page.getByRole('dialog')
    await moving.getByRole('combobox').first().selectOption({ label: 'Todo' })
    await moving.getByRole('button', { name: en ? 'Move' : 'Переместить', exact: true }).click()
    await expect(moving).toBeHidden()
    await expect(names).toHaveText(['Peer', 'Renamed', 'Changed', 'Urgent', 'None'])
    await expect(changed.locator('.card-badge')).toHaveText([label.important])
    const bounds = await changed.evaluate(element => ({ fits: element.scrollWidth <= element.clientWidth, badges: Array.from(element.querySelectorAll('.card-badge')).every(badge => badge.getBoundingClientRect().width <= element.clientWidth) }))
    expect(bounds).toEqual({ fits: true, badges: true })
    await page.screenshot({ path: testInfo.outputPath(`card-priority-${language}-${width}.png`), fullPage: true })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Priority', exact: true })).toBeVisible()
    await expect(names).toHaveText(['Peer', 'Renamed', 'Changed', 'Urgent', 'None'])
    await expect(changed.locator('.card-badge')).toHaveText([label.important])
    await expect(changed.getByRole('button', { name: en ? 'Move left' : 'Переместить влево', exact: true })).toBeDisabled()
  })
}
