import { cleanup, render, screen } from '@testing-library/react'
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
  it('sets the attribute only for the exact stored value ink', () => {
    expect(run({ getItem: () => null })).toBeUndefined()
    expect(run({ getItem: () => 'plum' })).toBeUndefined()
    expect(run({ getItem: () => 'Ink' })).toBeUndefined()
    expect(run({ getItem: () => { throw Error('blocked') } })).toBeUndefined()
    expect(run({ getItem: key => key === themeStorageKey ? 'ink' : null })).toBe('ink')
  })
})

function renderBar(locale = 'en') {
  localStorage.setItem(localeStorageKey, locale)
  return render(<LocaleProvider><ThemeProvider><AppBar title="Catalogue" /></ThemeProvider></LocaleProvider>)
}
const openSettings = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /^(Настройки|Settings)$/ }))

describe('theme selector', () => {
  it('applies and stores the choice, removing the attribute for Green', async () => {
    const user = userEvent.setup()
    renderBar()
    await openSettings(user)
    const select = await screen.findByRole('combobox', { name: 'Application color theme' })
    expect(select).toHaveValue('green')
    await user.selectOptions(select, 'ink')
    expect(document.documentElement.dataset.theme).toBe('ink')
    expect(localStorage.getItem(themeStorageKey)).toBe('ink')
    await user.selectOptions(select, 'green')
    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(localStorage.getItem(themeStorageKey)).toBe('green')
  })
  it('starts from the attribute set before first paint', async () => {
    document.documentElement.dataset.theme = 'ink'
    const user = userEvent.setup()
    renderBar()
    await openSettings(user)
    expect(await screen.findByRole('combobox', { name: 'Application color theme' })).toHaveValue('ink')
  })
  it('keeps the theme for the session and warns when the write fails', async () => {
    const user = userEvent.setup()
    renderBar('ru')
    await openSettings(user)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Цветовая тема приложения' }), 'ink')
    expect(document.documentElement.dataset.theme).toBe('ink')
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить цветовую тему')
    expect(screen.getByRole('combobox', { name: 'Цветовая тема приложения' })).toHaveValue('ink')
  })
  it('follows the interface language', async () => {
    const user = userEvent.setup()
    renderBar('ru')
    await openSettings(user)
    const select = await screen.findByRole('combobox', { name: 'Цветовая тема приложения' })
    expect([...select.querySelectorAll('option')].map(option => option.textContent)).toEqual(['Зелёная', 'Чернильная'])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Язык приложения' }), 'en')
    const english = await screen.findByRole('combobox', { name: 'Application color theme' })
    expect([...english.querySelectorAll('option')].map(option => option.textContent)).toEqual(['Green', 'Ink'])
  })
  it('exists only while settings are open and no modal is shown, including service screens', async () => {
    const user = userEvent.setup()
    const view = renderBar()
    expect(screen.queryByRole('combobox', { name: 'Application color theme' })).not.toBeInTheDocument()
    await openSettings(user)
    expect(await screen.findByRole('combobox', { name: 'Application color theme' })).toBeInTheDocument()
    view.rerender(<LocaleProvider><ThemeProvider><AppBar title="Catalogue" /><ActionDialog title="Dialog" onClose={() => {}}><button>Close</button></ActionDialog></ThemeProvider></LocaleProvider>)
    expect(screen.queryByRole('combobox', { name: 'Application color theme' })).not.toBeInTheDocument()
    view.unmount()
    render(<LocaleProvider><ThemeProvider><RestartRequired onRestart={() => {}} /></ThemeProvider></LocaleProvider>)
    await openSettings(user)
    expect(await screen.findByRole('combobox', { name: 'Application color theme' })).toBeInTheDocument()
  })
})
