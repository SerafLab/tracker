import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/app'
import { ProjectBoardDatabase, DexieProjectBoardRepository, type ProjectBoardRepository } from '../features/project-board'
import { InstallProvider } from '../app/pwa/install-guidance'
import { NotificationProvider } from '../ui/notifications'
import { PwaUpdateNotice } from '../app/pwa/update-notice'
import { AppBar } from '../ui/app-bar'
import { ActionDialog } from '../features/project-board/presentation/controls'
import { SettingsPage } from '../app/settings/settings-page'
import { LocaleProvider } from './provider'
import { localeStorageKey, resolveLocale } from './locale'
import { findHeaderCreate } from '../test/queries'

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
  const view = render(<LocaleProvider><SettingsPage onBack={() => {}} onReturn={() => {}} /></LocaleProvider>)
  expect(document.documentElement.lang).toBe('en')
  expect(document.title).toBe('EasyTrack — personal project tracker')
  expect(localStorage.getItem(localeStorageKey)).toBeNull()
  await user.click(await screen.findByRole('radio', { name: 'Русский' }))
  expect(document.documentElement.lang).toBe('ru')
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'EasyTrack — трекер личных проектов')
  expect(document.querySelector('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.ru.webmanifest')
  expect(localStorage.getItem(localeStorageKey)).toBe('ru')
  view.unmount()
  render(<LocaleProvider><SettingsPage onBack={() => {}} onReturn={() => {}} /></LocaleProvider>)
  expect(await screen.findByRole('radio', { name: 'Русский' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked()
  await user.click(screen.getByRole('radio', { name: 'Русский' }))
  expect(screen.getByRole('heading', { name: 'Настройки' })).toBeInTheDocument()
  expect(document.documentElement.lang).toBe('ru')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  await user.click(await screen.findByRole('radio', { name: 'English' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your language')
  expect(within(screen.getByRole('group', { name: 'Application language' })).getByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  expect(document.documentElement.lang).toBe('en')
})

it.each(['loading', 'unavailable'] as const)('keeps keyboard language switching available when workspace is %s', async kind => {
  const repo = { open: kind === 'loading' ? () => new Promise(() => {}) : () => Promise.reject(Error('blocked')) } as unknown as ProjectBoardRepository
  render(<App repository={repo} />)
  if (kind === 'unavailable') await screen.findByRole('heading', {name: 'Рабочая доска недоступна'})
  await userEvent.setup().click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  const selector = await screen.findByRole('radio', { name: 'English' })
  await userEvent.setup().click(selector)
  expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Data' })).not.toBeInTheDocument()
  expect(selector).toHaveFocus()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getAllByRole('group')).toHaveLength(2)
  expect(screen.getAllByRole('group', { name: 'Application language' })).toHaveLength(1)
  expect(screen.getAllByRole('group', { name: 'Application color theme' })).toHaveLength(1)
  expect(screen.getAllByRole('radio')).toHaveLength(4)
  expect(selector).toBeChecked()
  expect(screen.queryByRole('button', { name: /Создать|Добавить|Create|Add status/ })).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }))
  expect(await screen.findByRole('heading', { name: kind === 'loading' ? 'Opening workspace…' : 'Project board unavailable' })).toBeInTheDocument()
})

it('isolates a dialog and restores the sole language selector after closing', async () => {
  const user = userEvent.setup()
  render(<App repository={repository()} />)
  await user.click(await findHeaderCreate('Создать проект'))
  await user.type(screen.getByLabelText('Название проекта'), 'Мой проект')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Создать проект' }))
  await screen.findByRole('heading', { name: 'Мой проект' })
  const trigger = screen.getByRole('button', { name: 'Добавить статус' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
  expect(document.querySelector('.app-bar')).toHaveAttribute('aria-hidden', 'true')
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  await user.type(screen.getByLabelText('Название статуса'), 'Черновик')
  for (let index = 0; index < 8; index++) { await user.tab(); expect(dialog.contains(document.activeElement)).toBe(true) }
  for (let index = 0; index < 8; index++) { await user.tab({ shift: true }); expect(dialog.contains(document.activeElement)).toBe(true) }
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  await user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))
  await user.click(await screen.findByRole('radio', { name: 'English' }))
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await screen.findByRole('heading', { name: 'Мой проект' })
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
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('heading', { name: 'Ready' })).toBeInTheDocument()
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
})

it.each(['en', 'ru'] as const)('translates validation and save errors in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const repo = repository()
  vi.spyOn(repo, 'createProject').mockRejectedValue(Error('quota'))
  const user = userEvent.setup()
  render(<App repository={repo} />)
  const create = await findHeaderCreate(locale === 'en' ? 'Create project' : 'Создать проект')
  await user.click(create)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' }))
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(locale === 'en' ? 'Name is required' : 'Название обязательно')
  await user.type(screen.getByRole('textbox'), 'Название')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: locale === 'en' ? 'Create project' : 'Создать проект' }))
  expect(await screen.findByText(locale === 'en' ? /Could not save changes/ : /Не удалось сохранить изменения/)).toBeInTheDocument()
})

it.each(['en', 'ru'] as const)('translates platform installation, update and restart notices in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone')
  const user = userEvent.setup()
  const openInstallGuidance = async () => {
    await user.click(await screen.findByRole('button', { name: locale === 'en' ? 'How to install EasyTrack' : 'Как установить EasyTrack' }))
  }
  const view = render(<LocaleProvider><NotificationProvider><InstallProvider><PwaUpdateNotice needRefresh onUpdate={async () => {}} onLater={() => {}} /><SettingsPage onBack={() => {}} onReturn={() => {}} /></InstallProvider></NotificationProvider></LocaleProvider>)
  expect(screen.getByRole('status', { name: locale === 'en' ? 'EasyTrack update' : 'Обновление EasyTrack' })).toHaveTextContent(locale === 'en' ? 'An EasyTrack update is available.' : 'Доступно обновление EasyTrack.')
  await openInstallGuidance()
  expect(screen.getByRole('dialog')).toHaveTextContent(locale === 'en' ? 'Add to Home Screen' : 'На экран')
  expect(document.querySelector('h1')).toHaveTextContent(locale === 'en' ? 'Settings' : 'Настройки')
  await user.click(screen.getByRole('button', { name: locale === 'en' ? 'Close' : 'Закрыть' }))
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome')
  view.rerender(<LocaleProvider><NotificationProvider><InstallProvider><SettingsPage onBack={() => {}} onReturn={() => {}} /></InstallProvider></NotificationProvider></LocaleProvider>)
  await openInstallGuidance()
  expect(screen.getByRole('dialog')).toHaveTextContent(locale === 'en' ? 'Open the browser menu' : 'Откройте меню браузера')
  expect(within(screen.getByRole('dialog')).queryByRole('radio')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')

})


it('keeps the preference warning beside the language choice after a dialog closes', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><InstallProvider><SettingsPage onBack={() => {}} onReturn={() => {}} /></InstallProvider></LocaleProvider>)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  await user.click(await screen.findByRole('radio', { name: 'English' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save your language')
  await user.click(screen.getByRole('button', { name: 'How to install EasyTrack' }))
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  expect(within(screen.getByRole('dialog')).queryByRole('radio')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  expect(within(screen.getByRole('group', { name: 'Application language' })).getByRole('alert')).toHaveTextContent('Could not save your language')
})

describe('resources', () => {
  it('has the same non-empty keys in both languages', async () => {
    const { ru, en } = await import('./resources')
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
    expect(Object.values(en).every(Boolean) && Object.values(ru).every(Boolean)).toBe(true)
  })
})
