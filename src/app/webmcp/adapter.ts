import type { AgentCommand, ProjectBoardStore } from '../../features/project-board'
import type { RuntimeDependencies } from './runtime'
import { ToolError } from './error'
import type { ConnectionState, StatusSetId, ToolName } from './schemas'

type Dependencies = {
  store: ProjectBoardStore
  state(): ConnectionState
  route(): string
  isDirty(): boolean
  showWorkspace(projectId?: string): Promise<{ route: string; url: string }>
  reads: { projects(): Promise<unknown>; board(projectId: string): Promise<unknown> }
  onSaved(): void
  /** Localized names of a built-in set, from the same catalogue and language as the UI. */
  statusNames(id: StatusSetId | 'none'): string[]
}
export function createBrowserAdapter(dependencies: Dependencies): RuntimeDependencies {
  const { store } = dependencies
  const guard = (tool: ToolName, input: Record<string, unknown>) => {
    store.getState().assertAgentReady()
    const workspace = store.getState().workspace
    if (dependencies.isDirty() && (tool === 'show_workspace' || (workspace.kind === 'card' && input.cardId === workspace.details.card.id && ['update_card', 'move_card', 'delete_card'].includes(tool)))) throw new ToolError('conflict', 'Unsaved card fields or note draft would be affected')
  }
  return {
    state: dependencies.state,
    route: dependencies.route,
    guard,
    async execute(tool, input) {
      if (tool === 'list_projects') return { projects: await dependencies.reads.projects() }
      if (tool === 'get_board') {
        const board = await dependencies.reads.board(input.projectId as string)
        if (!board) throw new ToolError('not_found')
        return { board }
      }
      if (tool === 'show_workspace') {
        guard(tool, input)
        const release = store.getState().beginAgentOperation()
        try { return await dependencies.showWorkspace(input.projectId as string | undefined) } finally { release() }
      }
      // Metadata is validated by the native contract and never enters repository commands.
      const { sessionId: _session, requestId: _request, confirm: _confirm, statusSetId, ...fields } = input
      const statusNames = statusSetId ? { statusNames: dependencies.statusNames(statusSetId as StatusSetId | 'none') } : {}
      const data = await store.getState().executeAgentCommand({ ...fields, ...statusNames, kind: tool } as AgentCommand)
      dependencies.onSaved()
      return data
    },
  }
}
