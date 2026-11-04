import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../../i18n/provider'
import { ProjectCatalogueView } from './project-catalogue-view'

afterEach(() => { cleanup(); localStorage.clear() })
it.each([
  ['ru', ['0 карточек', '1 карточка', '2 карточки', '5 карточек']],
  ['en', ['0 cards', '1 card', '2 cards', '5 cards']],
])('shows localized counts and independent opening/rename/delete controls in %s', async (locale, labels) => {
  localStorage.setItem('easytrack.locale', locale)
  const user = userEvent.setup(), onOpen = vi.fn(), onRename = vi.fn()
  render(<LocaleProvider><ProjectCatalogueView projects={[0, 1, 2, 5].map((cardCount, index) => ({ id: String(index), name: `Project ${index}`, createdAt: String(index), cardCount }))} saveError={false} onCreate={vi.fn()} onOpen={onOpen} onRename={onRename} onReadSummary={vi.fn()} onDelete={vi.fn()} /></LocaleProvider>)
  for (const label of labels) expect(screen.getByText(label)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Project 1' }))
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('1')
  await user.click(screen.getByRole('button', { name: locale === 'ru' ? 'Действия проекта Project 1' : 'Project actions for Project 1' }))
  await user.click(screen.getByRole('menuitem', { name: locale === 'ru' ? 'Переименовать' : 'Rename' }))
  const input = screen.getByRole('textbox')
  await user.clear(input); await user.type(input, 'Renamed')
  await user.click(screen.getByRole('button', { name: locale === 'ru' ? 'Сохранить' : 'Save' }))
  expect(onRename).toHaveBeenCalledWith('1', 'Renamed')
  expect(onOpen).toHaveBeenCalledOnce()
})
