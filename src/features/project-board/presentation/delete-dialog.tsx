import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionDialog } from './controls'

export function DeleteDialog({ kind, name, blocked, returnFocus, onDelete, onClose }: {
  kind: 'card' | 'status'
  name: string
  blocked: boolean
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
  const cannotDelete = blocked || refused
  useEffect(() => {
    let mounted = true
    queueMicrotask(() => { if (mounted) cancel.current?.focus() })
    return () => { mounted = false }
  }, [])
  const submit = async () => {
    if (pending.current || cannotDelete) return
    pending.current = true
    setSaving(true); setFailed(false)
    try {
      const result = await onDelete()
      if (result === 'deleted') return
      setRefused(result === 'not-empty'); setFailed(result === 'failed')
    } catch { setFailed(true) }
    finally { pending.current = false; setSaving(false); cancel.current?.focus() }
  }
  return <ActionDialog title={t(kind === 'card' ? 'deleteCard' : 'deleteStatus')} onClose={onClose} returnFocus={returnFocus}>
    <p>{t(kind === 'card' ? 'deleteCardConfirmation' : 'deleteStatusConfirmation', { name })}</p>
    <p>{t('deletionIrreversible')}</p>
    {cannotDelete || failed ? <p id={messageId} className="save-error" role="alert">{t(cannotDelete ? 'statusNotEmpty' : 'saveError')}</p> : null}
    <div className="form-actions"><button ref={cancel} type="button" className="button button-secondary" onClick={onClose}>{t('cancel')}</button><button type="button" className="button button-primary" disabled={saving || cannotDelete} aria-describedby={cannotDelete || failed ? messageId : undefined} onClick={() => void submit()}>{t('delete')}</button></div>
  </ActionDialog>
}
