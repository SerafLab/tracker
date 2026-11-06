import { expect, test } from '@playwright/test'
import { selectLanguage } from './language'
import { viewportFor } from './viewports'

const sets = {
  ru: [
    ['simple', ['Нужно сделать', 'В процессе', 'Готово']],
    ['search', ['Найдено', 'На рассмотрении', 'В избранном', 'Не подходит']],
    ['documents', ['Подготовить', 'Отправлено', 'Ожидаю ответа', 'Завершено']],
    ['development', ['Запланировано', 'На паузе', 'В разработке', 'На проверке', 'Готово']],
    ['job-search', ['Интересно', 'Отклик отправлен', 'Собеседования', 'Предложение', 'Отказ']],
    ['empty', []],
  ],
  en: [
    ['simple', ['To do', 'In progress', 'Done']],
    ['search', ['Found', 'Under consideration', 'Shortlisted', 'Not suitable']],
    ['documents', ['To prepare', 'Submitted', 'Awaiting response', 'Completed']],
    ['development', ['Planned', 'On hold', 'In development', 'In review', 'Done']],
    ['job-search', ['Interested', 'Applied', 'Interviews', 'Offer', 'Rejected']],
    ['empty', []],
  ],
} as const

for (const language of ['ru', 'en'] as const) for (const [id, names] of sets[language]) {
  test(`creates, persists and isolates the ${language} ${id} status set`, async ({ page }) => {
    await page.addInitScript(language => localStorage.setItem('easytrack.locale', language), language)
    await page.goto('/tracker/')
    const createName = language === 'en' ? 'Create project' : 'Создать проект'
    await page.getByRole('banner').getByRole('button', { name: createName, exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('combobox')).toHaveValue('simple')
    await dialog.getByRole('textbox').fill(`Project ${id}`)
    if (id !== 'simple') await dialog.getByRole('combobox').selectOption(id)
    await expect(dialog.getByRole('listitem')).toHaveText([...names])
    await dialog.getByRole('button', { name: createName, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Project ${id}`)
    await expect(page.locator('.column-title')).toHaveText([...names])
    await expect(page.locator('.work-card')).toHaveCount(0)
    if (!names.length) await expect(page.getByRole('heading', { name: language === 'en' ? 'Add your first status' : 'Добавьте первый статус' })).toBeVisible()
    const projectUrl = page.url()
    await page.reload()
    await expect(page.locator('.column-title')).toHaveText([...names])
    await page.getByRole('button', { name: /^EasyTrack —/ }).click()
    await page.getByRole('banner').getByRole('button', { name: createName, exact: true }).click()
    await dialog.getByRole('textbox').fill('Independent')
    await dialog.getByRole('combobox').selectOption('empty')
    await dialog.getByRole('button', { name: createName, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Independent')
    await expect(page.locator('.column-title')).toHaveCount(0)
    await page.goto(projectUrl)
    await expect(page.locator('.column-title')).toHaveText([...names])
  })
}

test('preserves customized Russian names after switching language and creates new English names', async ({ page }) => {
  await page.goto('/tracker/')
  await page.getByRole('banner').getByRole('button', { name: 'Создать проект', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Русский проект')
  await page.getByRole('dialog').getByRole('button', { name: 'Создать проект', exact: true }).click()
  await page.locator('.status-column').first().getByRole('button', { name: /^Действия статуса/ }).click()
  await page.getByRole('menuitem', { name: 'Переименовать', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Мой первый статус')
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click()
  const originalUrl = page.url()
  await selectLanguage(page, 'en')
  await expect(page.locator('.column-title')).toHaveText(['Мой первый статус', 'В процессе', 'Готово'])
  await page.reload()
  await expect(page.locator('.column-title')).toHaveText(['Мой первый статус', 'В процессе', 'Готово'])
  await page.getByRole('button', { name: /^EasyTrack —/ }).click()
  await page.getByRole('banner').getByRole('button', { name: 'Create project', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('English project')
  await page.getByRole('dialog').getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(page.locator('.column-title')).toHaveText(['To do', 'In progress', 'Done'])
  await page.goto(originalUrl)
  await expect(page.locator('.column-title')).toHaveText(['Мой первый статус', 'В процессе', 'Готово'])
})

for (const width of [320, 390, 1280, 1440]) for (const language of ['ru', 'en'] as const) {
  test(`status-set form keeps keyboard, failure and five statuses usable in ${language} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewportFor(width))
    await page.addInitScript(language => {
      localStorage.setItem('easytrack.locale', language)
      const add = IDBObjectStore.prototype.add
      ;(window as unknown as { failPreset: boolean }).failPreset = true
      IDBObjectStore.prototype.add = function (...args) {
        if (this.name === 'statuses' && (window as unknown as { failPreset: boolean }).failPreset) throw Error('Test write unavailable')
        return add.apply(this, args)
      }
    }, language)
    await page.goto('/tracker/')
    const en = language === 'en', createName = en ? 'Create project' : 'Создать проект'
    const create = page.getByRole('banner').getByRole('button', { name: createName, exact: true })
    await create.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog'), input = dialog.getByRole('textbox')
    await expect(input).toBeFocused()
    await input.fill('ОченьДлинноеНазваниеПроектаБезПробелов'.repeat(3))
    await dialog.getByRole('combobox', { name: en ? 'Status set' : 'Набор статусов' }).selectOption('development')
    await page.screenshot({ path: testInfo.outputPath(`preset-form-${language}-${width}.png`) })
    for (let count = 0; count < 8; count++) {
      await page.keyboard.press(count % 2 ? 'Shift+Tab' : 'Tab')
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
    await create.click()
    await expect(dialog.getByRole('combobox')).toHaveValue('simple')
    await input.fill('ОченьДлинноеНазваниеПроектаБезПробелов'.repeat(3))
    await dialog.getByRole('combobox').selectOption('development')
    await dialog.getByRole('button', { name: createName, exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText(en ? 'Could not save changes' : 'Не удалось сохранить')
    await expect(dialog.getByRole('combobox')).toHaveValue('development')
    await expect(input).toHaveValue('ОченьДлинноеНазваниеПроектаБезПробелов'.repeat(3))
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`preset-failure-${language}-${width}.png`) })
    await page.evaluate(() => { (window as unknown as { failPreset: boolean }).failPreset = false })
    await dialog.getByRole('button', { name: createName, exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('.column-title')).toHaveText([...sets[language][3][1]])
    for (const status of await page.locator('.status-column').all()) {
      await status.scrollIntoViewIfNeeded()
      await expect(status.getByRole('heading')).toBeVisible()
      await expect(status.getByRole('button', { name: /^(Status actions|Действия статуса)/ })).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`preset-board-${language}-${width}.png`), fullPage: true })
  })
}
