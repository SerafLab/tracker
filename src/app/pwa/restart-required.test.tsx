import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RestartRequired } from './restart-required'

describe('RestartRequired', () => {
  it('removes editing controls and reloads only on the explicit restart action', async () => {
    const restart = vi.fn()
    render(<RestartRequired onRestart={restart} />)
    expect(screen.getByRole('alert')).toHaveTextContent('обновило локальное хранилище')
    expect(screen.queryByRole('button', { name: 'Создать проект' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Перезапустить' }))
    expect(restart).toHaveBeenCalledOnce()
  })
})
