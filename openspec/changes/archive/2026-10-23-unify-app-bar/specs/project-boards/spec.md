# Spec Delta

## ADDED Requirements

### Requirement: Single primary creation entry in catalogue and board
The system SHALL offer one primary creation entry in the application bar for the current workspace screen: project creation in the catalogue and status creation on a board. That entry SHALL open the existing focused creation dialog or mobile sheet. Empty-state content SHALL explain the next step without duplicating the creation form or button.

#### Scenario: User opens an empty catalogue
- **WHEN** no projects exist
- **THEN** the catalogue explains the empty state and its application bar offers the only project-creation entry, which opens the project-name form

#### Scenario: User opens a project with no statuses
- **WHEN** the project has no statuses
- **THEN** the board explains that a status is needed and its application bar offers the only status-creation entry, which opens the status-name form

#### Scenario: User creates after data exists
- **WHEN** the catalogue has projects or the board has statuses
- **THEN** the same application-bar creation entry remains available and opens the corresponding form
