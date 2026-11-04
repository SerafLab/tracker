import { CommandError, type AgentCommand, type AgentSavedData } from '../application/agent-command'
import { createStore } from 'zustand/vanilla'
import type { CardDetails, CardPlacement, CardPlacementResult, CardInput, CreateProjectInput, Note, Id, Project, ProjectSummary, ProjectBoard } from '../domain/model'
import type { DeleteStatusResult } from '../application/repository'
import type { ProjectBoardUseCases } from '../application/use-cases'

export type Workspace =
  | { kind: 'loading' }
  | { kind: 'catalogue'; projects: ProjectSummary[] }
  | { kind: 'board'; board: ProjectBoard }
  | { kind: 'card'; details: CardDetails }
  | { kind: 'card-missing'; project: Project }
  | { kind: 'unavailable' }

export type DeleteStatusStateResult = DeleteStatusResult | 'failed'
export type ProjectDeletionSummary = { statusCount: number; cardCount: number }
export type MoveCardStateResult = CardPlacementResult | 'failed' | 'refresh-failed'
export type ShowCardResult = 'shown' | 'missing' | 'unavailable' | 'superseded'

export type ProjectBoardState = {
  workspace: Workspace
  boardSnapshot: ProjectBoard | null
  storageState: 'opening' | 'ready' | 'storage_unavailable'
  agentPending: boolean
  agentRefreshError: boolean
  assertAgentReady(): void
  beginAgentOperation(): () => void
  executeAgentCommand(command: AgentCommand): Promise<AgentSavedData & { warning?: { code: 'view_refresh_failed'; message: string } }>
  retryAgentRefresh(): Promise<boolean>
  saveError: boolean
  placementPending: boolean
  placementRefreshError: Id | null
  retryPlacementRefresh(): Promise<boolean>
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
  moveCard(projectId: Id, cardId: Id, placement: CardPlacement): Promise<MoveCardStateResult>
}


export function createProjectBoardStore(useCases: ProjectBoardUseCases, canMutate = () => true) {
  return createStore<ProjectBoardState>((set, get) => {
    let pendingUiWrites = 0
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
        if (currentCardId) {
          const cardId = currentCardId, refreshRequest = ++request
          try {
            const [details, board] = await Promise.all([useCases.cardDetails(id, cardId), useCases.board(id)])
            if (navigation !== startedAt || request !== refreshRequest) return
            if (!board) throw new Error('board_not_found')
            set({ boardSnapshot: board, workspace: details ? { kind: 'card', details } : { kind: 'card-missing', project: board } })
          } catch { if (navigation === startedAt && request === refreshRequest) set({ agentRefreshError: true }) }
        } else await get().showBoard(id)
      }
    }
    const preserveConfirmedState = async (operation: () => Promise<unknown>) => {
      if (!canMutate() || get().agentPending || get().agentRefreshError || get().placementPending || get().placementRefreshError) return false
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

    const assertAgentReady = () => {
      if (!canMutate()) throw new CommandError('restart_required')
      if (get().storageState !== 'ready') throw new CommandError(get().storageState === 'opening' ? 'disconnected' : 'storage_unavailable')
      if (pendingUiWrites || get().agentPending || get().agentRefreshError || get().placementPending || get().placementRefreshError) throw new CommandError('conflict', 'A write or view recovery is pending')
    }
    const refreshCurrent = async (affectedProject?: Id) => {
      // A navigation already reading its destination owns that request; never supersede it with a background refresh.
      if (pendingUiWrites) return true
      const workspace = get().workspace, startedAt = navigation

      if (workspace.kind === 'board' && affectedProject && workspace.board.id !== affectedProject) return true
      if (workspace.kind === 'card' && affectedProject && workspace.details.project.id !== affectedProject) return true
      const refreshRequest = ++request
      try {
        let refreshed: Workspace = workspace
        if (workspace.kind === 'catalogue') refreshed = { kind: 'catalogue', projects: await useCases.catalogue() }
        else if (workspace.kind === 'board') {
          const board = await useCases.board(workspace.board.id)
          if (!board) throw new Error('board_not_found')
          refreshed = { kind: 'board', board }
        } else if (workspace.kind === 'card') {
          const [details, board] = await Promise.all([useCases.cardDetails(workspace.details.project.id, workspace.details.card.id), useCases.board(workspace.details.project.id)])
          if (!board) throw new Error('board_not_found')
          if (navigation === startedAt && request === refreshRequest) set({ boardSnapshot: board })
          if (details) refreshed = { kind: 'card', details }
          else refreshed = { kind: 'card-missing', project: workspace.details.project }
        }
        if (navigation === startedAt && request === refreshRequest) set({ workspace: refreshed, agentRefreshError: false })
        return true
      } catch {
        if (navigation === startedAt && request === refreshRequest) { set({ agentRefreshError: true }); return false }
        return true
      }
    }
    const state: ProjectBoardState = {
      workspace: { kind: 'loading' },
      boardSnapshot: null,
      storageState: 'opening',
      agentPending: false,
      agentRefreshError: false,
      assertAgentReady,
      beginAgentOperation() {
        assertAgentReady()
        set({ agentPending: true })
        return () => set({ agentPending: false })
      },
      async executeAgentCommand(command) {
        const release = get().beginAgentOperation()
        try {
          const result = await useCases.executeAgentCommand(command)
          const refreshed = await refreshCurrent(result.projectId)
          return refreshed ? result.data : { ...result.data, warning: { code: 'view_refresh_failed', message: 'Saved; retry reading the current view without repeating the mutation' } }
        } finally { release() }
      },
      async retryAgentRefresh() {
        if (!canMutate() || get().agentPending || get().placementPending || pendingUiWrites) return false
        set({ agentPending: true })
        try { return await refreshCurrent() } finally { set({ agentPending: false }) }
      },
      saveError: false,
      placementPending: false,
      placementRefreshError: null,
      async retryPlacementRefresh() {
        const id = get().placementRefreshError
        if (!id || get().placementPending) return false
        const startedAt = ++request
        set({ placementPending: true })
        try {
          const board = await useCases.board(id)
          if (!board) throw new Error('board_not_found')
          if (request !== startedAt || currentProjectId !== id) return false
          set({ boardSnapshot: board, ...(!currentCardId ? { workspace: { kind: 'board' as const, board } } : {}), placementRefreshError: null, agentRefreshError: false })
          if (currentCardId) await refreshBoard(id, navigation)
          return true
        } catch { return false }
        finally { set({ placementPending: false }) }
      },
      async openStorage() {
        try {
          await useCases.open()
          set({ storageState: 'ready' })
          return true
        } catch {
          set({ workspace: { kind: 'unavailable' }, storageState: 'storage_unavailable' })
          return false
        }
      },
      async clearLastProject() {
        if (!canMutate()) return false
        const startedAt = navigation
        try {
          await rememberProject()
          if (navigation === startedAt) set({ saveError: false })
          return true
        } catch {
          if (navigation === startedAt) set({ saveError: true })
          return false
        }
      },
      async showCatalogue() {
        set({ placementRefreshError: null, agentRefreshError: false })
        ++navigation
        const startedAt = ++request
        currentProjectId = undefined
        currentCardId = undefined
        try {
          const projects = await useCases.catalogue()
          if (request === startedAt) set({ boardSnapshot: null, workspace: { kind: 'catalogue', projects } })
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
          set({ boardSnapshot: board, workspace: { kind: 'board', board }, placementRefreshError: null, agentRefreshError: false })
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
          const [details, board] = await Promise.all([useCases.cardDetails(projectId, cardId), useCases.board(projectId)])
          if (request !== startedAt) return 'superseded'
          if (!board) {
            set({ boardSnapshot: null })
            return 'missing'
          }
          if (!details) {
            set({ boardSnapshot: board, workspace: { kind: 'card-missing', project: board } })
            return 'shown'
          }
          if (remember && canMutate()) await rememberProject(projectId)
          if (request !== startedAt) return 'superseded'
          set({ boardSnapshot: board, workspace: { kind: 'card', details } })
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
        if (!canMutate() || get().agentPending || get().agentRefreshError || get().placementPending || get().placementRefreshError) return undefined
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
        const wasOpen = (workspace.kind === 'board' && workspace.board.id === id) || (workspace.kind === 'card' && workspace.details.project.id === id)
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
        if (!canMutate() || get().agentPending || get().agentRefreshError || get().placementPending || get().placementRefreshError) return 'failed'
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
        }
        // Re-read priority order after commit; a failed read must not repeat the saved write.
        if (navigation !== startedAt || currentProjectId !== projectId) return true
        const refreshRequest = ++request
        try {
          const board = await useCases.board(projectId)
          if (!board) throw new Error('board_not_found')
          if (navigation === startedAt && request === refreshRequest) set({ boardSnapshot: board, ...(get().workspace.kind === 'board' ? { workspace: { kind: 'board' as const, board } } : {}) })
        } catch { if (navigation === startedAt && request === refreshRequest) set({ agentRefreshError: true }) }
        return true
      },
      async deleteCard(projectId, cardId) {
        const startedAt = navigation
        if (!await preserveConfirmedState(() => useCases.deleteCard(cardId))) return false
        await refreshBoard(projectId, startedAt)
        return true
      },
      async moveCard(projectId, cardId, placement) {
        if (!canMutate() || get().agentPending || get().agentRefreshError || get().placementPending || get().placementRefreshError) return 'failed'
        const startedAt = navigation
        set({ placementPending: true, saveError: false })
        let result: CardPlacementResult
        try { result = await useCases.moveCard(cardId, placement) }
        catch { set({ placementPending: false, ...(navigation === startedAt ? { saveError: true } : {}) }); return 'failed' }
        if (navigation === startedAt && currentProjectId === projectId) {
          const refreshRequest = ++request
          try {
            const board = await useCases.board(projectId)
            if (!board) throw new Error('board_not_found')
            if (navigation === startedAt && request === refreshRequest) {
              set({ boardSnapshot: board, ...(!currentCardId ? { workspace: { kind: 'board' as const, board } } : {}) })
              if (currentCardId) await refreshBoard(projectId, startedAt)
            }
          } catch {
            if (navigation === startedAt && request === refreshRequest) {
              set({ placementPending: false, placementRefreshError: projectId })
              return 'refresh-failed'
            }
          }
        }
        set({ placementPending: false })
        return result
      },
    }
    const tracked = ['createNote', 'updateNote', 'deleteNote', 'createProject', 'deleteProject', 'renameProject', 'createStatus', 'renameStatus', 'deleteStatus', 'moveStatus', 'createCard', 'updateCard', 'deleteCard', 'moveCard', 'clearLastProject', 'showBoard', 'showCard', 'showCatalogue'] as const
    for (const name of tracked) {
      const action = state[name] as (...args: never[]) => Promise<unknown>
      ;(state as unknown as Record<string, (...args: never[]) => Promise<unknown>>)[name] = async (...args) => {
        pendingUiWrites++
        try { return await action(...args) } finally { pendingUiWrites-- }
      }
    }
    return state
  })
}

export type ProjectBoardStore = ReturnType<typeof createProjectBoardStore>
