import { createStore } from 'zustand/vanilla'
import type { CardDetails, CardInput, CreateProjectInput, Note, Id, Project, ProjectBoard } from '../domain/model'
import type { DeleteStatusResult } from '../application/repository'
import type { ProjectBoardUseCases } from '../application/use-cases'

export type Workspace =
  | { kind: 'loading' }
  | { kind: 'catalogue'; projects: Project[] }
  | { kind: 'board'; board: ProjectBoard }
  | { kind: 'card'; details: CardDetails }
  | { kind: 'card-missing'; project: Project }
  | { kind: 'unavailable' }

export type DeleteStatusStateResult = DeleteStatusResult | 'failed'
export type ProjectDeletionSummary = { statusCount: number; cardCount: number }
export type ShowCardResult = 'shown' | 'missing' | 'unavailable' | 'superseded'

export type ProjectBoardState = {
  workspace: Workspace
  saveError: boolean
  openStorage(): Promise<boolean>
  clearLastProject(): Promise<boolean>
  showCatalogue(): Promise<void>
  showBoard(id: Id, remember?: boolean): Promise<boolean>
  showCard(projectId: Id, cardId: Id, remember?: boolean): Promise<ShowCardResult>
  createNote(projectId: Id, cardId: Id, text: string): Promise<Note | undefined>
  updateNote(projectId: Id, cardId: Id, noteId: Id, text: string): Promise<Note | undefined>
  deleteNote(projectId: Id, cardId: Id, noteId: Id): Promise<boolean>
  createProject(input: CreateProjectInput): Promise<Id | undefined>
  projectDeletionSummary(id: Id): Promise<ProjectDeletionSummary>
  deleteProject(id: Id): Promise<boolean>
  renameProject(id: Id, name: string): Promise<boolean>
  createStatus(projectId: Id, name: string): Promise<boolean>
  renameStatus(projectId: Id, statusId: Id, name: string): Promise<boolean>
  deleteStatus(projectId: Id, statusId: Id): Promise<DeleteStatusStateResult>
  moveStatus(projectId: Id, statusId: Id, direction: -1 | 1): Promise<boolean>
  createCard(projectId: Id, statusId: Id, input: CardInput): Promise<boolean>
  updateCard(projectId: Id, cardId: Id, input: CardInput): Promise<boolean>
  deleteCard(projectId: Id, cardId: Id): Promise<boolean>
  moveCard(projectId: Id, cardId: Id, statusId: Id): Promise<boolean>
}


export function createProjectBoardStore(useCases: ProjectBoardUseCases, canMutate = () => true) {
  return createStore<ProjectBoardState>((set, get) => {
    let request = 0
    let navigation = 0
    let currentProjectId: Id | undefined
    let currentCardId: Id | undefined
    let preferenceWrite = Promise.resolve()
    const rememberProject = (id?: Id) => {
      const write = preferenceWrite.then(() => useCases.setLastProject(id))
      preferenceWrite = write.catch(() => {})
      return write
    }
    const refreshBoard = async (id: Id, startedAt: number) => {
      if (navigation === startedAt && currentProjectId === id) {
        if (currentCardId) await get().showCard(id, currentCardId)
        else await get().showBoard(id)
      }
    }
    const preserveConfirmedState = async (operation: () => Promise<unknown>) => {
      if (!canMutate()) return false
      const startedAt = navigation
      try {
        await operation()
        if (startedAt === navigation) set({ saveError: false })
        return true
      } catch {
        if (startedAt === navigation) set({ saveError: true })
        return false
      }
    }

    return {
      workspace: { kind: 'loading' },
      saveError: false,
      async openStorage() {
        try {
          await useCases.open()
          return true
        } catch {
          set({ workspace: { kind: 'unavailable' } })
          return false
        }
      },
      async clearLastProject() {
        return preserveConfirmedState(() => rememberProject())
      },
      async showCatalogue() {
        ++navigation
        const startedAt = ++request
        currentProjectId = undefined
        currentCardId = undefined
        try {
          const projects = await useCases.projects()
          if (request === startedAt) set({ workspace: { kind: 'catalogue', projects } })
        } catch {
          if (request === startedAt) set({ workspace: { kind: 'unavailable' } })
        }
      },
      async showBoard(id, remember = false) {
        if (remember || currentProjectId !== id || currentCardId) ++navigation
        currentCardId = undefined
        const startedAt = ++request
        currentProjectId = id
        try {
          const board = await useCases.board(id)
          if (request !== startedAt || !board) return false
          if (remember && canMutate()) await rememberProject(id)
          if (request !== startedAt) return false
          set({ workspace: { kind: 'board', board } })
          return true
        } catch {
          if (request === startedAt) set({ workspace: { kind: 'unavailable' } })
          return false
        }
      },
      async showCard(projectId, cardId, remember = false) {
        if (remember || currentProjectId !== projectId || currentCardId !== cardId) ++navigation
        const startedAt = ++request
        currentProjectId = projectId
        currentCardId = cardId
        try {
          const details = await useCases.cardDetails(projectId, cardId)
          if (request !== startedAt) return 'superseded'
          if (!details) {
            const board = await useCases.board(projectId)
            if (request !== startedAt) return 'superseded'
            if (!board) return 'missing'
            set({ workspace: { kind: 'card-missing', project: board } })
            return 'shown'
          }
          if (remember && canMutate()) await rememberProject(projectId)
          if (request !== startedAt) return 'superseded'
          set({ workspace: { kind: 'card', details } })
          return 'shown'
        } catch {
          if (request !== startedAt) return 'superseded'
          set({ workspace: { kind: 'unavailable' } })
          return 'unavailable'
        }
      },
      async createNote(projectId, cardId, text) {
        let saved: Note | undefined
        if (!await preserveConfirmedState(async () => { saved = await useCases.createNote(cardId, text) })) return undefined
        const current = get().workspace
        if (saved && current.kind === 'card' && current.details.project.id === projectId && current.details.card.id === cardId) {
          const notes = [...current.details.notes, saved].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
          set({ workspace: { kind: 'card', details: { ...current.details, notes } } })
        }
        return saved
      },
      async updateNote(projectId, cardId, noteId, text) {
        let saved: Note | undefined
        if (!await preserveConfirmedState(async () => { saved = await useCases.updateNote(cardId, noteId, text) })) return undefined
        const current = get().workspace
        if (saved && current.kind === 'card' && current.details.project.id === projectId && current.details.card.id === cardId) {
          set({ workspace: { kind: 'card', details: { ...current.details, notes: current.details.notes.map(note => note.id === noteId ? saved! : note) } } })
        }
        return saved
      },
      async deleteNote(projectId, cardId, noteId) {
        if (!await preserveConfirmedState(() => useCases.deleteNote(cardId, noteId))) return false
        const current = get().workspace
        if (current.kind === 'card' && current.details.project.id === projectId && current.details.card.id === cardId) {
          set({ workspace: { kind: 'card', details: { ...current.details, notes: current.details.notes.filter(note => note.id !== noteId) } } })
        }
        return true
      },
      async createProject(input) {
        if (!canMutate()) return undefined
        try {
          const project = await useCases.createProject(input)
          set({ saveError: false })
          return project.id
        } catch {
          set({ saveError: true })
          return undefined
        }
      },
      async projectDeletionSummary(id) {
        const board = await useCases.board(id)
        if (!board) throw new Error('Проект не найден')
        return { statusCount: board.statuses.length, cardCount: board.statuses.reduce((total, status) => total + status.cards.length, 0) }
      },
      async deleteProject(id) {
        const startedAt = navigation
        if (!await preserveConfirmedState(async () => { await preferenceWrite; await useCases.deleteProject(id) })) return false
        if (navigation === startedAt) await get().showCatalogue()
        return true
      },
      async renameProject(id, name) {
        const startedAt = navigation
        const workspace = get().workspace
        const wasOpen = workspace.kind === 'board' && workspace.board.id === id
        if (await preserveConfirmedState(() => useCases.renameProject(id, name))) {
          if (navigation === startedAt) {
            if (wasOpen) await refreshBoard(id, startedAt)
            else await get().showCatalogue()
          }
          return true
        }
        return false
      },
      async createStatus(projectId, name) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.createStatus(projectId, name))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
      async renameStatus(projectId, statusId, name) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.renameStatus(statusId, name))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
      async deleteStatus(projectId, statusId) {
        const startedAt = navigation
        if (!canMutate()) return 'failed'
        try {
          const result = await useCases.deleteStatus(statusId)
          if (navigation === startedAt) set({ saveError: false })
          if (result === 'deleted') await refreshBoard(projectId, startedAt)
          return result
        } catch {
          if (navigation === startedAt) set({ saveError: true })
          return 'failed'
        }
      },
      async moveStatus(projectId, statusId, direction) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.moveStatus(statusId, direction))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
      async createCard(projectId, statusId, input) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.createCard(statusId, input))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
      async updateCard(projectId, cardId, input) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.updateCard(cardId, input))) return false
        const current = get().workspace
        if (current.kind === 'card' && current.details.card.id === cardId && current.details.project.id === projectId) {
          set({ workspace: { kind: 'card', details: { ...current.details, card: { ...current.details.card, ...input, name: input.name.trim() } } } })
        } else await refreshBoard(projectId, startedAt)
        return true
      },
      async deleteCard(projectId, cardId) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.deleteCard(cardId))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
      async moveCard(projectId, cardId, statusId) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.moveCard(cardId, statusId))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
    }
  })
}

export type ProjectBoardStore = ReturnType<typeof createProjectBoardStore>
