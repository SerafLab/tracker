import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectBoardDatabase } from './database'

const databases: Dexie[] = []
afterEach(async () => { await Promise.all(databases.splice(0).map(async database => { database.close(); await database.delete() })) })

describe('ProjectBoardDatabase', () => {
  it('closes a stale connection after another client upgrades the schema', async () => {
    const name = `versionchange-${crypto.randomUUID()}`
    const stale = vi.fn()
    const older = new ProjectBoardDatabase(name, stale); databases.push(older)
    await older.open()
    const newer = new Dexie(name); databases.push(newer)
    newer.version(4).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id', releases: 'id' })
    await newer.open()
    expect(stale).toHaveBeenCalledOnce()
    expect(older.isOpen()).toBe(false)
  })
})


const schema = { projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id' }
async function legacy() {
  const name = `migration-${crypto.randomUUID()}`
  const old = new Dexie(name); databases.push(old)
  old.version(1).stores(schema)
  await old.open()
  await old.table('projects').bulkAdd([{ id: 'p', name: 'P', createdAt: 'now' }, { id: 'q', name: 'Q', createdAt: 'later' }])
  await old.table('statuses').bulkAdd([{ id: 's', projectId: 'p', name: 'S', position: 0 }, { id: 't', projectId: 'q', name: 'T', position: 0 }])
  await old.table('cards').bulkAdd([{ id: 'z', statusId: 's', name: 'Z', position: 0 }, { id: 'a', statusId: 's', name: 'A', position: 1 }, { id: 'b', statusId: 't', name: 'B', position: 0 }])
  await old.table('workspace').put({ id: 'workspace', lastProjectId: 'q' })
  const before = await Promise.all(Object.keys(schema).map(table => old.table(table).toArray()))
  old.close()
  return { name, before }
}
it('upgrades a real v1 database without changing positions, relations, or other tables', async () => {
  const { name, before } = await legacy()
  const db = new ProjectBoardDatabase(name); databases.push(db)
  await db.open()
  expect(await db.cards.orderBy('[statusId+position]').toArray()).toEqual(before[2].sort((a, b) => a.statusId.localeCompare(b.statusId) || a.position - b.position).map(card => ({ ...card, description: '', important: false, urgent: false })))
  expect(await db.projects.toArray()).toEqual(before[0])
  expect(await db.statuses.toArray()).toEqual(before[1])
  expect(await db.workspace.toArray()).toEqual(before[3])
  db.close(); await db.open()
  expect((await db.cards.toArray()).every(card => card.important === false && card.urgent === false)).toBe(true)
})
it('rolls back every migrated record if the upgrade fails', async () => {
  const { name, before } = await legacy()
  const failing = new ProjectBoardDatabase(name); databases.push(failing)
  let updates = 0
  failing.cards.hook('updating', () => { if (++updates === 2) throw new Error('migration failed') })
  await expect(failing.open()).rejects.toThrow('migration failed')
  failing.close()
  const old = new Dexie(name); databases.push(old); old.version(1).stores(schema)
  await old.open()
  expect(await old.table('cards').toArray()).toEqual(before[2])
  expect(old.verno).toBe(1)
})

it('upgrades v2 cards with descriptions while preserving flags, positions, links and preferences', async () => {
  const name = `v2-${crypto.randomUUID()}`
  const old = new Dexie(name); databases.push(old); old.version(2).stores(schema); await old.open()
  await old.table('projects').add({ id: 'p', name: 'P', createdAt: 'now' })
  await old.table('statuses').add({ id: 's', projectId: 'p', name: 'S', position: 0 })
  const card = { id: 'c', statusId: 's', name: 'Card', position: 7, important: true, urgent: false }
  await old.table('cards').add(card); await old.table('workspace').put({ id: 'workspace', lastProjectId: 'p' }); old.close()
  const current = new ProjectBoardDatabase(name); databases.push(current); await current.open()
  expect(await current.cards.get('c')).toEqual({ ...card, description: '' })
  expect(await current.notes.count()).toBe(0)
  expect(await current.workspace.get('workspace')).toEqual({ id: 'workspace', lastProjectId: 'p' })
  current.close(); await current.open(); expect(await current.cards.get('c')).toEqual({ ...card, description: '' })
})

it('rolls back the v3 description upgrade and note store creation after a record failure', async () => {
  const name = `v3-fail-${crypto.randomUUID()}`
  const old = new Dexie(name); databases.push(old); old.version(2).stores(schema); await old.open()
  const cards = ['a', 'b'].map((id, position) => ({ id, statusId: 's', name: id, position, important: true, urgent: false }))
  await old.table('cards').bulkAdd(cards); old.close()
  const failing = new ProjectBoardDatabase(name); databases.push(failing)
  let updates = 0; failing.cards.hook('updating', () => { if (++updates === 2) throw new Error('v3 failed') })
  await expect(failing.open()).rejects.toThrow('v3 failed'); failing.close()
  const reopened = new Dexie(name); databases.push(reopened); reopened.version(2).stores(schema); await reopened.open()
  expect(reopened.verno).toBe(2); expect(await reopened.table('cards').toArray()).toEqual(cards)
  expect(reopened.tables.map(table => table.name)).not.toContain('notes')
})
