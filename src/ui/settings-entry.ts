import { createContext } from 'react'

/** An application-wide settings action supplied by the app shell (for example, installation). */
export type SettingsEntry = { label: string; onSelect: () => void }

export const SettingsEntryContext = createContext<SettingsEntry | null>(null)
