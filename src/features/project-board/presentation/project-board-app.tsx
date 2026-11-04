import { useState } from 'react'
import { AppBar } from '../../../ui/app-bar'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import type { Id, RegisterDraftGuard } from '../domain/model'
import type { ProjectBoardStore } from '../state/project-board-store'
import { ProjectBoardView } from './project-board-view'
import { ProjectCatalogueView } from './project-catalogue-view'
import { CardDetailView } from './card-detail-view'

export function ProjectBoardApp({ store, navigateToProject, navigateToCatalogue, navigateToCard, onProjectDeleted, registerDraftGuard, requestLeave, onMutationSaved }: {
  store: ProjectBoardStore
  navigateToProject: (id: Id) => Promise<void>
  navigateToCatalogue: () => Promise<void>
  onProjectDeleted: (id: Id) => Promise<void>
  navigateToCard: (projectId: Id, cardId: Id) => Promise<void>
  registerDraftGuard: RegisterDraftGuard
  requestLeave: (action: () => void | Promise<void>) => void
  onMutationSaved?: () => void
}) {
  const { t } = useTranslation()
  const [focusCatalogueCreation, setFocusCatalogueCreation] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<Id | null>(null)
  const workspace = useStore(store, state => state.workspace)
  const agentPending = useStore(store, state => state.agentPending)
  const agentRefreshError = useStore(store, state => state.agentRefreshError)
  const applyingStatusSet = useStore(store, state => state.applyingStatusSet)
  const placementPending = useStore(store, state => state.placementPending)
  const placementRefreshError = useStore(store, state => state.placementRefreshError)
  const saveError = useStore(store, state => state.saveError)
  const createProject = useStore(store, state => state.createProject)
  const renameProject = useStore(store, state => state.renameProject)
  const createStatus = useStore(store, state => state.createStatus)
  const renameStatus = useStore(store, state => state.renameStatus)
  const moveStatus = useStore(store, state => state.moveStatus)
  const createCard = useStore(store, state => state.createCard)
  const updateCard = useStore(store, state => state.updateCard)
  const moveCard = useStore(store, state => state.moveCard)
  const deleteCard = useStore(store, state => state.deleteCard)
  const deleteStatus = useStore(store, state => state.deleteStatus)

  if (workspace.kind === 'loading') return <><AppBar key="loading" title={t('loading')} /><main className="app-shell" aria-busy="true"><div className="loading-shell"><div className="skeleton skeleton-title" /><div className="skeleton-columns"><div className="skeleton skeleton-column" /><div className="skeleton skeleton-column" /></div></div></main></>
  if (workspace.kind === 'unavailable') return <><AppBar key="unavailable" title={t('unavailable')} /><main className="app-shell"><section className="unavailable-state surface-card"><p role="alert">{t('unavailableHelp')}</p></section></main></>
  if (workspace.kind === 'catalogue') return <ProjectCatalogueView projects={workspace.projects} saveError={saveError} focusCreation={focusCatalogueCreation} onCreationFocused={() => setFocusCatalogueCreation(false)}
    onReadSummary={store.getState().projectDeletionSummary}
    onDelete={async id => { const saved = await store.getState().deleteProject(id); if (saved) onMutationSaved?.(); return saved }}
    onCreate={async input => {
      const id = await createProject(input)
      if (!id) return false
      setCreatedProjectId(id)
      // Persistence already succeeded: a navigation error must not offer another creation.
      try { onMutationSaved?.(); await navigateToProject(id) } catch { await store.getState().showCatalogue() }
      return true
    }}
    onOpen={navigateToProject}
    onRename={async (id, name) => { if (await renameProject(id, name)) onMutationSaved?.() }}
  />

  if (workspace.kind === 'card-missing') return <><AppBar title={t('cardMissing')} onReturn={() => void navigateToCatalogue()} /><main className="app-shell"><p role="alert">{t('cardMissingHelp')}</p><button className="button button-secondary" onClick={() => void navigateToProject(workspace.project.id)}>{t('backToBoard')}</button></main></>
  if (workspace.kind === 'card') {
    const { details } = workspace
    return <CardDetailView key={details.card.id} details={details} busy={agentPending || agentRefreshError} registerDraftGuard={registerDraftGuard} requestLeave={requestLeave}
      onReturn={() => navigateToProject(details.project.id)} onCatalogue={navigateToCatalogue}
      onSave={async input => { const saved = await updateCard(details.project.id, details.card.id, input); if (saved) onMutationSaved?.(); return saved }}
      onCreateNote={async text => { const saved = await store.getState().createNote(details.project.id, details.card.id, text); if (saved) onMutationSaved?.(); return saved }}
      onUpdateNote={async (id, text) => { const saved = await store.getState().updateNote(details.project.id, details.card.id, id, text); if (saved) onMutationSaved?.(); return saved }}
      onDeleteNote={async id => { const saved = await store.getState().deleteNote(details.project.id, details.card.id, id); if (saved) onMutationSaved?.(); return saved }}
    />
  }

  const { board } = workspace
  return <ProjectBoardView key={board.id} board={board} focusCreation={createdProjectId === board.id} onCreationFocused={() => setCreatedProjectId(null)} saveError={saveError} placementPending={placementPending} busy={applyingStatusSet || agentPending || agentRefreshError || placementPending || !!placementRefreshError} refreshFailed={!!placementRefreshError} onRetryRefresh={() => store.getState().retryPlacementRefresh()}
    onReturn={navigateToCatalogue}
    onApplyStatusSet={async names => { const result = await store.getState().applyStatusSet(board.id, names); if (result === 'saved') onMutationSaved?.(); return result }}
    onDeleteProject={async () => {
      const saved = await store.getState().deleteProject(board.id)
      if (saved) { setFocusCatalogueCreation(true); onMutationSaved?.(); await onProjectDeleted(board.id) }
      return saved
    }}
    onRenameProject={async name => { if (await renameProject(board.id, name)) onMutationSaved?.() }}
    onCreateStatus={async name => { if (await createStatus(board.id, name)) onMutationSaved?.() }}
    onRenameStatus={async (statusId, name) => { if (await renameStatus(board.id, statusId, name)) onMutationSaved?.() }}
    onMoveStatus={async (statusId, direction) => { if (await moveStatus(board.id, statusId, direction)) onMutationSaved?.() }}
    onCreateCard={async (statusId, name) => { const saved = await createCard(board.id, statusId, name); if (saved) onMutationSaved?.(); return saved }}
    onOpenCard={cardId => navigateToCard(board.id, cardId)}
    onDeleteCard={async cardId => { const saved = await deleteCard(board.id, cardId); if (saved) onMutationSaved?.(); return saved }}
    onDeleteStatus={async statusId => { const result = await deleteStatus(board.id, statusId); if (result === 'deleted') onMutationSaved?.(); return result }}
    onMoveCard={async (cardId, placement) => { const result = await moveCard(board.id, cardId, placement); if (result === 'saved') onMutationSaved?.(); return result }}
  />
}
