import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../../i18n/provider'
import { ApplyStatusSetForm } from './apply-status-set-form'

afterEach(() => { cleanup(); localStorage.clear() })
it.each(['ru', 'en'])('previews only five nonempty sets and submits current localized names in %s', async language => {
  localStorage.setItem('easytrack.locale', language)
  const submit = vi.fn().mockResolvedValue('saved'), user = userEvent.setup()
  render(<LocaleProvider><ApplyStatusSetForm busy={false} onApply={submit} /></LocaleProvider>)
  const select = screen.getByRole('combobox', { name: language === 'ru' ? 'Набор статусов' : 'Status set' })
  expect(select).toHaveValue('simple')
  expect(screen.getAllByRole('option')).toHaveLength(5)
  expect(screen.queryByRole('option', { name: /Без статусов|No statuses/ })).not.toBeInTheDocument()
  await user.selectOptions(select, 'development')
  const expected = language === 'ru' ? ['Запланировано', 'На паузе', 'В разработке', 'На проверке', 'Готово'] : ['Planned', 'On hold', 'In development', 'In review', 'Done']
  expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(expected)
  await user.click(screen.getByRole('button', { name: language === 'ru' ? 'Применить набор' : 'Apply status set' }))
  expect(submit).toHaveBeenCalledExactlyOnceWith(expected)
})
it('keeps choice and an actionable error, prevents duplicate dispatch and permits retry', async () => {
  let finish!: (value: 'failed') => void
  const submit = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValue('saved')
  const user = userEvent.setup()
  render(<LocaleProvider><ApplyStatusSetForm busy={false} onApply={submit} /></LocaleProvider>)
  await user.selectOptions(screen.getByRole('combobox'), 'job-search')
  const form = screen.getByRole('form')
  fireEvent.submit(form); fireEvent.submit(form)
  expect(submit).toHaveBeenCalledOnce()
  expect(screen.getByRole('combobox')).toBeDisabled()
  expect(screen.getByRole('button')).toBeDisabled()
  await act(async () => finish('failed'))
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось сохранить')
  expect(screen.getByRole('combobox')).toHaveValue('job-search')
  await user.click(screen.getByRole('button'))
  expect(submit).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
