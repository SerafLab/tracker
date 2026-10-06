export type Id = string

export type Project = { id: Id; name: string; createdAt: string }
export type Status = { id: Id; projectId: Id; name: string; position: number }
export type Card = { id: Id; statusId: Id; name: string; position: number }
export type WorkspacePreference = { id: 'workspace'; lastProjectId?: Id }

export type ProjectBoard = Project & { statuses: Array<Status & { cards: Card[] }> }

export function requiredName(value: string): string | null {
  const name = value.trim()
  return name === '' ? null : name
}

export function newId(): Id {
  return crypto.randomUUID()
}
