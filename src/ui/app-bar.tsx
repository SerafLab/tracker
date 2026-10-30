import { useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useModalOpen } from './modal-state'
import { LocaleSelector } from '../i18n/provider'

type BarAction = { label: string; onSelect: () => void; triggerRef: RefObject<HTMLButtonElement | null> }

export function AppBar({ title, onReturn, creation, rename }: { title: string; onReturn?: () => void; creation?: BarAction; rename?: Omit<BarAction, 'label'> }) {
  const { t } = useTranslation()
  const modalOpen = useModalOpen()
  const [open, setOpen] = useState(false)
  const localGear = useRef<HTMLButtonElement>(null)
  const gear = rename?.triggerRef ?? localGear
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  useLayoutEffect(() => { if (modalOpen) setOpen(false) }, [modalOpen])
  useLayoutEffect(() => {
    if (!open || modalOpen || !panel.current) return
    const element = panel.current
    element.showPopover()
    const position = () => {
      const trigger = gear.current?.getBoundingClientRect()
      if (!trigger) return
      const bounds = element.getBoundingClientRect()
      element.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, trigger.right - bounds.width))}px`
      element.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, trigger.bottom + 6))}px`
    }
    const outside = (event: Event) => {
      if (event.target instanceof Node && !element.contains(event.target) && !gear.current?.contains(event.target)) setOpen(false)
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); gear.current?.focus() }
    }
    const toggle = (event: Event) => { if ((event as ToggleEvent).newState === 'closed') setOpen(false) }
    position()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position)
    observer?.observe(element)
    if (gear.current?.closest('.app-bar-inner')) observer?.observe(gear.current.closest('.app-bar-inner')!)
    const scroll = (event: Event) => {
      // Nested scrollers do not move the application bar.
      if (event.target !== document) return
      const trigger = gear.current?.getBoundingClientRect()
      if (trigger && trigger.height > 0 && (trigger.bottom <= 0 || trigger.top >= window.innerHeight)) setOpen(false)
      else position()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', keyboard)
    document.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', position)
    element.addEventListener('toggle', toggle)
    return () => {
      observer?.disconnect()
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', keyboard)
      document.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', position)
      element.removeEventListener('toggle', toggle)
    }
  }, [open, modalOpen, gear])
  const brand = <><svg className="brand-mark" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h7M4 12h4M4 19h10m-3-7 4 4 6-9" /></svg>EasyTrack</>
  return <header className="app-bar" inert={modalOpen} aria-hidden={modalOpen || undefined}>
    <div className="app-bar-inner">
      {onReturn ? <button className="app-brand bar-hint" data-hint={t('allProjects')} aria-label={`EasyTrack — ${t('allProjects')}`} translate="no" onClick={() => { setOpen(false); onReturn() }}>{brand}</button> : <span className="app-brand" translate="no">{brand}</span>}
      <h1 className="page-title">{title}</h1>
      <div className="app-bar-controls">
        {creation ? <button ref={creation.triggerRef} className="button button-primary button-icon bar-hint" data-hint={creation.label} aria-label={creation.label} onClick={() => { setOpen(false); creation.onSelect() }}><svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button> : null}
        <button ref={gear} className="button button-quiet button-icon bar-hint" data-hint={t('settings')} aria-label={t('settings')} aria-expanded={open && !modalOpen} aria-controls={id} onClick={() => setOpen(value => !value)}><svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 3-.6 2.4-2 .9L4 5.6 2 9l1.8 1.7v2.6L2 15l2 3.4 2.4-.7 2 .9L9 21h4l.6-2.4 2-.9 2.4.7 2-3.4-1.8-1.7v-2.6L20 9l-2-3.4-2.4.7-2-.9L13 3Z" /><circle cx="11" cy="12" r="3" /></svg></button>
        {open && !modalOpen ? <div id={id} ref={panel} className="settings-panel" popover="auto" role="region" aria-label={t('settings')}>
          {rename ? <button className="button button-quiet" onClick={() => { setOpen(false); rename.onSelect() }}>{t('renameProject')}</button> : null}
          <LocaleSelector />
        </div> : null}
      </div>
    </div>
  </header>
}
