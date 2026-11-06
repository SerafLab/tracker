import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { LocaleProvider } from '../../../i18n/provider'
import { ProjectCreateDialog } from './project-create-dialog'
import { ProjectCatalogueView } from './project-catalogue-view'
import { ProjectBoardApp } from './project-board-app'
import { createProjectBoardStore } from '../state/project-board-store'
import { createProjectBoardUseCases } from '../application/use-cases'
import { DexieProjectBoardRepository } from '../infrastructure/indexeddb/dexie-project-board-repository'
import { ProjectBoardDatabase } from '../infrastructure/indexeddb/database'

const sets = {
  ru: [
    ['simple', 'Простой', ['Нужно сделать', 'В процессе', 'Готово']],
    ['search', 'Поиск и выбор', ['Найдено', 'На рассмотрении', 'В избранном', 'Не подходит']],
    ['documents', 'Заявки и документы', ['Подготовить', 'Отправлено', 'Ожидаю ответа', 'Завершено']],
    ['development', 'Разработка', ['Запланировано', 'На паузе', 'В разработке', 'На проверке', 'Готово']],
    ['job-search', 'Поиск работы', ['Интересно', 'Отклик отправлен', 'Собеседования', 'Предложение', 'Отказ']],
    ['empty', 'Без статусов', []],
  ],
  en: [
    ['simple', 'Simple', ['To do', 'In progress', 'Done']],
    ['search', 'Search and selection', ['Found', 'Under consideration', 'Shortlisted', 'Not suitable']],
    ['documents', 'Applications and documents', ['To prepare', 'Submitted', 'Awaiting response', 'Completed']],
    ['development', 'Development', ['Planned', 'On hold', 'In development', 'In review', 'Done']],
    ['job-search', 'Job search', ['Interested', 'Applied', 'Interviews', 'Offer', 'Rejected']],
    ['empty', 'No statuses', []],
  ],
} as const

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.removeItem('easytrack.locale') })

for (const language of ['ru', 'en'] as const) for (const [id, label, names] of sets[language]) {
  it(`previews and submits the exact ${language} ${id} set`, async () => {
    localStorage.setItem('easytrack.locale', language)
    const submit = vi.fn().mockResolvedValue(true), close = vi.fn()
    render(<LocaleProvider><ProjectCreateDialog onSubmit={submit} onClose={close} returnFocus={createRef()} /></LocaleProvider>)
    const user = userEvent.setup(), select = screen.getByRole('combobox')
    expect(select).toHaveValue('simple')
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(sets[language].map(item => item[1]))
    await user.type(screen.getByRole('textbox'), '  Personal project  ')
    await user.selectOptions(select, id)
    expect(within(select).getByRole('option', { name: label })).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('  Personal project  ')
    expect(screen.queryAllByRole('listitem').map(item => item.textContent)).toEqual(names)
    await user.click(screen.getByRole('button', { name: language === 'en' ? 'Create project' : 'Создать проект' }))
    expect(submit).toHaveBeenCalledExactlyOnceWith({ name: '  Personal project  ', initialStatusNames: [...names] })
    expect(close).toHaveBeenCalledOnce()
  })
}

it('preserves a failed draft, blocks duplicate dispatch and succeeds on retry', async () => {
  let finish!: (saved: boolean) => void
  const submit = vi.fn().mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve })).mockResolvedValue(true)
  const close = vi.fn(), user = userEvent.setup()
  render(<LocaleProvider><ProjectCreateDialog onSubmit={submit} onClose={close} returnFocus={createRef()} /></LocaleProvider>)
  await user.type(screen.getByRole('textbox'), 'My project')
  await user.selectOptions(screen.getByRole('combobox'), 'development')
  const form = screen.getByRole('textbox').closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(submit).toHaveBeenCalledOnce()
  expect(screen.getByRole('textbox')).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(close).not.toHaveBeenCalled()
  await act(async () => finish(false))
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(screen.getByRole('textbox')).toHaveValue('My project')
  expect(screen.getByRole('combobox')).toHaveValue('development')
  await user.click(screen.getByRole('button', { name: 'Создать проект' }))
  expect(submit).toHaveBeenCalledTimes(2)
  expect(close).toHaveBeenCalledOnce()
})

it('resets to Simple after cancellation and restores focus to the catalogue plus', async () => {
  const user = userEvent.setup()
  render(<LocaleProvider><ProjectCatalogueView onReadSummary={vi.fn()} onDelete={vi.fn()} projects={[]} saveError={false} onCreate={vi.fn()} onOpen={vi.fn()} onRename={vi.fn()} /></LocaleProvider>)
  const create = within(screen.getByRole('banner')).getByRole('button', { name: 'Создать проект' })
  await user.click(create)
  await user.type(screen.getByRole('textbox'), 'Draft')
  await user.selectOptions(screen.getByRole('combobox'), 'job-search')
  await user.keyboard('{Escape}')
  expect(create).toHaveFocus()
  await user.click(create)
  expect(screen.getByRole('combobox')).toHaveValue('simple')
  expect(screen.getByRole('textbox')).toHaveValue('')
})

it('closes a committed creation after navigation fails without offering another write', async () => {
  const db = new ProjectBoardDatabase(`preset-navigation-${crypto.randomUUID()}`)
  try {
    const repo = new DexieProjectBoardRepository(db)
    const create = vi.spyOn(repo, 'createProject')
    const api = createProjectBoardUseCases({ repository: repo, createId: () => crypto.randomUUID(), now: () => 'now', build: { version: 'test', commit: 'test' } })
    const store = createProjectBoardStore(api)
    await store.getState().showCatalogue()
    const saved = vi.fn(), navigate = vi.fn().mockRejectedValue(Error('navigation failed'))
    render(<LocaleProvider><ProjectBoardApp onProjectDeleted={async () => {}} navigateToCard={async () => {}} registerDraftGuard={() => {}} requestLeave={action => void action()} store={store} navigateToProject={navigate} navigateToCatalogue={vi.fn()} onMutationSaved={saved} /></LocaleProvider>)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Создать проект' }))
    await user.type(screen.getByRole('textbox'), 'Saved project')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Создать проект' }))
    expect(await screen.findByRole('button', { name: 'Saved project' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(create).toHaveBeenCalledOnce()
    expect(saved).toHaveBeenCalledOnce()
    expect(await repo.projects()).toHaveLength(1)
    expect((await repo.board((await repo.projects())[0].id))?.statuses).toHaveLength(3)
  } finally { cleanup(); db.close(); await db.delete() }
})
