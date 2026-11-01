# Spec Delta

## Purpose

Позволяет агенту работать с задачами EasyTrack через MCP и показывать доску во внутреннем браузере, сохраняя данные в выбранном браузерном контексте.

## ADDED Requirements

### Requirement: Discoverable task operation tools
The system SHALL expose typed MCP tools to list projects, read a project board, create and rename projects, create and rename statuses, move a status left or right, delete an empty status, and create, update, move and delete cards. Results SHALL contain stable identifiers and persisted values. A task SHALL mean an existing card, without introducing completion semantics or additional card fields.

#### Scenario: Agent adds a task
- **WHEN** the agent supplies an existing status identifier, a nonempty card name and priority flags
- **THEN** the create tool returns the saved card with its identifier, status, name, flags and position

#### Scenario: Agent inspects tasks
- **WHEN** the agent lists projects and reads a selected project board
- **THEN** it receives identifiers, names, ordered statuses and their ordered cards sufficient to select subsequent tool targets

#### Scenario: Agent discovers supported actions
- **WHEN** an MCP client discovers tools
- **THEN** each listed operation has an argument schema, result schema and description, and unsupported project deletion is not advertised

### Requirement: Existing board rules apply to agent operations
The system SHALL apply the same naming, project isolation, ordering and independent priority rules to agent and interface operations. Mutations SHALL target identifiers rather than implicitly resolving names or using whichever project is visible. Invalid arguments, missing targets, cross-project moves and nonempty status deletion SHALL return distinguishable errors without claiming success.

#### Scenario: Duplicate names exist
- **WHEN** multiple projects or cards share a name
- **THEN** the agent can distinguish them by identifiers and mutations affect only the selected identifier

#### Scenario: Agent requests an invalid move
- **WHEN** a card is moved to a status in another project
- **THEN** the tool reports a conflict and leaves the card in its original status

#### Scenario: Agent deletes a populated status
- **WHEN** deletion targets a status that contains cards
- **THEN** the tool refuses deletion and preserves the status and cards

#### Scenario: Agent deletes without explicit intent
- **WHEN** a conversation does not authorize deleting the selected card or empty status
- **THEN** the integration workflow does not invoke its destructive tool

### Requirement: Browser storage remains authoritative
The system SHALL execute task operations inside the connected application's storage context and keep task data in its existing browser storage. The MCP transport SHALL not maintain a separate persistent task database or synchronize browsers. Ordinary local and offline use SHALL remain available without MCP.

#### Scenario: Reopening the same browser context
- **WHEN** a card is saved through MCP and EasyTrack is reloaded in that storage context
- **THEN** the saved card remains available without importing data from the MCP process

#### Scenario: Another browser has different projects
- **WHEN** MCP is connected to one browser context and another context contains different data
- **THEN** reads and mutations use only the connected context and do not claim synchronization

#### Scenario: MCP is stopped
- **WHEN** the MCP process is unavailable
- **THEN** EasyTrack still allows normal local viewing and editing, including its existing offline behavior

### Requirement: Explicit application session binding
The system SHALL bind requests to one authenticated application session. It SHALL reject untrusted connections, arbitrary command execution and silent switching to another tab. No task operation SHALL run before storage is ready or after the application's storage connection becomes stale. Connection status SHALL distinguish ready, disconnected, incompatible and restart-required states.

#### Scenario: Several tabs connect
- **WHEN** a second tab attempts to join an already bound session
- **THEN** it cannot silently replace the tab executing operations or receive a duplicate mutation

#### Scenario: Storage requires restart
- **WHEN** the connected app receives an IndexedDB version-change notification
- **THEN** subsequent mutations are refused with restart-required until a fresh application session is ready

#### Scenario: Untrusted caller connects
- **WHEN** a bridge connection lacks valid session authorization or comes from an unapproved origin
- **THEN** it cannot inspect projects or execute commands

### Requirement: Saved results and visible state agree
The system SHALL acknowledge a successful mutation only after browser storage commits it and refresh the affected visible data without requiring a page reload. Background mutations SHALL preserve the current route. Storage failure SHALL preserve confirmed state. A view-refresh failure after commit SHALL be reported separately from persistence failure.

#### Scenario: Card appears on the open board
- **WHEN** MCP successfully creates a card in the displayed board
- **THEN** the board shows the saved card in its priority position without manual reload

#### Scenario: Agent edits another board
- **WHEN** MCP edits a project other than the currently displayed project
- **THEN** the visible route remains unchanged and reading the edited board returns its saved state

#### Scenario: Saving fails
- **WHEN** browser storage rejects an agent mutation
- **THEN** the tool reports storage failure and does not report the mutation as saved

### Requirement: Interrupted calls do not silently duplicate work
The system SHALL identify calls within a session, prevent repeated dispatch of the same mutation identifier in that session, and bound waits for application responses. After losing confirmation of a dispatched mutation it SHALL report an unknown outcome and SHALL NOT automatically replay it on reconnection. Calls made while disconnected SHALL not be queued for later execution.

#### Scenario: Connection drops after dispatch
- **WHEN** a mutation was dispatched but its result is lost
- **THEN** the agent receives an unknown-outcome error and is instructed to inspect current data before deciding on another mutation

#### Scenario: Application is absent
- **WHEN** an operation is called without a ready application session
- **THEN** it returns a bounded disconnected response and does not execute later without a new call

### Requirement: Agent opens and shows the internal application
The integration SHALL provide a repeatable agent workflow to reuse or open EasyTrack in the internal browser, establish a ready session before task calls, and show the catalogue or a selected board on request. Routine task operations SHALL use MCP rather than interface automation. Missing browser support or required browser permission SHALL be reported explicitly without switching to an external browser or a different storage origin.

#### Scenario: User asks to add a task with the app closed
- **WHEN** the agent has the integration available and no connected EasyTrack tab exists
- **THEN** it opens the configured app in the internal browser, establishes readiness and calls the creation tool after resolving the project and status

#### Scenario: User asks to show tasks
- **WHEN** the user requests the tasks in a selected project
- **THEN** the agent makes EasyTrack visible in the internal browser at that project's board

#### Scenario: Internal browser blocks the connection
- **WHEN** the target internal browser blocks the bridge or requires a permission the agent cannot grant
- **THEN** the workflow explains the precise connection obstacle and does not claim task creation succeeded
