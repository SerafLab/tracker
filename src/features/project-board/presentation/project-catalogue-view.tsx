import type { Id, Project } from '../domain/model'
import { NameForm, RenameControl } from './controls'

export function ProjectCatalogueView({ projects, saveError, onCreate, onOpen, onRename }: {
  projects: Project[]
  saveError: string
  onCreate: (name: string) => Promise<void>
  onOpen: (id: Id) => Promise<void>
  onRename: (id: Id, name: string) => Promise<void>
}) {
  return <main>
    <h1>Трекер личных проектов</h1>
    {saveError ? <p className="save-error" role="alert">{saveError}</p> : null}
    <NameForm label="Новый проект" button="Создать проект" onSubmit={onCreate} />
    {projects.length === 0
      ? <p>Проектов пока нет. Создайте первый проект, чтобы начать доску.</p>
      : <ul className="project-list">{projects.map(project => <li key={project.id}>
        <button onClick={() => void onOpen(project.id)}>Открыть проект {project.name}</button>
        <RenameControl label={`Переименовать проект ${project.name}`} value={project.name} onRename={name => onRename(project.id, name)} />
      </li>)}</ul>}
  </main>
}
