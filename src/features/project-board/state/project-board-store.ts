import { createStore } from 'zustand/vanilla'
import type { CardInput, Id, Project, ProjectBoard } from '../domain/model'
import type { ProjectBoardUseCases } from '../application/use-cases'

export type Workspace =
  | { kind: 'loading' }
  | { kind: 'catalogue'; projects: Project[] }
  | { kind: 'board'; board: ProjectBoard }
  | { kind: 'unavailable' }

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
  moveStatus(projectId: Id, statusId: Id, direction: -1 | 1): Promise<boolean>
  createCard(projectId: Id, statusId: Id, input: CardInput): Promise<boolean>
  updateCard(projectId: Id, cardId: Id, input: CardInput): Promise<boolean>
  moveCard(projectId: Id, cardId: Id, statusId: Id): Promise<boolean>
}


export function createProjectBoardStore(useCases: ProjectBoardUseCases, canMutate = () => true) {
  return createStore<ProjectBoardState>((set, get) => {
    const preserveConfirmedState = async (operation: () => Promise<unknown>) => {
      if (!canMutate()) return false
      try {
        await operation()
        set({ saveError: false })
        return true
      } catch {
        set({ saveError: true })
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
        return preserveConfirmedState(() => useCases.setLastProject())
      },
      async showCatalogue() {
        try {
          set({ workspace: { kind: 'catalogue', projects: await useCases.projects() } })
        } catch {
          set({ workspace: { kind: 'unavailable' } })
        }
      },
      async showBoard(id, remember = false) {
        try {
          const board = await useCases.board(id)
          if (!board) return false
          if (remember && canMutate()) await useCases.setLastProject(id)
          set({ workspace: { kind: 'board', board } })
          return true
        } catch {
          set({ workspace: { kind: 'unavailable' } })
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
        const workspace = get().workspace
        const wasOpen = workspace.kind === 'board' && workspace.board.id === id
        if (await preserveConfirmedState(() => useCases.renameProject(id, name))) {
          if (wasOpen) await get().showBoard(id)
          else await get().showCatalogue()
          return true
        }
        return false
      },
      async createStatus(projectId, name) {
        if (!await preserveConfirmedState(() => useCases.createStatus(projectId, name))) return false
        await get().showBoard(projectId)
        return true
      },
      async renameStatus(projectId, statusId, name) {
        if (!await preserveConfirmedState(() => useCases.renameStatus(statusId, name))) return false
        await get().showBoard(projectId)
        return true
      },
      async moveStatus(projectId, statusId, direction) {
        if (!await preserveConfirmedState(() => useCases.moveStatus(statusId, direction))) return false
        await get().showBoard(projectId)
        return true
      },
      async createCard(projectId, statusId, input) {
        if (!await preserveConfirmedState(() => useCases.createCard(statusId, input))) return false
        await get().showBoard(projectId)
        return true
      },
      async updateCard(projectId, cardId, input) {
        if (!await preserveConfirmedState(() => useCases.updateCard(cardId, input))) return false
        await get().showBoard(projectId)
        return true
      },
      async moveCard(projectId, cardId, statusId) {
        if (!await preserveConfirmedState(() => useCases.moveCard(cardId, statusId))) return false
        await get().showBoard(projectId)
        return true
      },
    }
  })
}

export type ProjectBoardStore = ReturnType<typeof createProjectBoardStore>
