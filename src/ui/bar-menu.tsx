import { useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useModalOpen } from './modal-state'
import { focusFirstMenuItem, moveMenuFocus } from './menu-focus'

export function BarMenu({ label, triggerRef, disabled, items }: {
  label: string
  triggerRef: RefObject<HTMLButtonElement | null>
  disabled?: boolean
  items: { label: string; select: () => void }[]
}) {
  const modalOpen = useModalOpen()
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  useLayoutEffect(() => { if (modalOpen) setOpen(false) }, [modalOpen])
  useLayoutEffect(() => {
    if (!open || modalOpen || !panel.current) return
    const element = panel.current
    element.showPopover()
    const position = () => {
      const trigger = triggerRef.current?.getBoundingClientRect()
      if (!trigger) return
      const bounds = element.getBoundingClientRect()
      element.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, trigger.right - bounds.width))}px`
      element.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, trigger.bottom + 6))}px`
    }
    const outside = (event: Event) => {
      if (event.target instanceof Node && !element.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false)
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
      else if (moveMenuFocus(menu.current, event.key)) event.preventDefault()
    }
    const toggle = (event: Event) => { if ((event as ToggleEvent).newState === 'closed') setOpen(false) }
    position()
    focusFirstMenuItem(menu.current)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position)
    observer?.observe(element)
    if (triggerRef.current?.closest('.app-bar-inner')) observer?.observe(triggerRef.current.closest('.app-bar-inner')!)
    const scroll = (event: Event) => {
      // Nested scrollers do not move the application bar.
      if (event.target !== document) return
      setOpen(false)
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
  }, [open, modalOpen, triggerRef])
  return <>
    <button ref={triggerRef} disabled={disabled} className="button button-quiet button-icon bar-hint" data-hint={label} aria-label={label} aria-haspopup="menu" aria-expanded={open && !modalOpen} aria-controls={open && !modalOpen ? id : undefined} onClick={() => setOpen(value => !value)}>
      <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" strokeLinecap="round" /></svg>
    </button>
    {open && !modalOpen ? <div ref={panel} className="bar-menu menu-items" popover="auto">
      <div id={id} ref={menu} role="menu" aria-label={label} className="menu-list">
        {items.map(item => <button key={item.label} role="menuitem" className="menu-item" onClick={() => {
          setOpen(false)
          triggerRef.current?.focus()
          item.select()
        }}>{item.label}</button>)}
      </div>
    </div> : null}
  </>
}
