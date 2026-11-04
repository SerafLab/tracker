import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Card, CardPlacement, CardInput, Id, ProjectBoard, BoardView, Status } from '../domain/model'
import { useModalOpen } from '../../../ui/modal-state'
import { AppBar } from '../../../ui/app-bar'
import { CardView } from './card-view'
import { BoardDrag, usePlacementMarker, useStatusDrop } from './board-drag'
import { BoardIcon } from './board-icon'
import { ActionMenu, CardDialog, NameDialog } from './controls'
import { DeleteDialog } from './delete-dialog'
import type { MoveCardStateResult, DeleteStatusStateResult } from '../state/project-board-store'

type BoardProps = {
  onRequestDestructiveAction?: (action: () => void) => void
  /** The card shown beside the board; only deletions that remove it need the unsaved-draft guard. */
  openCard?: { id: Id; statusId: Id } | null
  /** Receives the node where the narrow-screen install entry is placed after the board content. */
  installSlot?: (node: HTMLElement | null) => void
  focusCreation: boolean
  onCreationFocused: () => void
  board: BoardView
  saveError: boolean
  busy: boolean
  placementPending: boolean
  refreshFailed: boolean
  onRetryRefresh: () => Promise<boolean>
  onReturn: () => Promise<void>
  onDeleteProject: () => Promise<boolean>
  onRenameProject: (name: string) => Promise<void>
  onCreateStatus: (name: string) => Promise<void>
  onRenameStatus: (statusId: Id, name: string) => Promise<void>
  onMoveStatus: (statusId: Id, direction: -1 | 1) => Promise<void>
  onCreateCard: (statusId: Id, input: CardInput) => Promise<boolean>
  onOpenCard: (cardId: Id) => Promise<void>
  onDeleteCard: (cardId: Id) => Promise<boolean>
  onDeleteStatus: (statusId: Id) => Promise<DeleteStatusStateResult>
  onMoveCard: (cardId: Id, placement: CardPlacement) => Promise<MoveCardStateResult>
}

const runImmediately = (action: () => void) => action()

export function ProjectBoardView({ onRequestDestructiveAction = runImmediately, openCard = null, installSlot, focusCreation, onCreationFocused, board, saveError, busy, placementPending, refreshFailed, onRetryRefresh, onReturn, onDeleteProject, onRenameProject, onCreateStatus, onRenameStatus, onMoveStatus, onCreateCard, onOpenCard, onMoveCard, onDeleteCard, onDeleteStatus }: BoardProps) {
  const { t } = useTranslation()
  const [moveDialogCardId, setMoveDialogCardId] = useState<Id | null>(null)
  const root = useRef<HTMLElement>(null)
  const addStatusTrigger = useRef<HTMLButtonElement>(null)
  const modalOpen = useModalOpen()
  useEffect(() => {
    if (focusCreation && !modalOpen) { addStatusTrigger.current?.focus({ preventScroll: true }); onCreationFocused() }
  }, [focusCreation, modalOpen, onCreationFocused])
  const [deleting, setDeleting] = useState<{ kind: 'card' | 'status'; id: Id; name: string; statusId: Id; returnFocus: React.RefObject<HTMLButtonElement | null> } | null>(null)
  const [deleteFocus, setDeleteFocus] = useState<{ statusId?: Id; cardId?: Id } | null>(null)
  useEffect(() => {
    if (!deleteFocus) return
    const timer = window.setTimeout(() => {
      const columns = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-status-id]') ?? [])
      const column = columns.find(item => item.dataset.statusId === deleteFocus.statusId)
      const card = Array.from(column?.querySelectorAll<HTMLElement>('[data-card-id]') ?? []).find(item => item.dataset.cardId === deleteFocus.cardId)
      const trigger = (card ?? column)?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
      ;(trigger ?? addStatusTrigger.current)?.focus({ preventScroll: true })
      setDeleteFocus(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [deleteFocus])
  const confirmDeletion = async () => {
    if (!deleting) return 'failed' as const
    const status = board.statuses.find(item => item.id === deleting.statusId)
    let focus: { statusId?: Id; cardId?: Id }
    if (deleting.kind === 'card') {
      const index = status?.cards.findIndex(card => card.id === deleting.id) ?? -1
      focus = { statusId: status?.id, cardId: status?.cards[index + 1]?.id ?? status?.cards[index - 1]?.id }
      if (!await onDeleteCard(deleting.id)) return 'failed' as const
    } else {
      const index = board.statuses.findIndex(item => item.id === deleting.id)
      focus = { statusId: board.statuses[index + 1]?.id ?? board.statuses[index - 1]?.id }
      const result = await onDeleteStatus(deleting.id)
      if (result !== 'deleted') return result
    }
    setDeleting(null)
    setDeleteFocus(focus)
    return 'deleted' as const
  }
  const [moveFocus, setMoveFocus] = useState<Id | null>(null)
  const [notice, setNotice] = useState<string>('')
  useEffect(() => {
    if (!moveFocus || busy) return
    const card = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-card-id]') ?? []).find(item => item.dataset.cardId === moveFocus)
    card?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.focus({ preventScroll: true })
    setMoveFocus(null)
  }, [moveFocus, busy])
  const moveCard = useCallback(async (cardId: Id, placement: CardPlacement, focus = false) => {
    const result = await onMoveCard(cardId, placement)
    setNotice(t(result === 'saved' ? 'placementSaved' : result === 'unchanged' ? 'placementUnchanged' : result === 'refresh-failed' ? 'placementRefreshFailed' : 'saveError'))
    if (focus) setMoveFocus(cardId)
    return result
  }, [onMoveCard, t])
  const requestStatusDeletion = useCallback((status: ProjectBoard['statuses'][number], returnFocus: React.RefObject<HTMLButtonElement | null>) => {
    const request = openCard?.statusId === status.id ? onRequestDestructiveAction : runImmediately
    request(() => setDeleting({ kind: 'status', id: status.id, statusId: status.id, name: status.name, returnFocus }))
  }, [onRequestDestructiveAction, openCard?.statusId])
  const requestCardDeletion = useCallback((card: Card, returnFocus: React.RefObject<HTMLButtonElement | null>) => {
    const request = openCard?.id === card.id ? onRequestDestructiveAction : runImmediately
    request(() => setDeleting({ kind: 'card', id: card.id, statusId: card.statusId, name: card.name, returnFocus }))
  }, [onRequestDestructiveAction, openCard?.id])
  const statuses = useMemo(() => board.statuses.map(({ cards: _cards, ...status }) => status), [board.statuses])
  const [deletingProject, setDeletingProject] = useState(false)
  const [creatingStatus, setCreatingStatus] = useState(false)
  const [renamingProject, setRenamingProject] = useState(false)
  const projectMenu = useRef<HTMLButtonElement>(null)
  return <>
    <AppBar
      title={board.name}
      onReturn={() => void onReturn()}
      creation={{ disabled: busy, label: t('addStatus'), triggerRef: addStatusTrigger, onSelect: () => setCreatingStatus(true) }}
      rename={{ disabled: busy, triggerRef: projectMenu, onSelect: () => setRenamingProject(true) }}
      deleteProject={{ disabled: busy, triggerRef: projectMenu, onSelect: () => onRequestDestructiveAction(() => setDeletingProject(true)) }}
    />
    <main ref={root} className="app-shell">
      {saveError && !deletingProject ? <p className="save-error" role={moveDialogCardId || deleting ? undefined : 'alert'}>{t('saveError')}</p> : null}
      {board.statuses.length === 0 ? <section className="empty-state surface-card"><h2>{t('firstStatus')}</h2><p>{t('firstStatusHelp')}</p></section> : null}
      <p className="placement-status" role="status" aria-live="polite">{placementPending ? t('placementSaving') : notice}</p>
      {refreshFailed ? <div className="save-error" role="alert"><p>{t('placementRefreshFailed')}</p><button className="button button-secondary" disabled={placementPending} onClick={() => void onRetryRefresh().then(saved => { if (saved) setNotice(t('placementSaved')) })}>{t('retryBoardRead')}</button></div> : null}
      <BoardDrag board={board} disabled={busy} onPlace={moveCard}>
      <section className="status-columns" inert={busy} aria-label={t('statuses')}>
        {board.statuses.map((status, index) => <StatusColumn
          key={status.id}
          status={status}
          index={index}
          total={board.statuses.length}
          statuses={statuses}
          recentNotes={board.recentNotes}
          saveError={saveError}
          disabled={busy}
          onDeleteStatus={requestStatusDeletion}
          onDeleteCard={requestCardDeletion}
          onMoveDialogChange={setMoveDialogCardId}
          onRename={onRenameStatus}
          onMove={onMoveStatus}
          onCreateCard={onCreateCard}
          projectId={board.id}
          onOpenCard={onOpenCard}
          onMoveCard={moveCard}
        />)}
      </section>
      </BoardDrag>
      {deletingProject ? <DeleteDialog kind="project" name={board.name} blocked={false} summary={{ kind: 'ready', statusCount: board.statuses.length, cardCount: board.statuses.reduce((total, status) => total + status.cards.length, 0) }} returnFocus={projectMenu} onDelete={async () => await onDeleteProject() ? 'deleted' : 'failed'} onClose={() => setDeletingProject(false)} /> : null}
      {deleting ? <DeleteDialog kind={deleting.kind} name={deleting.name} blocked={deleting.kind === 'status' && !!board.statuses.find(status => status.id === deleting.id)?.cards.length} returnFocus={deleting.returnFocus} onDelete={confirmDeletion} onClose={() => setDeleting(null)} /> : null}
      {creatingStatus ? <NameDialog returnFocus={addStatusTrigger} title={t('newStatus')} label={t('statusName')} button={t('createStatus')} onSubmit={onCreateStatus} onClose={() => setCreatingStatus(false)} /> : null}
      {renamingProject ? <NameDialog returnFocus={projectMenu} title={t('renameProject')} label={t('newName')} button={t('save')} initialName={board.name} onSubmit={onRenameProject} onClose={() => setRenamingProject(false)} /> : null}
      {installSlot ? <div ref={installSlot} /> : null}
    </main>
  </>
}

type StatusColumnProps = {
  status: ProjectBoard['statuses'][number]
  index: number
  total: number
  statuses: Status[]
  recentNotes: BoardView['recentNotes']
  saveError: boolean
  disabled: boolean
  onDeleteStatus: (status: ProjectBoard['statuses'][number], returnFocus: React.RefObject<HTMLButtonElement | null>) => void
  onDeleteCard: (card: Card, returnFocus: React.RefObject<HTMLButtonElement | null>) => void
  onMoveDialogChange: (cardId: Id | null) => void
  onRename: (statusId: Id, name: string) => Promise<void>
  onMove: (statusId: Id, direction: -1 | 1) => Promise<void>
  onCreateCard: (statusId: Id, input: CardInput) => Promise<boolean>
  projectId: Id
  onOpenCard: (cardId: Id) => Promise<void>
  onMoveCard: (cardId: Id, placement: CardPlacement, focus?: boolean) => Promise<MoveCardStateResult>
}

const StatusColumn = memo(function StatusColumn({ projectId, status, index, total, statuses, recentNotes, saveError, disabled, onMoveDialogChange, onRename, onMove, onCreateCard, onOpenCard, onMoveCard, onDeleteCard, onDeleteStatus }: StatusColumnProps) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const { ref: dropRef } = useStatusDrop(status.id)
  const marker = usePlacementMarker(status)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const headerCreateTrigger = useRef<HTMLButtonElement>(null)
  const footerCreateTrigger = useRef<HTMLButtonElement>(null)
  const createTrigger = useRef<HTMLButtonElement | null>(null)
  const openCreation = (trigger: React.RefObject<HTMLButtonElement | null>) => {
    createTrigger.current = trigger.current
    setCreatingCard(true)
  }
  const [creatingCard, setCreatingCard] = useState(false)
  return <article ref={dropRef} className="status-column" data-status-id={status.id}>
    <header className="column-header">
      <div className="column-heading">
        <h2 className="column-title">{status.name}</h2>
        <span className="card-count"><span aria-hidden="true">{status.cards.length}</span><span className="sr-only">{t('cardCount', { count: status.cards.length })}</span></span>
      </div>
      <button ref={headerCreateTrigger} className="button button-primary button-icon bar-hint add-card-header" aria-label={t('addCard')} data-hint={t('addCard')} onClick={() => openCreation(headerCreateTrigger)}><BoardIcon name="plus" /></button>
      <ActionMenu triggerRef={menuTrigger} label={t('statusActions', { name: status.name })} actions={[
        { label: t('rename'), onSelect: () => setRenaming(true) },
        { label: t('moveLeft'), disabled: index === 0, onSelect: () => void onMove(status.id, -1) },
        { label: t('moveRight'), disabled: index === total - 1, onSelect: () => void onMove(status.id, 1) },
        { label: t('delete'), onSelect: () => onDeleteStatus(status, menuTrigger) },
      ]} />
    </header>
    <ul className="card-list">{status.cards.map(card => <Fragment key={card.id}>
      {marker === card.id ? <li className="card-placement-marker" aria-hidden="true">{t('placementHere')}</li> : null}
      <CardView
      card={card}
      onDelete={onDeleteCard}
      statuses={statuses}
      notes={recentNotes[card.id]}
      saveError={saveError}
      onMoveDialogChange={onMoveDialogChange}
      peers={status.cards}
      disabled={disabled}
      projectId={projectId}
      onOpen={onOpenCard}
      onMove={onMoveCard}
    /></Fragment>)}{marker === null ? <li className="card-placement-marker" aria-hidden="true">{t('placementHere')}</li> : null}</ul>
    <button ref={footerCreateTrigger} className="button button-quiet add-card" onClick={() => openCreation(footerCreateTrigger)}><span className="button button-primary button-icon add-card-symbol" aria-hidden="true"><BoardIcon name="plus" /></span>{t('addCard')}</button>
    {renaming ? <NameDialog title={t('renameStatus')} label={t('newName')} button={t('save')} initialName={status.name} onSubmit={name => onRename(status.id, name)} onClose={() => setRenaming(false)} /> : null}
    {creatingCard ? <CardDialog title={t('newCard')} returnFocus={createTrigger} button={t('createCard')} onSubmit={input => onCreateCard(status.id, input)} onClose={() => setCreatingCard(false)} /> : null}
  </article>
})
