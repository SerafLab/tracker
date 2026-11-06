import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RECENT_NOTE_LIMIT, type Card, type CardPlacement, type Id, type Note, type Status } from '../domain/model'
import { appendPlacement, peerPlacement } from '../domain/order'
import type { MoveCardStateResult } from '../state/project-board-store'
import { ActionDialog, ActionMenu } from './controls'
import { BoardIcon } from './board-icon'
import { CardFlagBadges } from './card-flag-badges'
import { useCardDrag } from './board-drag'
import { orderNotes, useNoteOrder } from './note-order'

export const CardView = memo(function CardView({ card, notes, peers, statuses, disabled, saveError, onMoveDialogChange, projectId, onOpen, onMove, onDelete }: {
  card: Card
  notes?: Note[]
  peers: Card[]
  statuses: Status[]
  disabled: boolean
  saveError: boolean
  onMoveDialogChange: (cardId: Id | null) => void
  onDelete: (card: Card, returnFocus: React.RefObject<HTMLButtonElement | null>) => void
  projectId: Id
  onOpen: (cardId: Id, options?: { edit?: boolean }) => Promise<void>
  onMove: (cardId: Id, placement: CardPlacement, focus?: boolean) => Promise<MoveCardStateResult>
}) {
  const { t } = useTranslation()
  const drag = useCardDrag(card)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const [moving, setMoving] = useState(false)
  const [saving, setSaving] = useState(false)
  const otherStatuses = statuses.filter(status => status.id !== card.statusId)
  const [destination, setDestination] = useState(otherStatuses[0]?.id ?? '')
  const pending = useRef(false)
  const errorId = useId()
  const notesId = useId()
  const [notesOpen, setNotesOpen] = useState(false)
  const noteCount = notes?.length ?? 0
  useEffect(() => { if (noteCount < 2) setNotesOpen(false) }, [noteCount])
  const { order } = useNoteOrder()
  // The board shows the start of the history in the chosen order: one note collapsed, up to five expanded.
  const shownNotes = orderNotes(notes ?? [], order).slice(0, notesOpen ? RECENT_NOTE_LIMIT : 1)
  const closeMoving = useCallback(() => { if (!pending.current) setMoving(false) }, [])
  const above = peerPlacement(peers, card, -1), below = peerPlacement(peers, card, 1)
  useEffect(() => {
    if (!moving) return
    onMoveDialogChange(card.id)
    return () => onMoveDialogChange(null)
  }, [moving, card.id, onMoveDialogChange])
  const move = async (placement: CardPlacement) => {
    if (pending.current || disabled) return
    pending.current = true; setSaving(true)
    try { if (await onMove(card.id, placement, true) !== 'failed') setMoving(false) }
    finally { pending.current = false; setSaving(false) }
  }
  return <li ref={drag.ref} className="work-card surface-card" data-card-id={card.id} data-dragging={drag.isDragSource || undefined}
    onPointerDownCapture={drag.resetPointer}
    onContextMenuCapture={event => { if (drag.isDragSource) event.preventDefault() }}
    onClickCapture={event => { if (drag.suppressClick(event.detail)) { event.preventDefault(); event.stopPropagation() } }}>
    <div className="card-heading">
      <a className="card-detail-link" draggable={false} aria-label={card.name} aria-disabled={disabled || undefined} href={`#project/${encodeURIComponent(projectId)}/card/${encodeURIComponent(card.id)}`} onClick={event => {
        if (disabled) { event.preventDefault(); return }
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); void onOpen(card.id) }
      }}><span className="card-name">{card.name}</span><CardFlagBadges important={card.important} urgent={card.urgent} />{card.description.trim() ? <span className="card-description-preview">{card.description}</span> : null}</a>
      <ActionMenu disabled={disabled} triggerRef={menuTrigger} label={t('cardActions', { name: card.name })} actions={[
        { label: t('edit'), onSelect: () => void onOpen(card.id, { edit: true }) },
        ...(otherStatuses.length ? [{ label: t('moveToOther'), onSelect: () => { setDestination(otherStatuses[0].id); setMoving(true) } }] : []),
        ...(above ? [{ label: t('cardMoveUp'), onSelect: () => void move(above) }] : []),
        ...(below ? [{ label: t('cardMoveDown'), onSelect: () => void move(below) }] : []),
        { label: t('delete'), onSelect: () => onDelete(card, menuTrigger) },
      ]} />
    </div>
    {shownNotes.length ? <div className="card-notes">
      <ul id={notesId} className="card-note-list" aria-label={t('recentNotes')}>{shownNotes.map(note => <li key={note.id} className="card-note">{note.text}</li>)}</ul>
      {notes!.length > 1 ? <button type="button" className="card-notes-toggle bar-hint" data-hint={t(notesOpen ? 'hideNotes' : 'showNotes')} aria-label={t('recentNotesToggle', { name: card.name })} aria-expanded={notesOpen} aria-controls={notesId} onClick={() => setNotesOpen(open => !open)}><BoardIcon name="chevronDown" /></button> : null}
    </div> : null}
    {moving ? <ActionDialog title={t('moveCard')} returnFocus={menuTrigger} onClose={closeMoving}><form onSubmit={event => { event.preventDefault(); void move(appendPlacement(card, destination)) }}>
      <label className="field"><span className="field-label">{t('moveTo', { name: card.name })}</span><select className="select-input" value={destination} disabled={saving} aria-describedby={saveError ? errorId : undefined} onChange={event => setDestination(event.target.value)}>{otherStatuses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {saveError ? <p id={errorId} className="save-error" role="alert">{t('saveError')}</p> : null}
      <div className="form-actions"><button type="button" className="button button-secondary" disabled={saving} onClick={closeMoving}>{t('cancel')}</button><button className="button button-primary" disabled={saving} aria-describedby={saveError ? errorId : undefined}>{t('move')}</button></div>
    </form></ActionDialog> : null}
  </li>
})
