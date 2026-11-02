import type { Card, CardPlacement, Id, Project, ProjectBoard, Status } from '../domain/model'

export type CardAttributes = Pick<Card, 'name' | 'important' | 'urgent'>
export type AgentCommand =
  | { kind: 'create_project'; name: string }
  | { kind: 'rename_project'; projectId: Id; name: string }
  | { kind: 'create_status'; projectId: Id; name: string }
  | { kind: 'rename_status'; statusId: Id; name: string }
  | { kind: 'move_status'; statusId: Id; direction: 'left' | 'right' }
  | { kind: 'delete_status'; statusId: Id }
  | ({ kind: 'create_card'; statusId: Id } & CardAttributes)
  | ({ kind: 'update_card'; cardId: Id } & CardAttributes)
  | { kind: 'move_card'; cardId: Id; statusId: Id; expected: CardPlacement['expected'] }
  | { kind: 'delete_card'; cardId: Id }
export type RepositoryAgentCommand = Exclude<AgentCommand, { kind: 'create_project' | 'create_status' | 'create_card' }>
  | { kind: 'create_project'; project: Project }
  | { kind: 'create_status'; status: Omit<Status, 'position'> }
  | { kind: 'create_card'; card: Omit<Card, 'position'> }
export type AgentSavedData = { saved: true } & (
  | { project: Project }
  | { status: Status }
  | { board: ProjectBoard; outcome: 'saved' | 'unchanged' }
  | { card: Card; outcome?: 'saved' | 'unchanged' }
  | { deletedId: Id }
)
export type AgentCommandResult = { projectId: Id; data: AgentSavedData }
export type CommandErrorCode = 'not_found' | 'conflict' | 'status_not_empty' | 'storage_unavailable' | 'restart_required' | 'disconnected'
export class CommandError extends Error {
  constructor(readonly code: CommandErrorCode, message: string = code) { super(message) }
}
