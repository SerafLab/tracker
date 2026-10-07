import { requiredName, type Id } from '../domain/model'
import type { ProjectBoardRepository } from './repository'

export type IdGenerator = () => Id
export type Clock = () => string

export type ProjectBoardUseCases = ReturnType<typeof createProjectBoardUseCases>

export function createProjectBoardUseCases(dependencies: {
  repository: ProjectBoardRepository
  createId: IdGenerator
  now: Clock
}) {
  const { repository, createId, now } = dependencies
  const name = (input: string) => {
    const value = requiredName(input)
    if (!value) throw new Error('Название обязательно')
    return value
  }

  return {
    open: () => repository.open(),
    projects: () => repository.projects(),
    preference: () => repository.preference(),
    setLastProject: (id?: Id) => repository.setLastProject(id),
    board: (projectId: Id) => repository.board(projectId),
    createProject: (input: string) => repository.createProject({ id: createId(), name: name(input), createdAt: now() }),
    renameProject: (id: Id, input: string) => repository.renameProject(id, name(input)),
    createStatus: (projectId: Id, input: string) => repository.createStatus({ id: createId(), projectId, name: name(input) }),
    renameStatus: (id: Id, input: string) => repository.renameStatus(id, name(input)),
    moveStatus: (id: Id, direction: -1 | 1) => repository.moveStatus(id, direction),
    createCard: (statusId: Id, input: string) => repository.createCard({ id: createId(), statusId, name: name(input) }),
    renameCard: (id: Id, input: string) => repository.renameCard(id, name(input)),
    moveCard: (id: Id, statusId: Id) => repository.moveCard(id, statusId),
  }
}
