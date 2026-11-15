import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { LocaleProvider } from '../i18n/provider'
import { localeStorageKey } from '../i18n/locale'
import { ActionDialog } from '../features/project-board/presentation/controls'
import { AppBar } from './app-bar'
import { SettingsNavigationContext } from './settings-navigation'

afterEach(cleanup)

it.each(['ru', 'en'])('names and orders the board actions and settings control in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const en = locale === 'en'
  const user = userEvent.setup()
  const openSettings = vi.fn()
  const back = vi.fn(), create = vi.fn(), rename = vi.fn(), remove = vi.fn()
  render(<LocaleProvider><SettingsNavigationContext value={{ openSettings, preserveFocus: () => {}, restoreFocus: () => {} }}>
    <AppBar title="Project" onReturn={back}
      creation={{ label: en ? 'Add status' : 'Добавить статус', onSelect: create, triggerRef: createRef() }}
      projectActions={{ onRename: rename, onDelete: remove, triggerRef: createRef() }} />
  </SettingsNavigationContext></LocaleProvider>)
  const actions = en ? 'Project actions' : 'Действия проекта'
  const settings = en ? 'Settings' : 'Настройки'
  const actionTrigger = screen.getByRole('button', { name: actions })
  const gear = screen.getByRole('button', { name: settings })
  expect(actionTrigger).toHaveAttribute('data-hint', actions)
  expect(gear).toHaveAttribute('data-hint', settings)
  for (const target of [screen.getByRole('button', { name: /EasyTrack/ }), screen.getByRole('button', { name: en ? 'Add status' : 'Добавить статус' }), actionTrigger]) {
    await user.tab()
    expect(target).toHaveFocus()
  }
  await user.keyboard('{Enter}')
  const menu = await screen.findByRole('menu', { name: actions })
  const [first, second] = within(menu).getAllByRole('menuitem')
  expect(first).toHaveFocus()
  await user.keyboard('{ArrowDown}'); expect(second).toHaveFocus()
  await user.keyboard('{ArrowDown}'); expect(first).toHaveFocus()
  await user.keyboard('{ArrowUp}'); expect(second).toHaveFocus()
  await user.keyboard('{Escape}'); await waitFor(() => expect(actionTrigger).toHaveFocus())
  expect(menu).not.toBeInTheDocument()
  await user.tab(); expect(gear).toHaveFocus()
  await user.keyboard('{Enter}'); expect(openSettings).toHaveBeenCalledOnce()
  await user.click(actionTrigger)
  await user.click(screen.getByRole('heading', { name: 'Project' }))
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await user.click(actionTrigger)
  await user.click(screen.getByRole('menuitem', { name: en ? 'Rename project' : 'Переименовать проект' }))
  expect(rename).toHaveBeenCalledOnce()
  await waitFor(() => expect(actionTrigger).toHaveFocus())
})

it.each(['ru', 'en'])('focuses the settings heading and offers only localised navigation in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const user = userEvent.setup()
  const onBack = vi.fn()
  const label = locale === 'en' ? 'Back' : 'Назад'
  render(<LocaleProvider><AppBar title="Settings heading" onReturn={() => {}} onBack={onBack} /></LocaleProvider>)
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(2)
  const back = screen.getByRole('button', { name: label })
  expect(back).toHaveAttribute('data-hint', label)
  await user.click(back)
  expect(onBack).toHaveBeenCalledOnce()
})

it('closes the project menu when a creation modal opens and returns focus to the plus', async () => {
  const user = userEvent.setup()
  const props = { title: 'Project', creation: { label: 'Add status', onSelect: vi.fn(), triggerRef: createRef<HTMLButtonElement>() },
    projectActions: { onRename: vi.fn(), onDelete: vi.fn(), triggerRef: createRef<HTMLButtonElement>() } }
  const bar = <AppBar {...props} />
  const view = render(<LocaleProvider>{bar}</LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Действия проекта' }))
  await screen.findByRole('menu')
  await user.click(screen.getByRole('button', { name: 'Add status' }))
  const rerender = (open: boolean) => view.rerender(<LocaleProvider>{bar}{open ? <ActionDialog title="New status" onClose={() => rerender(false)} returnFocus={props.creation.triggerRef}><button>Close</button></ActionDialog> : null}</LocaleProvider>)
  rerender(true)
  expect(document.querySelector('.bar-menu')).not.toBeInTheDocument()
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add status' })).toHaveFocus())
})

it('dismisses the project menu on document scrolling but keeps it during nested board scrolling', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="Project" projectActions={{ onRename: vi.fn(), onDelete: vi.fn(), triggerRef: createRef() }} /><section data-testid="board-scroller" /></LocaleProvider>)
  await user.click(screen.getByRole('button', { name: 'Действия проекта' }))
  await screen.findByRole('menu')
  fireEvent.scroll(screen.getByTestId('board-scroller'))
  expect(screen.getByRole('menu')).toBeInTheDocument()
  fireEvent.scroll(document)
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
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
