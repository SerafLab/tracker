import { CommandError, type CardAttributes, type RepositoryAgentCommand, type AgentCommandResult, type AgentSavedData } from '../../application/agent-command'
import { moveByOffset, placeCardInGroup, placeCard } from '../../domain/order'
import type { Card, CardPlacement, CardPlacementResult, CardDetails, CardInput, Note, Id, Project, ProjectBoard, Status, WorkspacePreference } from '../../domain/model'
import type { DeleteStatusResult, NewCard, NewStatus, ProjectBoardRepository } from '../../application/repository'
import { ProjectBoardDatabase } from './database'

export class DexieProjectBoardRepository implements ProjectBoardRepository {
  constructor(private readonly db: ProjectBoardDatabase) {}

  async executeAgentCommand(command: RepositoryAgentCommand): Promise<AgentCommandResult> {
    return this.db.transaction('rw', [this.db.projects, this.db.statuses, this.db.cards, this.db.notes, this.db.workspace], async () => {
      const project = async (id: Id) => {
        const value = await this.db.projects.get(id)
        if (!value) throw new CommandError('not_found')
        return value
      }
      const status = async (id: Id) => {
        const value = await this.db.statuses.get(id)
        if (!value) throw new CommandError('not_found')
        await project(value.projectId)
        return value
      }
      const card = async (id: Id) => {
        const value = await this.db.cards.get(id)
        if (!value) throw new CommandError('not_found')
        await status(value.statusId)
        return value
      }
      let projectId: Id
      let data: AgentSavedData
      switch (command.kind) {
        case 'create_project':
          projectId = command.project.id
          data = { saved: true, project: await this.createProject(command.project, [], false) }
          break
        case 'rename_project':
          projectId = (await project(command.projectId)).id
          await this.renameProject(projectId, command.name)
          data = { saved: true, project: await project(projectId) }
          break
        case 'create_status':
          projectId = (await project(command.status.projectId)).id
          data = { saved: true, status: await this.createStatus(command.status) }
          break
        case 'rename_status':
          projectId = (await status(command.statusId)).projectId
          await this.renameStatus(command.statusId, command.name)
          data = { saved: true, status: await status(command.statusId) }
          break
        case 'move_status': {
          const current = await status(command.statusId)
          projectId = current.projectId
          const count = await this.db.statuses.where('projectId').equals(projectId).count()
          const direction = command.direction === 'left' ? -1 : 1
          const outcome = current.position + direction < 0 || current.position + direction >= count ? 'unchanged' : 'saved'
          if (outcome === 'saved') await this.moveStatus(current.id, direction)
          data = { saved: true, board: (await this.board(projectId))!, outcome }
          break
        }
        case 'delete_status':
          projectId = (await status(command.statusId)).projectId
          if (await this.deleteStatus(command.statusId) === 'not-empty') throw new CommandError('status_not_empty')
          data = { saved: true, deletedId: command.statusId }
          break
        case 'create_card':
          projectId = (await status(command.card.statusId)).projectId
          data = { saved: true, card: await this.createCard(command.card) }
          break
        case 'update_card': {
          const current = await card(command.cardId)
          projectId = (await status(current.statusId)).projectId
          data = { saved: true, card: await this.updateCardAttributes(command.cardId, { name: command.name, important: command.important, urgent: command.urgent }) }
          break
        }
        case 'move_card': {
          const current = await card(command.cardId)
          projectId = (await status(current.statusId)).projectId
          const destination = await status(command.statusId)
          if (destination.projectId !== projectId) throw new CommandError('conflict')
          if (current.statusId !== command.expected.statusId || current.important !== command.expected.important || current.urgent !== command.expected.urgent) throw new CommandError('conflict')
          const outcome = await this.moveCard(current.id, { statusId: destination.id, beforeCardId: null, expected: command.expected })
          data = { saved: true, card: await card(current.id), outcome }
          break
        }
        case 'delete_card': {
          const current = await card(command.cardId)
          projectId = (await status(current.statusId)).projectId
          await this.deleteCard(current.id)
          data = { saved: true, deletedId: current.id }
          break
        }
      }
      return { projectId, data }
    })
  }

  async open() { await this.db.open() }
  async projects() { return this.db.projects.orderBy('createdAt').toArray() }
  async preference(): Promise<WorkspacePreference | undefined> { return this.db.workspace.get('workspace') }
  async setLastProject(id?: Id) { await this.db.workspace.put({ id: 'workspace', lastProjectId: id }) }

  async createProject(project: Project, initialStatuses: Status[], remember: boolean) {
    await this.db.transaction('rw', this.db.projects, this.db.statuses, this.db.workspace, async () => {
      await this.db.projects.add(project)
      await this.db.statuses.bulkAdd(initialStatuses)
      if (remember) await this.setLastProject(project.id)
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

  async renameProject(id: Id, name: string) { if (!await this.db.projects.update(id, { name })) throw new CommandError('not_found') }

  async board(projectId: Id): Promise<ProjectBoard | undefined> {
    return this.db.transaction('r', this.db.projects, this.db.statuses, this.db.cards, async () => {
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
    })
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
    return this.db.transaction('rw', this.db.projects, this.db.statuses, async () => {
      if (!await this.db.projects.get(status.projectId)) throw new Error('Проект не найден')
      const position = await this.db.statuses.where('projectId').equals(status.projectId).count()
      const saved = { ...status, position }
      await this.db.statuses.add(saved)
      return saved
    })
  }

  async renameStatus(id: Id, name: string) { if (!await this.db.statuses.update(id, { name })) throw new CommandError('not_found') }

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
      if (!current) throw new CommandError('not_found')
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

  private async writeCard(card: Card, input: CardInput): Promise<Card> {
    const updated = { ...card, name: input.name, description: input.description, important: input.important, urgent: input.urgent }
    if (card.important === input.important && card.urgent === input.urgent) {
      if (JSON.stringify(card) !== JSON.stringify(updated)) await this.db.cards.put(updated)
      return updated
    }
    const cards = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
    const ordered = placeCardInGroup(cards, updated)
    await this.db.cards.bulkPut(ordered)
    return ordered.find(item => item.id === card.id)!
  }

  async updateCard(id: Id, input: CardInput) {
    await this.db.transaction('rw', this.db.cards, async () => {
      const card = await this.db.cards.get(id)
      if (!card) throw new CommandError('not_found', 'Карточка не найдена')
      await this.writeCard(card, input)
    })
  }

  async updateCardAttributes(id: Id, attributes: CardAttributes): Promise<Card> {
    return this.db.transaction('rw', this.db.projects, this.db.statuses, this.db.cards, async () => {
      const card = await this.db.cards.get(id)
      if (!card) throw new CommandError('not_found')
      const status = await this.db.statuses.get(card.statusId)
      if (!status || !await this.db.projects.get(status.projectId)) throw new CommandError('not_found')
      return this.writeCard(card, { ...attributes, description: card.description })
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

  async moveCard(id: Id, placement: CardPlacement): Promise<CardPlacementResult> {
    return this.db.transaction('rw', this.db.cards, this.db.statuses, async () => {
      const card = await this.db.cards.get(id)
      if (!card) throw new Error('source_not_found')
      const [destination, sourceStatus] = await Promise.all([this.db.statuses.get(placement.statusId), this.db.statuses.get(card.statusId)])
      if (!destination || !sourceStatus) throw new Error('status_not_found')
      if (destination.projectId !== sourceStatus.projectId) throw new Error('Нельзя перенести карточку в другой проект')
      const source = await this.db.cards.where('statusId').equals(card.statusId).sortBy('position')
      const target = card.statusId === placement.statusId ? source : await this.db.cards.where('statusId').equals(placement.statusId).sortBy('position')
      const ordered = placeCard(source, target, card, placement)
      if (ordered.unchanged) return 'unchanged'
      await this.db.cards.bulkPut(ordered.target)
      if (card.statusId !== placement.statusId) await this.db.cards.bulkPut(ordered.source)
      return 'saved'
    })
  }
}
