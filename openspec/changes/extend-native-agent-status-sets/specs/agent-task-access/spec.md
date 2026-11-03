# Spec Delta

## ADDED Requirements

### Requirement: Explicit native status-set selection
Native create_project SHALL require statusSetId equal to simple, search, documents, development, job-search or none. It SHALL atomically save the named project and independent statuses in the selected set order using current UI language, and return the saved project with ordered statuses. none SHALL create no statuses. Background creation SHALL preserve route and last-opened-project preference. The native contract SHALL be version 2.

#### Scenario: Set choice is missing or invalid
- **WHEN** create_project has no valid statusSetId
- **THEN** invalid_argument is returned and nothing is written

#### Scenario: Agent explicitly creates without statuses
- **WHEN** create_project names none
- **THEN** a project with no statuses is saved without changing the visible route or preference

#### Scenario: Agent chooses a localized set
- **WHEN** create_project supplies a nonempty built-in set ID
- **THEN** the current UI language determines saved status names, in the exact same order as the UI preview

### Requirement: Native status-set application
Native apply_status_set SHALL accept projectId and one of the five nonempty set IDs. Existence, empty-status condition and all status writes SHALL be one transaction. Success SHALL return the saved board without implicit navigation; failure SHALL preserve existing data.

#### Scenario: Agent fills an existing empty project
- **WHEN** a valid set is applied to an existing project without statuses
- **THEN** the complete localized ordered set is saved and returned

#### Scenario: Project has acquired a status
- **WHEN** the target project has any status at commit time
- **THEN** conflict is returned without writing any set statuses

#### Scenario: Write fails or project is missing
- **WHEN** the project is missing or any status write fails
- **THEN** not_found or storage_unavailable is returned respectively, with no partial set

### Requirement: Agent asks for a project status set
The repository skill SHALL request explicit status-set choice before create_project when the request has no choice, recommending Simple and offering all sets and none. It SHALL not guess from the project name, re-ask an already specified choice, or apply a set to a nonempty project.

#### Scenario: User requests a project with no set choice
- **WHEN** the user asks to create a project without naming a set
- **THEN** the skill asks for the choice and does not invoke create_project until answered

#### Scenario: User explicitly supplies a set or none
- **WHEN** the request already names a valid set or no statuses
- **THEN** that choice is used without an additional question
