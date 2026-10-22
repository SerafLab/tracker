import type { Card, CardInput, Id, Project, ProjectBoard, Status, WorkspacePreference } from '../domain/model'

export type NewStatus = Omit<Status, 'position'>
export type NewCard = Omit<Card, 'position'>
export type DeleteStatusResult = 'deleted' | 'not-empty'

export interface ProjectBoardRepository {
  open(): Promise<void>
  projects(): Promise<Project[]>
  preference(): Promise<WorkspacePreference | undefined>
  setLastProject(id?: Id): Promise<void>
  createProject(project: Project): Promise<Project>
  renameProject(id: Id, name: string): Promise<void>
  board(projectId: Id): Promise<ProjectBoard | undefined>
  createStatus(status: NewStatus): Promise<Status>
  renameStatus(id: Id, name: string): Promise<void>
  deleteStatus(id: Id): Promise<DeleteStatusResult>
  moveStatus(id: Id, direction: -1 | 1): Promise<void>
  createCard(card: NewCard): Promise<Card>
  updateCard(id: Id, input: CardInput): Promise<void>
  deleteCard(id: Id): Promise<void>
  moveCard(id: Id, statusId: Id): Promise<void>
}
