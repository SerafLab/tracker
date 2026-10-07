import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

type Action = { label: string; onSelect: () => void; disabled?: boolean }

export function ActionMenu({ label, actions }: { label: string; actions: Action[] }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])
  return <div className="menu"><button ref={button} className="button button-quiet button-icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>•••</button>
    {open ? <div ref={menu} className="menu-items" role="menu" aria-label={label}>{actions.map(action => <button className="menu-item" role="menuitem" key={action.label} disabled={action.disabled} onClick={() => { setOpen(false); action.onSelect() }}>{action.label}</button>)}</div> : null}
  </div>
}

export function ActionDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId()
  const opener = useRef<HTMLElement | null>(null)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel.current?.querySelector<HTMLElement>('input, select, button:not([disabled])')?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape); opener.current?.focus() }
  }, [onClose])
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} className="action-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={event => event.stopPropagation()}><header className="dialog-header"><h2 id={titleId} className="dialog-title">{title}</h2><button className="button button-quiet button-icon" aria-label="Закрыть" onClick={onClose}>×</button></header>{children}</section></div>
}

export function NameForm({ label, button, initialName = '', onSubmit, onCancel }: { label: string; button: string; initialName?: string; onSubmit: (name: string) => Promise<void>; onCancel?: () => void }) {
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!name.trim()) { setInvalid(true); return }; setInvalid(false); await onSubmit(name); setName('') }
  return <form onSubmit={event => void submit(event)}><label className="field"><span className="field-label">{label}</span><input className="text-input" autoFocus value={name} aria-describedby={invalid ? errorId : undefined} onChange={event => setName(event.target.value)} /></label>{invalid ? <p id={errorId} className="field-error" role="alert">Название обязательно</p> : null}<div className="form-actions">{onCancel ? <button type="button" className="button button-secondary" onClick={onCancel}>Отмена</button> : null}<button className="button button-primary">{button}</button></div></form>
}

export function NameDialog({ title, label, button, initialName, onSubmit, onClose }: { title: string; label: string; button: string; initialName?: string; onSubmit: (name: string) => Promise<void>; onClose: () => void }) {
  return <ActionDialog title={title} onClose={onClose}><NameForm label={label} button={button} initialName={initialName} onCancel={onClose} onSubmit={async name => { await onSubmit(name); onClose() }} /></ActionDialog>
}
