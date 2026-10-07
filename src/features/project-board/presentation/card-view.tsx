import type { Card, Id, Status } from '../domain/model'
import { RenameControl } from './controls'

export function CardView({ card, status, statuses, onRename, onMove }: {
  card: Card
  status: Status
  statuses: Status[]
  onRename: (name: string) => Promise<void>
  onMove: (statusId: Id) => Promise<void>
}) {
  return <li>
    <span>{card.name}</span>
    <RenameControl label={`Переименовать карточку ${card.name}`} value={card.name} onRename={onRename} />
    <label>Переместить карточку {card.name}
      <select aria-label={`Переместить карточку ${card.name}`} value={status.id} onChange={event => void onMove(event.target.value)}>
        {statuses.map(destination => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
      </select>
    </label>
  </li>
}
