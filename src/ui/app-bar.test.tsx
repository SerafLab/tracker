import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../i18n/provider'
import { RestartRequired } from '../app/pwa/restart-required'
import { ActionDialog } from '../features/project-board/presentation/controls'
import { AppBar } from './app-bar'

afterEach(cleanup)

it('composes one primary heading, language selector, navigation and actions in accessible order', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><AppBar title="Проект" navigation={<button>Все проекты</button>} actions={<button>Добавить статус</button>} /></LocaleProvider>)
  const bar = screen.getByRole('banner')
  expect(within(bar).getAllByRole('heading')).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Проект')
  expect(within(bar).getByText('EasyTrack')).toBeInTheDocument()
  await user.tab(); expect(screen.getByRole('combobox')).toHaveFocus()
  await user.tab(); expect(screen.getByRole('button', { name: 'Все проекты' })).toHaveFocus()
  await user.tab(); expect(screen.getByRole('button', { name: 'Добавить статус' })).toHaveFocus()
})

it('keeps one heading and selector in the restart state while retaining recovery', async () => {
  const restart = vi.fn()
  render(<LocaleProvider><RestartRequired onRestart={restart} /></LocaleProvider>)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getAllByRole('combobox')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /Создать|Добавить/ })).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Перезапустить' }))
  expect(restart).toHaveBeenCalledOnce()
})

it('keeps a replacement app bar isolated while a modal remains open', () => {
  const view = render(<LocaleProvider><AppBar key="loading" title="Loading" /><ActionDialog title="Install" onClose={() => {}}><button>Close</button></ActionDialog></LocaleProvider>)
  view.rerender(<LocaleProvider><AppBar key="catalogue" title="Catalogue" /><ActionDialog title="Install" onClose={() => {}}><button>Close</button></ActionDialog></LocaleProvider>)
  expect(document.querySelector('.app-bar')).toHaveAttribute('inert')
  expect(document.querySelector('.app-bar')).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  view.rerender(<LocaleProvider><AppBar title="Catalogue" /></LocaleProvider>)
  expect(screen.getByRole('banner')).not.toHaveAttribute('inert')
  expect(screen.getByRole('combobox')).toBeInTheDocument()
})
