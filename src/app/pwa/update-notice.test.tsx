import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PwaUpdateNotice } from './update-notice'
import { NotificationProvider } from '../../ui/notifications'

afterEach(() => cleanup())

describe('PwaUpdateNotice', () => {
  it('keeps the current session when the user defers an update', async () => {
    const user = userEvent.setup()
    const update = vi.fn().mockResolvedValue(undefined)
    const later = vi.fn()
    render(<NotificationProvider><PwaUpdateNotice needRefresh onUpdate={update} onLater={later} /></NotificationProvider>)
    await user.click(screen.getByRole('button', { name: 'Позже' }))
    expect(later).toHaveBeenCalledOnce()
    expect(update).not.toHaveBeenCalled()
  })

  it('activates and reloads only after the user accepts', async () => {
    const user = userEvent.setup()
    const update = vi.fn().mockResolvedValue(undefined)
    render(<NotificationProvider><PwaUpdateNotice needRefresh onUpdate={update} onLater={vi.fn()} /></NotificationProvider>)
    await user.click(screen.getByRole('button', { name: 'Обновить' }))
    expect(update).toHaveBeenCalledOnce()
  })
})
