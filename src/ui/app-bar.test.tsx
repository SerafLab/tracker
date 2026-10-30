import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { LocaleProvider } from '../i18n/provider'
import { localeStorageKey } from '../i18n/locale'
import { RestartRequired } from '../app/pwa/restart-required'
import { ActionDialog } from '../features/project-board/presentation/controls'
import { AppBar } from './app-bar'

afterEach(cleanup)

it.each(['ru', 'en'])('offers contextual icon controls and keyboard settings in %s', async locale => {
  localStorage.setItem(localeStorageKey, locale)
  const en = locale === 'en'
  const user = userEvent.setup()
  const back = vi.fn(), create = vi.fn(), rename = vi.fn()
  render(<LocaleProvider><AppBar title="Проект" onReturn={back} creation={{label: en ? 'Add status' : 'Добавить статус', onSelect: create, triggerRef: createRef()}} rename={{onSelect: rename, triggerRef: createRef()}} /></LocaleProvider>)
  const gear = screen.getByRole('button', { name: en ? 'Settings' : 'Настройки' })
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
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
  await user.keyboard('{Enter}'); expect(gear).toHaveAttribute('aria-expanded', 'true')
  await user.tab(); expect(screen.getByRole('button', {name: en ? 'Rename project' : 'Переименовать проект'})).toHaveFocus()
  await user.tab(); expect(screen.getByRole('combobox')).toHaveFocus()
  await user.keyboard('{Escape}'); expect(gear).toHaveFocus()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.click(gear)
  await user.click(brand)
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.click(gear)
  await user.click(screen.getByRole('button', {name: en ? 'Rename project' : 'Переименовать проект'}))
  expect(rename).toHaveBeenCalledOnce()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})

it('keeps settings and recovery on the restart screen without project actions', async () => {
  const restart = vi.fn(), user = userEvent.setup()
  render(<LocaleProvider><RestartRequired onRestart={restart} /></LocaleProvider>)
  expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  expect(screen.getAllByRole('combobox')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /Создать|Добавить|Переименовать/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Перезапустить' }))
  expect(restart).toHaveBeenCalledOnce()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})

it('closes the top-layer settings when a modal opens and keeps replacement bars isolated', async () => {
  const user = userEvent.setup()
  const view = render(<LocaleProvider><AppBar title="Loading" /></LocaleProvider>)
  await user.click(screen.getByRole('button', {name: 'Настройки'}))
  expect(screen.getByRole('combobox')).toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar title="Loading" /><ActionDialog title="Install" onClose={() => {}}><button>Close</button></ActionDialog></LocaleProvider>)
  expect(document.querySelector('.settings-panel')).not.toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar key="catalogue" title="Catalogue" /><ActionDialog title="Install" onClose={() => {}}><button>Close</button></ActionDialog></LocaleProvider>)
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(within(screen.getByRole('dialog')).queryByRole('combobox')).not.toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar title="Catalogue" /></LocaleProvider>)
  expect(screen.getByRole('banner')).not.toHaveAttribute('inert')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
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
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    fireEvent.scroll(screen.getByTestId('board-scroller'))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    fireEvent.scroll(document)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  } finally { vi.unstubAllGlobals() }
})
