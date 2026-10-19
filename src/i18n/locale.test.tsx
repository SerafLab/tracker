import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/app'
import { ProjectBoardDatabase, DexieProjectBoardRepository, type ProjectBoardRepository } from '../features/project-board'
import { InstallGuidance } from '../app/pwa/install-guidance'
import { PwaUpdateNotice } from '../app/pwa/update-notice'
import { RestartRequired } from '../app/pwa/restart-required'
import { LocaleProvider } from './provider'
import { localeStorageKey, resolveLocale } from './locale'

const databases: ProjectBoardDatabase[] = []
function repository() { const db = new ProjectBoardDatabase(`locale-${crypto.randomUUID()}`); databases.push(db); return new DexieProjectBoardRepository(db) }
afterEach(async () => { cleanup(); vi.restoreAllMocks(); location.hash = ''; await Promise.all(databases.splice(0).map(async db => { db.close(); await db.delete() })) })

describe('locale resolution', () => {
  it('uses the primary browser language without persisting inferred choices', () => {
    const storage = { getItem: vi.fn().mockReturnValue(null) }
    expect(resolveLocale(storage, 'ru')).toBe('ru')
    expect(resolveLocale(storage, 'ru-RU')).toBe('ru')
    expect(resolveLocale(storage, 'en-GB')).toBe('en')
    expect(resolveLocale(storage, 'fr-FR')).toBe('en')
    expect(resolveLocale(storage, 'RU-CY')).toBe('ru')
    expect(resolveLocale(storage, 'en')).toBe('en')
  })
  it('accepts only valid manual overrides and safely handles read rejection', () => {
    expect(resolveLocale({ getItem: () => 'en' }, 'ru-RU')).toBe('en')
    expect(resolveLocale({ getItem: () => 'ru' }, 'en')).toBe('ru')
    expect(resolveLocale({ getItem: () => 'bad' }, 'fr')).toBe('en')
    expect(resolveLocale({ getItem: () => { throw Error('blocked') } }, 'ru')).toBe('ru')
  })
})

it('updates metadata from first launch, persists selection, and retains session choice when writes fail', async () => {
  localStorage.removeItem(localeStorageKey)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
  const user = userEvent.setup()
  const view = render(<LocaleProvider><span>EasyTrack</span></LocaleProvider>)
  expect(document.documentElement.lang).toBe('en')
  expect(document.title).toBe('EasyTrack — personal project tracker')
  expect(localStorage.getItem(localeStorageKey)).toBeNull()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Interface language' }), 'ru')
  expect(document.documentElement.lang).toBe('ru')
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'EasyTrack — трекер личных проектов')
  expect(document.querySelector('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.ru.webmanifest')
  expect(localStorage.getItem(localeStorageKey)).toBe('ru')
  view.unmount()
  render(<LocaleProvider><span>EasyTrack</span></LocaleProvider>)
  expect(screen.getByRole('combobox')).toHaveValue('ru')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  await user.selectOptions(screen.getByRole('combobox'), 'en')
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save your language')
  expect(document.documentElement.lang).toBe('en')
})

it.each(['loading', 'unavailable'] as const)('keeps keyboard language switching available when workspace is %s', async kind => {
  const repo = { open: kind === 'loading' ? () => new Promise(() => {}) : () => Promise.reject(Error('blocked')) } as unknown as ProjectBoardRepository
  render(<App repository={repo} />)
  const selector = screen.getByRole('combobox')
  selector.focus()
  expect(selector).toHaveFocus()
  fireEvent.change(selector, { target: { value: 'en' } })
  expect(await screen.findByText(kind === 'loading' ? 'Opening workspace…' : 'Project board unavailable')).toBeInTheDocument()
  expect(selector).toHaveFocus()
})

it('keeps the current project and unfinished dialog input across language switches', async () => {
  const user = userEvent.setup()
  render(<App repository={repository()} />)
  await user.type(await screen.findByLabelText('Новый проект'), 'Мой проект')
  await user.click(screen.getByRole('button', { name: 'Создать проект' }))
  await screen.findByRole('heading', { name: 'Мой проект' })
  await user.click(screen.getAllByRole('button', { name: 'Добавить статус' })[0])
  await user.type(screen.getByLabelText('Название статуса'), 'Мой черновик')
  await user.selectOptions(within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Язык интерфейса' }), 'en')
  expect(screen.getByRole('heading', { name: 'Мой проект' })).toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'New status' })).toBeInTheDocument()
  expect(screen.getByLabelText('Status name')).toHaveValue('Мой черновик')
  await user.click(screen.getByRole('button', { name: 'Create status' }))
  expect(await screen.findByRole('heading', { name: 'Мой черновик' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Status actions for Мой черновик' }))
  expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument()
})

it.each(['en', 'ru'] as const)('translates validation and save errors in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const repo = repository()
  vi.spyOn(repo, 'createProject').mockRejectedValue(Error('quota'))
  const user = userEvent.setup()
  render(<App repository={repo} />)
  const create = await screen.findByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' })
  await user.click(create)
  expect(screen.getByRole('alert')).toHaveTextContent(locale === 'en' ? 'Name is required' : 'Название обязательно')
  await user.type(screen.getByRole('textbox'), 'Название')
  await user.click(create)
  expect(await screen.findByText(locale === 'en' ? /Could not save changes/ : /Не удалось сохранить изменения/)).toBeInTheDocument()
})

it.each(['en', 'ru'] as const)('translates platform installation, update and restart notices in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone')
  const user = userEvent.setup()
  const view = render(<LocaleProvider><InstallGuidance /><PwaUpdateNotice needRefresh onUpdate={async () => {}} onLater={() => {}} /><RestartRequired onRestart={() => {}} /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: locale === 'en' ? 'How to install EasyTrack' : 'Как установить EasyTrack' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(locale === 'en' ? 'Add to Home Screen' : 'На экран')
  expect(screen.getByRole('status')).toHaveAccessibleName(locale === 'en' ? 'EasyTrack update' : 'Обновление EasyTrack')
  expect(screen.getByRole('heading', { name: locale === 'en' ? 'Restart EasyTrack' : 'Нужно перезапустить EasyTrack' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: locale === 'en' ? 'Close' : 'Закрыть' }))
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome')
  view.rerender(<LocaleProvider><InstallGuidance /><RestartRequired onRestart={() => {}} /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: locale === 'en' ? 'How to install EasyTrack' : 'Как установить EasyTrack' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(locale === 'en' ? 'Open the browser menu' : 'Откройте меню браузера')
  await act(async () => { fireEvent.change(within(screen.getByRole('dialog')).getByRole('combobox'), { target: { value: locale === 'en' ? 'ru' : 'en' } }) })
  expect(screen.getByRole('heading', { name: locale === 'en' ? 'Нужно перезапустить EasyTrack' : 'Restart EasyTrack' })).toBeInTheDocument()
})


it('announces preference write failures once inside the active dialog', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><InstallGuidance /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Как установить EasyTrack' }))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  await user.selectOptions(within(screen.getByRole('dialog')).getByRole('combobox'), 'en')
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Could not save your language')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
  expect(screen.getAllByRole('alert')).toHaveLength(1)
})
