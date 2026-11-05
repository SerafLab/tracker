import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { LocaleProvider } from '../i18n/provider'
import { localeStorageKey } from '../i18n/locale'
import { RestartRequired } from '../app/pwa/restart-required'
import { ActionDialog } from '../features/project-board/presentation/controls'
import { AppBar } from './app-bar'
import { SettingsEntries } from './settings-entry'

afterEach(cleanup)

it.each(['ru', 'en'])('offers contextual icon controls and keyboard settings in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const en = locale === 'en'
  const user = userEvent.setup()
  const back = vi.fn(), create = vi.fn(), rename = vi.fn()
  render(<LocaleProvider><AppBar title="Проект" onReturn={back} creation={{label: en ? 'Add status' : 'Добавить статус', onSelect: create, triggerRef: createRef()}} rename={{onSelect: rename, triggerRef: createRef()}} /></LocaleProvider>)
  const gear = screen.getByRole('button', { name: en ? 'Settings' : 'Настройки' })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
  const brand = screen.getByRole('button', { name: /EasyTrack/ })
  await user.tab(); expect(brand).toHaveFocus()
  expect(brand).toHaveAttribute('data-hint', en ? 'All projects' : 'Все проекты')
  await user.keyboard('{Enter}'); expect(back).toHaveBeenCalledOnce()
  await user.tab(); expect(screen.getByRole('button', {name: en ? 'Add status' : 'Добавить статус'})).toHaveFocus()
  await user.keyboard('{Enter}'); expect(create).toHaveBeenCalledOnce()
  await user.tab(); expect(gear).toHaveFocus()
  expect(gear).toHaveTextContent('')
  expect(gear).toHaveAttribute('data-hint', en ? 'Settings' : 'Настройки')
  expect(gear).toHaveAttribute('aria-haspopup', 'menu')
  await user.keyboard('{Enter}'); expect(gear).toHaveAttribute('aria-expanded', 'true')
  expect(await screen.findByRole('menuitem', {name: en ? 'Rename project' : 'Переименовать проект'})).toHaveFocus()
  await user.keyboard('{Escape}'); await waitFor(() => expect(gear).toHaveFocus())
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await user.click(gear)
  await user.click(brand)
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await user.click(gear)
  await user.click(await screen.findByRole('menuitem', {name: en ? 'Rename project' : 'Переименовать проект'}))
  expect(rename).toHaveBeenCalledOnce()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('lists actions, a separator and the language group in order with a wrapping arrow-key cycle', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><SettingsEntries entries={[{ label: 'Как установить EasyTrack', onSelect: () => {} }]}><AppBar title="Проект" rename={{onSelect: () => {}, triggerRef: createRef()}} deleteProject={{onSelect: () => {}, triggerRef: createRef()}} /></SettingsEntries></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  const menu = await screen.findByRole('menu', { name: 'Настройки' })
  const items = [...within(menu).getAllByRole('menuitem'), ...within(menu).getAllByRole('menuitemradio')]
  expect(items.map(item => item.textContent)).toEqual(['Переименовать проект', 'Удалить проект', 'Как установить EasyTrack', 'Русский', 'English'])
  expect(within(menu).getAllByRole('separator')).toHaveLength(1)
  const group = within(menu).getByRole('group', { name: 'Язык приложения' })
  expect(within(group).getAllByRole('menuitemradio')).toHaveLength(2)
  expect(items[0]).toHaveFocus()
  for (const item of [...items.slice(1), items[0]]) { await user.keyboard('{ArrowDown}'); expect(item).toHaveFocus() }
  await user.keyboard('{ArrowUp}'); expect(items[4]).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Настройки' })).toHaveAttribute('aria-controls', menu.id)
  await user.click(within(menu).getByText('Язык приложения'))
  await user.keyboard('{ArrowUp}'); expect(items[4]).toHaveFocus()
})

it('omits the separator when no action precedes the language group', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="Каталог" /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  const menu = await screen.findByRole('menu', { name: 'Настройки' })
  expect(within(menu).queryByRole('separator')).not.toBeInTheDocument()
  expect(within(menu).getByRole('group', { name: 'Язык приложения' })).toBeInTheDocument()
  expect(within(menu).getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus()
})

it('keeps the menu open and focus on the chosen language item', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="Каталог" /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  const english = await screen.findByRole('menuitemradio', { name: 'English' })
  expect(english).toHaveAttribute('lang', 'en')
  await user.click(english)
  expect(await screen.findByRole('group', { name: 'Application language' })).toBeInTheDocument()
  expect(screen.getByRole('menu', { name: 'Settings' })).toBeInTheDocument()
  expect(english).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveAttribute('aria-checked', 'false')
  expect(english).toHaveFocus()
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus())
})

it('renders a supplied application settings entry before the language group and closes settings when it is chosen', async () => {
  const user = userEvent.setup()
  const select = vi.fn(() => expect(gear).toHaveFocus())
  render(<LocaleProvider><SettingsEntries entries={[{ label: 'Как установить EasyTrack', onSelect: select }]}><AppBar title="Каталог" /></SettingsEntries></LocaleProvider>)
  const gear = screen.getByRole('button', { name: 'Настройки' })
  await user.click(gear)
  const menu = await screen.findByRole('menu', { name: 'Настройки' })
  const entry = within(menu).getByRole('menuitem', { name: 'Как установить EasyTrack' })
  expect(entry.compareDocumentPosition(within(menu).getByRole('menuitemradio', { name: 'Русский' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  await user.click(entry)
  expect(select).toHaveBeenCalledOnce()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('omits the application settings entry without a provider', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="Каталог" /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(within(await screen.findByRole('menu', { name: 'Настройки' })).queryAllByRole('menuitem')).toHaveLength(0)
})

it('keeps settings and recovery on the restart screen without project actions', async () => {
  const restart = vi.fn(), user = userEvent.setup()
  render(<LocaleProvider><RestartRequired onRestart={restart} /></LocaleProvider>)
  expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(await screen.findAllByRole('group', { name: 'Язык приложения' })).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /Создать|Добавить|Переименовать|Удалить/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Перезапустить' }))
  expect(restart).toHaveBeenCalledOnce()
  expect(screen.queryByRole('group', { name: 'Язык приложения' })).not.toBeInTheDocument()
})

it('closes the top-layer settings when a modal opens and keeps replacement bars isolated', async () => {
  const user = userEvent.setup()
  const view = render(<LocaleProvider><AppBar title="Loading" /></LocaleProvider>)
  await user.click(screen.getByRole('button', {name: 'Настройки'}))
  expect(await screen.findByRole('group', { name: 'Язык приложения' })).toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar title="Loading" /><ActionDialog title="Install" onClose={() => {}}><button>Close</button></ActionDialog></LocaleProvider>)
  expect(document.querySelector('.settings-panel')).not.toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar key="catalogue" title="Catalogue" /><ActionDialog title="Install" onClose={() => {}}><button>Close</button></ActionDialog></LocaleProvider>)
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  expect(screen.queryByRole('group', { name: /Язык приложения|Application language/ })).not.toBeInTheDocument()
  expect(within(screen.getByRole('dialog')).queryByRole('menuitemradio')).not.toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar title="Catalogue" /></LocaleProvider>)
  expect(screen.getByRole('banner')).not.toHaveAttribute('inert')
  expect(screen.queryByRole('group', { name: /Язык приложения|Application language/ })).not.toBeInTheDocument()
})


it('only dismisses offscreen settings on document scrolling, not resizing or nested scrolling', async () => {
  let resize = () => {}
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback }
    observe() {}
    disconnect() {}
  })
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="Project" /><section data-testid="board-scroller" /></LocaleProvider>)
  const gear = screen.getByRole('button', {name: 'Настройки'})
  await user.click(gear)
  vi.spyOn(gear, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 12, 44, 44))
  // Full-page capture can briefly change viewport metrics and scroll a nested board.
  vi.stubGlobal('innerHeight', 1)
  try {
    act(() => resize())
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.scroll(screen.getByTestId('board-scroller'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.scroll(document)
    expect(screen.queryByRole('group', { name: /Язык приложения|Application language/ })).not.toBeInTheDocument()
  } finally { vi.unstubAllGlobals() }
})

it('only focuses truncated headings and remeasures title, resize and font changes', async () => {
  let available = 200
  const callbacks = new Set<() => void>()
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.tagName === 'H1' ? available : 0 })
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.tagName === 'H1' ? this.textContent!.length * 10 : 0 })
  vi.stubGlobal('ResizeObserver', class {
    callback: () => void
    constructor(callback: () => void) { this.callback = callback; callbacks.add(callback) }
    observe() {}
    disconnect() { callbacks.delete(this.callback) }
  })
  const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() })
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
  try {
    const view = render(<LocaleProvider><AppBar title="Short" onReturn={() => {}} /></LocaleProvider>)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).not.toHaveAttribute('tabindex')
    expect(document.querySelector('.page-title-hint')).not.toBeInTheDocument()
    view.rerender(<LocaleProvider><AppBar title={'Long title '.repeat(10)} onReturn={() => {}} /></LocaleProvider>)
    expect(heading).toHaveAttribute('tabindex', '0')
    expect(heading).toHaveTextContent('Long title '.repeat(10).trim())
    const hint = document.querySelector('.page-title-hint')!
    expect(hint).toHaveAttribute('aria-hidden', 'true')
    expect(heading.contains(hint)).toBe(false)
    const user = userEvent.setup()
    await user.tab(); await user.tab(); expect(heading).toHaveFocus()
    available = 2000
    act(() => { for (const resize of callbacks) resize() })
    expect(heading).not.toHaveAttribute('tabindex')
    available = 100
    fireEvent(window, new Event('resize'))
    expect(heading).toHaveAttribute('tabindex', '0')
    available = 2000
    act(() => fonts.dispatchEvent(new Event('loadingdone')))
    expect(heading).not.toHaveAttribute('tabindex')
    view.unmount()
    expect(callbacks.size).toBe(0)
  } finally {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(document, 'fonts')
  }
})

it('lists inherited entries before nested ones and cycles through them with the keyboard', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><SettingsEntries entries={[{ label: 'Выгрузить резервную копию', onSelect: () => {} }, { label: 'Восстановить из резервной копии', onSelect: () => {} }]}><SettingsEntries entries={[{ label: 'Как установить EasyTrack', onSelect: () => {} }]}><AppBar title="Проект" rename={{onSelect: () => {}, triggerRef: createRef()}} deleteProject={{onSelect: () => {}, triggerRef: createRef()}} /></SettingsEntries></SettingsEntries></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  const menu = await screen.findByRole('menu', { name: 'Настройки' })
  const items = [...within(menu).getAllByRole('menuitem'), ...within(menu).getAllByRole('menuitemradio')]
  const names = ['Переименовать проект', 'Удалить проект', 'Выгрузить резервную копию', 'Восстановить из резервной копии', 'Как установить EasyTrack', 'Русский', 'English']
  expect(items.map(item => item.textContent)).toEqual(names)
  expect(items[0]).toHaveFocus()
  for (const item of [...items.slice(1), items[0]]) { await user.keyboard('{ArrowDown}'); expect(item).toHaveFocus() }
})
