import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreateProjectInput } from '../domain/model'
import { ActionDialog } from './controls'
import { presetStatusNames, statusPresets, type StatusPresetId } from './status-presets'

export function ProjectCreateDialog({ onSubmit, onClose, returnFocus }: {
  onSubmit: (input: CreateProjectInput) => Promise<boolean>
  onClose: () => void
  returnFocus: RefObject<HTMLButtonElement | null>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [preset, setPreset] = useState<StatusPresetId>('simple')
  const [invalid, setInvalid] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const errorId = useId()
  const previewId = useId()
  const names = presetStatusNames(preset, t)
  const close = () => { if (!pending.current) onClose() }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current) return
    if (!name.trim()) { setInvalid(true); return }
    pending.current = true
    setInvalid(false); setFailed(false); setSaving(true)
    try {
      if (await onSubmit({ name, initialStatusNames: presetStatusNames(preset, t) })) onClose()
      else setFailed(true)
    } catch { setFailed(true) }
    finally { pending.current = false; setSaving(false) }
  }
  return <ActionDialog title={t('newProject')} onClose={close} returnFocus={returnFocus}><form onSubmit={event => void submit(event)} aria-busy={saving}>
    <label className="field"><span className="field-label">{t('projectName')}</span><input className="text-input" value={name} disabled={saving} aria-invalid={invalid || undefined} aria-describedby={invalid || failed ? errorId : undefined} onChange={event => setName(event.target.value)} /></label>
    <label className="field project-preset-field"><span className="field-label">{t('statusSet')}</span><select className="select-input" value={preset} disabled={saving} aria-describedby={previewId} onChange={event => setPreset(event.target.value as StatusPresetId)}>{statusPresets.map(item => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label>
    <div id={previewId} className="preset-preview" aria-live="polite">{names.length ? <ol aria-label={t('statusSetPreview')}>{names.map((status, index) => <li key={index}>{status}</li>)}</ol> : <p>{t('emptyStatusSetHelp')}</p>}</div>
    {invalid || failed ? <p id={errorId} className="field-error" role="alert">{t(invalid ? 'nameRequired' : 'saveError')}</p> : null}
    <div className="form-actions"><button type="button" className="button button-secondary" disabled={saving} onClick={close}>{t('cancel')}</button><button className="button button-primary" disabled={saving}>{t('createProject')}</button></div>
  </form></ActionDialog>
}
