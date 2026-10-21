import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import type { Id } from '../domain/model'
import type { ProjectBoardStore } from '../state/project-board-store'
import { ProjectBoardView } from './project-board-view'
import { ProjectCatalogueView } from './project-catalogue-view'

export function ProjectBoardApp({ store, navigateToProject, navigateToCatalogue, onMutationSaved }: {
  store: ProjectBoardStore
  navigateToProject: (id: Id) => Promise<void>
  navigateToCatalogue: () => Promise<void>
  onMutationSaved?: () => void
}) {
  const { t } = useTranslation()
  const workspace = useStore(store, state => state.workspace)
  const saveError = useStore(store, state => state.saveError)
  const createProject = useStore(store, state => state.createProject)
  const renameProject = useStore(store, state => state.renameProject)
  const createStatus = useStore(store, state => state.createStatus)
  const renameStatus = useStore(store, state => state.renameStatus)
  const moveStatus = useStore(store, state => state.moveStatus)
  const createCard = useStore(store, state => state.createCard)
  const updateCard = useStore(store, state => state.updateCard)
  const moveCard = useStore(store, state => state.moveCard)

  if (workspace.kind === 'loading') return <main className="app-shell" aria-busy="true"><div className="loading-shell"><p className="muted-copy">{t('loading')}</p><div className="skeleton skeleton-title" /><div className="skeleton-columns"><div className="skeleton skeleton-column" /><div className="skeleton skeleton-column" /></div></div></main>
  if (workspace.kind === 'unavailable') return <main className="app-shell"><section className="unavailable-state surface-card"><h1>{t('unavailable')}</h1><p role="alert">{t('unavailableHelp')}</p></section></main>
  if (workspace.kind === 'catalogue') return <ProjectCatalogueView projects={workspace.projects} saveError={saveError}
    onCreate={async name => { const id = await createProject(name); if (id) { onMutationSaved?.(); await navigateToProject(id) } }}
    onOpen={navigateToProject}
    onRename={async (id, name) => { if (await renameProject(id, name)) onMutationSaved?.() }}
  />

  const { board } = workspace
  return <ProjectBoardView board={board} saveError={saveError}
    onReturn={navigateToCatalogue}
    onRenameProject={async name => { if (await renameProject(board.id, name)) onMutationSaved?.() }}
    onCreateStatus={async name => { if (await createStatus(board.id, name)) onMutationSaved?.() }}
    onRenameStatus={async (statusId, name) => { if (await renameStatus(board.id, statusId, name)) onMutationSaved?.() }}
    onMoveStatus={async (statusId, direction) => { if (await moveStatus(board.id, statusId, direction)) onMutationSaved?.() }}
    onCreateCard={async (statusId, name) => { const saved = await createCard(board.id, statusId, name); if (saved) onMutationSaved?.(); return saved }}
    onUpdateCard={async (cardId, name) => { const saved = await updateCard(board.id, cardId, name); if (saved) onMutationSaved?.(); return saved }}
    onMoveCard={async (cardId, statusId) => { const saved = await moveCard(board.id, cardId, statusId); if (saved) onMutationSaved?.(); return saved }}
  />
}
