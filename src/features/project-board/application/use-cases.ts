import type { AgentCommand, CardAttributes, RepositoryAgentCommand } from './agent-command'
import { requiredName, type CardInput, type CardPlacement, type CreateProjectInput, type Id } from '../domain/model'
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
    executeAgentCommand: (command: AgentCommand) => {
      let prepared: RepositoryAgentCommand
      switch (command.kind) {
        case 'create_project': prepared = { kind: command.kind, project: { id: createId(), name: name(command.name), createdAt: now() } }; break
        case 'create_status': prepared = { kind: command.kind, status: { id: createId(), projectId: command.projectId, name: name(command.name) } }; break
        case 'create_card': prepared = { kind: command.kind, card: { id: createId(), statusId: command.statusId, name: name(command.name), description: '', important: command.important, urgent: command.urgent } }; break
        default: prepared = 'name' in command ? { ...command, name: name(command.name) } : command
      }
      return repository.executeAgentCommand(prepared)
    },
    updateCardAttributes: (id: Id, attributes: CardAttributes) => repository.updateCardAttributes(id, { ...attributes, name: name(attributes.name) }),
    open: () => repository.open(),
    projects: () => repository.projects(),
    catalogue: () => repository.catalogue(),
    preference: () => repository.preference(),
    setLastProject: (id?: Id) => repository.setLastProject(id),
    board: (projectId: Id) => repository.board(projectId),
    boardView: (projectId: Id) => repository.boardView(projectId),
    createProject: (input: CreateProjectInput) => {
      const projectName = name(input.name)
      const statusNames = input.initialStatusNames.map(name)
      const project = { id: createId(), name: projectName, createdAt: now() }
      return repository.createProject(project, statusNames.map((statusName, position) => ({ id: createId(), projectId: project.id, name: statusName, position })), true)
    },
    cardDetails: (projectId: Id, cardId: Id) => repository.cardDetails(projectId, cardId),
    createNote: (cardId: Id, text: string) => {
      if (!text.trim()) throw new Error('Текст заметки обязателен')
      return repository.createNote({ id: createId(), cardId, text: text.trim(), createdAt: now() })
    },
    updateNote: (cardId: Id, noteId: Id, text: string) => {
      if (!text.trim()) throw new Error('Текст заметки обязателен')
      return repository.updateNote(cardId, noteId, text.trim(), now())
    },
    deleteNote: (cardId: Id, noteId: Id) => repository.deleteNote(cardId, noteId),
    deleteProject: (id: Id) => repository.deleteProject(id),
    renameProject: (id: Id, input: string) => repository.renameProject(id, name(input)),
    createStatus: (projectId: Id, input: string) => repository.createStatus({ id: createId(), projectId, name: name(input) }),
    renameStatus: (id: Id, input: string) => repository.renameStatus(id, name(input)),
    deleteStatus: (id: Id) => repository.deleteStatus(id),
    moveStatus: (id: Id, direction: -1 | 1) => repository.moveStatus(id, direction),
    createCard: (statusId: Id, input: CardInput) => repository.createCard({ id: createId(), statusId, name: name(input.name), description: input.description, important: input.important, urgent: input.urgent }),
    updateCard: (id: Id, input: CardInput) => repository.updateCard(id, { name: name(input.name), description: input.description, important: input.important, urgent: input.urgent }),
    deleteCard: (id: Id) => repository.deleteCard(id),
    moveCard: (id: Id, placement: CardPlacement) => repository.moveCard(id, placement),
  }
}
