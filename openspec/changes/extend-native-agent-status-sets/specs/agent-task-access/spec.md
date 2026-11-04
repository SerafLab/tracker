# Spec Delta

## MODIFIED Requirements

### Requirement: Discoverable task operation tools
The system SHALL expose typed native WebMCP page tools in supported browser-hosts for project/board reads, project creation with an explicit status set, status-set application to an empty project, status creation and renaming, status movement, empty-status deletion and card creation, attribute updates, movement and deletion. A task SHALL mean an existing card without new completion semantics. Ordinary stdio MCP clients SHALL NOT be advertised as supported consumers.

#### Scenario: Agent discovers supported actions
- **WHEN** a supported host discovers the selected EasyTrack document's tools
- **THEN** it receives descriptions and native argument schemas for get_connection, list_projects, get_board, create_project, apply_status_set, rename_project, create_status, rename_status, move_status, delete_status, create_card, update_card, move_card, delete_card and show_workspace (contract version 2); versioned result contracts are documented and validated

#### Scenario: Unsupported operations remain absent
- **WHEN** the host discovers the task tools
- **THEN** project deletion, note CRUD, description editing, arbitrary card anchors/reorder, batch and disconnect tools are not advertised

#### Scenario: Agent adds a task
- **WHEN** the agent supplies an existing status identifier, a nonempty card name and optional independent priority flags
- **THEN** creation returns the saved card with its identifier, status, name, flags, empty description and priority position; omitted flags default to false

#### Scenario: Agent inspects tasks
- **WHEN** the agent lists projects and reads a selected board
- **THEN** it receives stable identifiers, names, ordered statuses and ordered cards including stored descriptions, without adding note-history tools

### Requirement: Agent creation preserves workspace context
create_project SHALL accept a name and a required statusSetId and SHALL NOT select a set implicitly. create_card SHALL initialize description to an empty string. Background creation SHALL preserve the current workspace route and last-opened-project preference; explicit show_workspace SHALL own navigation. Existing UI project creation SHALL retain its selected status set and navigation behavior.

#### Scenario: Agent creates from the catalogue
- **WHEN** the agent creates a named project while the catalogue is displayed
- **THEN** the named project is saved with the chosen set's statuses (none for an empty project), the catalogue refreshes without opening it, and reload does not unexpectedly restore that project

#### Scenario: Agent creates while a board is open
- **WHEN** the agent creates a project while another project is open
- **THEN** the displayed project, route and previous last-opened-project preference remain unchanged

## ADDED Requirements

### Requirement: Explicit native status-set selection
Native create_project SHALL require statusSetId equal to simple, search, documents, development, job-search or none. It SHALL atomically save the named project and independent statuses in the selected set order using the current interface language, and return the saved project with ordered statuses. none SHALL create no statuses. The native contract SHALL be version 2.

#### Scenario: Set choice is missing or invalid
- **WHEN** create_project has no valid statusSetId
- **THEN** invalid_argument is returned and nothing is written

#### Scenario: Agent explicitly creates without statuses
- **WHEN** create_project names none
- **THEN** a project with no statuses is saved

#### Scenario: Agent chooses a localized set
- **WHEN** create_project supplies a nonempty built-in set ID
- **THEN** the application's interface-language setting determines saved status names, in the exact same order as the UI preview

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
