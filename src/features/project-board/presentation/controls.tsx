import { useState, type FormEvent } from 'react'

export function NameForm({ label, button, initialName = '', onSubmit }: { label: string, button: string, initialName?: string, onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) { setInvalid(true); return }
    setInvalid(false)
    await onSubmit(name)
    setName('')
  }
  return <form className="name-form" onSubmit={event => void submit(event)}>
    <label>{label}<input value={name} onChange={event => setName(event.target.value)} /></label>
    {invalid ? <span role="alert">Название обязательно</span> : null}
    <button>{button}</button>
  </form>
}

export function RenameControl({ label, value, onRename }: { label: string, value: string, onRename: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  if (!editing) return <button onClick={() => setEditing(true)}>{label}</button>
  return <NameForm label={label} button="Сохранить название" initialName={value} onSubmit={async name => { await onRename(name); setEditing(false) }} />
}
