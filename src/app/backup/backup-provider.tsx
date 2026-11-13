import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog, type Backup, type BackupSummary, type ParseBackupResult } from '../../features/project-board'
import { useToast } from '../../ui/notifications'
import { deliverBackup } from './delivery'

export type BackupActions = {
  exportBackup(): Promise<Backup>
  summary(): Promise<BackupSummary>
  parseBackup(text: string): ParseBackupResult
  /** Replaces all data; false when the store is busy. */
  restore(backup: Backup): Promise<boolean>
}

type Message = 'backupExportFailed' | 'backupInvalid' | 'backupNewer' | 'backupRestoreFailed'
type Dialog = { kind: 'error'; message: Message } | { kind: 'compare'; backup: Backup; current: BackupSummary }

type BackupEntry = {
  exportBackup: (trigger: HTMLButtonElement) => void
  startRestore: (trigger: HTMLButtonElement) => void
}
const BackupContext = createContext<BackupEntry | null>(null)
export const useBackup = () => useContext(BackupContext)

export function BackupProvider({ enabled, actions, showCatalogue, children }: {
  enabled: boolean
  actions: BackupActions
  showCatalogue: () => Promise<void>
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const replacing = useRef(false)
  const [restorePending, setRestorePending] = useState(false)
  useEffect(() => {
    const element = input.current
    const cancelled = () => opener.current?.focus()
    element?.addEventListener('cancel', cancelled)
    return () => element?.removeEventListener('cancel', cancelled)
  }, [])

  const exportCurrent = async () => {
    try { await deliverBackup(await actions.exportBackup()); return true }
    catch { return false }
  }
  const choose = async (file: File | undefined) => {
    if (!file) { opener.current?.focus(); return }
    let result: ParseBackupResult
    try { result = actions.parseBackup(await file.text()) } catch { result = { ok: false, reason: 'invalid' } }
    if (!result.ok) { setDialog({ kind: 'error', message: result.reason === 'newer' ? 'backupNewer' : 'backupInvalid' }); return }
    try { setDialog({ kind: 'compare', backup: result.backup, current: await actions.summary() }) }
    catch { setDialog({ kind: 'error', message: 'backupRestoreFailed' }) }
  }
  const replace = async (backup: Backup) => {
    if (replacing.current) return
    replacing.current = true
    setRestorePending(true)
    try {
      let restored = false
      try { restored = await actions.restore(backup) } catch { /* Reported below. */ }
      if (!restored) { setDialog({ kind: 'error', message: 'backupRestoreFailed' }); return }
      setDialog(null)
      await showCatalogue()
      showToast(t('backupRestored'))
    } finally {
      replacing.current = false
      setRestorePending(false)
    }
  }
  const entry: BackupEntry | null = enabled ? {
    exportBackup: trigger => {
      opener.current = trigger
      void exportCurrent().then(ok => {
        if (!ok) setDialog({ kind: 'error', message: 'backupExportFailed' })
        else trigger.focus()
      })
    },
    // Keep the file chooser within the browser's user activation.
    startRestore: trigger => { opener.current = trigger; input.current?.click() },
  } : null
  return <BackupContext value={entry}>
    {children}
    <input ref={input} type="file" hidden tabIndex={-1} accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file) }} />
    {dialog?.kind === 'error' ? <ActionDialog title={t(dialog.message)} onClose={() => setDialog(null)} returnFocus={opener}>
      <div className="form-actions"><button className="button button-primary" onClick={() => setDialog(null)}>{t('close')}</button></div>
    </ActionDialog> : null}
    {dialog?.kind === 'compare' ? <CompareDialog key={dialog.backup.exportedAt} dialog={dialog} language={i18n.language} opener={opener} onExport={exportCurrent} pending={restorePending} onClose={() => { if (!replacing.current) setDialog(null) }} onReplace={() => void replace(dialog.backup)} /> : null}
  </BackupContext>
}

function CompareDialog({ dialog, language, opener, pending, onExport, onClose, onReplace }: {
  dialog: Extract<Dialog, { kind: 'compare' }>
  language: string
  opener: React.RefObject<HTMLButtonElement | null>
  pending: boolean
  onExport: () => Promise<boolean>
  onClose: () => void
  onReplace: () => void
}) {
  const { t } = useTranslation()
  const [exportFailed, setExportFailed] = useState(false)
  const number = new Intl.NumberFormat(language)
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dialog.backup.exportedAt))
  const copy = { projects: dialog.backup.data.projects.length, cards: dialog.backup.data.cards.length, notes: dialog.backup.data.notes.length }
  return <ActionDialog title={t('backupRestoreTitle')} onClose={onClose} returnFocus={opener}><div className="install-guidance">
    <p>{t('backupExportedAt', { date })}</p>
    <p>{t('backupNow')} → {t('backupInCopy')}</p>
    {(['projects', 'cards', 'notes'] as const).map(key => <p key={key}><strong>{t(key === 'projects' ? 'backupProjects' : key === 'cards' ? 'backupCards' : 'backupNotes')}</strong>: {number.format(dialog.current[key])} → {number.format(copy[key])}</p>)}
    <p>{t('backupReplaceWarning')}</p>
    {exportFailed ? <p className="field-error" role="alert">{t('backupExportFailed')}</p> : null}
    <div className="form-actions">
      <button className="button button-secondary" disabled={pending} onClick={() => void onExport().then(ok => setExportFailed(!ok))}>{t('backupExportFirst')}</button>
      <button className="button button-secondary" disabled={pending} onClick={onClose}>{t('cancel')}</button>
      <button className="button button-primary" disabled={pending} onClick={onReplace}>{t('backupReplace')}</button>
    </div>
  </div></ActionDialog>
}
