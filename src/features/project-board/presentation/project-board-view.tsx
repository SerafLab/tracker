import type { Id, ProjectBoard } from '../domain/model'
import { CardView } from './card-view'
import { NameForm, RenameControl } from './controls'

export function ProjectBoardView({ board, saveError, onReturn, onRenameProject, onCreateStatus, onRenameStatus, onMoveStatus, onCreateCard, onRenameCard, onMoveCard }: {
  board: ProjectBoard
  saveError: string
  onReturn: () => Promise<void>
  onRenameProject: (name: string) => Promise<void>
  onCreateStatus: (name: string) => Promise<void>
  onRenameStatus: (statusId: Id, name: string) => Promise<void>
  onMoveStatus: (statusId: Id, direction: -1 | 1) => Promise<void>
  onCreateCard: (statusId: Id, name: string) => Promise<void>
  onRenameCard: (cardId: Id, name: string) => Promise<void>
  onMoveCard: (cardId: Id, statusId: Id) => Promise<void>
}) {
  const statuses = board.statuses.map(({ cards: _cards, ...status }) => status)
  return <main>
    <header className="board-header">
      <button onClick={() => void onReturn()}>Все проекты</button>
      <h1>{board.name}</h1>
      <RenameControl label={`Переименовать проект ${board.name}`} value={board.name} onRename={onRenameProject} />
    </header>
    {saveError ? <p className="save-error" role="alert">{saveError}</p> : null}
    <NameForm label="Новый статус" button="Создать статус" onSubmit={onCreateStatus} />
    {board.statuses.length === 0 ? <p>На доске пока нет статусов. Создайте статус, чтобы добавлять карточки.</p> : null}
    <section className="status-columns" aria-label="Статусы проекта">
      {board.statuses.map((status, index) => <article className="status-column" key={status.id}>
        <h2>{status.name}</h2>
        <div className="status-actions">
          <button disabled={index === 0} onClick={() => void onMoveStatus(status.id, -1)}>Переместить статус {status.name} влево</button>
          <button disabled={index === board.statuses.length - 1} onClick={() => void onMoveStatus(status.id, 1)}>Переместить статус {status.name} вправо</button>
          <RenameControl label={`Переименовать статус ${status.name}`} value={status.name} onRename={name => onRenameStatus(status.id, name)} />
        </div>
        <NameForm label={`Новая карточка в статусе ${status.name}`} button="Создать карточку" onSubmit={name => onCreateCard(status.id, name)} />
        <ul className="card-list">{status.cards.map(card => <CardView key={card.id} card={card} status={status} statuses={statuses} onRename={name => onRenameCard(card.id, name)} onMove={statusId => onMoveCard(card.id, statusId)} />)}</ul>
      </article>)}
    </section>
  </main>
}
