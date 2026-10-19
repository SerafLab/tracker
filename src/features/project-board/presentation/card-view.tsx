import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { Card, Id, Status } from '../domain/model'
import { ActionDialog, ActionMenu, NameDialog } from './controls'

export function CardView({ card, status, statuses, onRename, onMove }: {
  card: Card
  status: Status
  statuses: Status[]
  onRename: (name: string) => Promise<void>
  onMove: (statusId: Id) => Promise<void>
}) {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [destination, setDestination] = useState(status.id)
  return <li className="work-card surface-card"><span className="card-name">{card.name}</span><ActionMenu label={t('cardActions', { name: card.name })} actions={[{ label: t('rename'), onSelect: () => setRenaming(true) }, { label: t('move'), onSelect: () => { setDestination(status.id); setMoving(true) } }]} />
    {renaming ? <NameDialog title={t('renameCard')} label={t('newName')} button={t('save')} initialName={card.name} onSubmit={onRename} onClose={() => setRenaming(false)} /> : null}
    {moving ? <ActionDialog title={t('moveCard')} onClose={() => setMoving(false)}><form onSubmit={event => { event.preventDefault(); void onMove(destination).then(() => setMoving(false)) }}><label className="field"><span className="field-label">{t('moveTo', { name: card.name })}</span><select className="select-input" value={destination} onChange={event => setDestination(event.target.value)}>{statuses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setMoving(false)}>{t('cancel')}</button><button className="button button-primary">{t('move')}</button></div></form></ActionDialog> : null}
  </li>
}
