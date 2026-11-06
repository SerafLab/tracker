import { screen, waitFor, within } from '@testing-library/react'

/** The "+" creation button in the app bar. The empty catalogue has a second button with the same name in `main`. */
export const findHeaderCreate = (name: string) => waitFor(() => within(screen.getByRole('banner')).getByRole('button', { name }))
