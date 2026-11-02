import { afterEach, expect, it, vi } from 'vitest'
import { ProjectBoardDatabase } from './database'
import { DexieProjectBoardRepository } from './dexie-project-board-repository'
import { createProjectBoardUseCases } from '../../application/use-cases'

const databases: ProjectBoardDatabase[] = []
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())) })
async function setup() {
  const db = new ProjectBoardDatabase(`agent-command-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  let id = 0
  const api = createProjectBoardUseCases({ repository: repo, createId: () => `id-${++id}`, now: () => 'now' })
  const project = await api.createProject({ name: 'Same', initialStatusNames: ['One', 'Two'] })
  const board = (await api.board(project.id))!
  return { db, repo, api, project, statuses: board.statuses }
}
it('executes ID-based commands with confirmed transaction results, empty background creation, and unchanged preference', async () => {
  const { api, project, statuses, repo } = await setup()
  const created = await api.executeAgentCommand({ kind: 'create_project', name: ' Same ' })
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
  await expect(api.executeAgentCommand({ kind: 'create_project', name: 'Fail' })).rejects.toThrow('quota')
  expect(await api.projects()).toEqual(before)
  if ('card' in result.data) {
    await api.createNote(result.data.card.id, 'Cascade')
    expect((await api.executeAgentCommand({ kind: 'delete_card', cardId: result.data.card.id })).data).toEqual({ saved: true, deletedId: result.data.card.id })
    expect(await db.notes.count()).toBe(0)
  }
  expect((await api.executeAgentCommand({ kind: 'delete_status', statusId: statuses[0].id })).data).toEqual({ saved: true, deletedId: statuses[0].id })
})
