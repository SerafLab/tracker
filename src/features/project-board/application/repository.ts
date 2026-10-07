import type { Card, Id, Project, ProjectBoard, Status, WorkspacePreference } from '../domain/model'

export type NewStatus = Omit<Status, 'position'>
export type NewCard = Omit<Card, 'position'>

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
  moveStatus(id: Id, direction: -1 | 1): Promise<void>
  createCard(card: NewCard): Promise<Card>
  renameCard(id: Id, name: string): Promise<void>
  moveCard(id: Id, statusId: Id): Promise<void>
}
