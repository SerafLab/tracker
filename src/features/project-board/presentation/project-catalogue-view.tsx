import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { Id, Project } from '../domain/model'
import { ActionMenu, NameDialog, NameForm } from './controls'

export function ProjectCatalogueView({ projects, saveError, onCreate, onOpen, onRename }: {
  projects: Project[]
  saveError: boolean
  onCreate: (name: string) => Promise<void>
  onOpen: (id: Id) => Promise<void>
  onRename: (id: Id, name: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<Project | null>(null)
  const create = async (name: string) => { await onCreate(name); setCreating(false) }
  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">EasyTrack</p><h1 className="page-title">{t('title')}</h1><p className="page-subtitle">{t('subtitle')}</p></div>{projects.length ? <button className="button button-primary" onClick={() => setCreating(true)}>{t('createProject')}</button> : null}</header>
    {saveError ? <p className="save-error" role="alert">{t('saveError')}</p> : null}
    {projects.length === 0 ? <section className="empty-state surface-card"><h2>{t('firstProject')}</h2><p>{t('firstProjectHelp')}</p><NameForm label={t('newProject')} button={t('createProject')} onSubmit={create} /></section> : <ul className="project-list">{projects.map(project => <li className="project-card surface-card" key={project.id}><button className="project-open" onClick={() => void onOpen(project.id)}>{project.name}</button><ActionMenu label={t('projectActions', { name: project.name })} actions={[{ label: t('rename'), onSelect: () => setRenaming(project) }]} /></li>)}</ul>}
    {creating ? <NameDialog title={t('newProject')} label={t('projectName')} button={t('createProject')} onSubmit={create} onClose={() => setCreating(false)} /> : null}
    {renaming ? <NameDialog title={t('renameProject')} label={t('newName')} button={t('save')} initialName={renaming.name} onSubmit={name => onRename(renaming.id, name)} onClose={() => setRenaming(null)} /> : null}
  </main>
}
