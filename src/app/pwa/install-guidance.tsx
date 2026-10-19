import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { ActionDialog } from '../../features/project-board'

type DeferredInstallPrompt = Event & { prompt: () => Promise<void> }

const isAppleMobile = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

export function InstallGuidance() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as DeferredInstallPrompt) }
    addEventListener('beforeinstallprompt', capture)
    return () => removeEventListener('beforeinstallprompt', capture)
  }, [])

  const install = async () => {
    if (!deferredPrompt) { setOpen(true); return }
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }

  return <aside className="install-help" aria-label={t('installLabel')}>
    <button className="button button-secondary" onClick={() => void install()}>{deferredPrompt ? t('install') : t('installHelp')}</button>
    {open ? <ActionDialog title={t('install')} onClose={() => setOpen(false)}><div className="install-guidance">
      <p>{t('installBefore')}</p>
      {isAppleMobile() ? <p>{t('installApple')}</p> : <p>{t('installBrowser')}</p>}
      <p>{t('localData')}</p>
      <div className="form-actions"><button className="button button-primary" onClick={() => setOpen(false)}>{t('understood')}</button></div>
    </div></ActionDialog> : null}
  </aside>
}
