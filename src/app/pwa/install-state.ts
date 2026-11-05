import { useEffect, useState } from 'react'

export type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }> }
export type InstallDialogKind = 'guidance' | 'invitation'

export const installInvitationStorageKey = 'easytrack.installInvitationDismissed'

/** iPadOS 13+ reports a desktop Mac UA; touch support distinguishes it from a Mac. */
export function isAppleMobile(userAgent = navigator.userAgent, touchPoints = navigator.maxTouchPoints ?? 0) {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1)
}

export function isStandalone() {
  const displayStandalone = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches
  return displayStandalone || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

// Preference storage can be blocked independently of the workspace; an unreadable flag means "not dismissed".
export function isInvitationDismissed() {
  try { return localStorage.getItem(installInvitationStorageKey) === '1' } catch { return false }
}
export function dismissInvitation() {
  try { localStorage.setItem(installInvitationStorageKey, '1') } catch { /* The invitation may reappear on the next launch. */ }
}

/** Captured prompt and dialog state; hold it above any component that may remount. */
export function useInstallState() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null)
  const [dialog, setDialog] = useState<InstallDialogKind | null>(null)
  const [standalone] = useState(isStandalone)
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as DeferredInstallPrompt) }
    const installed = () => { setDeferredPrompt(null); dismissInvitation(); setDialog(current => current === 'invitation' ? null : current) }
    addEventListener('beforeinstallprompt', capture)
    addEventListener('appinstalled', installed)
    return () => { removeEventListener('beforeinstallprompt', capture); removeEventListener('appinstalled', installed) }
  }, [])
  const install = async () => {
    if (!deferredPrompt) return
    setDeferredPrompt(null)
    await deferredPrompt.prompt()
    if ((await deferredPrompt.userChoice)?.outcome === 'accepted') dismissInvitation()
  }
  return { deferredPrompt, dialog, setDialog, standalone, install }
}
export type InstallState = ReturnType<typeof useInstallState>
