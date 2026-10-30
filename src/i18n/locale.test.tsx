import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/app'
import { ProjectBoardDatabase, DexieProjectBoardRepository, type ProjectBoardRepository } from '../features/project-board'
import { InstallGuidance } from '../app/pwa/install-guidance'
import { PwaUpdateNotice } from '../app/pwa/update-notice'
import { RestartRequired } from '../app/pwa/restart-required'
import { AppBar } from '../ui/app-bar'
import { ActionDialog } from '../features/project-board/presentation/controls'
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
  const view = render(<LocaleProvider><AppBar title="EasyTrack" /></LocaleProvider>)
  expect(document.documentElement.lang).toBe('en')
  expect(document.title).toBe('EasyTrack — personal project tracker')
  expect(localStorage.getItem(localeStorageKey)).toBeNull()
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Application language' }), 'ru')
  expect(document.documentElement.lang).toBe('ru')
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'EasyTrack — трекер личных проектов')
  expect(document.querySelector('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.ru.webmanifest')
  expect(localStorage.getItem(localeStorageKey)).toBe('ru')
  view.unmount()
  render(<LocaleProvider><AppBar title="EasyTrack" /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(screen.getByRole('combobox')).toHaveValue('ru')
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.selectOptions(screen.getByRole('combobox'), 'en')
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save your language')
  expect(document.documentElement.lang).toBe('en')
})

it.each(['loading', 'unavailable'] as const)('keeps keyboard language switching available when workspace is %s', async kind => {
  const repo = { open: kind === 'loading' ? () => new Promise(() => {}) : () => Promise.reject(Error('blocked')) } as unknown as ProjectBoardRepository
  render(<App repository={repo} />)
  if (kind === 'unavailable') await screen.findByRole('heading', {name: 'Рабочая доска недоступна'})
  await userEvent.setup().click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  const selector = screen.getByRole('combobox')
  selector.focus()
  expect(selector).toHaveFocus()
  fireEvent.change(selector, { target: { value: 'en' } })
  expect(await screen.findByText(kind === 'loading' ? 'Opening workspace…' : 'Project board unavailable')).toBeInTheDocument()
  expect(selector).toHaveFocus()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getAllByRole('combobox')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /Создать|Добавить|Create|Add status/ })).not.toBeInTheDocument()
})

it('isolates a dialog and restores the sole language selector after closing', async () => {
  const user = userEvent.setup()
  render(<App repository={repository()} />)
  await user.click(await screen.findByRole('button', { name: 'Создать проект' }))
  await user.type(screen.getByLabelText('Название проекта'), 'Мой проект')
  await user.click(screen.getByRole('button', { name: 'Создать проект' }))
  await screen.findByRole('heading', { name: 'Мой проект' })
  const trigger = screen.getByRole('button', { name: 'Добавить статус' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
  expect(document.querySelectorAll('.locale-selector select')).toHaveLength(0)
  expect(document.querySelector('.app-bar')).toHaveAttribute('aria-hidden', 'true')
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.type(screen.getByLabelText('Название статуса'), 'Черновик')
  for (let index = 0; index < 8; index++) { await user.tab(); expect(dialog.contains(document.activeElement)).toBe(true) }
  for (let index = 0; index < 8; index++) { await user.tab({ shift: true }); expect(dialog.contains(document.activeElement)).toBe(true) }
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.selectOptions(screen.getByRole('combobox'), 'en')
  expect(screen.getByRole('heading', { name: 'Мой проект' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Add status' }))
  expect(screen.getByRole('dialog', { name: 'New status' })).toBeInTheDocument()
})

it('keeps a replacement app bar inert while an existing dialog remains open', async () => {
  function ChangingBar() {
    const [title, setTitle] = useState('Loading')
    const [open, setOpen] = useState(true)
    return <><AppBar key={title} title={title} />{open ? <ActionDialog title="Guidance" onClose={() => setOpen(false)}><button onClick={() => setTitle('Ready')}>Finish loading</button></ActionDialog> : null}</>
  }
  const user = userEvent.setup()
  render(<LocaleProvider><ChangingBar /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Finish loading' }))
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('heading', { name: 'Ready' })).toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})

it.each(['en', 'ru'] as const)('translates validation and save errors in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const repo = repository()
  vi.spyOn(repo, 'createProject').mockRejectedValue(Error('quota'))
  const user = userEvent.setup()
  render(<App repository={repo} />)
  const create = await screen.findByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' })
  await user.click(create)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' }))
  expect(screen.getByRole('alert')).toHaveTextContent(locale === 'en' ? 'Name is required' : 'Название обязательно')
  await user.type(screen.getByRole('textbox'), 'Название')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' }))
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
  expect(document.querySelector('h1')).toHaveTextContent(locale === 'en' ? 'Restart EasyTrack' : 'Нужно перезапустить EasyTrack')
  await user.click(screen.getByRole('button', { name: locale === 'en' ? 'Close' : 'Закрыть' }))
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome')
  view.rerender(<LocaleProvider><InstallGuidance /><RestartRequired onRestart={() => {}} /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: locale === 'en' ? 'How to install EasyTrack' : 'Как установить EasyTrack' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(locale === 'en' ? 'Open the browser menu' : 'Откройте меню браузера')
  expect(within(screen.getByRole('dialog')).queryByRole('combobox')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: locale === 'en' ? 'ru' : 'en' } })
  expect(screen.getByRole('heading', { name: locale === 'en' ? 'Нужно перезапустить EasyTrack' : 'Restart EasyTrack' })).toBeInTheDocument()
})


it('keeps the preference warning in the app bar after a dialog closes', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="EasyTrack" /><InstallGuidance /></LocaleProvider>)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.selectOptions(screen.getByRole('combobox'), 'en')
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save your language')
  await user.click(screen.getByRole('button', { name: 'How to install EasyTrack' }))
  expect(within(screen.getByRole('dialog')).queryByRole('combobox')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Settings' }))
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  expect(within(screen.getByRole('banner')).getByRole('alert')).toHaveTextContent('Could not save your language')
})
