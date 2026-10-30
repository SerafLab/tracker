import { createStore } from 'zustand/vanilla'
import type { CardInput, Id, Project, ProjectBoard } from '../domain/model'
import type { DeleteStatusResult } from '../application/repository'
import type { ProjectBoardUseCases } from '../application/use-cases'

export type Workspace =
  | { kind: 'loading' }
  | { kind: 'catalogue'; projects: Project[] }
  | { kind: 'board'; board: ProjectBoard }
  | { kind: 'unavailable' }

export type DeleteStatusStateResult = DeleteStatusResult | 'failed'

export type ProjectBoardState = {
  workspace: Workspace
  saveError: boolean
  openStorage(): Promise<boolean>
  clearLastProject(): Promise<boolean>
  showCatalogue(): Promise<void>
  showBoard(id: Id, remember?: boolean): Promise<boolean>
  createProject(name: string): Promise<Id | undefined>
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
    let preferenceWrite = Promise.resolve()
    const rememberProject = (id?: Id) => {
      const write = preferenceWrite.then(() => useCases.setLastProject(id))
      preferenceWrite = write.catch(() => {})
      return write
    }
    const refreshBoard = async (id: Id, startedAt: number) => {
      if (navigation === startedAt && currentProjectId === id) await get().showBoard(id)
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
        try {
          const projects = await useCases.projects()
          if (request === startedAt) set({ workspace: { kind: 'catalogue', projects } })
        } catch {
          if (request === startedAt) set({ workspace: { kind: 'unavailable' } })
        }
      },
      async showBoard(id, remember = false) {
        if (remember || currentProjectId !== id) ++navigation
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
      async createProject(name) {
        if (!canMutate()) return undefined
        try {
          const project = await useCases.createProject(name)
          set({ saveError: false })
          return project.id
        } catch {
          set({ saveError: true })
          return undefined
        }
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
        await refreshBoard(projectId, startedAt)
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
