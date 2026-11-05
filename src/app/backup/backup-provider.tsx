import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog, type Backup, type BackupSummary, type ParseBackupResult } from '../../features/project-board'
import { SettingsEntries } from '../../ui/settings-entry'
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

/**
 * Owns backup export and restore for the app shell: the two settings entries, the hidden file input and the dialogs.
 * Entries exist only while `enabled` (a workspace is shown).
 */
export function BackupProvider({ enabled, actions, requestLeave, showCatalogue, children }: {
  enabled: boolean
  actions: BackupActions
  requestLeave: (action: () => void | Promise<void>) => void
  showCatalogue: () => Promise<void>
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const input = useRef<HTMLInputElement>(null)
  // The settings gear: the app bar focuses it before an entry runs.
  const opener = useRef<HTMLButtonElement | null>(null)
  const remember = () => { opener.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null }
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
    if (!file) return
    let result: ParseBackupResult
    try { result = actions.parseBackup(await file.text()) } catch { result = { ok: false, reason: 'invalid' } }
    if (!result.ok) { setDialog({ kind: 'error', message: result.reason === 'newer' ? 'backupNewer' : 'backupInvalid' }); return }
    try { setDialog({ kind: 'compare', backup: result.backup, current: await actions.summary() }) }
    catch { setDialog({ kind: 'error', message: 'backupRestoreFailed' }) }
  }
  const replace = (backup: Backup) => {
    setDialog(null)
    requestLeave(async () => {
      let restored = false
      try { restored = await actions.restore(backup) } catch { /* Reported below. */ }
      if (!restored) { setDialog({ kind: 'error', message: 'backupRestoreFailed' }); return }
      await showCatalogue()
      showToast(t('backupRestored'))
    })
  }
  const entries = enabled ? [
    { label: t('backupExport'), onSelect: () => { remember(); void exportCurrent().then(ok => { if (!ok) setDialog({ kind: 'error', message: 'backupExportFailed' }) }) } },
    // The chooser must open synchronously in the click handler to keep the user activation.
    { label: t('backupRestore'), onSelect: () => { remember(); input.current?.click() } },
  ] : []
  return <SettingsEntries entries={entries}>
    {children}
    <input ref={input} type="file" hidden tabIndex={-1} accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file) }} />
    {dialog?.kind === 'error' ? <ActionDialog title={t(dialog.message)} onClose={() => setDialog(null)} returnFocus={opener}>
      <div className="form-actions"><button className="button button-primary" onClick={() => setDialog(null)}>{t('close')}</button></div>
    </ActionDialog> : null}
    {dialog?.kind === 'compare' ? <CompareDialog key={dialog.backup.exportedAt} dialog={dialog} language={i18n.language} opener={opener} onExport={exportCurrent} onClose={() => setDialog(null)} onReplace={() => replace(dialog.backup)} /> : null}
  </SettingsEntries>
}

function CompareDialog({ dialog, language, opener, onExport, onClose, onReplace }: {
  dialog: Extract<Dialog, { kind: 'compare' }>
  language: string
  opener: React.RefObject<HTMLButtonElement | null>
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
      <button className="button button-secondary" onClick={() => void onExport().then(ok => setExportFailed(!ok))}>{t('backupExportFirst')}</button>
      <button className="button button-secondary" onClick={onClose}>{t('cancel')}</button>
      <button className="button button-primary" onClick={onReplace}>{t('backupReplace')}</button>
    </div>
  </div></ActionDialog>
}
