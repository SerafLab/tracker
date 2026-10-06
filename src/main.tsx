import { StrictMode, useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import type { Id, Project, ProjectBoard } from './domain'
import { TrackerDatabase, TrackerRepository } from './storage'
import './styles.css'

type Repository = Pick<TrackerRepository,
  'open' | 'projects' | 'preference' | 'setLastProject' | 'createProject' | 'renameProject' |
  'board' | 'createStatus' | 'renameStatus' | 'moveStatus' | 'createCard' | 'renameCard' | 'moveCard'>

type Workspace =
  | { kind: 'loading' }
  | { kind: 'catalogue', projects: Project[] }
  | { kind: 'board', board: ProjectBoard }
  | { kind: 'unavailable' }

const routeFor = (id: Id) => `#project/${encodeURIComponent(id)}`
const projectIdFromHash = (): Id | undefined => {
  const match = location.hash.match(/^#project\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export function App({ repository: suppliedRepository }: { repository?: Repository }) {
  const [repository] = useState<Repository>(() => suppliedRepository ?? new TrackerRepository(new TrackerDatabase()))
  const [workspace, setWorkspace] = useState<Workspace>({ kind: 'loading' })
  const [saveError, setSaveError] = useState('')

  const showCatalogue = async () => setWorkspace({ kind: 'catalogue', projects: await repository.projects() })
  const showBoard = async (id: Id, remember = false) => {
    const board = await repository.board(id)
    if (board) {
      if (remember) await repository.setLastProject(id)
      setWorkspace({ kind: 'board', board })
    }
    else {
      if (projectIdFromHash() === id) location.hash = ''
      await showCatalogue()
    }
  }

  useEffect(() => {
    let active = true
    const start = async () => {
      try {
        await repository.open()
        const requested = projectIdFromHash()
        if (requested) { await showBoard(requested, true); return }
        const lastProjectId = (await repository.preference())?.lastProjectId
        if (lastProjectId && await repository.board(lastProjectId)) { location.hash = routeFor(lastProjectId); return }
        await showCatalogue()
      } catch {
        if (active) setWorkspace({ kind: 'unavailable' })
      }
    }
    const onHashChange = () => {
      const id = projectIdFromHash()
      void (id ? showBoard(id, true) : showCatalogue()).catch(() => active && setWorkspace({ kind: 'unavailable' }))
    }
    void start()
    addEventListener('hashchange', onHashChange)
    return () => { active = false; removeEventListener('hashchange', onHashChange) }
  }, [repository])

  const mutate = async (operation: () => Promise<void>) => {
    try { await operation(); setSaveError('') }
    catch { setSaveError('Не удалось сохранить изменения. Проверьте доступность локального хранилища и повторите попытку.') }
  }
  const openProject = async (id: Id) => mutate(async () => { await repository.setLastProject(id); location.hash = routeFor(id) })
  const returnToCatalogue = async () => mutate(async () => { await repository.setLastProject(); location.hash = ''; await showCatalogue() })
  const refreshBoard = async (id: Id) => showBoard(id)

  if (workspace.kind === 'loading') return <main><p>Открываем рабочее пространство…</p></main>
  if (workspace.kind === 'unavailable') return <main><h1>Рабочая доска недоступна</h1><p role="alert">Локальное хранилище недоступно. Изменения не будут показаны как сохранённые.</p></main>
  const error = saveError && <p className="save-error" role="alert">{saveError}</p>

  if (workspace.kind === 'catalogue') return <main>
    <h1>Трекер личных проектов</h1>
    {error}
    <NameForm label="Новый проект" button="Создать проект" onSubmit={async name => mutate(async () => {
      const project = await repository.createProject(name)
      location.hash = routeFor(project.id)
    })} />
    {workspace.projects.length === 0
      ? <p>Проектов пока нет. Создайте первый проект, чтобы начать доску.</p>
      : <ul className="project-list">{workspace.projects.map(project => <li key={project.id}>
        <button onClick={() => void openProject(project.id)}>Открыть проект {project.name}</button>
        <RenameControl label={`Переименовать проект ${project.name}`} value={project.name} onRename={name => mutate(async () => {
          await repository.renameProject(project.id, name); await showCatalogue()
        })} />
      </li>)}</ul>}
  </main>

  const { board } = workspace
  return <main>
    <header className="board-header">
      <button onClick={() => void returnToCatalogue()}>Все проекты</button>
      <h1>{board.name}</h1>
      <RenameControl label={`Переименовать проект ${board.name}`} value={board.name} onRename={name => mutate(async () => {
        await repository.renameProject(board.id, name); await refreshBoard(board.id)
      })} />
    </header>
    {error}
    <NameForm label="Новый статус" button="Создать статус" onSubmit={name => mutate(async () => {
      await repository.createStatus(board.id, name); await refreshBoard(board.id)
    })} />
    {board.statuses.length === 0 && <p>На доске пока нет статусов. Создайте статус, чтобы добавлять карточки.</p>}
    <section className="status-columns" aria-label="Статусы проекта">
      {board.statuses.map((status, index) => <article className="status-column" key={status.id}>
        <h2>{status.name}</h2>
        <div className="status-actions">
          <button disabled={index === 0} onClick={() => void mutate(async () => { await repository.moveStatus(status.id, -1); await refreshBoard(board.id) })}>Переместить статус {status.name} влево</button>
          <button disabled={index === board.statuses.length - 1} onClick={() => void mutate(async () => { await repository.moveStatus(status.id, 1); await refreshBoard(board.id) })}>Переместить статус {status.name} вправо</button>
          <RenameControl label={`Переименовать статус ${status.name}`} value={status.name} onRename={name => mutate(async () => { await repository.renameStatus(status.id, name); await refreshBoard(board.id) })} />
        </div>
        <NameForm label={`Новая карточка в статусе ${status.name}`} button="Создать карточку" onSubmit={name => mutate(async () => { await repository.createCard(status.id, name); await refreshBoard(board.id) })} />
        <ul className="card-list">{status.cards.map(card => <li key={card.id}>
          <span>{card.name}</span>
          <RenameControl label={`Переименовать карточку ${card.name}`} value={card.name} onRename={name => mutate(async () => { await repository.renameCard(card.id, name); await refreshBoard(board.id) })} />
          <label>Переместить карточку {card.name}
            <select aria-label={`Переместить карточку ${card.name}`} value={status.id} onChange={event => void mutate(async () => { await repository.moveCard(card.id, event.target.value); await refreshBoard(board.id) })}>
              {board.statuses.map(destination => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
            </select>
          </label>
        </li>)}</ul>
      </article>)}
    </section>
  </main>
}

function NameForm({ label, button, initialName = '', onSubmit }: { label: string, button: string, initialName?: string, onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) { setInvalid(true); return }
    setInvalid(false); await onSubmit(name); setName('')
  }
  return <form className="name-form" onSubmit={event => void submit(event)}>
    <label>{label}<input value={name} onChange={event => setName(event.target.value)} /></label>
    {invalid && <span role="alert">Название обязательно</span>}
    <button>{button}</button>
  </form>
}

function RenameControl({ label, value, onRename }: { label: string, value: string, onRename: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  if (!editing) return <button onClick={() => setEditing(true)}>{label}</button>
  return <NameForm label={label} button="Сохранить название" initialName={value} onSubmit={async name => { await onRename(name); setEditing(false) }} />
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>)
