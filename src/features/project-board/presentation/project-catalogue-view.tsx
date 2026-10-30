import { useTranslation } from 'react-i18next'
import { AppBar } from '../../../ui/app-bar'
import { useRef, useState } from 'react'
import type { Id, Project } from '../domain/model'
import { ActionMenu, NameDialog } from './controls'

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
  const createTrigger = useRef<HTMLButtonElement>(null)
  const create = async (name: string) => { await onCreate(name); setCreating(false) }
  return <><AppBar title={t('title')} creation={{ label: t('createProject'), triggerRef: createTrigger, onSelect: () => setCreating(true) }} /><main className="app-shell">
    <p className="page-subtitle catalogue-subtitle">{t('subtitle')}</p>
    {saveError ? <p className="save-error" role="alert">{t('saveError')}</p> : null}
    {projects.length === 0 ? <section className="empty-state surface-card"><h2>{t('firstProject')}</h2><p>{t('firstProjectHelp')}</p></section> : <ul className="project-list">{projects.map(project => <li className="project-card surface-card" key={project.id}><button className="project-open" onClick={() => void onOpen(project.id)}>{project.name}</button><ActionMenu label={t('projectActions', { name: project.name })} actions={[{ label: t('rename'), onSelect: () => setRenaming(project) }]} /></li>)}</ul>}
    {creating ? <NameDialog returnFocus={createTrigger} title={t('newProject')} label={t('projectName')} button={t('createProject')} onSubmit={create} onClose={() => setCreating(false)} /> : null}
    {renaming ? <NameDialog title={t('renameProject')} label={t('newName')} button={t('save')} initialName={renaming.name} onSubmit={name => onRename(renaming.id, name)} onClose={() => setRenaming(null)} /> : null}
  </main></>
}
