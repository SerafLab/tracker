import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Card, Id, Status } from '../domain/model'
import { ActionDialog, ActionMenu, NameDialog } from './controls'

export type CardMoveFocus = 'left' | 'right' | 'menu'

export function CardView({ card, statuses, previousStatus, nextStatus, saveError, onMoveDialogChange, onRename, onMove }: {
  card: Card
  statuses: Status[]
  previousStatus?: Status
  nextStatus?: Status
  saveError: boolean
  onMoveDialogChange: (cardId: Id | null) => void
  onRename: (name: string) => Promise<void>
  onMove: (statusId: Id, focus?: CardMoveFocus) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [saving, setSaving] = useState(false)
  const otherStatuses = statuses.filter(status => status.id !== card.statusId)
  const [destination, setDestination] = useState(otherStatuses[0]?.id ?? '')
  const keyboard = useRef(false)
  const failedControl = useRef<HTMLElement | null>(null)
  const pending = useRef(false)
  const errorId = useId()
  const closeMoving = useCallback(() => setMoving(false), [])

  useEffect(() => {
    if (!moving) return
    onMoveDialogChange(card.id)
    return () => onMoveDialogChange(null)
  }, [moving, card.id, onMoveDialogChange])
  useEffect(() => {
    if (!saving && failedControl.current) {
      failedControl.current.focus({ preventScroll: true })
      failedControl.current = null
    }
  }, [saving])

  const move = async (statusId: Id, focus?: CardMoveFocus) => {
    if (pending.current) return
    pending.current = true
    const source = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSaving(true)
    const saved = await onMove(statusId, focus)
    if (saved) setMoving(false)
    else if (focus) failedControl.current = source
    pending.current = false
    setSaving(false)
  }

  return <li className="work-card surface-card" data-card-id={card.id}>
    <span className="card-name">{card.name}</span>
    <div className="card-controls">
      <div className="card-move-arrows" role="group" aria-label={t('moveCardActions', { name: card.name })}>
        <button className="button button-quiet button-icon" data-card-move="left" aria-label={previousStatus ? t('moveAdjacentLeft', { name: previousStatus.name }) : t('moveLeft')} disabled={!previousStatus || saving} onClick={event => { if (previousStatus) void move(previousStatus.id, event.detail === 0 ? 'left' : undefined) }}>←</button>
        <button className="button button-quiet button-icon" data-card-move="right" aria-label={nextStatus ? t('moveAdjacentRight', { name: nextStatus.name }) : t('moveRight')} disabled={!nextStatus || saving} onClick={event => { if (nextStatus) void move(nextStatus.id, event.detail === 0 ? 'right' : undefined) }}>→</button>
      </div>
      <ActionMenu label={t('cardActions', { name: card.name })} actions={[{ label: t('rename'), onSelect: () => setRenaming(true) }, ...(otherStatuses.length ? [{ label: t('moveToOther'), onSelect: () => { setDestination(otherStatuses[0].id); setMoving(true) } }] : [])]} />
    </div>
    {renaming ? <NameDialog title={t('renameCard')} label={t('newName')} button={t('save')} initialName={card.name} onSubmit={onRename} onClose={() => setRenaming(false)} /> : null}
    {moving ? <ActionDialog title={t('moveCard')} onClose={closeMoving}><form onKeyDown={() => { keyboard.current = true }} onPointerDown={() => { keyboard.current = false }} onSubmit={event => { event.preventDefault(); void move(destination, keyboard.current ? 'menu' : undefined) }}><label className="field"><span className="field-label">{t('moveTo', { name: card.name })}</span><select className="select-input" value={destination} disabled={saving} aria-describedby={saveError ? errorId : undefined} onChange={event => setDestination(event.target.value)}>{otherStatuses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{saveError ? <p id={errorId} className="save-error" role="alert">{t('saveError')}</p> : null}<div className="form-actions"><button type="button" className="button button-secondary" onClick={closeMoving}>{t('cancel')}</button><button className="button button-primary" disabled={saving} aria-describedby={saveError ? errorId : undefined}>{t('move')}</button></div></form></ActionDialog> : null}
  </li>
}
