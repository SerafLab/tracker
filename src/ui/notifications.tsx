import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalOpen } from './modal-state'

/** The one place on screen for every notification; switch it here, never per call. */
export type NotificationPlacement = 'bottom-center' | 'bottom-start' | 'bottom-end' | 'top-center'
export const TOAST_DURATION_MS = 4000

type Toast = { id: number; text: string }
type ToastApi = { showToast(text: string): void }

// Views rendered without the app shell (isolated component tests) have nowhere to show a toast, so it is dropped.
const ToastContext = createContext<ToastApi>({ showToast() {} })
const PersistentSlotContext = createContext<HTMLElement | null | undefined>(undefined)

export function NotificationProvider({ placement = 'bottom-center', isolated = false, children }: { placement?: NotificationPlacement; isolated?: boolean; children: ReactNode }) {
  const modalOpen = useModalOpen()
  const [toast, setToast] = useState<Toast | null>(null)
  const nextId = useRef(0)
  const [persistentSlot, setPersistentSlot] = useState<HTMLDivElement | null>(null)
  const showToast = useCallback((text: string) => setToast({ id: ++nextId.current, text }), [])
  const api = useMemo(() => ({ showToast }), [showToast])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(current => current === toast ? null : current), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toast])
  const unavailable = modalOpen || isolated

  return <ToastContext.Provider value={api}>
    <PersistentSlotContext.Provider value={persistentSlot}>
      {children}
      <div className="notification-area" data-placement={placement} style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` } as CSSProperties}>
        {/* Always mounted and never inert, so results are announced even over a dialog. A new key re-announces identical text. */}
        <div className="notification-transient" role="status" aria-live="polite" aria-atomic="true">
          {toast ? <p key={toast.id} className="toast">{toast.text}</p> : null}
        </div>
        <div ref={setPersistentSlot} className="notification-persistent" aria-live="polite" inert={unavailable} aria-hidden={unavailable || undefined} />
      </div>
    </PersistentSlotContext.Provider>
  </ToastContext.Provider>
}

export function useToast() { return useContext(ToastContext) }

/** A notice with actions that stays until the consumer stops rendering it. */
export function PersistentNotice({ label, text, actions }: { label: string; text: string; actions: ReactNode }) {
  const slot = useContext(PersistentSlotContext)
  if (slot === undefined) throw new Error('PersistentNotice must be rendered inside NotificationProvider')
  if (!slot) return null
  return createPortal(<aside className="persistent-notice" role="status" aria-label={label}>
    <p>{text}</p>
    <div className="form-actions">{actions}</div>
  </aside>, slot)
}
