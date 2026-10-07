import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectBoardDatabase } from './database'
import { DexieProjectBoardRepository } from './dexie-project-board-repository'

const databases: ProjectBoardDatabase[] = []
function repository() {
  const database = new ProjectBoardDatabase(`indexeddb-${crypto.randomUUID()}`)
  databases.push(database)
  return { database, repository: new DexieProjectBoardRepository(database) }
}
afterEach(async () => { await Promise.all(databases.splice(0).map(database => database.delete())) })

describe('DexieProjectBoardRepository', () => {
  it('opens schema-v1-shaped data and preserves project and card ordering', async () => {
    const { database, repository: repo } = repository()
    await repo.open()
    await database.projects.add({ id: 'project', name: 'Поиск квартиры', createdAt: '2026-10-07T00:00:00.000Z' })
    await database.statuses.bulkAdd([
      { id: 'found', projectId: 'project', name: 'Найдено', position: 0 },
      { id: 'viewing', projectId: 'project', name: 'Просмотр', position: 1 },
    ])
    await database.cards.add({ id: 'card', statusId: 'found', name: 'Квартира у парка', position: 0 })
    await repo.moveStatus('viewing', -1)
    await repo.moveCard('card', 'viewing')
    expect((await repo.board('project'))?.statuses.map(status => status.name)).toEqual(['Просмотр', 'Найдено'])
    expect((await repo.board('project'))?.statuses[0].cards.map(card => card.name)).toEqual(['Квартира у парка'])
  })

  it('keeps projects isolated and exposes storage failures', async () => {
    const { database, repository: repo } = repository()
    await repo.open()
    vi.spyOn(database.projects, 'add').mockRejectedValueOnce(new Error('quota'))
    await expect(repo.createProject({ id: 'broken', name: 'Паспорт', createdAt: 'now' })).rejects.toThrow('quota')
    await repo.createProject({ id: 'first', name: 'Поиск квартиры', createdAt: '1' })
    await repo.createProject({ id: 'second', name: 'Паспорт', createdAt: '2' })
    await repo.createStatus({ id: 'status', projectId: 'first', name: 'Найдено' })
    expect((await repo.board('second'))?.statuses).toEqual([])
  })
})
