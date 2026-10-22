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
    newer.version(3).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id', releases: 'id' })
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
  expect(await db.cards.orderBy('[statusId+position]').toArray()).toEqual(before[2].sort((a, b) => a.statusId.localeCompare(b.statusId) || a.position - b.position).map(card => ({ ...card, important: false, urgent: false })))
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
