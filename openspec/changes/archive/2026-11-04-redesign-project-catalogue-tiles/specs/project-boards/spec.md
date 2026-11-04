# Spec Delta

## MODIFIED Requirements

### Requirement: Project catalogue and board navigation
The system SHALL present a distinct project catalogue and one open project board at a time. It SHALL let the user view locally stored projects in an adaptive tile grid, create a project with a non-empty name through a primary creation control, rename an existing project, and open a project. Each project tile SHALL show the project name and the total number of its cards across all statuses. Duplicate project names SHALL be permitted. Creating a project SHALL initialize its statuses from the selected status set and open its board, and the board SHALL provide a clear control to return to the catalogue.

#### Scenario: User creates and opens projects
- **WHEN** the user creates projects named "Поиск квартиры" and "Паспорт" and chooses one from the catalogue
- **THEN** the selected project's board is displayed without the other project's statuses or cards

#### Scenario: User submits an empty project name
- **WHEN** the user tries to create or rename a project with a name containing only whitespace
- **THEN** the project is not created or renamed and the interface indicates that a name is required

#### Scenario: User starts creating a project from a populated catalogue
- **WHEN** the user activates the catalogue's primary project-creation control
- **THEN** the interface exposes a focused form for the name and status-set selection without obscuring the creation action's purpose

#### Scenario: User views projects in the catalogue
- **WHEN** the catalogue contains one or more projects
- **THEN** each project appears as a tile in an adaptive grid, with its name, its total card count across all statuses, and its rename action available

#### Scenario: User views a project with no cards
- **WHEN** a project has no cards in any of its statuses
- **THEN** its tile shows a localized count of zero cards

#### Scenario: User views the catalogue on a narrow screen
- **WHEN** the catalogue is displayed on a narrow viewport
- **THEN** project tiles remain readable and operable without horizontal page overflow
