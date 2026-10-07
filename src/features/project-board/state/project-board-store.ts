import { createStore } from 'zustand/vanilla'
import type { Id, Project, ProjectBoard } from '../domain/model'
import type { ProjectBoardUseCases } from '../application/use-cases'

export type Workspace =
  | { kind: 'loading' }
  | { kind: 'catalogue'; projects: Project[] }
  | { kind: 'board'; board: ProjectBoard }
  | { kind: 'unavailable' }

export type ProjectBoardState = {
  workspace: Workspace
  saveError: string
  openStorage(): Promise<boolean>
  clearLastProject(): Promise<boolean>
  showCatalogue(): Promise<void>
  showBoard(id: Id, remember?: boolean): Promise<boolean>
  createProject(name: string): Promise<Id | undefined>
  renameProject(id: Id, name: string): Promise<void>
  createStatus(projectId: Id, name: string): Promise<void>
  renameStatus(projectId: Id, statusId: Id, name: string): Promise<void>
  moveStatus(projectId: Id, statusId: Id, direction: -1 | 1): Promise<void>
  createCard(projectId: Id, statusId: Id, name: string): Promise<void>
  renameCard(projectId: Id, cardId: Id, name: string): Promise<void>
  moveCard(projectId: Id, cardId: Id, statusId: Id): Promise<void>
}

const saveError = 'Не удалось сохранить изменения. Проверьте доступность локального хранилища и повторите попытку.'

export function createProjectBoardStore(useCases: ProjectBoardUseCases) {
  return createStore<ProjectBoardState>((set, get) => {
    const preserveConfirmedState = async (operation: () => Promise<unknown>) => {
      try {
        await operation()
        set({ saveError: '' })
        return true
      } catch {
        set({ saveError })
        return false
      }
    }

    return {
      workspace: { kind: 'loading' },
      saveError: '',
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
          if (remember) await useCases.setLastProject(id)
          set({ workspace: { kind: 'board', board } })
          return true
        } catch {
          set({ workspace: { kind: 'unavailable' } })
          return false
        }
      },
      async createProject(name) {
        try {
          const project = await useCases.createProject(name)
          set({ saveError: '' })
          return project.id
        } catch {
          set({ saveError })
          return undefined
        }
      },
      async renameProject(id, name) {
        const workspace = get().workspace
        const wasOpen = workspace.kind === 'board' && workspace.board.id === id
        if (await preserveConfirmedState(() => useCases.renameProject(id, name))) {
          if (wasOpen) await get().showBoard(id)
          else await get().showCatalogue()
        }
      },
      async createStatus(projectId, name) {
        if (await preserveConfirmedState(() => useCases.createStatus(projectId, name))) await get().showBoard(projectId)
      },
      async renameStatus(projectId, statusId, name) {
        if (await preserveConfirmedState(() => useCases.renameStatus(statusId, name))) await get().showBoard(projectId)
      },
      async moveStatus(projectId, statusId, direction) {
        if (await preserveConfirmedState(() => useCases.moveStatus(statusId, direction))) await get().showBoard(projectId)
      },
      async createCard(projectId, statusId, name) {
        if (await preserveConfirmedState(() => useCases.createCard(statusId, name))) await get().showBoard(projectId)
      },
      async renameCard(projectId, cardId, name) {
        if (await preserveConfirmedState(() => useCases.renameCard(cardId, name))) await get().showBoard(projectId)
      },
      async moveCard(projectId, cardId, statusId) {
        if (await preserveConfirmedState(() => useCases.moveCard(cardId, statusId))) await get().showBoard(projectId)
      },
    }
  })
}

export type ProjectBoardStore = ReturnType<typeof createProjectBoardStore>
