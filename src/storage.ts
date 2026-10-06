import Dexie, { type EntityTable } from 'dexie'
import { newId, requiredName, type Card, type Id, type Project, type ProjectBoard, type Status, type WorkspacePreference } from './domain'

export class TrackerDatabase extends Dexie {
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

export class TrackerRepository {
  constructor(private readonly db: TrackerDatabase) {}

  async open() { await this.db.open() }
  async projects() { return this.db.projects.orderBy('createdAt').toArray() }
  async preference() { return this.db.workspace.get('workspace') }
  async setLastProject(id?: Id) { await this.db.workspace.put({ id: 'workspace', lastProjectId: id }) }

  async createProject(input: string) {
    const name = requiredName(input); if (!name) throw new Error('Название обязательно')
    const project = { id: newId(), name, createdAt: new Date().toISOString() }
    await this.db.transaction('rw', this.db.projects, this.db.workspace, async () => {
      await this.db.projects.add(project); await this.setLastProject(project.id)
    })
    return project
  }
  async renameProject(id: Id, input: string) { const name = requiredName(input); if (!name) throw new Error('Название обязательно'); await this.db.projects.update(id, { name }) }

  async board(projectId: Id): Promise<ProjectBoard | undefined> {
    const project = await this.db.projects.get(projectId); if (!project) return undefined
    const statuses = await this.db.statuses.where('projectId').equals(projectId).sortBy('position')
    return { ...project, statuses: await Promise.all(statuses.map(async status => ({ ...status, cards: await this.db.cards.where('statusId').equals(status.id).sortBy('position') }))) }
  }
  async createStatus(projectId: Id, input: string) {
    const name = requiredName(input); if (!name) throw new Error('Название обязательно')
    if (!await this.db.projects.get(projectId)) throw new Error('Проект не найден')
    const position = (await this.db.statuses.where('projectId').equals(projectId).count())
    const status = { id: newId(), projectId, name, position }; await this.db.statuses.add(status); return status
  }
  async renameStatus(id: Id, input: string) { const name = requiredName(input); if (!name) throw new Error('Название обязательно'); await this.db.statuses.update(id, { name }) }
  async moveStatus(id: Id, direction: -1 | 1) {
    await this.db.transaction('rw', this.db.statuses, async () => {
      const current = await this.db.statuses.get(id); if (!current) return
      const items = await this.db.statuses.where('projectId').equals(current.projectId).sortBy('position')
      const index = items.findIndex(item => item.id === id); const target = index + direction
      if (target < 0 || target >= items.length) return
      ;[items[index], items[target]] = [items[target], items[index]]
      await this.db.statuses.bulkPut(items.map((item, position) => ({ ...item, position })))
    })
  }
  async createCard(statusId: Id, input: string) {
    const name = requiredName(input); if (!name) throw new Error('Название обязательно')
    if (!await this.db.statuses.get(statusId)) throw new Error('Статус не найден')
    const card = { id: newId(), statusId, name, position: await this.db.cards.where('statusId').equals(statusId).count() }
    await this.db.cards.add(card); return card
  }
  async renameCard(id: Id, input: string) { const name = requiredName(input); if (!name) throw new Error('Название обязательно'); await this.db.cards.update(id, { name }) }
  async moveCard(id: Id, statusId: Id) {
    await this.db.transaction('rw', this.db.cards, this.db.statuses, async () => {
      const card = await this.db.cards.get(id); if (!card || card.statusId === statusId) return
      const destination = await this.db.statuses.get(statusId)
      const sourceStatus = await this.db.statuses.get(card.statusId)
      if (!destination || !sourceStatus || destination.projectId !== sourceStatus.projectId) {
        throw new Error('Нельзя перенести карточку в другой проект')
      }
      const source = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
      const destinationPosition = await this.db.cards.where('statusId').equals(statusId).count()
      await this.db.cards.put({ ...card, statusId, position: destinationPosition })
      await this.db.cards.bulkPut(source.filter(item => item.id !== id).map((item, position) => ({ ...item, position })))
    })
  }
}
