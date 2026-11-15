import { createContext } from 'react'

export const SettingsNavigationContext = createContext<{
  openSettings: () => void
  preserveFocus: (gear: HTMLButtonElement) => void
  restoreFocus: (gear: HTMLButtonElement) => void
} | null>(null)
