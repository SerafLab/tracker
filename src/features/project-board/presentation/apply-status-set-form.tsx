import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplyStatusSetResult } from '../state/project-board-store'
import { presetStatusNames, statusPresets, type StatusPresetId } from './status-presets'

export function ApplyStatusSetForm({ busy, onApply }: { busy: boolean; onApply(names: string[]): Promise<ApplyStatusSetResult> }) {
  const { t } = useTranslation()
  const [preset, setPreset] = useState<Exclude<StatusPresetId, 'empty'>>('simple')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<'saveError' | 'statusSetConflict' | null>(null)
  const pending = useRef(false)
  const previewId = useId()
  const names = presetStatusNames(preset, t)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || busy) return
    pending.current = true; setSaving(true); setError(null)
    try {
      const result = await onApply(presetStatusNames(preset, t))
      if (result !== 'saved') setError(result === 'conflict' ? 'statusSetConflict' : 'saveError')
    } catch { setError('saveError') }
    finally { pending.current = false; setSaving(false) }
  }
  return <form className="apply-status-set" aria-label={t('applyStatusSet')} aria-busy={saving} onSubmit={event => void submit(event)}>
    <p>{t('applyStatusSetHelp')}</p>
    <label className="field"><span className="field-label">{t('statusSet')}</span><select className="select-input" value={preset} disabled={busy || saving} aria-describedby={previewId} onChange={event => setPreset(event.target.value as Exclude<StatusPresetId, 'empty'>)}>{statusPresets.filter(item => item.id !== 'empty').map(item => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label>
    <div id={previewId} className="preset-preview" aria-live="polite"><ol aria-label={t('statusSetPreview')}>{names.map((name, index) => <li key={index}>{name}</li>)}</ol></div>
    {error ? <p className="field-error" role="alert">{t(error)}</p> : null}
    <button className="button button-primary" disabled={busy || saving}>{t('applyStatusSet')}</button>
  </form>
}
