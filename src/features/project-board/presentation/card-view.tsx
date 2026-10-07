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
  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [destination, setDestination] = useState(status.id)
  return <li className="work-card surface-card"><span className="card-name">{card.name}</span><ActionMenu label={`Действия карточки ${card.name}`} actions={[{ label: 'Переименовать', onSelect: () => setRenaming(true) }, { label: 'Переместить', onSelect: () => { setDestination(status.id); setMoving(true) } }]} />
    {renaming ? <NameDialog title="Переименовать карточку" label="Новое название" button="Сохранить" initialName={card.name} onSubmit={onRename} onClose={() => setRenaming(false)} /> : null}
    {moving ? <ActionDialog title="Переместить карточку" onClose={() => setMoving(false)}><form onSubmit={event => { event.preventDefault(); void onMove(destination).then(() => setMoving(false)) }}><label className="field"><span className="field-label">Переместить «{card.name}» в</span><select className="select-input" value={destination} onChange={event => setDestination(event.target.value)}>{statuses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setMoving(false)}>Отмена</button><button className="button button-primary">Переместить</button></div></form></ActionDialog> : null}
  </li>
}
