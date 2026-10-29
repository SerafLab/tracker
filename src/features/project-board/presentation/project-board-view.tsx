import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardInput, Id, ProjectBoard, Status } from '../domain/model'
import { AppBar } from '../../../ui/app-bar'
import { CardView, type CardMoveFocus } from './card-view'
import { BoardIcon } from './board-icon'
import { ActionMenu, CardDialog, NameDialog } from './controls'
import { DeleteDialog } from './delete-dialog'
import type { DeleteStatusStateResult } from '../state/project-board-store'

type BoardProps = {
  board: ProjectBoard
  saveError: boolean
  onReturn: () => Promise<void>
  onRenameProject: (name: string) => Promise<void>
  onCreateStatus: (name: string) => Promise<void>
  onRenameStatus: (statusId: Id, name: string) => Promise<void>
  onMoveStatus: (statusId: Id, direction: -1 | 1) => Promise<void>
  onCreateCard: (statusId: Id, input: CardInput) => Promise<boolean>
  onUpdateCard: (cardId: Id, input: CardInput) => Promise<boolean>
  onDeleteCard: (cardId: Id) => Promise<boolean>
  onDeleteStatus: (statusId: Id) => Promise<DeleteStatusStateResult>
  onMoveCard: (cardId: Id, statusId: Id) => Promise<boolean>
}

export function ProjectBoardView({ board, saveError, onReturn, onRenameProject, onCreateStatus, onRenameStatus, onMoveStatus, onCreateCard, onUpdateCard, onMoveCard, onDeleteCard, onDeleteStatus }: BoardProps) {
  const { t } = useTranslation()
  const [moveDialogCardId, setMoveDialogCardId] = useState<Id | null>(null)
  const root = useRef<HTMLElement>(null)
  const addStatusTrigger = useRef<HTMLButtonElement>(null)
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
  const [moveFocus, setMoveFocus] = useState<{ cardId: Id; control: CardMoveFocus } | null>(null)
  useEffect(() => {
    if (!moveFocus) return
    const card = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-card-id]') ?? []).find(item => item.dataset.cardId === moveFocus.cardId)
    const preferred = card?.querySelector<HTMLButtonElement>(`[data-card-move="${moveFocus.control}"]:not(:disabled)`)
    const fallback = card?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
    ;(preferred ?? fallback)?.focus({ preventScroll: true })
    setMoveFocus(null)
  }, [moveFocus])
  const moveCard = async (cardId: Id, statusId: Id, control?: CardMoveFocus) => {
    const saved = await onMoveCard(cardId, statusId)
    if (saved && control) setMoveFocus({ cardId, control })
    return saved
  }
  const statuses = board.statuses.map(({ cards: _cards, ...status }) => status)
  const [creatingStatus, setCreatingStatus] = useState(false)
  const [renamingProject, setRenamingProject] = useState(false)
  const projectMenu = useRef<HTMLButtonElement>(null)
  return <>
    <AppBar
      title={board.name}
      navigation={<button className="button button-quiet" onClick={() => void onReturn()}><BoardIcon name="left" />{t('allProjects')}</button>}
      actions={<>
        <ActionMenu triggerRef={projectMenu} label={t('projectActions', { name: board.name })} actions={[{ label: t('rename'), onSelect: () => setRenamingProject(true) }]} />
        <button ref={addStatusTrigger} className="button button-primary" onClick={() => setCreatingStatus(true)}><BoardIcon name="plus" />{t('addStatus')}</button>
      </>}
    />
    <main ref={root} className="app-shell">
      {saveError ? <p className="save-error" role={moveDialogCardId || deleting ? undefined : 'alert'}>{t('saveError')}</p> : null}
      {board.statuses.length === 0 ? <section className="empty-state surface-card"><h2>{t('firstStatus')}</h2><p>{t('firstStatusHelp')}</p></section> : null}
      <section className="status-columns" aria-label={t('statuses')}>
        {board.statuses.map((status, index) => <StatusColumn
          key={status.id}
          status={status}
          index={index}
          total={board.statuses.length}
          statuses={statuses}
          saveError={saveError}
          onDeleteStatus={returnFocus => setDeleting({ kind: 'status', id: status.id, statusId: status.id, name: status.name, returnFocus })}
          onDeleteCard={(cardId, returnFocus) => {
            const card = status.cards.find(item => item.id === cardId)
            if (card) setDeleting({ kind: 'card', id: card.id, statusId: status.id, name: card.name, returnFocus })
          }}
          onMoveDialogChange={setMoveDialogCardId}
          onRename={name => onRenameStatus(status.id, name)}
          onMove={direction => onMoveStatus(status.id, direction)}
          onCreateCard={input => onCreateCard(status.id, input)}
          onUpdateCard={(cardId, input) => onUpdateCard(cardId, input)}
          onMoveCard={moveCard}
        />)}
      </section>
      {deleting ? <DeleteDialog kind={deleting.kind} name={deleting.name} blocked={deleting.kind === 'status' && !!board.statuses.find(status => status.id === deleting.id)?.cards.length} returnFocus={deleting.returnFocus} onDelete={confirmDeletion} onClose={() => setDeleting(null)} /> : null}
      {creatingStatus ? <NameDialog title={t('newStatus')} label={t('statusName')} button={t('createStatus')} onSubmit={onCreateStatus} onClose={() => setCreatingStatus(false)} /> : null}
      {renamingProject ? <NameDialog returnFocus={projectMenu} title={t('renameProject')} label={t('newName')} button={t('save')} initialName={board.name} onSubmit={onRenameProject} onClose={() => setRenamingProject(false)} /> : null}
    </main>
  </>
}

type StatusColumnProps = {
  status: ProjectBoard['statuses'][number]
  index: number
  total: number
  statuses: Status[]
  saveError: boolean
  onDeleteStatus: (returnFocus: React.RefObject<HTMLButtonElement | null>) => void
  onDeleteCard: (cardId: Id, returnFocus: React.RefObject<HTMLButtonElement | null>) => void
  onMoveDialogChange: (cardId: Id | null) => void
  onRename: (name: string) => Promise<void>
  onMove: (direction: -1 | 1) => Promise<void>
  onCreateCard: (input: CardInput) => Promise<boolean>
  onUpdateCard: (cardId: Id, input: CardInput) => Promise<boolean>
  onMoveCard: (cardId: Id, statusId: Id, focus?: CardMoveFocus) => Promise<boolean>
}

function StatusColumn({ status, index, total, statuses, saveError, onMoveDialogChange, onRename, onMove, onCreateCard, onUpdateCard, onMoveCard, onDeleteCard, onDeleteStatus }: StatusColumnProps) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const createTrigger = useRef<HTMLButtonElement>(null)
  const [creatingCard, setCreatingCard] = useState(false)
  return <article className="status-column" data-status-id={status.id}>
    <header className="column-header">
      <div className="column-heading">
        <h2 className="column-title">{status.name}</h2>
        <span className="card-count"><span aria-hidden="true">{status.cards.length}</span><span className="sr-only">{t('cardCount', { count: status.cards.length })}</span></span>
      </div>
      <ActionMenu triggerRef={menuTrigger} label={t('statusActions', { name: status.name })} actions={[
        { label: t('rename'), onSelect: () => setRenaming(true) },
        { label: t('moveLeft'), disabled: index === 0, onSelect: () => void onMove(-1) },
        { label: t('moveRight'), disabled: index === total - 1, onSelect: () => void onMove(1) },
        { label: t('delete'), onSelect: () => onDeleteStatus(menuTrigger) },
      ]} />
    </header>
    <ul className="card-list">{status.cards.map(card => <CardView
      key={card.id}
      card={card}
      onDelete={returnFocus => onDeleteCard(card.id, returnFocus)}
      statuses={statuses}
      saveError={saveError}
      onMoveDialogChange={onMoveDialogChange}
      previousStatus={statuses[index - 1]}
      nextStatus={statuses[index + 1]}
      onUpdate={input => onUpdateCard(card.id, input)}
      onMove={(statusId, focus) => onMoveCard(card.id, statusId, focus)}
    />)}</ul>
    <button ref={createTrigger} className="button button-quiet add-card" onClick={() => setCreatingCard(true)}><BoardIcon name="plus" />{t('addCard')}</button>
    {renaming ? <NameDialog title={t('renameStatus')} label={t('newName')} button={t('save')} initialName={status.name} onSubmit={onRename} onClose={() => setRenaming(false)} /> : null}
    {creatingCard ? <CardDialog title={t('newCard')} returnFocus={createTrigger} button={t('createCard')} onSubmit={onCreateCard} onClose={() => setCreatingCard(false)} /> : null}
  </article>
}
