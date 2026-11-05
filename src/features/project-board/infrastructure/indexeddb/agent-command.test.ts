import { afterEach, expect, it, vi } from 'vitest'
import { ProjectBoardDatabase } from './database'
import { DexieProjectBoardRepository } from './dexie-project-board-repository'
import type { Status } from '../../domain/model'
import { createProjectBoardUseCases } from '../../application/use-cases'

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())) })
async function setup() {
  const db = new ProjectBoardDatabase(`agent-command-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  let id = 0
  const api = createProjectBoardUseCases({ repository: repo, createId: () => `id-${++id}`, now: () => 'now', build: { version: 'test', commit: 'test' } })
  const project = await api.createProject({ name: 'Same', initialStatusNames: ['One', 'Two'] })
  const board = (await api.board(project.id))!
  return { db, repo, api, project, statuses: board.statuses }
}
it('executes ID-based commands with confirmed transaction results, empty background creation, and unchanged preference', async () => {
  const { api, project, statuses, repo } = await setup()
  const created = await api.executeAgentCommand({ kind: 'create_project', name: ' Same ', statusNames: [] })
  expect(created.data).toMatchObject({ saved: true, project: { name: 'Same' } })
  expect((await api.board(created.projectId))?.statuses).toEqual([])
  expect((await api.preference())?.lastProjectId).toBe(project.id)
  const status = await api.executeAgentCommand({ kind: 'create_status', projectId: created.projectId, name: ' One ' })
  expect(status.data).toMatchObject({ status: { projectId: created.projectId, name: 'One', position: 0 } })
  expect((await api.executeAgentCommand({ kind: 'rename_project', projectId: project.id, name: 'New' })).data).toMatchObject({ project: { id: project.id, name: 'New' } })
  expect((await api.executeAgentCommand({ kind: 'rename_status', statusId: statuses[0].id, name: 'New status' })).data).toMatchObject({ status: { name: 'New status' } })
  const spy = vi.spyOn(repo, 'moveStatus')
  expect((await api.executeAgentCommand({ kind: 'move_status', statusId: statuses[0].id, direction: 'left' })).data).toMatchObject({ outcome: 'unchanged' })
  expect(spy).not.toHaveBeenCalled()
  expect((await api.executeAgentCommand({ kind: 'move_status', statusId: statuses[0].id, direction: 'right' })).data).toMatchObject({ outcome: 'saved', board: { statuses: [{ id: statuses[1].id }, { id: statuses[0].id }] } })
})
it.each(['description-first', 'attributes-first'] as const)('preserves concurrent description and notes with shared priority rules: %s', async order => {
  const { api, statuses, db } = await setup()
  const card = await api.createCard(statuses[0].id, { name: 'Old', description: 'Old description', important: false, urgent: false })
  await api.createNote(card.id, 'Note')
  const description = () => api.updateCard(card.id, { name: 'UI', description: 'Latest description', important: false, urgent: false })
  const attributes = () => api.updateCardAttributes(card.id, { name: 'Agent', important: true, urgent: true })
  const operations = order === 'description-first' ? [description(), attributes()] : [attributes(), description()]
  await Promise.all(operations)
  expect((await db.cards.get(card.id))?.description).toBe('Latest description')
  expect(await db.notes.where('cardId').equals(card.id).count()).toBe(1)
  if (order === 'description-first') expect(await db.cards.get(card.id)).toMatchObject({ name: 'Agent', important: true, urgent: true })
})
it('appends at own group tail with exact expected fields, preserves details and rejects foreign/stale moves', async () => {
  const { api, statuses, db } = await setup()
  const source = await api.createCard(statuses[0].id, { name: 'Source', description: 'Keep', important: true, urgent: false })
  const peer = await api.createCard(statuses[1].id, { name: 'Peer', description: '', important: true, urgent: false })
  const lower = await api.createCard(statuses[1].id, { name: 'Lower', description: '', important: false, urgent: false })
  await api.createNote(source.id, 'Keep note')
  const command = { kind: 'move_card' as const, cardId: source.id, statusId: statuses[1].id, expected: { statusId: source.statusId, important: true, urgent: false } }
  expect((await api.executeAgentCommand(command)).data).toMatchObject({ outcome: 'saved', card: { id: source.id, description: 'Keep', position: 1 } })
  expect((await db.cards.where('statusId').equals(statuses[1].id).sortBy('position')).map(c => c.id)).toEqual([peer.id, source.id, lower.id])
  await expect(api.executeAgentCommand(command)).rejects.toMatchObject({ code: 'conflict' })
  expect((await api.executeAgentCommand({ ...command, expected: { ...command.expected, statusId: statuses[1].id } })).data).toMatchObject({ outcome: 'unchanged' })
  const foreign = await api.createProject({ name: 'Foreign', initialStatusNames: ['Other'] })
  const destination = (await api.board(foreign.id))!.statuses[0]
  await expect(api.executeAgentCommand({ ...command, statusId: destination.id, expected: { ...command.expected, statusId: statuses[1].id } })).rejects.toMatchObject({ code: 'conflict' })
  expect(await db.notes.where('cardId').equals(source.id).count()).toBe(1)
})
it('distinguishes missing targets and nonempty deletion and rolls back failed commands', async () => {
  const { api, statuses, db } = await setup()
  for (const command of [
    { kind: 'rename_project' as const, projectId: 'missing', name: 'N' },
    { kind: 'rename_status' as const, statusId: 'missing', name: 'N' },
    { kind: 'move_status' as const, statusId: 'missing', direction: 'left' as const },
    { kind: 'delete_status' as const, statusId: 'missing' },
    { kind: 'update_card' as const, cardId: 'missing', name: 'N', important: false, urgent: false },
    { kind: 'delete_card' as const, cardId: 'missing' },
    { kind: 'move_card' as const, cardId: 'missing', statusId: statuses[0].id, expected: { statusId: statuses[0].id, important: false, urgent: false } },
  ]) await expect(api.executeAgentCommand(command)).rejects.toMatchObject({ code: 'not_found' })
  const result = await api.executeAgentCommand({ kind: 'create_card', statusId: statuses[0].id, name: 'N', important: false, urgent: false })
  expect(result.data).toMatchObject({ saved: true, card: { description: '', important: false, urgent: false } })
  await expect(api.executeAgentCommand({ kind: 'delete_status', statusId: statuses[0].id })).rejects.toMatchObject({ code: 'status_not_empty' })
  vi.spyOn(db.statuses, 'bulkAdd').mockRejectedValueOnce(Error('quota'))
  const before = await api.projects()
  await expect(api.executeAgentCommand({ kind: 'create_project', name: 'Fail', statusNames: [] })).rejects.toThrow('quota')
  expect(await api.projects()).toEqual(before)
  if ('card' in result.data) {
    await api.createNote(result.data.card.id, 'Cascade')
    expect((await api.executeAgentCommand({ kind: 'delete_card', cardId: result.data.card.id })).data).toEqual({ saved: true, deletedId: result.data.card.id })
    expect(await db.notes.count()).toBe(0)
  }
  expect((await api.executeAgentCommand({ kind: 'delete_status', statusId: statuses[0].id })).data).toEqual({ saved: true, deletedId: statuses[0].id })
})
it('creates a project with its ordered independent statuses atomically, without changing the preference', async () => {
  const { api, project, db } = await setup()
  const created = await api.executeAgentCommand({ kind: 'create_project', name: 'Set', statusNames: [' A ', 'B', 'C'] })
  expect(created.data).toMatchObject({ saved: true, project: { name: 'Set', statuses: [{ name: 'A', position: 0 }, { name: 'B', position: 1 }, { name: 'C', position: 2 }] } })
  expect((await api.board(created.projectId))?.statuses.map(status => status.name)).toEqual(['A', 'B', 'C'])
  expect(new Set(await db.statuses.toCollection().primaryKeys()).size).toBe(await db.statuses.count())
  expect((await api.preference())?.lastProjectId).toBe(project.id)
  const before = await db.projects.count()
  expect(() => api.executeAgentCommand({ kind: 'create_project', name: 'Bad', statusNames: ['A', '  '] })).toThrow()
  expect(await db.projects.count()).toBe(before)
})
it('applies a set only to an existing empty project, atomically, returning the board', async () => {
  const { api, project, db } = await setup()
  const empty = await api.executeAgentCommand({ kind: 'create_project', name: 'Empty', statusNames: [] })
  const applied = await api.executeAgentCommand({ kind: 'apply_status_set', projectId: empty.projectId, statusNames: ['A', 'B'] })
  expect(applied.data).toMatchObject({ saved: true, board: { id: empty.projectId, statuses: [{ name: 'A', position: 0, cards: [] }, { name: 'B', position: 1, cards: [] }] } })
  const count = await db.statuses.count()
  await expect(api.executeAgentCommand({ kind: 'apply_status_set', projectId: empty.projectId, statusNames: ['C'] })).rejects.toMatchObject({ code: 'conflict' })
  await expect(api.executeAgentCommand({ kind: 'apply_status_set', projectId: project.id, statusNames: ['C'] })).rejects.toMatchObject({ code: 'conflict' })
  await expect(api.executeAgentCommand({ kind: 'apply_status_set', projectId: 'missing', statusNames: ['C'] })).rejects.toMatchObject({ code: 'not_found' })
  expect(await db.statuses.count()).toBe(count)
  expect((await api.preference())?.lastProjectId).toBe(project.id)
})
it('leaves no partial set when a status write fails', async () => {
  const { api, repo, db } = await setup()
  const empty = await api.executeAgentCommand({ kind: 'create_project', name: 'Empty', statusNames: [] })
  const actual = db.statuses.bulkAdd.bind(db.statuses)
  vi.spyOn(db.statuses, 'bulkAdd').mockImplementationOnce((async (items: readonly Status[]) => { await actual([items[0]]); throw new Error('quota') }) as never)
  await expect(api.executeAgentCommand({ kind: 'apply_status_set', projectId: empty.projectId, statusNames: ['A', 'B'] })).rejects.toThrow('quota')
  expect(await db.statuses.where('projectId').equals(empty.projectId).count()).toBe(0)
  void repo
})
