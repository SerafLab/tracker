import { createContext, useContext, type ReactNode } from 'react'

/** An application-wide settings action supplied by the app shell (for example, backup or installation). */
export type SettingsEntry = { label: string; onSelect: () => void }

export const SettingsEntryContext = createContext<SettingsEntry[]>([])

/** Adds entries after those inherited from outer providers. */
export function SettingsEntries({ entries, children }: { entries: SettingsEntry[]; children: ReactNode }) {
  const inherited = useContext(SettingsEntryContext)
  return <SettingsEntryContext value={[...inherited, ...entries]}>{children}</SettingsEntryContext>
}
