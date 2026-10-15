import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePersistentStorage } from './persistent-storage'

const originalStorage = navigator.storage
function Probe() { const request = usePersistentStorage(); return <button onClick={request}>save</button> }

afterEach(() => { cleanup(); Object.defineProperty(navigator, 'storage', { configurable: true, value: originalStorage }) })

describe('usePersistentStorage', () => {
  it.each([
    ['granted', vi.fn().mockResolvedValue(true)],
    ['rejected', vi.fn().mockResolvedValue(false)],
    ['failed', vi.fn().mockRejectedValue(new Error('denied'))],
  ])('requests storage once when it is %s', async (_result, persist) => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } })
    const user = userEvent.setup()
    render(<Probe />)
    await user.click(screen.getByRole('button', { name: 'save' }))
    await user.click(screen.getByRole('button', { name: 'save' }))
    expect(persist).toHaveBeenCalledOnce()
  })

  it('does nothing when persistent storage is unsupported', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    const user = userEvent.setup()
    render(<Probe />)
    await user.click(screen.getByRole('button', { name: 'save' }))
    expect(screen.getByRole('button', { name: 'save' })).toBeInTheDocument()
  })
})
