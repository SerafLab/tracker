export type Id = string

export type Project = { id: Id; name: string; createdAt: string }
export type CreateProjectInput = { name: string; initialStatusNames: string[] }
export type Status = { id: Id; projectId: Id; name: string; position: number }
export type Card = { id: Id; statusId: Id; name: string; description: string; position: number; important: boolean; urgent: boolean }
export type CardInput = Pick<Card, 'name' | 'description' | 'important' | 'urgent'>
export type Note = { id: Id; cardId: Id; text: string; createdAt: string; updatedAt?: string }
export type CardDetails = { project: Project; status: Status; card: Card; notes: Note[] }
export type DraftGuard = { isDirty(): boolean; save(): Promise<boolean>; discard(): void }
export type RegisterDraftGuard = (guard: DraftGuard | null) => void

export type WorkspacePreference = { id: 'workspace'; lastProjectId?: Id }

export type ProjectBoard = Project & { statuses: Array<Status & { cards: Card[] }> }

export function requiredName(value: string): string | null {
  const name = value.trim()
  return name === '' ? null : name
}
