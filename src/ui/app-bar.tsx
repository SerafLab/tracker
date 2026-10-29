import type { ReactNode } from 'react'
import { useModalOpen } from './modal-state'
import { LocaleSelector } from '../i18n/provider'

export function AppBar({ title, navigation, actions }: { title: string; navigation?: ReactNode; actions?: ReactNode }) {
  const modalOpen = useModalOpen()
  return <header className="app-bar" inert={modalOpen} aria-hidden={modalOpen || undefined}>
    <div className="app-bar-inner">
      <span className="app-brand" translate="no"><svg className="brand-mark" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h7M4 12h4M4 19h10m-3-7 4 4 6-9" /></svg>EasyTrack</span>
      <h1 className="page-title">{title}</h1>
      <LocaleSelector />
      {navigation || actions ? <div className="app-bar-controls">
        {navigation ? <nav>{navigation}</nav> : null}
        <div className="button-row">{actions}</div>
      </div> : null}
    </div>
  </header>
}
