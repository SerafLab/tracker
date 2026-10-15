import { useEffect, useState } from 'react'
import { ActionDialog } from '../../features/project-board'

type DeferredInstallPrompt = Event & { prompt: () => Promise<void> }

const isAppleMobile = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

export function InstallGuidance() {
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

  return <aside className="install-help" aria-label="Установка EasyTrack">
    <button className="button button-secondary" onClick={() => void install()}>{deferredPrompt ? 'Установить EasyTrack' : 'Как установить EasyTrack'}</button>
    {open ? <ActionDialog title="Установить EasyTrack" onClose={() => setOpen(false)}><div className="install-guidance">
      <p>Установите EasyTrack до создания первых важных проектов: так они останутся в хранилище установленного приложения.</p>
      {isAppleMobile() ? <p>На iPhone или iPad откройте меню «Поделиться», выберите «На экран “Домой”», затем подтвердите добавление. Установленный EasyTrack хранит проекты отдельно от Safari и от других иконок приложения.</p> : <p>Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран». Если этот пункт недоступен, браузер пока не предлагает установку.</p>}
      <p>Проекты локальны для этого браузера или установленного приложения. Они не синхронизируются и могут быть удалены при очистке данных сайта.</p>
      <div className="form-actions"><button className="button button-primary" onClick={() => setOpen(false)}>Понятно</button></div>
    </div></ActionDialog> : null}
  </aside>
}
