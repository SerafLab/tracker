import type { ReactNode } from 'react'
import { useModalOpen } from './modal-state'

export function SettingsLayout({ children }: { children: ReactNode }) {
  const modalOpen = useModalOpen()
  return <main className="app-shell settings-page" inert={modalOpen} aria-hidden={modalOpen || undefined}>{children}</main>
}

export function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="surface-card settings-section" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    {children}
  </section>
}
