import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NoteOrderProvider, noteOrderStorageKey, orderNotes, useNoteOrder } from './note-order'

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.removeItem(noteOrderStorageKey) })

let toggle: () => void
function Probe() {
  const preference = useNoteOrder()
  toggle = preference.toggle
  return <output>{preference.order}</output>
}
const mount = () => render(<NoteOrderProvider><Probe /></NoteOrderProvider>)

it('orders stored oldest-first notes for display without mutating them', () => {
  const notes = ['a', 'b', 'c']
  expect(orderNotes(notes, 'newest')).toEqual(['c', 'b', 'a'])
  expect(orderNotes(notes, 'oldest')).toEqual(['a', 'b', 'c'])
  expect(notes).toEqual(['a', 'b', 'c'])
})

it('defaults to newest first, also for unknown stored values and without a provider', () => {
  render(<Probe />)
  expect(screen.getByRole('status')).toHaveTextContent('newest')
  cleanup()
  localStorage.setItem(noteOrderStorageKey, 'Oldest')
  mount()
  expect(screen.getByRole('status')).toHaveTextContent('newest')
})

it('toggles, stores the choice and restores it after remounting', () => {
  mount()
  act(() => toggle())
  expect(screen.getByRole('status')).toHaveTextContent('oldest')
  expect(localStorage.getItem(noteOrderStorageKey)).toBe('oldest')
  cleanup()
  mount()
  expect(screen.getByRole('status')).toHaveTextContent('oldest')
  act(() => toggle())
  expect(localStorage.getItem(noteOrderStorageKey)).toBe('newest')
})

it('keeps the choice until reload when the browser refuses to store it', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  mount()
  act(() => toggle())
  expect(screen.getByRole('status')).toHaveTextContent('oldest')
  cleanup()
  mount()
  expect(screen.getByRole('status')).toHaveTextContent('newest')
})

it('falls back to newest first when the browser refuses to read storage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  mount()
  expect(screen.getByRole('status')).toHaveTextContent('newest')
})
