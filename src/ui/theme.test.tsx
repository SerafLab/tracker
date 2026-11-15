import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import { localeStorageKey } from '../i18n/locale'
import { LocaleProvider } from '../i18n/provider'
import { SettingsPage } from '../app/settings/settings-page'
import { AppBar } from './app-bar'
import { ActionDialog } from '../features/project-board/presentation/controls'
import { themeStorageKey } from './theme'
import { ThemeProvider } from './theme-provider'

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); delete document.documentElement.dataset.theme })

describe('inline theme script in index.html', () => {
  const script = indexHtml.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>[\s\S]*?<\/head>/)?.[1] ?? ''
  const run = (storage: Pick<Storage, 'getItem'>) => { delete document.documentElement.dataset.theme; new Function('localStorage', script)(storage); return document.documentElement.dataset.theme }
  it('runs before the stylesheet and reads the module storage key', () => {
    expect(script).toContain(`"${themeStorageKey}"`)
    expect(indexHtml.indexOf('<script>')).toBeLessThan(indexHtml.indexOf('<title>'))
  })
  it('sets the attribute only for the exact stored value green', () => {
    expect(run({ getItem: () => null })).toBeUndefined()
    expect(run({ getItem: () => 'plum' })).toBeUndefined()
    expect(run({ getItem: () => 'Green' })).toBeUndefined()
    expect(run({ getItem: () => 'ink' })).toBeUndefined()
    expect(run({ getItem: () => { throw Error('blocked') } })).toBeUndefined()
    expect(run({ getItem: key => key === themeStorageKey ? 'green' : null })).toBe('green')
  })
})

function renderBar(locale = 'en') {
  localStorage.setItem(localeStorageKey, locale)
  return render(<LocaleProvider><ThemeProvider><SettingsPage onBack={() => {}} onReturn={() => {}} /></ThemeProvider></LocaleProvider>)
}

const themeGroup = (name: string | RegExp = /^(Application color theme|Цветовая тема приложения)$/) => screen.findByRole('group', { name })

describe('theme choice', () => {
  it('applies and stores the choice, removing the attribute for Ink', async () => {
    const user = userEvent.setup()
    renderBar()
    const group = await themeGroup()
    expect(within(group).getByRole('radio', { name: 'Ink' })).toBeChecked()
    await user.click(within(group).getByRole('radio', { name: 'Green' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('green'))
    expect(localStorage.getItem(themeStorageKey)).toBe('green')
    expect(within(group).getByRole('radio', { name: 'Green' })).toBeChecked()
    expect(within(group).getByRole('radio', { name: 'Ink' })).not.toBeChecked()
    await user.click(within(group).getByRole('radio', { name: 'Ink' }))
    await waitFor(() => expect(document.documentElement).not.toHaveAttribute('data-theme'))
    expect(localStorage.getItem(themeStorageKey)).toBe('ink')
  })
  it('starts from the attribute set before first paint', async () => {
    document.documentElement.dataset.theme = 'green'
    renderBar()
    expect(within(await themeGroup()).getByRole('radio', { name: 'Green' })).toBeChecked()
  })
  it('keeps the theme for the session and warns when the write fails', async () => {
    const user = userEvent.setup()
    renderBar('ru')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
    await user.click(within(await themeGroup('Цветовая тема приложения')).getByRole('radio', { name: 'Зелёная' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить цветовую тему')
    expect(document.documentElement.dataset.theme).toBe('green')
    expect(screen.getByRole('radio', { name: 'Зелёная' })).toBeChecked()
  })
  it('follows the interface language', async () => {
    const user = userEvent.setup()
    renderBar('ru')
    const group = await themeGroup('Цветовая тема приложения')
    expect(within(group).getAllByRole('radio').map(item => item.closest('label')?.textContent?.trim())).toEqual(['Зелёная', 'Чернильная'])
    await user.click(screen.getByRole('radio', { name: 'English' }))
    const english = await themeGroup('Application color theme')
    expect(within(english).getAllByRole('radio').map(item => item.closest('label')?.textContent?.trim())).toEqual(['Green', 'Ink'])
  })
  it('switches and focuses the neighboring theme with the arrow key', async () => {
    const user = userEvent.setup()
    renderBar('en')
    const ink = screen.getByRole('radio', { name: 'Ink' })
    ink.focus()
    await user.keyboard('{ArrowUp}')
    const green = screen.getByRole('radio', { name: 'Green' })
    expect(green).toHaveFocus()
    expect(green).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'green')
  })
  it('does not expose the theme choice on the workspace or while a dialog covers settings', () => {
    const view = renderBar()
    expect(screen.getByRole('group', { name: 'Application color theme' })).toBeInTheDocument()
    view.rerender(<LocaleProvider><ThemeProvider><SettingsPage onBack={() => {}} onReturn={() => {}} /><ActionDialog title="Dialog" onClose={() => {}}><button>Close</button></ActionDialog></ThemeProvider></LocaleProvider>)
    expect(screen.queryByRole('group', { name: 'Application color theme' })).not.toBeInTheDocument()
    view.rerender(<LocaleProvider><ThemeProvider><AppBar title="Catalogue" /></ThemeProvider></LocaleProvider>)
    expect(screen.queryByRole('group', { name: 'Application color theme' })).not.toBeInTheDocument()
  })
})
