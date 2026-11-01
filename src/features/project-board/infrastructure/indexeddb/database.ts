import Dexie, { type EntityTable } from 'dexie'
import type { Card, Note, Project, Status, WorkspacePreference } from '../../domain/model'

export class ProjectBoardDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  statuses!: EntityTable<Status, 'id'>
  cards!: EntityTable<Card, 'id'>
  notes!: EntityTable<Note, 'id'>
  workspace!: EntityTable<WorkspacePreference, 'id'>

  constructor(name = 'personal-project-tracker', onVersionChange?: () => void) {
    super(name)
    this.version(1).stores({
      projects: 'id, createdAt',
      statuses: 'id, projectId, [projectId+position]',
      cards: 'id, statusId, [statusId+position]',
      workspace: 'id',
    })
    this.version(2).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id' }).upgrade(transaction => transaction.table('cards').toCollection().modify(card => { card.important ??= false; card.urgent ??= false }))
    this.version(3).stores({ projects: 'id, createdAt', statuses: 'id, projectId, [projectId+position]', cards: 'id, statusId, [statusId+position]', workspace: 'id', notes: 'id, cardId, [cardId+createdAt]' }).upgrade(transaction => transaction.table('cards').toCollection().modify(card => { card.description ??= '' }))
    this.on('versionchange', () => {
      this.close()
      onVersionChange?.()
    })
  }
}
