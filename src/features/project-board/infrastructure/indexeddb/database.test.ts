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
    newer.version(2).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id', releases: 'id' })
    await newer.open()
    expect(stale).toHaveBeenCalledOnce()
    expect(older.isOpen()).toBe(false)
  })
})
