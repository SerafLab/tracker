import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NoteOrderProvider, noteOrderStorageKey, orderNotes, useNoteOrder } from './note-order'

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.removeItem(noteOrderStorageKey) })

function Probe() {
  const preference = useNoteOrder()
  return <><output>{preference.order}</output><button onClick={preference.toggle}>toggle</button></>
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
  fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
  expect(screen.getByRole('status')).toHaveTextContent('oldest')
  expect(localStorage.getItem(noteOrderStorageKey)).toBe('oldest')
  cleanup()
  mount()
  expect(screen.getByRole('status')).toHaveTextContent('oldest')
  fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
  expect(localStorage.getItem(noteOrderStorageKey)).toBe('newest')
})

it('keeps the choice until reload when the browser refuses to store it', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
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
