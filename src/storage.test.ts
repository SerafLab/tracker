import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrackerDatabase, TrackerRepository } from './storage'

const databases: TrackerDatabase[] = []
function repository() { const db = new TrackerDatabase(`test-${crypto.randomUUID()}`); databases.push(db); return new TrackerRepository(db) }
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())) })

describe('TrackerRepository', () => {
  it('retains boards, order, and card transfers', async () => {
    const repo = repository(); await repo.open(); const project = await repo.createProject('Поиск квартиры')
    const found = await repo.createStatus(project.id, 'Найдено'); const viewing = await repo.createStatus(project.id, 'Просмотр')
    expect((await repo.board(project.id))?.statuses.map(status => status.name)).toEqual(['Найдено', 'Просмотр'])
    await repo.moveStatus(viewing.id, -1); const card = await repo.createCard(found.id, 'Квартира у парка'); await repo.moveCard(card.id, viewing.id)
    const board = await repo.board(project.id)
    expect(board?.statuses.map(status => status.name)).toEqual(['Просмотр', 'Найдено'])
    expect(board?.statuses[0].cards.map(item => item.name)).toEqual(['Квартира у парка'])
  })

  it('does not create a project when persistence fails', async () => {
    const db = new TrackerDatabase(`test-${crypto.randomUUID()}`); databases.push(db)
    const repo = new TrackerRepository(db); await repo.open()
    vi.spyOn(db.projects, 'add').mockRejectedValueOnce(new Error('quota exceeded'))
    await expect(repo.createProject('Поиск квартиры')).rejects.toThrow('quota exceeded')
    expect(await repo.projects()).toEqual([])
  })

  it('restores the last open project after reopening storage', async () => {
    const db = new TrackerDatabase(`test-${crypto.randomUUID()}`); databases.push(db)
    const first = new TrackerRepository(db); await first.open(); const project = await first.createProject('Паспорт')
    const second = new TrackerRepository(db); await second.open()
    expect((await second.preference())?.lastProjectId).toBe(project.id)
    expect((await second.board(project.id))?.name).toBe('Паспорт')
  })

  it('appends a transferred card and rejects a transfer across projects', async () => {
    const repo = repository(); await repo.open()
    const apartment = await repo.createProject('Поиск квартиры')
    const found = await repo.createStatus(apartment.id, 'Найдено')
    const viewing = await repo.createStatus(apartment.id, 'Просмотр')
    const moving = await repo.createCard(found.id, 'Квартира у парка')
    await repo.createCard(viewing.id, 'Квартира у моря')
    await repo.moveCard(moving.id, viewing.id)
    expect((await repo.board(apartment.id))?.statuses[1].cards.map(card => card.name)).toEqual(['Квартира у моря', 'Квартира у парка'])
    const passport = await repo.createProject('Паспорт')
    const documents = await repo.createStatus(passport.id, 'Документы')
    await expect(repo.moveCard(moving.id, documents.id)).rejects.toThrow('другой проект')
  })
})
