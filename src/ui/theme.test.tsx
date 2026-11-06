import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import { localeStorageKey } from '../i18n/locale'
import { LocaleProvider } from '../i18n/provider'
import { RestartRequired } from '../app/pwa/restart-required'
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
  return render(<LocaleProvider><ThemeProvider><AppBar title="Catalogue" /></ThemeProvider></LocaleProvider>)
}
const openSettings = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))

const themeGroup = (name: string | RegExp = /^(Application color theme|Цветовая тема приложения)$/) => screen.findByRole('group', { name })

describe('theme menu group', () => {
  it('applies and stores the choice, removing the attribute for Ink', async () => {
    const user = userEvent.setup()
    renderBar()
    await openSettings(user)
    const group = await themeGroup()
    expect(within(group).getByRole('menuitemradio', { name: 'Ink' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(group).getByRole('menuitemradio', { name: 'Green' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('green'))
    expect(localStorage.getItem(themeStorageKey)).toBe('green')
    expect(within(group).getByRole('menuitemradio', { name: 'Green' })).toHaveAttribute('aria-checked', 'true')
    expect(within(group).getByRole('menuitemradio', { name: 'Ink' })).toHaveAttribute('aria-checked', 'false')
    await user.click(within(group).getByRole('menuitemradio', { name: 'Ink' }))
    await waitFor(() => expect(document.documentElement).not.toHaveAttribute('data-theme'))
    expect(localStorage.getItem(themeStorageKey)).toBe('ink')
  })
  it('starts from the attribute set before first paint', async () => {
    document.documentElement.dataset.theme = 'green'
    const user = userEvent.setup()
    renderBar()
    await openSettings(user)
    expect(within(await themeGroup()).getByRole('menuitemradio', { name: 'Green' })).toHaveAttribute('aria-checked', 'true')
  })
  it('keeps the theme for the session and warns when the write fails', async () => {
    const user = userEvent.setup()
    renderBar('ru')
    await openSettings(user)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
    await user.click(within(await themeGroup('Цветовая тема приложения')).getByRole('menuitemradio', { name: 'Зелёная' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить цветовую тему')
    expect(document.documentElement.dataset.theme).toBe('green')
    expect(screen.getByRole('menuitemradio', { name: 'Зелёная' })).toHaveAttribute('aria-checked', 'true')
  })
  it('follows the interface language', async () => {
    const user = userEvent.setup()
    renderBar('ru')
    await openSettings(user)
    const group = await themeGroup('Цветовая тема приложения')
    expect(within(group).getAllByRole('menuitemradio').map(item => item.textContent)).toEqual(['Зелёная', 'Чернильная'])
    await user.click(screen.getByRole('menuitemradio', { name: 'English' }))
    const english = await themeGroup('Application color theme')
    expect(within(english).getAllByRole('menuitemradio').map(item => item.textContent)).toEqual(['Green', 'Ink'])
  })
  it('is one group between separators and shares arrow-key navigation with the language group', async () => {
    const user = userEvent.setup()
    renderBar('en')
    await openSettings(user)
    const menu = await screen.findByRole('menu', { name: 'Settings' })
    expect(within(menu).getAllByRole('group')).toHaveLength(2)
    expect(await themeGroup('Application color theme')).toBeInTheDocument()
    expect(within(menu).getAllByRole('separator')).toHaveLength(1)
    const items = within(menu).getAllByRole('menuitemradio')
    expect(items.map(item => item.textContent)).toEqual(['Русский', 'English', 'Green', 'Ink'])
    items[1].focus()
    await user.keyboard('{ArrowDown}')
    expect(items[2]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(items[2]).toHaveAttribute('aria-checked', 'true')
  })
  it('exists only while settings are open and no modal is shown, including service screens', async () => {
    const user = userEvent.setup()
    const view = renderBar()
    expect(screen.queryByRole('group', { name: 'Application color theme' })).not.toBeInTheDocument()
    await openSettings(user)
    expect(await themeGroup('Application color theme')).toBeInTheDocument()
    view.rerender(<LocaleProvider><ThemeProvider><AppBar title="Catalogue" /><ActionDialog title="Dialog" onClose={() => {}}><button>Close</button></ActionDialog></ThemeProvider></LocaleProvider>)
    expect(screen.queryByRole('group', { name: 'Application color theme' })).not.toBeInTheDocument()
    view.unmount()
    render(<LocaleProvider><ThemeProvider><RestartRequired onRestart={() => {}} /></ThemeProvider></LocaleProvider>)
    await openSettings(user)
    expect(await themeGroup('Application color theme')).toBeInTheDocument()
  })
})
