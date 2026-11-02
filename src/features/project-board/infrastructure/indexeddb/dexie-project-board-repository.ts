import { moveByOffset, placeCardInGroup } from '../../domain/order'
import type { Card, CardDetails, CardInput, Note, Id, Project, ProjectBoard, Status, WorkspacePreference } from '../../domain/model'
import type { DeleteStatusResult, NewCard, NewStatus, ProjectBoardRepository } from '../../application/repository'
import { ProjectBoardDatabase } from './database'

export class DexieProjectBoardRepository implements ProjectBoardRepository {
  constructor(private readonly db: ProjectBoardDatabase) {}

  async open() { await this.db.open() }
  async projects() { return this.db.projects.orderBy('createdAt').toArray() }
  async preference(): Promise<WorkspacePreference | undefined> { return this.db.workspace.get('workspace') }
  async setLastProject(id?: Id) { await this.db.workspace.put({ id: 'workspace', lastProjectId: id }) }

  async createProject(project: Project, initialStatuses: Status[]) {
    await this.db.transaction('rw', this.db.projects, this.db.statuses, this.db.workspace, async () => {
      await this.db.projects.add(project)
      await this.db.statuses.bulkAdd(initialStatuses)
      await this.setLastProject(project.id)
    })
    return project
  }

  async deleteProject(id: Id): Promise<void> {
    await this.db.transaction('rw', [this.db.projects, this.db.statuses, this.db.cards, this.db.notes, this.db.workspace], async () => {
      if (!await this.db.projects.get(id)) return
      const statusIds = await this.db.statuses.where('projectId').equals(id).primaryKeys()
      const cardIds = await this.db.cards.where('statusId').anyOf(statusIds).primaryKeys()
      await this.db.notes.where('cardId').anyOf(cardIds).delete()
      await this.db.cards.bulkDelete(cardIds)
      await this.db.statuses.bulkDelete(statusIds)
      await this.db.projects.delete(id)
      if ((await this.preference())?.lastProjectId === id) await this.setLastProject()
    })
  }

  async renameProject(id: Id, name: string) { await this.db.projects.update(id, { name }) }

  async board(projectId: Id): Promise<ProjectBoard | undefined> {
    const project = await this.db.projects.get(projectId)
    if (!project) return undefined
    const statuses = await this.db.statuses.where('projectId').equals(projectId).sortBy('position')
    return {
      ...project,
      statuses: await Promise.all(statuses.map(async status => ({
        ...status,
        cards: await this.db.cards.where('statusId').equals(status.id).sortBy('position'),
      }))),
    }
  }

  async cardDetails(projectId: Id, cardId: Id): Promise<CardDetails | undefined> {
    return this.db.transaction('r', this.db.projects, this.db.statuses, this.db.cards, this.db.notes, async () => {
      const [project, card] = await Promise.all([this.db.projects.get(projectId), this.db.cards.get(cardId)])
      if (!project || !card) return undefined
      const status = await this.db.statuses.get(card.statusId)
      if (!status || status.projectId !== projectId) return undefined
      const notes = await this.db.notes.where('cardId').equals(cardId).toArray()
      notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      return { project, status, card, notes }
    })
  }

  async createNote(note: Note): Promise<Note> {
    return this.db.transaction('rw', this.db.cards, this.db.notes, async () => {
      if (!note.text.trim()) throw new Error('Текст заметки обязателен')
      if (!await this.db.cards.get(note.cardId)) throw new Error('Карточка не найдена')
      await this.db.notes.add(note)
      return note
    })
  }

  async updateNote(cardId: Id, noteId: Id, text: string, updatedAt: string): Promise<Note> {
    return this.db.transaction('rw', this.db.cards, this.db.notes, async () => {
      if (!text.trim()) throw new Error('Текст заметки обязателен')
      const [card, note] = await Promise.all([this.db.cards.get(cardId), this.db.notes.get(noteId)])
      if (!card || !note || note.cardId !== cardId) throw new Error('Заметка не найдена')
      if (note.text === text) return note
      const saved = { ...note, text, updatedAt }
      await this.db.notes.put(saved)
      return saved
    })
  }

  async deleteNote(cardId: Id, noteId: Id): Promise<void> {
    await this.db.transaction('rw', this.db.cards, this.db.notes, async () => {
      const [card, note] = await Promise.all([this.db.cards.get(cardId), this.db.notes.get(noteId)])
      if (!card || !note || note.cardId !== cardId) throw new Error('Заметка не найдена')
      await this.db.notes.delete(noteId)
    })
  }

  async createStatus(status: NewStatus): Promise<Status> {
    if (!await this.db.projects.get(status.projectId)) throw new Error('Проект не найден')
    const position = await this.db.statuses.where('projectId').equals(status.projectId).count()
    const saved = { ...status, position }
    await this.db.statuses.add(saved)
    return saved
  }

  async renameStatus(id: Id, name: string) { await this.db.statuses.update(id, { name }) }

  async deleteStatus(id: Id): Promise<DeleteStatusResult> {
    return this.db.transaction('rw', this.db.statuses, this.db.cards, async () => {
      const status = await this.db.statuses.get(id)
      if (!status) throw new Error('Статус не найден')
      if (await this.db.cards.where('statusId').equals(id).count()) return 'not-empty'
      const statuses = await this.db.statuses.where('projectId').equals(status.projectId).sortBy('position')
      await this.db.statuses.delete(id)
      await this.db.statuses.bulkPut(statuses.filter(item => item.id !== id).map((item, position) => ({ ...item, position })))
      return 'deleted'
    })
  }

  async moveStatus(id: Id, direction: -1 | 1) {
    await this.db.transaction('rw', this.db.statuses, async () => {
      const current = await this.db.statuses.get(id)
      if (!current) return
      const statuses = await this.db.statuses.where('projectId').equals(current.projectId).sortBy('position')
      const reordered = moveByOffset(statuses, id, direction)
      await this.db.statuses.bulkPut(reordered)
    })
  }

  async createCard(card: NewCard): Promise<Card> {
    return this.db.transaction('rw', this.db.statuses, this.db.cards, async () => {
      if (!await this.db.statuses.get(card.statusId)) throw new Error('Статус не найден')
      if (await this.db.cards.get(card.id)) throw new Error('Карточка уже существует')
      const cards = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
      const ordered = placeCardInGroup(cards, { ...card, position: 0 })
      await this.db.cards.bulkPut(ordered)
      return ordered.find(item => item.id === card.id)!
    })
  }

  async updateCard(id: Id, input: CardInput) {
    await this.db.transaction('rw', this.db.cards, async () => {
      const card = await this.db.cards.get(id)
      if (!card) throw new Error('Карточка не найдена')
      const updated = { ...card, name: input.name, description: input.description, important: input.important, urgent: input.urgent }
      if (card.important === input.important && card.urgent === input.urgent) {
        await this.db.cards.put(updated)
        return
      }
      const cards = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
      await this.db.cards.bulkPut(placeCardInGroup(cards, updated))
    })
  }

  async deleteCard(id: Id) {
    await this.db.transaction('rw', this.db.cards, this.db.notes, async () => {
      const card = await this.db.cards.get(id)
      if (!card) throw new Error('Карточка не найдена')
      const cards = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
      await this.db.notes.where('cardId').equals(id).delete()
      await this.db.cards.delete(id)
      await this.db.cards.bulkPut(cards.filter(item => item.id !== id).map((item, position) => ({ ...item, position })))
    })
  }

  async moveCard(id: Id, statusId: Id) {
    await this.db.transaction('rw', this.db.cards, this.db.statuses, async () => {
      const card = await this.db.cards.get(id)
      if (!card || card.statusId === statusId) return
      const destination = await this.db.statuses.get(statusId)
      const sourceStatus = await this.db.statuses.get(card.statusId)
      if (!destination || !sourceStatus || destination.projectId !== sourceStatus.projectId) throw new Error('Нельзя перенести карточку в другой проект')
      const source = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
      const targetCards = await this.db.cards.where('statusId').equals(statusId).sortBy('position')
      await this.db.cards.bulkPut(placeCardInGroup(targetCards, { ...card, statusId }))
      await this.db.cards.bulkPut(source.filter(item => item.id !== id).map((item, position) => ({ ...item, position })))
    })
  }
}
