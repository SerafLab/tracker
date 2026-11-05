import { createContext, useContext, useState, type ReactNode } from 'react'

export type NoteOrder = 'newest' | 'oldest'
export const noteOrderStorageKey = 'easytrack.noteOrder'

const NoteOrderContext = createContext<{ order: NoteOrder; toggle: () => void }>({ order: 'newest', toggle: () => {} })

function storedOrder(): NoteOrder {
  try { return localStorage.getItem(noteOrderStorageKey) === 'oldest' ? 'oldest' : 'newest' }
  catch { return 'newest' }
}

/** Application-wide display order of notes; stored notes stay oldest first. */
export function NoteOrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState(storedOrder)
  const toggle = () => {
    const next = order === 'newest' ? 'oldest' : 'newest'
    setOrder(next)
    // The choice still applies until reload when the browser refuses to store it.
    try { localStorage.setItem(noteOrderStorageKey, next) } catch { /* empty */ }
  }
  return <NoteOrderContext value={{ order, toggle }}>{children}</NoteOrderContext>
}

export const useNoteOrder = () => useContext(NoteOrderContext)

/** Notes arrive oldest first by creation; returns them in the shown order. */
export const orderNotes = <T,>(notes: readonly T[], order: NoteOrder): T[] => order === 'newest' ? [...notes].reverse() : [...notes]
