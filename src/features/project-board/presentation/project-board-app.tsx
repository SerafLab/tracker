import { useStore } from 'zustand'
import type { Id } from '../domain/model'
import type { ProjectBoardStore } from '../state/project-board-store'
import { ProjectBoardView } from './project-board-view'
import { ProjectCatalogueView } from './project-catalogue-view'

export function ProjectBoardApp({ store, navigateToProject, navigateToCatalogue }: {
  store: ProjectBoardStore
  navigateToProject: (id: Id) => Promise<void>
  navigateToCatalogue: () => Promise<void>
}) {
  const workspace = useStore(store, state => state.workspace)
  const saveError = useStore(store, state => state.saveError)
  const createProject = useStore(store, state => state.createProject)
  const renameProject = useStore(store, state => state.renameProject)
  const createStatus = useStore(store, state => state.createStatus)
  const renameStatus = useStore(store, state => state.renameStatus)
  const moveStatus = useStore(store, state => state.moveStatus)
  const createCard = useStore(store, state => state.createCard)
  const renameCard = useStore(store, state => state.renameCard)
  const moveCard = useStore(store, state => state.moveCard)

  if (workspace.kind === 'loading') return <main className="app-shell" aria-busy="true"><div className="loading-shell"><p className="muted-copy">Открываем рабочее пространство…</p><div className="skeleton skeleton-title" /><div className="skeleton-columns"><div className="skeleton skeleton-column" /><div className="skeleton skeleton-column" /></div></div></main>
  if (workspace.kind === 'unavailable') return <main className="app-shell"><section className="unavailable-state surface-card"><h1>Рабочая доска недоступна</h1><p role="alert">Локальное хранилище недоступно. Изменения не будут показаны как сохранённые.</p></section></main>
  if (workspace.kind === 'catalogue') return <ProjectCatalogueView projects={workspace.projects} saveError={saveError}
    onCreate={async name => { const id = await createProject(name); if (id) await navigateToProject(id) }}
    onOpen={navigateToProject}
    onRename={renameProject}
  />

  const { board } = workspace
  return <ProjectBoardView board={board} saveError={saveError}
    onReturn={navigateToCatalogue}
    onRenameProject={name => renameProject(board.id, name)}
    onCreateStatus={name => createStatus(board.id, name)}
    onRenameStatus={(statusId, name) => renameStatus(board.id, statusId, name)}
    onMoveStatus={(statusId, direction) => moveStatus(board.id, statusId, direction)}
    onCreateCard={(statusId, name) => createCard(board.id, statusId, name)}
    onRenameCard={(cardId, name) => renameCard(board.id, cardId, name)}
    onMoveCard={(cardId, statusId) => moveCard(board.id, cardId, statusId)}
  />
}
