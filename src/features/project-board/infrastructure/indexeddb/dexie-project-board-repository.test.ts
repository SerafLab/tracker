import { appendPlacement } from '../../domain/order'
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
    await database.cards.add({ id: 'card', statusId: 'found', name: 'Квартира у парка', position: 0, description: '', important: false, urgent: false })
    await repo.moveStatus('viewing', -1)
    await transfer(repo, 'card', 'viewing')
    expect((await repo.board('project'))?.statuses.map(status => status.name)).toEqual(['Просмотр', 'Найдено'])
    expect((await repo.board('project'))?.statuses[0].cards.map(card => card.name)).toEqual(['Квартира у парка'])
  })

  it('keeps projects isolated and exposes storage failures', async () => {
    const { database, repository: repo } = repository()
    await repo.open()
    vi.spyOn(database.projects, 'add').mockRejectedValueOnce(new Error('quota'))
    await expect(repo.createProject({ id: 'broken', name: 'Паспорт', createdAt: 'now' }, [], true)).rejects.toThrow('quota')
    await repo.createProject({ id: 'first', name: 'Поиск квартиры', createdAt: '1' }, [], true)
    await repo.createProject({ id: 'second', name: 'Паспорт', createdAt: '2' }, [], true)
    await repo.createStatus({ id: 'status', projectId: 'first', name: 'Найдено' })
    expect((await repo.board('second'))?.statuses).toEqual([])
  })
})


async function populated() {
  const fixture = repository(); const { repository: repo } = fixture
  await repo.createProject({ id: 'p', name: 'P', createdAt: 'now' }, [], true)
  await repo.createProject({ id: 'q', name: 'Q', createdAt: 'later' }, [], true)
  for (const [id, projectId] of [['s', 'p'], ['t', 'p'], ['foreign', 'q']]) await repo.createStatus({ id, projectId, name: id })
  const add = (id: string, important = false, urgent = false, statusId = 's') => repo.createCard({ id, statusId, name: id, description: '', important, urgent })
  return { ...fixture, add }
}
it('creates and edits at group tails with dense positions while unchanged flags preserve place', async () => {
  const { repository: repo, add } = await populated()
  await add('none'); await add('both', true, true); await add('urgent', false, true); await add('important', true); await add('peer', true, true)
  const cards = async () => (await repo.board('p'))!.statuses[0].cards
  expect((await cards()).map(card => card.id)).toEqual(['both', 'peer', 'important', 'urgent', 'none'])
  await repo.updateCard('both', { name: 'Renamed', description: '', important: true, urgent: true })
  expect((await cards())[0].name).toBe('Renamed')
  await repo.updateCard('both', { name: 'Changed', description: '', important: false, urgent: true })
  expect((await cards()).map(card => card.id)).toEqual(['peer', 'important', 'urgent', 'both', 'none'])
  await repo.updateCard('both', { name: 'Back', description: '', important: true, urgent: true })
  expect((await cards()).map(card => card.id)).toEqual(['peer', 'both', 'important', 'urgent', 'none'])
  expect((await cards()).map(card => card.position)).toEqual([0, 1, 2, 3, 4])
  await expect(repo.updateCard('missing', { name: 'X', description: '', important: true, urgent: false })).rejects.toThrow()
})
it('moves into group tails, compacts sources, preserves peers, and rejects cross-project moves', async () => {
  const { repository: repo, add } = await populated()
  await add('a', true); await add('b', true); await add('c'); await add('peer', true, false, 't'); await add('tail', false, false, 't')
  await transfer(repo, 'a', 't')
  let board = (await repo.board('p'))!
  expect(board.statuses.map(status => status.cards.map(card => card.id))).toEqual([['b', 'c'], ['peer', 'a', 'tail']])
  await transfer(repo, 'a', 's')
  const b = (await repo.board('p'))!.statuses[0].cards.find(card => card.id === 'b')!
  await expect(repo.moveCard('b', { ...appendPlacement(b, 's'), beforeCardId: 'a' })).resolves.toBe('unchanged')
  board = (await repo.board('p'))!
  expect(board.statuses[0].cards.map(card => card.id)).toEqual(['b', 'a', 'c'])
  expect(board.statuses[0].cards.map(card => card.position)).toEqual([0, 1, 2])
  expect(board.statuses[0].cards[1]).toMatchObject({ description: '', important: true, urgent: false })
  await expect(transfer(repo, 'a', 'foreign')).rejects.toThrow('другой проект')
  expect(await repo.board('p')).toEqual(board)
})
it.each(['create', 'update', 'move'])('rolls back fields and ordering when %s fails partway through a write', async operation => {
  const { repository: repo, database, add } = await populated()
  await add('a', true); await add('b'); await add('target', false, false, 't')
  const before = await repo.board('p')
  const original = database.cards.bulkPut.bind(database.cards)
  vi.spyOn(database.cards, 'bulkPut').mockImplementationOnce((...args: Parameters<typeof original>) => original(...args).then(() => { throw new Error('quota') }))
  const action = operation === 'create' ? add('new', true, true) : operation === 'update' ? repo.updateCard('b', { name: 'New', description: '', important: true, urgent: true }) : transfer(repo, 'a', 't')
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
  await add('b', true, false, 't'); await transfer(repo, 'a', 't')
  await repo.updateCard('a', { ...stale, name: 'Edited' })
  const cards = (await repo.board('p'))!.statuses[1].cards
  expect(cards.map(card => card.id)).toEqual(['b', 'a'])
  expect(cards[1]).toMatchObject({ name: 'Edited', position: 1, statusId: 't', description: '', important: true, urgent: false })
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

it('creates initial statuses and preference atomically, including an empty set', async () => {
  const { database: db, repository: repo } = repository()
  await repo.createProject({ id: 'previous', name: 'Old', createdAt: '1' }, [], true)
  const statuses = ['To do', 'In progress', 'Done'].map((name, position) => ({ id: `s${position}`, projectId: 'new', name, position }))
  await repo.createProject({ id: 'new', name: 'New', createdAt: '2' }, statuses, true)
  expect((await repo.board('new'))?.statuses).toEqual(statuses.map(status => ({ ...status, cards: [] })))
  expect(await repo.preference()).toEqual({ id: 'workspace', lastProjectId: 'new' })
  expect((await repo.board('previous'))?.statuses).toEqual([])
  expect(await db.cards.count()).toBe(0)
})

it.each(['statuses', 'workspace'] as const)('rolls back the project, statuses and preference after %s failure', async failure => {
  const { database: db, repository: repo } = repository()
  await repo.createProject({ id: 'old', name: 'Old', createdAt: '1' }, [], true)
  const statuses = [0, 1, 2].map(position => ({ id: `s${position}`, projectId: 'new', name: `Status ${position}`, position }))
  if (failure === 'statuses') {
    // A duplicate in the batch makes IndexedDB reject after its first valid insert.
    statuses[1].id = statuses[0].id
  } else vi.spyOn(db.workspace, 'put').mockRejectedValueOnce(Error('quota'))
  await expect(repo.createProject({ id: 'new', name: 'New', createdAt: '2' }, statuses, true)).rejects.toThrow()
  expect(await repo.projects()).toEqual([{ id: 'old', name: 'Old', createdAt: '1' }])
  expect(await db.statuses.toArray()).toEqual([])
  expect(await repo.preference()).toEqual({ id: 'workspace', lastProjectId: 'old' })
})

it('reads only details belonging to the requested project and orders notes stably without moving edited notes', async () => {
  const { repository: repo, add } = await populated()
  await add('a'); await add('other', false, false, 'foreign')
  for (const id of ['z', 'a', 'b']) await repo.createNote({ id, cardId: 'a', text: id, createdAt: id === 'b' ? '2026-11-02T00:00:00Z' : '2026-11-01T00:00:00Z' })
  expect(await repo.cardDetails('q', 'a')).toBeUndefined()
  expect(await repo.cardDetails('p', 'other')).toBeUndefined()
  expect(await repo.cardDetails('p', 'missing')).toBeUndefined()
  const before = await repo.cardDetails('p', 'a')
  expect(before!.notes.map(note => note.id)).toEqual(['a', 'z', 'b'])
  expect(await repo.updateNote('a', 'z', 'z', 'later')).toEqual(before!.notes[1])
  expect(await repo.updateNote('a', 'z', 'changed', 'later')).toEqual({ ...before!.notes[1], text: 'changed', updatedAt: 'later' })
  expect((await repo.cardDetails('p', 'a'))!.notes.map(note => note.id)).toEqual(['a', 'z', 'b'])
  await expect(repo.updateNote('other', 'z', 'stolen', 'later')).rejects.toThrow()
  await expect(repo.deleteNote('other', 'z')).rejects.toThrow()
  await expect(repo.createNote({ id: 'blank', cardId: 'a', text: ' ', createdAt: 'now' })).rejects.toThrow()
  await expect(repo.createNote({ id: 'orphan', cardId: 'missing', text: 'text', createdAt: 'now' })).rejects.toThrow()
  await expect(repo.updateNote('a', 'z', ' ', 'later')).rejects.toThrow()
})

it('preserves a detailed card and its notes on move and removes notes only with the committed card cascade', async () => {
  const { repository: repo, database, add } = await populated()
  await add('a', true); await add('b', true)
  await repo.updateCard('a', { name: 'A', description: 'line\nhttps://example.com', important: true, urgent: false })
  expect((await repo.board('p'))!.statuses[0].cards.map(card => card.id)).toEqual(['a', 'b'])
  const note = { id: 'n', cardId: 'a', text: 'note', createdAt: '2026-11-01T00:00:00Z' }
  await repo.createNote(note)
  await transfer(repo, 'a', 't')
  expect((await repo.cardDetails('p', 'a'))!.notes).toEqual([note])
  expect((await repo.cardDetails('p', 'a'))!.card.description).toBe('line\nhttps://example.com')
  const before = await repo.cardDetails('p', 'a')
  const remove = database.cards.delete.bind(database.cards)
  vi.spyOn(database.cards, 'delete').mockImplementationOnce(id => remove(id).then(() => { throw new Error('cascade failed') }))
  await expect(repo.deleteCard('a')).rejects.toThrow('cascade failed')
  expect(await repo.cardDetails('p', 'a')).toEqual(before)
  await repo.deleteCard('a')
  expect(await database.notes.toArray()).toEqual([])
  expect(await repo.cardDetails('p', 'a')).toBeUndefined()
})

it.each(['create', 'edit', 'delete'] as const)('rolls back a failed note %s and permits a fresh retry', async operation => {
  const { repository: repo, database, add } = await populated(); await add('a')
  const note = { id: 'n', cardId: 'a', text: 'Original', createdAt: '2026-11-01T00:00:00Z' }
  if (operation !== 'create') await repo.createNote(note)
  const before = await repo.cardDetails('p', 'a')
  const action = () => operation === 'create' ? repo.createNote(note) : operation === 'edit' ? repo.updateNote('a', 'n', 'Changed', 'later') : repo.deleteNote('a', 'n')
  const method = operation === 'create' ? 'add' : operation === 'edit' ? 'put' : 'delete'
  const spy = vi.spyOn(database.notes, method).mockRejectedValueOnce(new Error('quota'))
  await expect(action()).rejects.toThrow('quota')
  expect(await repo.cardDetails('p', 'a')).toEqual(before)
  spy.mockRestore(); await action()
  expect((await repo.cardDetails('p', 'a'))!.notes).toHaveLength(operation === 'delete' ? 0 : 1)
})

async function projectDeletionFixture() {
  const result = repository(), { repository: repo, database: db } = result
  await repo.createProject({ id: 'selected', name: 'Same project', createdAt: '1' }, [], true)
  await repo.createProject({ id: 'other', name: 'Same project', createdAt: '2' }, [], true)
  for (const [id, projectId] of [['s1', 'selected'], ['s2', 'selected'], ['other-status', 'other']]) await repo.createStatus({ id, projectId, name: 'Status' })
  for (const [id, statusId] of [['c1', 's1'], ['c2', 's1'], ['c3', 's2'], ['other-card', 'other-status']]) {
    await repo.createCard({ id, statusId, name: 'Card', description: 'Description', important: true, urgent: false })
    await repo.createNote({ id: `note-${id}`, cardId: id, text: 'Note', createdAt: 'now' })
  }
  await repo.setLastProject('selected')
  const snapshot = () => Promise.all([db.projects.toArray(), db.statuses.toArray(), db.cards.toArray(), db.notes.toArray(), db.workspace.toArray()])
  return { ...result, snapshot }
}

it('deletes one project and its statuses, cards and notes while preserving another identically named project', async () => {
  const { database: db, repository: repo } = await projectDeletionFixture()
  const other = await repo.board('other'), otherNotes = await db.notes.where('cardId').equals('other-card').toArray()
  await repo.deleteProject('selected')
  expect(await repo.board('selected')).toBeUndefined()
  expect(await repo.board('other')).toEqual(other)
  expect(await db.statuses.toArray()).toEqual(other!.statuses.map(({ cards: _cards, ...status }) => status))
  expect(await db.cards.toArray()).toEqual(other!.statuses.flatMap(status => status.cards))
  expect(await db.notes.toArray()).toEqual(otherNotes)
  expect((await repo.preference())?.lastProjectId).toBeUndefined()
  await repo.setLastProject('other')
  await repo.deleteProject('selected'); await repo.deleteProject('missing')
  expect((await repo.preference())?.lastProjectId).toBe('other')
  db.close(); await db.open()
  expect(await repo.board('selected')).toBeUndefined()
  expect(await repo.board('other')).toEqual(other)
  expect(await db.notes.toArray()).toEqual(otherNotes)
})

it.each([false, true])('deletes an empty project with empty statuses: %s', async withStatuses => {
  const { repository: repo, database: db } = repository()
  await repo.createProject({ id: 'p', name: 'Project', createdAt: '1' }, withStatuses ? [{ id: 's', projectId: 'p', name: 'Empty', position: 0 }] : [], true)
  await repo.deleteProject('p')
  expect(await repo.projects()).toEqual([])
  expect(await db.statuses.count()).toBe(0)
  expect(await db.cards.count()).toBe(0)
  expect(await db.notes.count()).toBe(0)
})

it.each(['cards', 'workspace'] as const)('rolls back all project contents and preference after an intermediate %s failure, then retries', async failure => {
  const { repository: repo, database: db, snapshot } = await projectDeletionFixture()
  const before = await snapshot()
  if (failure === 'cards') vi.spyOn(db.cards, 'bulkDelete').mockRejectedValueOnce(Error('quota'))
  else vi.spyOn(db.workspace, 'put').mockRejectedValueOnce(Error('quota'))
  await expect(repo.deleteProject('selected')).rejects.toThrow('quota')
  expect(await snapshot()).toEqual(before)
  await repo.deleteProject('selected')
  expect(await repo.board('selected')).toBeUndefined()
  expect((await db.notes.toArray()).map(note => note.id)).toEqual(['note-other-card'])
  expect((await repo.preference())?.lastProjectId).toBeUndefined()
})

it('reads the current children inside deletion rather than relying on a previously read board', async () => {
  const { repository: repo, database: db } = await projectDeletionFixture()
  await repo.board('selected')
  await repo.createStatus({ id: 'late-status', projectId: 'selected', name: 'Late' })
  await repo.createCard({ id: 'late-card', statusId: 'late-status', name: 'Late', description: '', important: false, urgent: false })
  await repo.createNote({ id: 'late-note', cardId: 'late-card', text: 'Late', createdAt: 'later' })
  await repo.setLastProject('other')
  await repo.deleteProject('selected')
  expect(await db.statuses.get('late-status')).toBeUndefined()
  expect(await db.cards.get('late-card')).toBeUndefined()
  expect(await db.notes.get('late-note')).toBeUndefined()
  expect((await repo.preference())?.lastProjectId).toBe('other')
})

it.each(['creation', 'deletion'] as const)('serializes concurrent status creation and project deletion when %s starts first', async first => {
  const { repository: repo, database: db } = repository()
  await repo.createProject({ id: 'p', name: 'Project', createdAt: 'now' }, [], true)
  const create = () => repo.createStatus({ id: 'concurrent', projectId: 'p', name: 'Concurrent' })
  let creation: ReturnType<typeof create>, deletion: Promise<void>
  if (first === 'creation') { creation = create(); deletion = repo.deleteProject('p') }
  else { deletion = repo.deleteProject('p'); creation = create() }
  const [created, deleted] = await Promise.allSettled([creation, deletion])
  expect(deleted.status).toBe('fulfilled')
  expect(created.status).toBe(first === 'creation' ? 'fulfilled' : 'rejected')
  if (created.status === 'rejected') expect(created.reason).toHaveProperty('message', 'Проект не найден')
  expect(await repo.board('p')).toBeUndefined()
  expect(await db.statuses.where('projectId').equals('p').count()).toBe(0)
  db.close(); await db.open()
  expect(await repo.board('p')).toBeUndefined()
  expect(await db.statuses.toArray()).toEqual([])
  expect(await db.cards.toArray()).toEqual([])
  expect(await db.notes.toArray()).toEqual([])
})

it('assigns distinct dense positions to concurrently created statuses and preserves them after reopening', async () => {
  const { repository: repo, database: db } = repository()
  await repo.createProject({ id: 'p', name: 'Project', createdAt: 'now' }, [], true)
  const created = await Promise.all(Array.from({ length: 5 }, (_, index) => repo.createStatus({ id: `s-${index}`, projectId: 'p', name: `Status ${index}` })))
  expect(created.map(status => status.position)).toEqual([0, 1, 2, 3, 4])
  const statuses = (await repo.board('p'))!.statuses
  expect(statuses.map(status => status.id)).toEqual(['s-0', 's-1', 's-2', 's-3', 's-4'])
  expect(statuses.map(status => status.position)).toEqual([0, 1, 2, 3, 4])
  db.close(); await db.open()
  expect((await repo.board('p'))!.statuses).toEqual(statuses)
})


async function transfer(repo: DexieProjectBoardRepository, id: string, statusId: string) {
  const boards = await Promise.all((await repo.projects()).map(project => repo.board(project.id)))
  const card = boards.flatMap(board => board?.statuses.flatMap(status => status.cards) ?? []).find(card => card.id === id)!
  return repo.moveCard(id, appendPlacement(card, statusId))
}

it('persists exact positions, retains notes and rejects invalid or stale placements without writes', async () => {
  const { repository: repo, database: db, add } = await populated()
  const a = await add('a', true); await add('b', true); await add('none')
  await add('x', true, false, 't'); await add('y', true, false, 't'); await add('bottom', false, false, 't')
  await repo.createNote({ id: 'n', cardId: 'a', text: 'History', createdAt: '2026-11-01T00:00:00Z' })
  const before = await repo.board('p')
  const put = vi.spyOn(db.cards, 'bulkPut')
  for (const placement of [
    { ...appendPlacement(a, 's'), beforeCardId: 'a' }, { ...appendPlacement(a, 's'), beforeCardId: 'none' },
    { ...appendPlacement(a, 's'), beforeCardId: 'missing' }, { ...appendPlacement(a, 't'), beforeCardId: 'b' },
    { ...appendPlacement(a, 'missing') }, { ...appendPlacement(a, 't'), expected: { ...a, urgent: true } },
    { ...appendPlacement(a, 't'), expected: { ...a, statusId: 't' } },
  ]) await expect(repo.moveCard('a', placement)).rejects.toThrow()
  await expect(repo.moveCard('missing', appendPlacement(a, 't'))).rejects.toThrow('source_not_found')
  expect(put).not.toHaveBeenCalled(); expect(await repo.board('p')).toEqual(before)
  expect(await repo.moveCard('a', { ...appendPlacement(a, 's'), beforeCardId: 'b' })).toBe('unchanged')
  expect(put).not.toHaveBeenCalled()
  expect(await repo.moveCard('a', { ...appendPlacement(a, 't'), beforeCardId: 'y' })).toBe('saved')
  expect((await repo.board('p'))!.statuses[1].cards.map(card => card.id)).toEqual(['x', 'a', 'y', 'bottom'])
  expect((await repo.cardDetails('p', 'a'))!.notes.map(note => note.id)).toEqual(['n'])
  db.close(); await db.open()
  expect((await repo.board('p'))!.statuses[1].cards.map(card => card.id)).toEqual(['x', 'a', 'y', 'bottom'])
})

it.each(['target', 'source', 'reorder'] as const)('rolls back %s placement writes and permits retry in a reopened session', async failure => {
  const { repository: repo, database: db, add } = await populated()
  const a = await add('a', true); await add('b', true); await add('x', true, false, 't')
  const before = await repo.board('p'), actual = db.cards.bulkPut.bind(db.cards)
  let writes = 0
  const spy = vi.spyOn(db.cards, 'bulkPut').mockImplementation((...args: Parameters<typeof actual>) => actual(...args).then(result => {
    if (++writes === (failure === 'source' ? 2 : 1)) throw new Error('placement quota')
    return result
  }))
  const placement = appendPlacement(a, failure === 'reorder' ? 's' : 't')
  await expect(repo.moveCard('a', placement)).rejects.toThrow('placement quota')
  spy.mockRestore(); db.close()
  const reopened = new ProjectBoardDatabase(db.name); databases.push(reopened)
  const fresh = new DexieProjectBoardRepository(reopened)
  expect(await fresh.board('p')).toEqual(before)
  expect(await fresh.moveCard('a', placement)).toBe('saved')
  expect((await fresh.board('p'))!.statuses.flatMap(status => status.cards).filter(card => card.id === 'a')).toHaveLength(1)
})

const setRecords = (projectId = 'p', prefix = 'set') => ['First', 'Second'].map((name, position) => ({ id: `${prefix}-${position}`, projectId, name, position }))
it('atomically applies a set only to an existing empty project without changing preference or other data', async () => {
  const { database, repository: repo } = repository()
  await repo.createProject({ id: 'p', name: 'Empty', createdAt: '1' }, [], false)
  await repo.createProject({ id: 'q', name: 'Other', createdAt: '2' }, [], true)
  await repo.createStatus({ id: 'foreign', projectId: 'q', name: 'Other status' })
  await repo.createCard({ id: 'card', statusId: 'foreign', name: 'Card', description: 'Keep', important: true, urgent: false })
  await repo.applyStatusSet('p', setRecords())
  expect((await repo.board('p'))?.statuses).toEqual(setRecords().map(status => ({ ...status, cards: [] })))
  expect((await repo.board('q'))?.statuses[0].cards[0].description).toBe('Keep')
  expect((await repo.preference())?.lastProjectId).toBe('q')
  await expect(repo.applyStatusSet('missing', setRecords('missing'))).rejects.toMatchObject({ code: 'not_found' })
  await expect(repo.applyStatusSet('p', setRecords('p', 'retry'))).rejects.toMatchObject({ code: 'conflict' })
  expect(await database.statuses.count()).toBe(3)
})
it('rolls back a partially written set and permits a complete retry', async () => {
  const { database, repository: repo } = repository()
  await repo.createProject({ id: 'p', name: 'P', createdAt: '1' }, [], true)
  const duplicateIds = setRecords().map(status => ({ ...status, id: 'duplicate' }))
  await expect(repo.applyStatusSet('p', duplicateIds)).rejects.toThrow()
  expect(await database.statuses.count()).toBe(0)
  expect((await repo.preference())?.lastProjectId).toBe('p')
  await repo.applyStatusSet('p', setRecords())
  expect((await repo.board('p'))?.statuses.map(status => status.name)).toEqual(['First', 'Second'])
})
it('serializes a parallel manual status creation before applying a set', async () => {
  const { database, repository: repo } = repository()
  await repo.createProject({ id: 'p', name: 'P', createdAt: '1' }, [], false)
  const otherDb = new ProjectBoardDatabase(database.name)
  databases.push(otherDb)
  const otherRepo = new DexieProjectBoardRepository(otherDb)
  await otherRepo.open()
  const outcomes = await Promise.allSettled([
    repo.createStatus({ id: 'manual', projectId: 'p', name: 'Manual' }),
    otherRepo.applyStatusSet('p', setRecords()),
  ])
  expect(outcomes[0].status).toBe('fulfilled')
  expect(outcomes[1]).toMatchObject({ status: 'rejected', reason: { code: 'conflict' } })
  expect((await repo.board('p'))?.statuses.map(status => status.id)).toEqual(['manual'])
})
it('allows only one of two concurrent set applications to write', async () => {
  const { database, repository: repo } = repository()
  await repo.createProject({ id: 'p', name: 'P', createdAt: '1' }, [], false)
  const outcomes = await Promise.allSettled([repo.applyStatusSet('p', setRecords()), repo.applyStatusSet('p', setRecords('p', 'other'))])
  expect(outcomes.map(value => value.status)).toEqual(['fulfilled', 'rejected'])
  expect(outcomes[1]).toMatchObject({ reason: { code: 'conflict' } })
  expect(await database.statuses.count()).toBe(2)
})
it('counts each project across its statuses without loading card payloads and refreshes confirmed totals', async () => {
  const { database, repository: repo } = repository()
  await repo.open()
  const projects = ['empty', 'one', 'many', 'no-status'].map((id, i) => ({ id, name: id, createdAt: String(i) }))
  await database.projects.bulkAdd(projects)
  await database.statuses.bulkAdd([
    { id: 'e', projectId: 'empty', name: 'Empty', position: 0 },
    { id: 'a', projectId: 'one', name: 'One', position: 0 },
    { id: 'b', projectId: 'many', name: 'First', position: 0 },
    { id: 'c', projectId: 'many', name: 'Second', position: 1 },
  ])
  await database.cards.bulkAdd(['a', 'b', 'b', 'c'].map((statusId, i) => ({ id: `card-${i}`, statusId, name: 'Card', position: i, description: 'Long payload', important: false, urgent: false })))
  const readingCards = vi.fn(card => card)
  database.cards.hook('reading', readingCards)
  expect(await repo.catalogue()).toEqual(projects.map((project, i) => ({ ...project, cardCount: [0, 1, 3, 0][i] })))
  expect(readingCards).not.toHaveBeenCalled()
  expect(await repo.projects()).toEqual(projects)
  await repo.deleteCard('card-1')
  expect((await repo.catalogue())[2].cardCount).toBe(2)
})

describe('board view recent notes', () => {
  async function seeded() {
    const { database, repository: repo } = repository()
    await repo.createProject({ id: 'p', name: 'P', createdAt: '2026-11-01T00:00:00Z' }, [], true)
    await repo.createStatus({ id: 's', projectId: 'p', name: 'S' })
    for (const id of ['c0', 'c1', 'c5', 'c6', 'tie']) await repo.createCard({ id, statusId: 's', name: id, description: '', important: false, urgent: false })
    await repo.createProject({ id: 'q', name: 'Q', createdAt: '2026-11-01T00:00:01Z' }, [], false)
    await repo.createStatus({ id: 't', projectId: 'q', name: 'T' })
    await repo.createCard({ id: 'foreign', statusId: 't', name: 'foreign', description: '', important: false, urgent: false })
    const note = (cardId: string, n: number, createdAt = `2026-11-02T00:00:0${n}Z`, id = `${cardId}-n${n}`) => repo.createNote({ id, cardId, text: `${cardId} text ${n}`, createdAt })
    await note('c1', 1)
    for (let n = 1; n <= 5; n++) await note('c5', n)
    for (let n = 6; n >= 1; n--) await note('c6', n)
    await note('foreign', 1)
    return { database, repo, note }
  }
  it('returns up to five newest notes per card, oldest first, without foreign or empty entries', async () => {
    const { repo } = await seeded()
    const view = (await repo.boardView('p'))!
    expect(view.recentNotes.c0).toBeUndefined()
    expect(view.recentNotes.c1.map(n => n.id)).toEqual(['c1-n1'])
    expect(view.recentNotes.c5.map(n => n.id)).toEqual(['c5-n1', 'c5-n2', 'c5-n3', 'c5-n4', 'c5-n5'])
    expect(view.recentNotes.c6.map(n => n.id)).toEqual(['c6-n2', 'c6-n3', 'c6-n4', 'c6-n5', 'c6-n6'])
    expect(view.recentNotes.foreign).toBeUndefined()
    expect(Object.keys((await repo.boardView('q'))!.recentNotes)).toEqual(['foreign'])
    expect(view.statuses[0].cards[0]).not.toHaveProperty('notes')
    expect(await repo.boardView('missing')).toBeUndefined()
  })
  it('orders equal creation dates by id and keeps the newest five at the boundary', async () => {
    const { repo, note } = await seeded()
    for (const id of ['f', 'b', 'e', 'a', 'd', 'c']) await note('tie', 0, '2026-11-03T00:00:00Z', `t-${id}`)
    expect((await repo.boardView('p'))!.recentNotes.tie.map(n => n.id)).toEqual(['t-b', 't-c', 't-d', 't-e', 't-f'])
  })
  it('orders by creation, not edit time, and reflects edits and deletions', async () => {
    const { repo } = await seeded()
    await repo.updateNote('c6', 'c6-n2', 'edited oldest visible', '2026-11-09T00:00:00Z')
    let notes = (await repo.boardView('p'))!.recentNotes.c6
    expect(notes.map(n => n.id)).toEqual(['c6-n2', 'c6-n3', 'c6-n4', 'c6-n5', 'c6-n6'])
    expect(notes[0].text).toBe('edited oldest visible')
    await repo.deleteNote('c6', 'c6-n6')
    notes = (await repo.boardView('p'))!.recentNotes.c6
    expect(notes.map(n => n.id)).toEqual(['c6-n1', 'c6-n2', 'c6-n3', 'c6-n4', 'c6-n5'])
  })
})
