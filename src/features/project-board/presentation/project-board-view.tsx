import { useState } from 'react'
import type { Id, ProjectBoard, Status } from '../domain/model'
import { CardView } from './card-view'
import { ActionMenu, NameDialog } from './controls'

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
  const [creatingStatus, setCreatingStatus] = useState(false)
  const [renamingProject, setRenamingProject] = useState(false)
  return <main className="app-shell">
    <header className="board-header"><div><button className="button button-quiet" onClick={() => void onReturn()}>← Все проекты</button><h1 className="page-title">{board.name}</h1></div><div className="button-row"><ActionMenu label={`Действия проекта ${board.name}`} actions={[{ label: 'Переименовать', onSelect: () => setRenamingProject(true) }]} /><button className="button button-primary" onClick={() => setCreatingStatus(true)}>Добавить статус</button></div></header>
    {saveError ? <p className="save-error" role="alert">{saveError}</p> : null}
    {board.statuses.length === 0 ? <section className="empty-state surface-card"><h2>Добавьте первый статус</h2><p>Статусы отражают этапы именно вашего проекта. После этого можно будет добавлять карточки.</p><button className="button button-primary" onClick={() => setCreatingStatus(true)}>Добавить статус</button></section> : null}
    <section className="status-columns" aria-label="Статусы проекта">
      {board.statuses.map((status, index) => <StatusColumn key={status.id} status={status} index={index} total={board.statuses.length} statuses={statuses} onRename={name => onRenameStatus(status.id, name)} onMove={direction => onMoveStatus(status.id, direction)} onCreateCard={name => onCreateCard(status.id, name)} onRenameCard={(cardId, name) => onRenameCard(cardId, name)} onMoveCard={(cardId, statusId) => onMoveCard(cardId, statusId)} />)}
    </section>
    {creatingStatus ? <NameDialog title="Новый статус" label="Название статуса" button="Создать статус" onSubmit={onCreateStatus} onClose={() => setCreatingStatus(false)} /> : null}
    {renamingProject ? <NameDialog title="Переименовать проект" label="Новое название" button="Сохранить" initialName={board.name} onSubmit={onRenameProject} onClose={() => setRenamingProject(false)} /> : null}
  </main>
}

function StatusColumn({ status, index, total, statuses, onRename, onMove, onCreateCard, onRenameCard, onMoveCard }: { status: ProjectBoard['statuses'][number]; index: number; total: number; statuses: Status[]; onRename: (name: string) => Promise<void>; onMove: (direction: -1 | 1) => Promise<void>; onCreateCard: (name: string) => Promise<void>; onRenameCard: (cardId: Id, name: string) => Promise<void>; onMoveCard: (cardId: Id, statusId: Id) => Promise<void> }) {
  const [renaming, setRenaming] = useState(false)
  const [creatingCard, setCreatingCard] = useState(false)
  return <article className="status-column"><header className="column-header"><div><h2 className="column-title">{status.name}</h2><p className="card-count">{status.cards.length} {status.cards.length === 1 ? 'карточка' : 'карточек'}</p></div><ActionMenu label={`Действия статуса ${status.name}`} actions={[{ label: 'Переименовать', onSelect: () => setRenaming(true) }, { label: 'Переместить влево', disabled: index === 0, onSelect: () => void onMove(-1) }, { label: 'Переместить вправо', disabled: index === total - 1, onSelect: () => void onMove(1) }]} /></header><button className="button button-quiet add-card" onClick={() => setCreatingCard(true)}>＋ Добавить карточку</button><ul className="card-list">{status.cards.map(card => <CardView key={card.id} card={card} status={status} statuses={statuses} onRename={name => onRenameCard(card.id, name)} onMove={statusId => onMoveCard(card.id, statusId)} />)}</ul>{renaming ? <NameDialog title="Переименовать статус" label="Новое название" button="Сохранить" initialName={status.name} onSubmit={onRename} onClose={() => setRenaming(false)} /> : null}{creatingCard ? <NameDialog title="Новая карточка" label="Название карточки" button="Создать карточку" onSubmit={onCreateCard} onClose={() => setCreatingCard(false)} /> : null}</article>
}
