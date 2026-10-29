import { registerModal } from '../../../ui/modal-state'
import { useTranslation } from 'react-i18next'
import { useEffect, useLayoutEffect, useEffectEvent, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import type { CardInput } from '../domain/model'
import { BoardIcon } from './board-icon'

type Action = { label: string; onSelect: () => void; disabled?: boolean }

export function ActionMenu({ label, actions, triggerRef }: { label: string; actions: Action[]; triggerRef?: React.RefObject<HTMLButtonElement | null> }) {
  const [open, setOpen] = useState(false)
  const localButton = useRef<HTMLButtonElement>(null)
  const button = triggerRef ?? localButton
  const menu = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!open || !menu.current || !button.current) return
    const panel = menu.current
    panel.showPopover()
    const position = (afterScroll = false) => {
      if (!button.current) return
      const trigger = button.current.getBoundingClientRect()
      const bounds = panel.getBoundingClientRect()
      if (afterScroll && (trigger.bottom <= 0 || trigger.top >= window.innerHeight || trigger.right <= 0 || trigger.left >= window.innerWidth)) {
        setOpen(false)
        return
      }
      panel.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, trigger.right - bounds.width))}px`
      panel.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, trigger.bottom + 6))}px`
    }
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !panel.contains(event.target)) position(true)
    }
    position()
    document.addEventListener('scroll', onScroll, true)
    return () => document.removeEventListener('scroll', onScroll, true)
  }, [open, button])
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    const closeOnOutsideInteraction = (event: Event) => {
      if (event.target instanceof Node && !button.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false)
    }
    const closeOnKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); button.current?.focus() }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      }
    }
    const closeOnViewportChange = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideInteraction)
    document.addEventListener('focusin', closeOnOutsideInteraction)
    document.addEventListener('keydown', closeOnKeyboard)
    window.addEventListener('resize', closeOnViewportChange)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction)
      document.removeEventListener('focusin', closeOnOutsideInteraction)
      document.removeEventListener('keydown', closeOnKeyboard)
      window.removeEventListener('resize', closeOnViewportChange)
    }
  }, [open])
  return <div className="menu"><button ref={button} className="button button-quiet button-icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><BoardIcon name="more" /></button>
    {open ? <div ref={menu} className="menu-items" popover="manual" role="menu" aria-label={label}>{actions.map(action => <button className="menu-item" role="menuitem" key={action.label} disabled={action.disabled} onClick={() => { setOpen(false); button.current?.focus(); action.onSelect() }}>{action.label}</button>)}</div> : null}
  </div>
}

export function ActionDialog({ title, children, onClose, returnFocus }: { title: string; children: ReactNode; onClose: () => void; returnFocus?: React.RefObject<HTMLButtonElement | null> }) {
  const { t } = useTranslation()
  const titleId = useId()
  const closeFromKeyboard = useEffectEvent(onClose)
  const opener = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    const releaseModal = registerModal()
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? [])
    ;(panel.current?.querySelector<HTMLElement>('input, select, textarea') ?? focusable()[0])?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeFromKeyboard() }
      if (event.key === 'Tab') {
        const elements = focusable()
        const first = elements[0], last = elements.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target)) focusable()[0]?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', keepFocus)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', keepFocus)
      releaseModal()
      queueMicrotask(() => {
        const target = returnFocus?.current ?? opener.current
        if (target?.isConnected) target.focus({ preventScroll: true })
      })
    }
  }, [])
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} className="action-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={event => event.stopPropagation()}><header className="dialog-header"><h2 id={titleId} className="dialog-title">{title}</h2><button className="button button-quiet button-icon" aria-label={t('close')} onClick={onClose}><BoardIcon name="close" /></button></header>{children}</section></div>
}

export function NameForm({ label, button, initialName = '', onSubmit, onCancel }: { label: string; button: string; initialName?: string; onSubmit: (name: string) => Promise<void>; onCancel?: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!name.trim()) { setInvalid(true); return }; setInvalid(false); await onSubmit(name); setName('') }
  return <form onSubmit={event => void submit(event)}><label className="field"><span className="field-label">{label}</span><input className="text-input" autoFocus value={name} aria-describedby={invalid ? errorId : undefined} onChange={event => setName(event.target.value)} /></label>{invalid ? <p id={errorId} className="field-error" role="alert">{t('nameRequired')}</p> : null}<div className="form-actions">{onCancel ? <button type="button" className="button button-secondary" onClick={onCancel}>{t('cancel')}</button> : null}<button className="button button-primary">{button}</button></div></form>
}

export function NameDialog({ title, label, button, initialName, onSubmit, onClose, returnFocus }: { returnFocus?: React.RefObject<HTMLButtonElement | null>; title: string; label: string; button: string; initialName?: string; onSubmit: (name: string) => Promise<void>; onClose: () => void }) {
  return <ActionDialog title={title} onClose={onClose} returnFocus={returnFocus}><NameForm label={label} button={button} initialName={initialName} onCancel={onClose} onSubmit={async name => { await onSubmit(name); onClose() }} /></ActionDialog>
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
