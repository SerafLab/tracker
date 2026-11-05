import { act, cleanup, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerModal } from './modal-state'
import { NotificationProvider, PersistentNotice, TOAST_DURATION_MS, useToast } from './notifications'

let show: (text: string) => void
function Trigger() {
  const { showToast } = useToast()
  useEffect(() => { show = showToast }, [showToast])
  return <button>Outside</button>
}
const transient = () => document.querySelector<HTMLElement>('.notification-transient')!
const persistent = () => document.querySelector<HTMLElement>('.notification-persistent')!

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('transient notifications', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('keeps an empty polite live region mounted and shows text for the display time', () => {
    render(<NotificationProvider><Trigger /></NotificationProvider>)
    expect(transient()).toHaveAttribute('role', 'status')
    expect(transient()).toHaveAttribute('aria-live', 'polite')
    expect(transient()).toBeEmptyDOMElement()
    act(() => show('Saved.'))
    expect(transient()).toHaveTextContent('Saved.')
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(transient()).toHaveTextContent('Saved.')
    act(() => vi.advanceTimersByTime(1))
    expect(transient()).toBeEmptyDOMElement()
  })

  it('replaces the current notification, restarts its time and re-inserts identical text', () => {
    render(<NotificationProvider><Trigger /></NotificationProvider>)
    act(() => show('First.'))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 100))
    act(() => show('Second.'))
    expect(transient()).toHaveTextContent(/^Second\.$/)
    const node = transient().firstElementChild
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 100))
    expect(transient()).toHaveTextContent('Second.')
    act(() => show('Second.'))
    expect(transient().firstElementChild).not.toBe(node)
    expect(transient().querySelectorAll('.toast')).toHaveLength(1)
  })

  it('does not move focus and contains nothing focusable', () => {
    render(<NotificationProvider><Trigger /></NotificationProvider>)
    screen.getByRole('button', { name: 'Outside' }).focus()
    act(() => show('Saved.'))
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
    expect(transient().querySelector('button, a, input, select, textarea, [tabindex]')).toBeNull()
  })

  it('is dropped silently outside the provider', () => {
    render(<Trigger />)
    expect(() => act(() => show('Saved.'))).not.toThrow()
  })
})

describe('persistent notices', () => {
  it('renders below the transient slot with its accessible name and keyboard-reachable actions', async () => {
    render(<NotificationProvider><PersistentNotice label="Update" text="An update is available." actions={<button>Update now</button>} /></NotificationProvider>)
    const notice = await screen.findByRole('status', { name: 'Update' })
    expect(persistent()).toContainElement(notice)
    expect(transient().compareDocumentPosition(persistent()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    within(notice).getByRole('button', { name: 'Update now' }).focus()
    expect(within(notice).getByRole('button', { name: 'Update now' })).toHaveFocus()
  })

  it('becomes unavailable while a modal is open or the workspace is isolated, and returns afterwards', async () => {
    const view = render(<NotificationProvider><Trigger /><PersistentNotice label="Update" text="Available." actions={<button>Update now</button>} /></NotificationProvider>)
    await screen.findByRole('status', { name: 'Update' })
    let release!: () => void
    act(() => { release = registerModal() })
    expect(persistent()).toHaveAttribute('inert')
    expect(screen.queryByRole('status', { name: 'Update' })).not.toBeInTheDocument()
    act(() => show('Saved.'))
    expect(transient()).not.toHaveAttribute('inert')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Saved.')
    act(() => release())
    expect(persistent()).not.toHaveAttribute('inert')
    expect(screen.getByRole('status', { name: 'Update' })).toBeInTheDocument()
    view.rerender(<NotificationProvider isolated><Trigger /><PersistentNotice label="Update" text="Available." actions={<button>Update now</button>} /></NotificationProvider>)
    expect(persistent()).toHaveAttribute('inert')
    expect(persistent()).toHaveAttribute('aria-hidden', 'true')
  })

  it('requires the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<PersistentNotice label="Update" text="Available." actions={null} />)).toThrow('NotificationProvider')
  })
})
