import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../../app/app'
import { localeStorageKey } from '../../../i18n/locale'
import { LocaleProvider } from '../../../i18n/provider'
import type { ProjectSummary } from '../domain/model'
import { ProjectCatalogueView } from './project-catalogue-view'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'

const databases: ProjectBoardDatabase[] = []
afterEach(async () => {
  cleanup(); history.replaceState(null, '', '/'); vi.restoreAllMocks(); localStorage.clear()
  await Promise.all(databases.splice(0).map(async db => { db.close(); await db.delete() }))
})
function setup(locale: 'ru' | 'en' = 'ru') {
  localStorage.setItem(localeStorageKey, locale)
  const db = new ProjectBoardDatabase(`first-run-${crypto.randomUUID()}`); databases.push(db)
  const repo = new DexieProjectBoardRepository(db)
  return { db, repo, user: userEvent.setup() }
}
const label = (locale: 'ru' | 'en') => locale === 'ru' ? 'Создать проект' : 'Create project'
const inMain = () => within(screen.getByRole('main'))
const quickButton = (locale: 'ru' | 'en') => waitFor(() => inMain().getByRole('button', { name: label(locale) }))
async function stored(db: ProjectBoardDatabase) {
  const projects = await db.projects.toArray()
  const statuses = (await db.statuses.toArray()).sort((a, b) => a.position - b.position).map(status => status.name)
  return { projects: projects.map(project => project.name), statuses }
}

describe('quick first-project creation', () => {
  it.each([
    ['ru', 'Первый проект', ['Нужно сделать', 'В процессе', 'Готово']],
    ['en', 'First project', ['To do', 'In progress', 'Done']],
  ] as const)('creates the %s project with the Simple status set and opens its board', async (locale, name, statuses) => {
    const { db, repo, user } = setup(locale)
    render(<App repository={repo} />)
    await user.click(await quickButton(locale))
    await screen.findByRole('heading', { level: 1, name })
    await waitFor(async () => expect(await stored(db)).toEqual({ projects: [name], statuses }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the created name when the language changes later', async () => {
    const { db, repo, user } = setup('ru')
    render(<App repository={repo} />)
    await user.click(await quickButton('ru'))
    await screen.findByRole('heading', { level: 1, name: 'Первый проект' })
    await user.click(screen.getByRole('button', { name: 'Настройки' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'English' }))
    await screen.findByRole('button', { name: 'Settings' })
    expect((await stored(db)).projects).toEqual(['Первый проект'])
  })

  it('creates one project when the button is activated twice', async () => {
    const { db, repo, user } = setup()
    const create = vi.spyOn(repo, 'createProject')
    render(<App repository={repo} />)
    await user.dblClick(await quickButton('ru'))
    await screen.findByRole('heading', { level: 1, name: 'Первый проект' })
    expect(create).toHaveBeenCalledTimes(1)
    expect((await stored(db)).projects).toEqual(['Первый проект'])
  })

  it('shows the failure under the button, keeps focus there and allows a retry', async () => {
    const { db, repo, user } = setup()
    const create = vi.spyOn(repo, 'createProject').mockRejectedValueOnce(Error('quota'))
    render(<App repository={repo} />)
    const button = await quickButton('ru')
    await user.click(button)
    await waitFor(() => expect(inMain().getByRole('alert')).toHaveTextContent('Не удалось сохранить изменения'))
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'))
    expect(button).toHaveFocus()
    expect(await stored(db)).toEqual({ projects: [], statuses: [] })
    expect(inMain().getAllByRole('alert')).toHaveLength(1)

    await user.click(button)
    await screen.findByRole('heading', { level: 1, name: 'Первый проект' })
    expect(create).toHaveBeenCalledTimes(2)
    expect((await stored(db)).projects).toEqual(['Первый проект'])
  })

  it('marks the button as busy without disabling it while saving', async () => {
    const { repo, user } = setup()
    let release = () => {}
    const original = repo.createProject.bind(repo)
    vi.spyOn(repo, 'createProject').mockImplementation(async (...args) => { await new Promise<void>(resolve => { release = resolve }); return original(...args) })
    render(<App repository={repo} />)
    const button = await quickButton('ru')
    await user.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'))
    expect(button.closest('section')).toHaveAttribute('aria-busy', 'true')
    expect(button).not.toBeDisabled()
    expect(button).toHaveFocus()
    release()
    await screen.findByRole('heading', { level: 1, name: 'Первый проект' })
  })

  it('unlocks the button when the catalogue becomes empty again after a successful creation', async () => {
    setup()
    const user = userEvent.setup()
    const created: ProjectSummary = { id: 'p', name: 'Первый проект', createdAt: '1', cardCount: 0 }
    const props = { saveError: false, onCreate: vi.fn(async () => true), onOpen: vi.fn(async () => {}), onRename: vi.fn(async () => {}), onReadSummary: vi.fn(async () => ({ statusCount: 0, cardCount: 0 })), onDelete: vi.fn(async () => true) }
    const view = (projects: ProjectSummary[]) => <LocaleProvider><ProjectCatalogueView projects={projects} {...props} /></LocaleProvider>
    const { rerender } = render(view([]))
    await user.click(await quickButton('ru'))
    await waitFor(() => expect(props.onCreate).toHaveBeenCalledTimes(1))
    // Navigation to the board failed, so the catalogue stays mounted with the new project, which is then deleted.
    rerender(view([created]))
    rerender(view([]))
    const button = await quickButton('ru')
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'))
    expect(button.closest('section')).toHaveAttribute('aria-busy', 'false')
    await user.click(button)
    await waitFor(() => expect(props.onCreate).toHaveBeenCalledTimes(2))
  })
})

describe('catalogue copy and entries', () => {
  it.each(['ru', 'en'] as const)('has no tagline and offers no quick creation when projects exist (%s)', async locale => {
    const { repo } = setup(locale)
    await repo.createProject({ id: 'p', name: 'Existing', createdAt: '1' }, [], true)
    await repo.setLastProject()
    render(<App repository={repo} />)
    await waitFor(() => expect(inMain().getByText('Existing')).toBeInTheDocument())
    expect(inMain().queryByRole('button', { name: label(locale) })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: label(locale) })).toHaveLength(1)
    expect(screen.queryByText(/Держите важные дела|Keep important tasks/)).not.toBeInTheDocument()
  })

  it.each(['ru', 'en'] as const)('shows the first-run block without a tagline or helper text (%s)', async locale => {
    const { repo } = setup(locale)
    render(<App repository={repo} />)
    await waitFor(() => expect(inMain().getByRole('heading', { level: 2, name: locale === 'ru' ? 'Начните с первого проекта' : 'Start with your first project' })).toBeInTheDocument())
    expect(screen.queryByText(/Держите важные дела|Keep important tasks/)).not.toBeInTheDocument()
    expect(inMain().getByRole('button', { name: label(locale) })).toBeInTheDocument()
  })
})
