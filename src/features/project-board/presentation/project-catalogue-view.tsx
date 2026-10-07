import { useState } from 'react'
import type { Id, Project } from '../domain/model'
import { ActionMenu, NameDialog, NameForm } from './controls'

export function ProjectCatalogueView({ projects, saveError, onCreate, onOpen, onRename }: {
  projects: Project[]
  saveError: string
  onCreate: (name: string) => Promise<void>
  onOpen: (id: Id) => Promise<void>
  onRename: (id: Id, name: string) => Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<Project | null>(null)
  const create = async (name: string) => { await onCreate(name); setCreating(false) }
  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">Личное рабочее пространство</p><h1 className="page-title">Трекер проектов</h1><p className="page-subtitle">Держите важные дела в понятном порядке.</p></div>{projects.length ? <button className="button button-primary" onClick={() => setCreating(true)}>Создать проект</button> : null}</header>
    {saveError ? <p className="save-error" role="alert">{saveError}</p> : null}
    {projects.length === 0 ? <section className="empty-state surface-card"><h2>Начните с первого проекта</h2><p>Создайте доску для дела, к которому хотите легко возвращаться.</p><NameForm label="Новый проект" button="Создать проект" onSubmit={create} /></section> : <ul className="project-list">{projects.map(project => <li className="project-card surface-card" key={project.id}><button className="project-open" onClick={() => void onOpen(project.id)}>{project.name}</button><ActionMenu label={`Действия проекта ${project.name}`} actions={[{ label: 'Переименовать', onSelect: () => setRenaming(project) }]} /></li>)}</ul>}
    {creating ? <NameDialog title="Новый проект" label="Название проекта" button="Создать проект" onSubmit={create} onClose={() => setCreating(false)} /> : null}
    {renaming ? <NameDialog title="Переименовать проект" label="Новое название" button="Сохранить" initialName={renaming.name} onSubmit={name => onRename(renaming.id, name)} onClose={() => setRenaming(null)} /> : null}
  </main>
}
