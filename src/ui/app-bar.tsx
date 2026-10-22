import type { ReactNode } from 'react'
import { useModalOpen } from './modal-state'
import { LocaleSelector } from '../i18n/provider'

export function AppBar({ title, navigation, actions }: { title: string; navigation?: ReactNode; actions?: ReactNode }) {
  const modalOpen = useModalOpen()
  return <header className="app-bar" inert={modalOpen} aria-hidden={modalOpen || undefined}><div className="app-bar-inner">
    <div className="app-bar-context"><p className="eyebrow">EasyTrack</p><h1 className="page-title">{title}</h1></div>
    <LocaleSelector />
    {navigation || actions ? <div className="app-bar-controls">{navigation ? <nav>{navigation}</nav> : null}<div className="button-row">{actions}</div></div> : null}
  </div></header>
}
