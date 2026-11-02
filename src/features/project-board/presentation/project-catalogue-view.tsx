import { useTranslation } from 'react-i18next'
import { AppBar } from '../../../ui/app-bar'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useModalOpen } from '../../../ui/modal-state'
import type { CreateProjectInput, Id, Project } from '../domain/model'
import type { ProjectDeletionSummary } from '../state/project-board-store'
import { ActionMenu, NameDialog } from './controls'
import { ProjectCreateDialog } from './project-create-dialog'
import { DeleteDialog, type ProjectSummaryState } from './delete-dialog'

type ProjectTrigger = RefObject<HTMLButtonElement | null>
export function ProjectCatalogueView({ projects, saveError, onCreate, onOpen, onRename, onReadSummary, onDelete, focusCreation = false, onCreationFocused }: {
  projects: Project[]
  saveError: boolean
  onCreate: (input: CreateProjectInput) => Promise<boolean>
  onOpen: (id: Id) => Promise<void>
  onRename: (id: Id, name: string) => Promise<void>
  onReadSummary: (id: Id) => Promise<ProjectDeletionSummary>
  onDelete: (id: Id) => Promise<boolean>
  focusCreation?: boolean
  onCreationFocused?: () => void
}) {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<{ project: Project; returnFocus: ProjectTrigger } | null>(null)
  const [summary, setSummary] = useState<ProjectSummaryState>({ kind: 'loading' })
  const [summaryAttempt, setSummaryAttempt] = useState(0)
  const [focusTarget, setFocusTarget] = useState<Id | 'create' | null>(null)
  const createTrigger = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLElement>(null)
  const modalOpen = useModalOpen()
  const deletingId = deleting?.project.id
  useEffect(() => {
    if (!deletingId) return
    let active = true
    setSummary({ kind: 'loading' })
    void onReadSummary(deletingId).then(value => { if (active) setSummary({ kind: 'ready', ...value }) }, () => { if (active) setSummary({ kind: 'failed' }) })
    return () => { active = false }
  }, [deletingId, summaryAttempt, onReadSummary])
  useEffect(() => {
    if (modalOpen || (!focusCreation && !focusTarget)) return
    const project = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-project-id]') ?? []).find(item => item.dataset.projectId === focusTarget)
    const target = focusCreation || focusTarget === 'create' ? createTrigger.current : project?.querySelector<HTMLButtonElement>('.project-open') ?? createTrigger.current
    target?.focus({ preventScroll: true })
    setFocusTarget(null)
    if (focusCreation) onCreationFocused?.()
  }, [focusCreation, focusTarget, projects, modalOpen, onCreationFocused])
  const requestDeletion = (project: Project, returnFocus: ProjectTrigger) => { setSummary({ kind: 'loading' }); setDeleting({ project, returnFocus }) }
  const confirmDeletion = async () => {
    if (!deleting || summary.kind !== 'ready') return 'failed' as const
    const index = projects.findIndex(project => project.id === deleting.project.id)
    const next = projects[index + 1]?.id ?? projects[index - 1]?.id ?? 'create'
    if (!await onDelete(deleting.project.id)) return 'failed' as const
    setDeleting(null); setFocusTarget(next)
    return 'deleted' as const
  }
  return <><AppBar title={t('title')} creation={{ label: t('createProject'), triggerRef: createTrigger, onSelect: () => setCreating(true) }} /><main ref={root} className="app-shell">
    <p className="page-subtitle catalogue-subtitle">{t('subtitle')}</p>
    {saveError && !creating && !deleting ? <p className="save-error" role="alert">{t('saveError')}</p> : null}
    {projects.length === 0 ? <section className="empty-state surface-card"><h2>{t('firstProject')}</h2><p>{t('firstProjectHelp')}</p></section> : <ul className="project-list">{projects.map(project => <CatalogueProject key={project.id} project={project} onOpen={onOpen} onRename={setRenaming} onDelete={requestDeletion} />)}</ul>}
    {creating ? <ProjectCreateDialog returnFocus={createTrigger} onSubmit={onCreate} onClose={() => setCreating(false)} /> : null}
    {renaming ? <NameDialog title={t('renameProject')} label={t('newName')} button={t('save')} initialName={renaming.name} onSubmit={name => onRename(renaming.id, name)} onClose={() => setRenaming(null)} /> : null}
    {deleting ? <DeleteDialog kind="project" name={deleting.project.name} blocked={false} summary={summary} onRetrySummary={() => setSummaryAttempt(value => value + 1)} returnFocus={deleting.returnFocus} onDelete={confirmDeletion} onClose={() => setDeleting(null)} /> : null}
  </main></>
}

function CatalogueProject({ project, onOpen, onRename, onDelete }: {
  project: Project
  onOpen: (id: Id) => Promise<void>
  onRename: (project: Project) => void
  onDelete: (project: Project, trigger: ProjectTrigger) => void
}) {
  const { t } = useTranslation()
  const menu = useRef<HTMLButtonElement>(null)
  return <li className="project-card surface-card" data-project-id={project.id}><button className="project-open" onClick={() => void onOpen(project.id)}>{project.name}</button><ActionMenu triggerRef={menu} label={t('projectActions', { name: project.name })} actions={[
    { label: t('rename'), onSelect: () => onRename(project) },
    { label: t('deleteProject'), onSelect: () => onDelete(project, menu) },
  ]} /></li>
}
