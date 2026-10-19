import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Id, ProjectBoard, Status } from '../domain/model'
import { CardView, type CardMoveFocus } from './card-view'
import { ActionMenu, NameDialog } from './controls'

type BoardProps = {
  board: ProjectBoard
  saveError: boolean
  onReturn: () => Promise<void>
  onRenameProject: (name: string) => Promise<void>
  onCreateStatus: (name: string) => Promise<void>
  onRenameStatus: (statusId: Id, name: string) => Promise<void>
  onMoveStatus: (statusId: Id, direction: -1 | 1) => Promise<void>
  onCreateCard: (statusId: Id, name: string) => Promise<void>
  onRenameCard: (cardId: Id, name: string) => Promise<void>
  onMoveCard: (cardId: Id, statusId: Id) => Promise<boolean>
}

export function ProjectBoardView({ board, saveError, onReturn, onRenameProject, onCreateStatus, onRenameStatus, onMoveStatus, onCreateCard, onRenameCard, onMoveCard }: BoardProps) {
  const { t } = useTranslation()
  const [moveDialogCardId, setMoveDialogCardId] = useState<Id | null>(null)
  const root = useRef<HTMLElement>(null)
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
  return <main ref={root} className="app-shell">
    <header className="board-header"><div><button className="button button-quiet" onClick={() => void onReturn()}>{t('allProjects')}</button><p className="eyebrow">EasyTrack</p><h1 className="page-title">{board.name}</h1></div><div className="button-row"><ActionMenu label={t('projectActions', { name: board.name })} actions={[{ label: t('rename'), onSelect: () => setRenamingProject(true) }]} /><button className="button button-primary" onClick={() => setCreatingStatus(true)}>{t('addStatus')}</button></div></header>
    {saveError ? <p className="save-error" role={moveDialogCardId ? undefined : 'alert'}>{t('saveError')}</p> : null}
    {board.statuses.length === 0 ? <section className="empty-state surface-card"><h2>{t('firstStatus')}</h2><p>{t('firstStatusHelp')}</p><button className="button button-primary" onClick={() => setCreatingStatus(true)}>{t('addStatus')}</button></section> : null}
    <section className="status-columns" aria-label={t('statuses')}>
      {board.statuses.map((status, index) => <StatusColumn key={status.id} status={status} index={index} total={board.statuses.length} statuses={statuses} saveError={saveError} onMoveDialogChange={setMoveDialogCardId} onRename={name => onRenameStatus(status.id, name)} onMove={direction => onMoveStatus(status.id, direction)} onCreateCard={name => onCreateCard(status.id, name)} onRenameCard={(cardId, name) => onRenameCard(cardId, name)} onMoveCard={moveCard} />)}
    </section>
    {creatingStatus ? <NameDialog title={t('newStatus')} label={t('statusName')} button={t('createStatus')} onSubmit={onCreateStatus} onClose={() => setCreatingStatus(false)} /> : null}
    {renamingProject ? <NameDialog title={t('renameProject')} label={t('newName')} button={t('save')} initialName={board.name} onSubmit={onRenameProject} onClose={() => setRenamingProject(false)} /> : null}
  </main>
}

type StatusColumnProps = {
  status: ProjectBoard['statuses'][number]
  index: number
  total: number
  statuses: Status[]
  saveError: boolean
  onMoveDialogChange: (cardId: Id | null) => void
  onRename: (name: string) => Promise<void>
  onMove: (direction: -1 | 1) => Promise<void>
  onCreateCard: (name: string) => Promise<void>
  onRenameCard: (cardId: Id, name: string) => Promise<void>
  onMoveCard: (cardId: Id, statusId: Id, focus?: CardMoveFocus) => Promise<boolean>
}

function StatusColumn({ status, index, total, statuses, saveError, onMoveDialogChange, onRename, onMove, onCreateCard, onRenameCard, onMoveCard }: StatusColumnProps) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const [creatingCard, setCreatingCard] = useState(false)
  return <article className="status-column"><header className="column-header"><div><h2 className="column-title">{status.name}</h2><p className="card-count">{t('cardCount', { count: status.cards.length })}</p></div><ActionMenu label={t('statusActions', { name: status.name })} actions={[{ label: t('rename'), onSelect: () => setRenaming(true) }, { label: t('moveLeft'), disabled: index === 0, onSelect: () => void onMove(-1) }, { label: t('moveRight'), disabled: index === total - 1, onSelect: () => void onMove(1) }]} /></header><button className="button button-quiet add-card" onClick={() => setCreatingCard(true)}>{t('addCard')}</button><ul className="card-list">{status.cards.map(card => <CardView key={card.id} card={card} statuses={statuses} saveError={saveError} onMoveDialogChange={onMoveDialogChange} previousStatus={statuses[index - 1]} nextStatus={statuses[index + 1]} onRename={name => onRenameCard(card.id, name)} onMove={(statusId, focus) => onMoveCard(card.id, statusId, focus)} />)}</ul>{renaming ? <NameDialog title={t('renameStatus')} label={t('newName')} button={t('save')} initialName={status.name} onSubmit={onRename} onClose={() => setRenaming(false)} /> : null}{creatingCard ? <NameDialog title={t('newCard')} label={t('cardName')} button={t('createCard')} onSubmit={onCreateCard} onClose={() => setCreatingCard(false)} /> : null}</article>
}
