import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { edgeCasesBackup, TEXT } from '../src/test/backup-fixtures'
import { viewportFor } from './viewports'

const backup = edgeCasesBackup()
const projectId = (name: string) => backup.data.projects.find(project => project.name === name)!.id
const cardPath = (projectName: string, cardName: string) => {
  const statusIds = new Set(backup.data.statuses.filter(status => status.projectId === projectId(projectName)).map(status => status.id))
  const card = backup.data.cards.find(item => item.name === cardName && statusIds.has(item.statusId))!
  return `/tracker/#project/${projectId(projectName)}/card/${card.id}`
}

async function restoreEdgeCases(page: Page) {
  await page.goto('/tracker/')
  await expect(page.locator('.app-bar')).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Настройки' }).click()
  await page.getByRole('menuitem', { name: 'Восстановить из резервной копии', exact: true }).click()
  await (await chooser).setFiles({ name: 'edge-cases.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await page.getByRole('dialog', { name: 'Заменить данные резервной копией?' }).getByRole('button', { name: 'Заменить' }).click()
  await expect(page.locator('.notification-transient .toast')).toHaveText('Данные восстановлены из резервной копии')
  await expect(page.locator('.project-card')).toHaveCount(backup.data.projects.length)
}

/** Clipped text (ellipsis, line clamp) does not count; text spilling out of its box does. */
async function expectNoOverflow(page: Page, selectors: string[]) {
  const problems = await page.evaluate(selectors => {
    const found: string[] = []
    if (document.documentElement.scrollWidth > innerWidth) found.push(`page ${document.documentElement.scrollWidth} > ${innerWidth}`)
    for (const selector of selectors) for (const element of document.querySelectorAll(selector)) {
      if (element.scrollWidth > element.clientWidth + 1) found.push(`${selector} "${element.textContent?.slice(0, 40)}" ${element.scrollWidth} > ${element.clientWidth}`)
    }
    const heading = document.querySelector('h1')
    if (heading) {
      const range = document.createRange()
      range.selectNodeContents(heading)
      const lines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size
      if (lines > 1) found.push(`h1 takes ${lines} lines`)
    }
    return found
  }, selectors)
  expect(problems).toEqual([])
}

async function shot(page: Page, info: TestInfo, name: string, width: number) {
  await page.screenshot({ path: info.outputPath(`${name}-${width}.png`) })
}

for (const width of [320, 1280]) test.describe(`edge-case backup at ${width}px`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(viewportFor(width))
    await restoreEdgeCases(page)
  })

  test('catalogue and boards keep long texts inside their boxes', async ({ page }, info) => {
    await expectNoOverflow(page, ['.project-card'])
    await shot(page, info, 'catalogue', width)

    for (const [name, file] of [['01 Длинные тексты везде', 'board-texts'], ['02 Пятнадцать колонок', 'board-columns'], [TEXT.wordRu, 'board-long-name']]) {
      await page.goto(`/tracker/#project/${projectId(name)}`)
      await expect(page.locator('.status-column')).toHaveCount(backup.data.statuses.filter(status => status.projectId === projectId(name)).length)
      await expectNoOverflow(page, ['.status-column', '.column-header', '.work-card'])
      await shot(page, info, file, width)
    }
    // Fifteen columns are reachable by scrolling the board, not the page.
    await page.goto(`/tracker/#project/${projectId('02 Пятнадцать колонок')}`)
    await expect(page.locator('.status-column')).toHaveCount(15)
    const scroller = await page.locator('.status-column').last().evaluate(column => {
      for (let element = column.parentElement; element && element !== document.documentElement; element = element.parentElement) {
        if (['auto', 'scroll'].includes(getComputedStyle(element).overflowX) && element.scrollWidth > element.clientWidth) return element.className
      }
      return null
    })
    expect(scroller).not.toBeNull()
  })

  test('card pages keep long descriptions and many notes inside their boxes', async ({ page }, info) => {
    for (const [projectName, cardName, notes, file] of [
      ['04 Заметки и даты', '200 заметок', 200, 'card-200-notes'],
      ['01 Длинные тексты везде', 'Описание на много абзацев', 1, 'card-long-description'],
      ['01 Длинные тексты везде', TEXT.wordRu, 1, 'card-long-word'],
    ] as const) {
      await page.goto(cardPath(projectName, cardName))
      await page.reload()
      await expect(page.locator('.note-list .note')).toHaveCount(notes)
      await expectNoOverflow(page, ['.card-detail', '.note'])
      await shot(page, info, file, width)
    }
  })
})
