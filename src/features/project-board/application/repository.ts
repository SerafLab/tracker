import type { AgentCommandResult, CardAttributes, RepositoryAgentCommand } from './agent-command'
import type { Card, CardPlacement, CardPlacementResult, CardDetails, CardInput, Note, Id, Project, ProjectSummary, ProjectBoard, BoardView, Status, WorkspacePreference } from '../domain/model'

export type NewStatus = Omit<Status, 'position'>
export type NewCard = Omit<Card, 'position'>
export type DeleteStatusResult = 'deleted' | 'not-empty'

export interface ProjectBoardRepository {
  executeAgentCommand(command: RepositoryAgentCommand): Promise<AgentCommandResult>
  updateCardAttributes(id: Id, attributes: CardAttributes): Promise<Card>
  open(): Promise<void>
  projects(): Promise<Project[]>
  catalogue(): Promise<ProjectSummary[]>
  preference(): Promise<WorkspacePreference | undefined>
  setLastProject(id?: Id): Promise<void>
  createProject(project: Project, initialStatuses: Status[], remember: boolean): Promise<Project>
  deleteProject(id: Id): Promise<void>
  renameProject(id: Id, name: string): Promise<void>
  board(projectId: Id): Promise<ProjectBoard | undefined>
  boardView(projectId: Id): Promise<BoardView | undefined>
  cardDetails(projectId: Id, cardId: Id): Promise<CardDetails | undefined>
  createNote(note: Note): Promise<Note>
  updateNote(cardId: Id, noteId: Id, text: string, updatedAt: string): Promise<Note>
  deleteNote(cardId: Id, noteId: Id): Promise<void>
  createStatus(status: NewStatus): Promise<Status>
  renameStatus(id: Id, name: string): Promise<void>
  deleteStatus(id: Id): Promise<DeleteStatusResult>
  moveStatus(id: Id, direction: -1 | 1): Promise<void>
  createCard(card: NewCard): Promise<Card>
  updateCard(id: Id, input: CardInput): Promise<void>
  deleteCard(id: Id): Promise<void>
  moveCard(id: Id, placement: CardPlacement): Promise<CardPlacementResult>
}
