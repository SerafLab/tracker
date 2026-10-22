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
    await database.cards.add({ id: 'card', statusId: 'found', name: 'Квартира у парка', position: 0, important: false, urgent: false })
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


async function populated() {
  const fixture = repository(); const { repository: repo } = fixture
  await repo.createProject({ id: 'p', name: 'P', createdAt: 'now' })
  await repo.createProject({ id: 'q', name: 'Q', createdAt: 'later' })
  for (const [id, projectId] of [['s', 'p'], ['t', 'p'], ['foreign', 'q']]) await repo.createStatus({ id, projectId, name: id })
  const add = (id: string, important = false, urgent = false, statusId = 's') => repo.createCard({ id, statusId, name: id, important, urgent })
  return { ...fixture, add }
}
it('creates and edits at group tails with dense positions while unchanged flags preserve place', async () => {
  const { repository: repo, add } = await populated()
  await add('none'); await add('both', true, true); await add('urgent', false, true); await add('important', true); await add('peer', true, true)
  const cards = async () => (await repo.board('p'))!.statuses[0].cards
  expect((await cards()).map(card => card.id)).toEqual(['both', 'peer', 'important', 'urgent', 'none'])
  await repo.updateCard('both', { name: 'Renamed', important: true, urgent: true })
  expect((await cards())[0].name).toBe('Renamed')
  await repo.updateCard('both', { name: 'Changed', important: false, urgent: true })
  expect((await cards()).map(card => card.id)).toEqual(['peer', 'important', 'urgent', 'both', 'none'])
  await repo.updateCard('both', { name: 'Back', important: true, urgent: true })
  expect((await cards()).map(card => card.id)).toEqual(['peer', 'both', 'important', 'urgent', 'none'])
  expect((await cards()).map(card => card.position)).toEqual([0, 1, 2, 3, 4])
  await expect(repo.updateCard('missing', { name: 'X', important: true, urgent: false })).rejects.toThrow()
})
it('moves into group tails, compacts sources, preserves peers, and rejects cross-project moves', async () => {
  const { repository: repo, add } = await populated()
  await add('a', true); await add('b', true); await add('c'); await add('peer', true, false, 't'); await add('tail', false, false, 't')
  await repo.moveCard('a', 't')
  let board = (await repo.board('p'))!
  expect(board.statuses.map(status => status.cards.map(card => card.id))).toEqual([['b', 'c'], ['peer', 'a', 'tail']])
  await repo.moveCard('a', 's'); await repo.moveCard('b', 's')
  board = (await repo.board('p'))!
  expect(board.statuses[0].cards.map(card => card.id)).toEqual(['b', 'a', 'c'])
  expect(board.statuses[0].cards.map(card => card.position)).toEqual([0, 1, 2])
  expect(board.statuses[0].cards[1]).toMatchObject({ important: true, urgent: false })
  await expect(repo.moveCard('a', 'foreign')).rejects.toThrow('другой проект')
  expect(await repo.board('p')).toEqual(board)
})
it.each(['create', 'update', 'move'])('rolls back fields and ordering when %s fails partway through a write', async operation => {
  const { repository: repo, database, add } = await populated()
  await add('a', true); await add('b'); await add('target', false, false, 't')
  const before = await repo.board('p')
  const original = database.cards.bulkPut.bind(database.cards)
  vi.spyOn(database.cards, 'bulkPut').mockImplementationOnce((...args: Parameters<typeof original>) => original(...args).then(() => { throw new Error('quota') }))
  const action = operation === 'create' ? add('new', true, true) : operation === 'update' ? repo.updateCard('b', { name: 'New', important: true, urgent: true }) : repo.moveCard('a', 't')
  await expect(action).rejects.toThrow('quota')
  expect(await repo.board('p')).toEqual(before)
})
it('serializes concurrent creates without losing cards or duplicating positions', async () => {
  const { repository: repo, add } = await populated()
  await Promise.all([add('a', true), add('b', true), add('c', false, true)])
  expect((await repo.board('p'))!.statuses[0].cards.map(card => card.position)).toEqual([0, 1, 2])
})

it('edits only editable fields even when a stale UI object includes status and position', async () => {
  const { repository: repo, add } = await populated()
  const stale = await add('a', true)
  await add('b', true, false, 't'); await repo.moveCard('a', 't')
  await repo.updateCard('a', { ...stale, name: 'Edited' })
  const cards = (await repo.board('p'))!.statuses[1].cards
  expect(cards.map(card => card.id)).toEqual(['b', 'a'])
  expect(cards[1]).toMatchObject({ name: 'Edited', position: 1, statusId: 't', important: true, urgent: false })
})

it('deletes only the selected card with a duplicate name and persists dense order in its status', async () => {
  const { repository: repo, database, add } = await populated()
  await add('a', true); await add('b', true); await add('c'); await add('other', false, false, 't')
  await database.cards.update('a', { name: 'Same' }); await database.cards.update('b', { name: 'Same' })
  const otherStatus = (await repo.board('p'))!.statuses[1]
  await repo.deleteCard('a')
  database.close(); await repo.open()
  const board = (await repo.board('p'))!
  expect(board.statuses[0].cards.map(({ id, position }) => ({ id, position }))).toEqual([{ id: 'b', position: 0 }, { id: 'c', position: 1 }])
  expect(board.statuses[0].cards[0].name).toBe('Same')
  expect(board.statuses[1]).toEqual(otherStatus)
})

it('rolls back card deletion and compaction together when writing fails', async () => {
  const { repository: repo, database, add } = await populated()
  await add('a'); await add('b'); await add('c')
  const before = await repo.board('p')
  const bulkPut = database.cards.bulkPut.bind(database.cards)
  vi.spyOn(database.cards, 'bulkPut').mockImplementationOnce((...args: Parameters<typeof bulkPut>) => bulkPut(...args).then(() => { throw new Error('quota') }))
  await expect(repo.deleteCard('b')).rejects.toThrow('quota')
  expect(await repo.board('p')).toEqual(before)
})

it('deletes empty statuses in order including the last status without altering another project', async () => {
  const { repository: repo, database } = await populated()
  await repo.createStatus({ id: 'last', projectId: 'p', name: 'last' })
  const otherProject = await repo.board('q')
  expect(await repo.deleteStatus('t')).toBe('deleted')
  expect((await repo.board('p'))!.statuses.map(({ id, position }) => ({ id, position }))).toEqual([{ id: 's', position: 0 }, { id: 'last', position: 1 }])
  await repo.deleteStatus('s'); await repo.deleteStatus('last')
  database.close(); await repo.open()
  expect((await repo.board('p'))!.statuses).toEqual([])
  expect(await repo.board('q')).toEqual(otherProject)
})

it('refuses a nonempty status and checks cards saved after a stale empty-board read', async () => {
  const { repository: repo, add } = await populated()
  const stale = await repo.board('p')
  expect(stale!.statuses[0].cards).toEqual([])
  await add('new-card')
  const before = await repo.board('p')
  expect(await repo.deleteStatus('s')).toBe('not-empty')
  expect(await repo.board('p')).toEqual(before)
})

it('serializes a pending card creation before status deletion without orphaning the card', async () => {
  const { repository: repo, add } = await populated()
  const adding = add('new-card')
  const deleting = repo.deleteStatus('s')
  await adding
  expect(await deleting).toBe('not-empty')
  expect((await repo.board('p'))!.statuses[0].cards.map(card => card.id)).toEqual(['new-card'])
})

it('rolls back status deletion and compaction together when writing fails', async () => {
  const { repository: repo, database } = await populated()
  const before = await repo.board('p')
  const bulkPut = database.statuses.bulkPut.bind(database.statuses)
  vi.spyOn(database.statuses, 'bulkPut').mockImplementationOnce((...args: Parameters<typeof bulkPut>) => bulkPut(...args).then(() => { throw new Error('quota') }))
  await expect(repo.deleteStatus('s')).rejects.toThrow('quota')
  expect(await repo.board('p')).toEqual(before)
})
