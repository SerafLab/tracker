import { LocaleSelector } from '../../../i18n/provider'
import { useTranslation } from 'react-i18next'
import { useEffect, useEffectEvent, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import type { CardInput } from '../domain/model'

type Action = { label: string; onSelect: () => void; disabled?: boolean }

export function ActionMenu({ label, actions, triggerRef }: { label: string; actions: Action[]; triggerRef?: React.RefObject<HTMLButtonElement | null> }) {
  const [open, setOpen] = useState(false)
  const localButton = useRef<HTMLButtonElement>(null)
  const button = triggerRef ?? localButton
  const menu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const closeOnOutsideInteraction = (event: Event) => {
      if (event.target instanceof Node && !button.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('pointerdown', closeOnOutsideInteraction)
    document.addEventListener('focusin', closeOnOutsideInteraction)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction)
      document.removeEventListener('focusin', closeOnOutsideInteraction)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])
  return <div className="menu"><button ref={button} className="button button-quiet button-icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>•••</button>
    {open ? <div ref={menu} className="menu-items" role="menu" aria-label={label}>{actions.map(action => <button className="menu-item" role="menuitem" key={action.label} disabled={action.disabled} onClick={() => { setOpen(false); action.onSelect() }}>{action.label}</button>)}</div> : null}
  </div>
}

export function ActionDialog({ title, children, onClose, returnFocus }: { title: string; children: ReactNode; onClose: () => void; returnFocus?: React.RefObject<HTMLButtonElement | null> }) {
  const { t } = useTranslation()
  const titleId = useId()
  const closeFromKeyboard = useEffectEvent(onClose)
  const opener = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeFromKeyboard() }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape); (returnFocus?.current ?? opener.current)?.focus({ preventScroll: true }) }
  }, [])
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} className="action-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={event => event.stopPropagation()}><header className="dialog-header"><h2 id={titleId} className="dialog-title">{title}</h2><button className="button button-quiet button-icon" aria-label={t('close')} onClick={onClose}>×</button></header>{children}<div className="dialog-locale"><LocaleSelector inDialog /></div></section></div>
}

export function NameForm({ label, button, initialName = '', onSubmit, onCancel }: { label: string; button: string; initialName?: string; onSubmit: (name: string) => Promise<void>; onCancel?: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!name.trim()) { setInvalid(true); return }; setInvalid(false); await onSubmit(name); setName('') }
  return <form onSubmit={event => void submit(event)}><label className="field"><span className="field-label">{label}</span><input className="text-input" autoFocus value={name} aria-describedby={invalid ? errorId : undefined} onChange={event => setName(event.target.value)} /></label>{invalid ? <p id={errorId} className="field-error" role="alert">{t('nameRequired')}</p> : null}<div className="form-actions">{onCancel ? <button type="button" className="button button-secondary" onClick={onCancel}>{t('cancel')}</button> : null}<button className="button button-primary">{button}</button></div></form>
}

export function NameDialog({ title, label, button, initialName, onSubmit, onClose }: { title: string; label: string; button: string; initialName?: string; onSubmit: (name: string) => Promise<void>; onClose: () => void }) {
  return <ActionDialog title={title} onClose={onClose}><NameForm label={label} button={button} initialName={initialName} onCancel={onClose} onSubmit={async name => { await onSubmit(name); onClose() }} /></ActionDialog>
}


export function CardDialog({ title, button, initialValue, onSubmit, onClose, returnFocus }: {
  title: string; button: string; initialValue?: CardInput; onSubmit: (input: CardInput) => Promise<boolean>; onClose: () => void; returnFocus: React.RefObject<HTMLButtonElement | null>
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState<CardInput>(() => ({ name: initialValue?.name ?? '', important: initialValue?.important ?? false, urgent: initialValue?.urgent ?? false }))
  const [invalid, setInvalid] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const errorId = useId()
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current) return
    if (!input.name.trim()) { setInvalid(true); return }
    pending.current = true
    setInvalid(false); setFailed(false); setSaving(true)
    try {
      if (await onSubmit(input)) onClose()
      else setFailed(true)
    } catch { setFailed(true) }
    finally { pending.current = false; setSaving(false) }
  }
  return <ActionDialog title={title} onClose={onClose} returnFocus={returnFocus}><form onSubmit={event => void submit(event)}>
    <label className="field"><span className="field-label">{t('cardName')}</span><input className="text-input" value={input.name} disabled={saving} aria-invalid={invalid || undefined} aria-describedby={invalid || failed ? errorId : undefined} onChange={event => setInput({ ...input, name: event.target.value })} /></label>
    <div className="card-flags">{(['important', 'urgent'] as const).map(flag => <label className="card-flag-toggle" key={flag}><input type="checkbox" checked={input[flag]} disabled={saving} onChange={event => setInput({ ...input, [flag]: event.target.checked })} /><span>{t(flag)}</span></label>)}</div>
    {invalid || failed ? <p id={errorId} className="field-error" role="alert">{t(invalid ? 'nameRequired' : 'saveError')}</p> : null}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>{t('cancel')}</button><button className="button button-primary" disabled={saving}>{button}</button></div>
  </form></ActionDialog>
}
