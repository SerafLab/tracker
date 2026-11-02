import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from './controls'
import type { ProjectDeletionSummary } from '../state/project-board-store'

export type ProjectSummaryState = { kind: 'loading' } | { kind: 'failed' } | ({ kind: 'ready' } & ProjectDeletionSummary)
const messages = {
  card: { title: 'deleteCard', question: 'deleteCardConfirmation', button: 'delete' },
  status: { title: 'deleteStatus', question: 'deleteStatusConfirmation', button: 'delete' },
  project: { title: 'deleteProject', question: 'deleteProjectConfirmation', button: 'deleteProject' },
} as const

export function DeleteDialog({ kind, name, blocked, summary, onRetrySummary, returnFocus, onDelete, onClose }: {
  kind: 'card' | 'status' | 'project'
  name: string
  blocked: boolean
  summary?: ProjectSummaryState
  onRetrySummary?: () => void
  returnFocus: React.RefObject<HTMLButtonElement | null>
  onDelete: () => Promise<'deleted' | 'not-empty' | 'failed'>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const cancel = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [refused, setRefused] = useState(false)
  const messageId = useId()
  const cannotDelete = blocked || refused || (kind === 'project' && summary?.kind !== 'ready')
  const close = () => { if (!pending.current) onClose() }
  useEffect(() => {
    let mounted = true
    queueMicrotask(() => { if (mounted) cancel.current?.focus() })
    return () => { mounted = false }
  }, [])
  useEffect(() => { if (!saving && (failed || refused)) cancel.current?.focus({ preventScroll: true }) }, [saving, failed, refused])
  const submit = async () => {
    if (pending.current || cannotDelete) return
    pending.current = true
    setSaving(true); setFailed(false)
    try {
      const result = await onDelete()
      if (result === 'deleted') return
      setRefused(result === 'not-empty'); setFailed(result === 'failed')
    } catch { setFailed(true) }
    finally { pending.current = false; setSaving(false) }
  }
  const text = messages[kind]
  return <ActionDialog title={t(text.title)} onClose={close} returnFocus={returnFocus}>
    <p>{t(text.question, { name })}</p>
    {kind === 'card' ? <p>{t('cardContentsLost')}</p> : null}
    {kind === 'project' ? <>
      {summary?.kind === 'ready' ? <p>{t('projectDeletionSummary', { statuses: summary.statusCount, cards: summary.cardCount })}</p> : summary?.kind === 'failed' ? <><p role="alert" className="save-error">{t('projectSummaryError')}</p><button type="button" className="button button-secondary" onClick={onRetrySummary}>{t('retry')}</button></> : <p role="status">{t('projectSummaryLoading')}</p>}
      <p>{t('projectContentsLost')}</p>
    </> : null}
    {kind !== 'project' ? <p>{t('deletionIrreversible')}</p> : null}
    {blocked || refused || failed ? <p id={messageId} className="save-error" role="alert">{t(blocked || refused ? 'statusNotEmpty' : 'saveError')}</p> : null}
    <div className="form-actions"><button ref={cancel} type="button" className="button button-secondary" disabled={saving} onClick={close}>{t('cancel')}</button><button type="button" className="button button-primary" disabled={saving || cannotDelete} aria-describedby={blocked || refused || failed ? messageId : undefined} onClick={() => void submit()}>{t(text.button)}</button></div>
  </ActionDialog>
}
