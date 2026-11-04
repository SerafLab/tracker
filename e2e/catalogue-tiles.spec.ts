import { expect, test } from '@playwright/test'

for (const language of ['ru', 'en']) for (const width of [320, 390, 1280, 1440]) {
  test(`catalogue tiles show totals and adapt in ${language} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/tracker/')
    await expect(page.locator('.app-bar')).toBeVisible()
    await page.evaluate(async locale => {
      localStorage.setItem('easytrack.locale', locale)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('personal-project-tracker')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['projects', 'statuses', 'cards', 'workspace'], 'readwrite')
        transaction.objectStore('workspace').clear()
        for (let i = 0; i < 5; i++) {
          transaction.objectStore('projects').put({ id: `p${i}`, name: i === 0 ? 'ОченьДлинноеНазваниеПроектаБезПробелов'.repeat(3) : `Project ${i}`, createdAt: String(i) })
          transaction.objectStore('statuses').put({ id: `s${i}`, projectId: `p${i}`, name: 'Status', position: 0 })
          for (let n = 0; n < i; n++) transaction.objectStore('cards').put({ id: `c${i}-${n}`, statusId: `s${i}`, name: 'Card', position: n, description: '', important: false, urgent: false })
        }
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
      db.close()
    }, language)
    await page.reload()
    await expect(page.locator('.project-card')).toHaveCount(5)
    await expect(page.locator('.project-card').nth(0)).toContainText(language === 'ru' ? '0 карточек' : '0 cards')
    await expect(page.locator('.project-card').nth(1)).toContainText(language === 'ru' ? '1 карточка' : '1 card')
    await expect(page.locator('.project-card').nth(2)).toContainText(language === 'ru' ? '2 карточки' : '2 cards')
    const positions = await page.locator('.project-card').evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right } }))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 500) expect(positions[1].y).toBeGreaterThan(positions[0].y)
    else expect(positions[1].y).toBe(positions[0].y)
    await page.screenshot({ path: testInfo.outputPath(`catalogue-${language}-${width}.png`), fullPage: true })
    // The count is part of the tile's open surface; the menu remains independent.
    const count = await page.locator('.project-card').nth(2).locator('.project-card-count').boundingBox()
    expect(count).not.toBeNull()
    await page.mouse.click(count!.x + count!.width / 2, count!.y + count!.height / 2)
    await expect(page.locator('h1')).toHaveText('Project 2')
    await page.getByRole('button', { name: /^EasyTrack —/ }).click()
    await expect(page.locator('.project-card')).toHaveCount(5)
    await page.locator('.project-card').nth(2).getByRole('button', { name: language === 'ru' ? 'Действия проекта Project 2' : 'Project actions for Project 2' }).click()
    await expect(page.getByRole('menuitem', { name: language === 'ru' ? 'Удалить проект' : 'Delete project' })).toBeVisible()
    await expect(page.locator('h1')).not.toHaveText('Project 2')
  })
}
