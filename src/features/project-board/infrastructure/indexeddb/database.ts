import Dexie, { type EntityTable } from 'dexie'
import type { Card, Project, Status, WorkspacePreference } from '../../domain/model'

export class ProjectBoardDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  statuses!: EntityTable<Status, 'id'>
  cards!: EntityTable<Card, 'id'>
  workspace!: EntityTable<WorkspacePreference, 'id'>

  constructor(name = 'personal-project-tracker') {
    super(name)
    this.version(1).stores({
      projects: 'id, createdAt',
      statuses: 'id, projectId, [projectId+position]',
      cards: 'id, statusId, [statusId+position]',
      workspace: 'id',
    })
  }
}
