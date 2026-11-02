import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Linkify from 'linkify-react'
import type { CardDetails, CardInput, Id, Note, RegisterDraftGuard } from '../domain/model'
import { AppBar } from '../../../ui/app-bar'
import { ActionDialog } from './controls'

const linkOptions = { validate: { url: (value: string) => /^https?:\/\//i.test(value), email: false }, target: '_blank', rel: 'noopener noreferrer' }
export function PlainText({ text }: { text: string }) { return <div className="detail-text"><Linkify options={linkOptions}>{text}</Linkify></div> }
const fieldsOf = (details: CardDetails): CardInput => ({ name: details.card.name, description: details.card.description, important: details.card.important, urgent: details.card.urgent })
const sameFields = (a: CardInput, b: CardInput) => a.name === b.name && a.description === b.description && a.important === b.important && a.urgent === b.urgent

type Props = {
  details: CardDetails
  busy: boolean
  onReturn(): Promise<void>
  onCatalogue(): Promise<void>
  onSave(input: CardInput): Promise<boolean>
  onCreateNote(text: string): Promise<Note | undefined>
  onUpdateNote(id: Id, text: string): Promise<Note | undefined>
  onDeleteNote(id: Id): Promise<boolean>
  registerDraftGuard: RegisterDraftGuard
  requestLeave(action: () => void | Promise<void>): void
}

export function CardDetailView({ details, busy, onReturn, onCatalogue, onSave, onCreateNote, onUpdateNote, onDeleteNote, registerDraftGuard, requestLeave }: Props) {
  const { t, i18n } = useTranslation()
  const [fields, setFields] = useState<CardInput>(() => fieldsOf(details))
  const [confirmed, setConfirmed] = useState<CardInput>(() => fieldsOf(details))
  const [fieldError, setFieldError] = useState<'nameRequired' | 'saveError' | null>(null)
  const [editor, setEditor] = useState<{ id: Id | null; text: string; initial: string } | null>(null)
  const [noteError, setNoteError] = useState<'noteRequired' | 'noteSaveError' | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const main = useRef<HTMLElement>(null)
  const history = useRef<HTMLElement>(null)
  const addTrigger = useRef<HTMLButtonElement>(null)
  const cancelDelete = useRef<HTMLButtonElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)
  const fieldErrorId = useId(), noteErrorId = useId(), noteInputId = useId(), descriptionId = useId()
  const fieldsDirty = !sameFields(fields, confirmed)
  const noteDirty = !!editor && editor.text !== editor.initial
  const savedFields = fieldsOf(details)
  // Only synchronize a newly confirmed external snapshot when there are no local edits.
  useEffect(() => {
    if (sameFields(savedFields, confirmed)) return
    if (!fieldsDirty) setFields(savedFields)
    setConfirmed(savedFields)
  }, [details.card])
  useLayoutEffect(() => { main.current?.focus({ preventScroll: true }) }, [details.card.id])

  const saveFields = async () => {
    if (!fields.name.trim()) { setFieldError('nameRequired'); return false }
    setFieldError(null)
    const saved = await onSave(fields)
    if (!saved) { setFieldError('saveError'); return false }
    const next = { ...fields, name: fields.name.trim() }
    setFields(next); setConfirmed(next)
    return true
  }
  const saveNote = async () => {
    if (!editor) return true
    if (!editor.text.trim()) { setNoteError('noteRequired'); return false }
    setNoteError(null)
    if (editor.id && editor.text === editor.initial) { setEditor(null); return true }
    const saved = editor.id ? await onUpdateNote(editor.id, editor.text) : await onCreateNote(editor.text)
    if (!saved) { setNoteError('noteSaveError'); return false }
    setEditor(null)
    return true
  }
  const saveAll = async () => {
    if (pending.current) return false
    pending.current = true; setSaving(true)
    try {
      if (fieldsDirty && !await saveFields()) return false
      if (noteDirty && !await saveNote()) return false
      return true
    } finally { pending.current = false; setSaving(false) }
  }
  const discard = () => { setFields(confirmed); setEditor(null); setFieldError(null); setNoteError(null) }
  const current = useRef({ fieldsDirty, noteDirty, saveAll, discard })
  current.current = { fieldsDirty, noteDirty, saveAll, discard }
  useLayoutEffect(() => {
    registerDraftGuard({ isDirty: () => current.current.fieldsDirty || current.current.noteDirty, save: () => current.current.saveAll(), discard: () => current.current.discard() })
    return () => registerDraftGuard(null)
  }, [registerDraftGuard])
  useEffect(() => {
    if (!fieldsDirty && !noteDirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    addEventListener('beforeunload', beforeUnload)
    return () => removeEventListener('beforeunload', beforeUnload)
  }, [fieldsDirty, noteDirty])
  useEffect(() => {
    if (!deleting) return
    queueMicrotask(() => cancelDelete.current?.focus())
  }, [deleting])

  const run = async (operation: () => Promise<unknown>) => {
    if (pending.current) return
    pending.current = true; setSaving(true)
    try { await operation() } finally { pending.current = false; setSaving(false) }
  }
  const openEditor = (note?: Note) => {
    if (editor && editor.id === (note?.id ?? null)) return
    const change = () => { setEditor({ id: note?.id ?? null, text: note?.text ?? '', initial: note?.text ?? '' }); setNoteError(null) }
    if (noteDirty) requestLeave(change)
    else change()
  }
  const closeEditor = () => {
    if (noteDirty) requestLeave(() => setEditor(null))
    else setEditor(null)
  }
  const closeDeletion = useCallback(() => { if (!pending.current) setDeleting(null) }, [])
  const deleteNote = async () => {
    if (!deleting || pending.current) return
    const index = details.notes.findIndex(note => note.id === deleting.id)
    const nextId = details.notes[index + 1]?.id ?? details.notes[index - 1]?.id
    await run(async () => {
      if (!await onDeleteNote(deleting.id)) { setDeleteError(true); return }
      if (editor?.id === deleting.id) setEditor(null)
      setDeleting(null)
      window.setTimeout(() => {
        const next = Array.from(history.current?.querySelectorAll<HTMLElement>('[data-note-id]') ?? []).find(item => item.dataset.noteId === nextId)
        ;(next?.querySelector<HTMLButtonElement>('button') ?? addTrigger.current ?? history.current?.querySelector<HTMLTextAreaElement>('.note-editor textarea:not(:disabled)'))?.focus({ preventScroll: true })
      }, 0)
    })
  }
  const date = (value: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  const noteEditor = editor ? <form className="note-editor" onSubmit={event => { event.preventDefault(); void run(saveNote) }}>
    <div className="field"><label className="field-label" htmlFor={noteInputId}>{t(editor.id ? 'editNote' : 'newNote')}</label><textarea id={noteInputId} className="text-input" rows={5} autoFocus value={editor.text} disabled={saving || busy} aria-describedby={noteError ? noteErrorId : undefined} onChange={event => setEditor({ ...editor, text: event.target.value })} /></div>
    {noteError ? <p id={noteErrorId} role="alert" className="field-error">{t(noteError)}</p> : null}
    <div className="form-actions"><button type="button" className="button button-secondary" disabled={saving || busy} onClick={closeEditor}>{t('cancel')}</button><button className="button button-primary" disabled={saving || busy}>{t(editor.id ? 'saveNote' : 'addNote')}</button></div>
  </form> : null
  return <>
    <AppBar title={details.card.name} onReturn={() => void onCatalogue()} />
    <main ref={main} tabIndex={-1} className="app-shell card-detail">
      <button className="button button-secondary" onClick={() => void onReturn()}>{t('backToBoard')}</button>
      <p className="muted-copy detail-context">{details.project.name} · {details.status.name}</p>
      <form className="detail-fields surface-card" aria-label={t('cardFields')} onSubmit={event => { event.preventDefault(); void run(saveFields) }}>
        <label className="field"><span className="field-label">{t('cardName')}</span><input className="text-input" value={fields.name} disabled={saving || busy} aria-invalid={fieldError === 'nameRequired' || undefined} aria-describedby={fieldError ? fieldErrorId : undefined} onChange={event => setFields({ ...fields, name: event.target.value })} /></label>
        <div className="field"><label className="field-label" htmlFor={descriptionId}>{t('cardDescription')}</label><textarea id={descriptionId} className="text-input" rows={6} value={fields.description} disabled={saving || busy} onChange={event => setFields({ ...fields, description: event.target.value })} /></div>
        <div className="card-flags">{(['important', 'urgent'] as const).map(flag => <label className="card-flag-toggle" key={flag}><input type="checkbox" checked={fields[flag]} disabled={saving || busy} onChange={event => setFields({ ...fields, [flag]: event.target.checked })} /><span>{t(flag)}</span></label>)}</div>
        {fieldError ? <p id={fieldErrorId} className="field-error" role="alert">{t(fieldError)}</p> : null}
        <div className="form-actions"><button className="button button-primary" disabled={saving || busy}>{t('save')}</button></div>
      </form>
      {details.card.description ? <section className="saved-description surface-card" aria-label={t('savedDescription')}><h2>{t('savedDescription')}</h2><PlainText text={details.card.description} /></section> : null}
      <section ref={history} className="note-history" aria-label={t('noteHistory')}><h2>{t('noteHistory')}</h2>
        {details.notes.length === 0 ? <p className="muted-copy">{t('noNotes')}</p> : <ol className="note-list">{details.notes.map(note => <li className="note surface-card" key={note.id} data-note-id={note.id}>
          <p className="note-date"><time dateTime={note.createdAt}>{date(note.createdAt)}</time>{note.updatedAt ? <> · {t('noteEdited')} <time dateTime={note.updatedAt}>{date(note.updatedAt)}</time></> : null}</p>
          {editor?.id === note.id ? noteEditor : <PlainText text={note.text} />}
          <div className="note-actions"><button className="button button-quiet" disabled={saving || busy} onClick={() => openEditor(note)}>{t('editNote')}</button><button className="button button-quiet" disabled={saving || busy} onClick={event => { deleteTrigger.current = event.currentTarget; setDeleteError(false); setDeleting(note) }}>{t('deleteNote')}</button></div>
        </li>)}</ol>}
        {editor && editor.id === null ? noteEditor : <button ref={addTrigger} className="button button-secondary" disabled={saving || busy} onClick={() => openEditor()}>{t('addNote')}</button>}
      </section>
      {deleting ? <ActionDialog title={t('deleteNote')} returnFocus={deleteTrigger} onClose={closeDeletion}><p>{t('deleteNoteConfirmation')}</p><blockquote className="detail-text">{deleting.text}</blockquote><p>{t('deletionIrreversible')}</p>{deleteError ? <p className="save-error" role="alert">{t('saveError')}</p> : null}<div className="form-actions"><button ref={cancelDelete} type="button" className="button button-secondary" disabled={saving || busy} onClick={closeDeletion}>{t('cancel')}</button><button type="button" className="button button-primary" disabled={saving || busy} onClick={() => void deleteNote()}>{t('delete')}</button></div></ActionDialog> : null}
    </main>
  </>
}
