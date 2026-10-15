import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallGuidance } from './install-guidance'

afterEach(() => cleanup())

describe('InstallGuidance', () => {
  it('opens manual guidance when a native install prompt is unavailable', async () => {
    const user = userEvent.setup()
    render(<InstallGuidance />)
    await user.click(screen.getByRole('button', { name: 'Как установить EasyTrack' }))
    expect(screen.getByRole('dialog', { name: 'Установить EasyTrack' })).toHaveTextContent('могут быть удалены при очистке данных сайта')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uses a deferred native install prompt only after an explicit action', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    render(<InstallGuidance />)
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void> }
    event.prompt = prompt
    dispatchEvent(event)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Установить EasyTrack' }))
    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Как установить EasyTrack' })).toBeInTheDocument()
  })

  it('explains iOS storage isolation', async () => {
    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'iPhone' })
    const user = userEvent.setup()
    render(<InstallGuidance />)
    await user.click(screen.getByRole('button', { name: 'Как установить EasyTrack' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('отдельно от Safari')
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent })
  })
})
