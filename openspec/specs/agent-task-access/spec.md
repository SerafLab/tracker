# agent-task-access Specification

## Purpose

Позволяет агенту работать с карточками EasyTrack через native WebMCP в явно выбранной внутренней вкладке и показывать доску, сохраняя данные и черновики в существующем браузерном контексте.

## Requirements

### Requirement: Discoverable task operation tools
The system SHALL expose typed native WebMCP page tools in supported browser-hosts for project/board reads, project/status creation and renaming, status movement, empty-status deletion and card creation, attribute updates, movement and deletion. A task SHALL mean an existing card without new completion semantics. Ordinary stdio MCP clients SHALL NOT be advertised as supported consumers.

#### Scenario: Agent discovers supported actions
- **WHEN** a supported host discovers the selected EasyTrack document's tools
- **THEN** it receives descriptions and native argument schemas for get_connection, list_projects, get_board, create_project, rename_project, create_status, rename_status, move_status, delete_status, create_card, update_card, move_card, delete_card and show_workspace; versioned result contracts are documented and validated

#### Scenario: Unsupported operations remain absent
- **WHEN** the host discovers the task tools
- **THEN** project deletion, note CRUD, description editing, presets, arbitrary card anchors/reorder, batch and disconnect tools are not advertised

#### Scenario: Agent adds a task
- **WHEN** the agent supplies an existing status identifier, a nonempty card name and optional independent priority flags
- **THEN** creation returns the saved card with its identifier, status, name, flags, empty description and priority position; omitted flags default to false

#### Scenario: Agent inspects tasks
- **WHEN** the agent lists projects and reads a selected board
- **THEN** it receives stable identifiers, names, ordered statuses and ordered cards including stored descriptions, without adding note-history tools

### Requirement: Typed saved results and distinguishable errors
The system SHALL validate tool inputs and return structured success or failure results. Success SHALL contain sessionId and persisted data; failures SHALL have a stable code. The error contract SHALL distinguish invalid_argument, not_found, conflict, status_not_empty, storage_unavailable, restart_required, disconnected, incompatible and outcome_unknown. Native host exceptions SHALL NOT be misrepresented as confirmed application success.

#### Scenario: Invalid input is refused
- **WHEN** a command contains unknown fields, invalid IDs/types or a whitespace-only required name
- **THEN** it returns invalid_argument without a mutation

#### Scenario: A target is missing
- **WHEN** renaming, moving, updating or deleting targets an absent entity
- **THEN** the operation returns not_found rather than claiming a successful no-op

#### Scenario: A contract version is unsupported
- **WHEN** the integration workflow discovers a get_connection contractVersion it does not support
- **THEN** it reports incompatible and does not invoke task operations

### Requirement: Existing board rules apply to agent operations
The system SHALL apply the same naming, project isolation, priority grouping and durable operation rules to agent and interface actions. Mutations SHALL target identifiers, not implicit name matches or the visible project. Missing/foreign targets and nonempty status deletion SHALL be checked authoritatively during the operation and SHALL preserve data on refusal.

#### Scenario: Duplicate names exist
- **WHEN** projects or cards share a name
- **THEN** reads distinguish their IDs and a mutation affects only the selected identifier

#### Scenario: Agent requests an invalid move
- **WHEN** a card is moved to a status in another project
- **THEN** the tool reports conflict and leaves the card unchanged

#### Scenario: Agent deletes a populated status
- **WHEN** deletion targets a status containing cards
- **THEN** it returns status_not_empty and preserves that status and its cards

#### Scenario: Agent deletes without explicit intent
- **WHEN** the conversation does not authorize deleting the selected card or empty status
- **THEN** the skill does not invoke its destructive tool; a permitted call requires confirm:true and the tool is marked consequential

### Requirement: Agent creation preserves workspace context
create_project SHALL accept a name and create a project without initial statuses or implicit preset selection. create_card SHALL initialize description to an empty string. Background creation SHALL preserve the current workspace route and last-opened-project preference; explicit show_workspace SHALL own navigation. Existing UI project creation SHALL retain its selected status set and navigation behavior.

#### Scenario: Agent creates from the catalogue
- **WHEN** the agent creates a named project while the catalogue is displayed
- **THEN** a new empty project is saved, the catalogue refreshes without opening it, and reload does not unexpectedly restore that project

#### Scenario: Agent creates while a board is open
- **WHEN** the agent creates a project while another project is open
- **THEN** the displayed project, route and previous last-opened-project preference remain unchanged

### Requirement: Card attribute updates preserve descriptions
update_card SHALL accept cardId, name, important and urgent, without an editable description. It SHALL update those attributes while preserving the latest stored description as one atomic operation. An unrelated concurrent description save SHALL NOT be overwritten by an older adapter snapshot. Updating attributes SHALL retain existing priority rules and personal notes.

#### Scenario: Agent renames a detailed card
- **WHEN** the agent updates a card's name and flags
- **THEN** the saved card retains its description and notes, and its position follows the same priority-group rules as a UI edit

#### Scenario: Description changes concurrently
- **WHEN** another UI or tab saves a description concurrently with the agent's name/flag update, in either operation order
- **THEN** the attribute operation retains the current stored description and does not write a copied or empty replacement

### Requirement: Agent card movement appends within its own group
move_card SHALL accept cardId, destination statusId and expected source statusId/important/urgent. It SHALL append the same card at the tail of its own priority group using the shared placement rules, preserving description, notes and dense order. A stale expected state SHALL return conflict; an unchanged placement SHALL be reported as unchanged without a new write.

#### Scenario: Agent moves a priority card
- **WHEN** a valid move targets another status containing several priority groups
- **THEN** the card follows its matching peers and precedes lower groups without changing its ID, flags, description or notes

#### Scenario: Source state changed after reading
- **WHEN** the card's source status or flags differ from the expected fields supplied by the agent
- **THEN** the operation returns conflict without moving the card

### Requirement: Browser storage remains authoritative
Task operations SHALL execute inside the selected application's browser storage context. The integration SHALL NOT maintain another task database, synchronize browsers or require a Node/stdio/relay process. Ordinary local and offline UI use SHALL remain available without a compatible native API or agent-host.

#### Scenario: Reopening the same context
- **WHEN** a card is saved through WebMCP and the app is reloaded in that storage context
- **THEN** it remains available from the existing browser storage

#### Scenario: Another browser has different projects
- **WHEN** one context is selected and another contains different data
- **THEN** reads and mutations use only the selected context and do not claim synchronization

#### Scenario: Host support is unavailable
- **WHEN** native discovery/execution is absent or the agent-host is stopped
- **THEN** integration is reported unavailable while the normal local and offline application keeps working

### Requirement: Explicit application session binding
The integration SHALL bind each data/navigation call to one selected document and expected in-memory sessionId. get_connection SHALL expose session/version/state/route and the mutation sequence. Native platform capabilities and origin rules SHALL govern access without custom pairing credentials. A different or expired session SHALL be refused before task access; selecting another tab SHALL never happen silently.

#### Scenario: Several tabs offer tools
- **WHEN** several EasyTrack documents have registered tools
- **THEN** the skill retains the chosen browser/tab/session tuple and each call reaches one selected document without replacement or fan-out

#### Scenario: The document reloads
- **WHEN** reload or document-lifetime replacement creates a fresh session
- **THEN** old session arguments/handles cannot execute task operations and the agent must discover and bind afresh

#### Scenario: Untrusted access is attempted
- **WHEN** a caller lacks the native platform's permitted access or supplies the wrong application session
- **THEN** it cannot use that call to inspect or mutate tasks; no broader cross-origin exposure or arbitrary code endpoint is provided

### Requirement: Storage and document lifecycle gate operations
No task operation SHALL access storage before readiness. The system SHALL refuse mutations after storage versionchange and during conflicting pending/recovery states. Cleanup, page suspension and re-registration SHALL revoke stale attempts without resurrecting old tools. Unregistering a tool SHALL NOT imply rollback or cancellation of an already-dispatched mutation.

#### Scenario: Storage requires restart
- **WHEN** the app receives IndexedDB versionchange
- **THEN** subsequent mutations return restart_required until a fresh ready runtime exists, for both agent and UI paths

#### Scenario: Registration completes after cleanup
- **WHEN** an old asynchronous registration resolves after its document attempt was revoked
- **THEN** it does not publish tools into the newer or ended session

#### Scenario: A board mutation is pending
- **WHEN** a conflicting agent write or show request arrives during DnD commit/refresh recovery or another active mutation
- **THEN** it returns conflict before dispatch, without being queued for later execution

### Requirement: Saved results and visible state agree
The system SHALL acknowledge mutation success only after storage confirms the operation. It SHALL refresh affected current data without manual reload or implicit route changes. A failed write SHALL preserve confirmed state. A failed view refresh after commit SHALL report saved:true with a separate warning and SHALL NOT invite repetition of the mutation.

#### Scenario: Card appears on the open board
- **WHEN** the agent successfully creates a card in the displayed board
- **THEN** the board shows it in its persisted priority position without manual reload

#### Scenario: Agent edits another board
- **WHEN** a command edits a project other than the currently displayed one
- **THEN** the route remains unchanged and reading the edited board returns its saved state

#### Scenario: Saving fails
- **WHEN** storage rejects a mutation
- **THEN** the tool reports storage_unavailable and does not announce that change as saved

#### Scenario: Refresh fails after commit
- **WHEN** a mutation commits but subsequent reading of the visible data fails
- **THEN** the result preserves the confirmed saved data with a view warning; recovery repeats only the read and does not resend the mutation

### Requirement: Agent operations protect active drafts
Background operations SHALL preserve independent local field and note drafts. An operation conflicting with or destroying the current dirty card editor SHALL return conflict before writing. A refresh failure SHALL NOT silently discard the mounted editor's drafts. The integration SHALL NOT expose a force/discard parameter that bypasses these rules.

#### Scenario: Agent targets a dirty card
- **WHEN** the current card has unsaved fields or a note draft and an agent mutation conflicts with that card
- **THEN** it returns conflict without changing stored data or discarding the draft

#### Scenario: Unrelated background edit succeeds
- **WHEN** an operation updates unrelated data while a card draft exists
- **THEN** the route and draft remain available, including if refreshing confirmed context fails

### Requirement: Interrupted calls do not silently duplicate work
Mutations SHALL carry a session-scoped increasing requestId. The system SHALL bound response waits and retain a bounded in-memory journal. A duplicate ID with identical operation/arguments SHALL share or reuse its result; mismatched reuse and evicted old IDs SHALL never execute a new write. Calls without a ready session SHALL NOT form an offline queue.

#### Scenario: Duplicate request is dispatched
- **WHEN** the same session/requestId and arguments arrive during or after the first invocation
- **THEN** at most one mutation executes and its pending or retained result is reused

#### Scenario: An old ID was evicted
- **WHEN** an ID below the session's accepted high-water sequence is no longer in the bounded journal
- **THEN** the call is refused without executing it as a new mutation

#### Scenario: Application is absent
- **WHEN** the selected document/session is not ready or available
- **THEN** the workflow returns a bounded disconnected response and no mutation executes later without a fresh explicit invocation

### Requirement: Unknown outcomes require state inspection
Losing a mutation result after dispatch SHALL be treated as outcome_unknown, including host exceptions when the document cannot reply. Cancellation or timeout SHALL NOT imply rollback. The workflow SHALL inspect current persisted data before deciding on a new attempt and SHALL NOT automatically replay mutations with new IDs or sessions.

#### Scenario: Connection disappears after dispatch
- **WHEN** a mutation may have executed but its acknowledgement is lost by timeout, abort or navigation
- **THEN** the agent reports uncertainty, reads the actual state when available and does not announce failure as proof that nothing was saved

#### Scenario: Duplicate names prevent attribution
- **WHEN** current data contains indistinguishable names after a lost creation result
- **THEN** the workflow does not assert which record was created by that call or automatically create another copy

### Requirement: Explicit workspace showing respects guards
show_workspace SHALL use normal application navigation and update the remembered project only for an applied transition. Dirty drafts and conflicting pending state SHALL return conflict without navigation. Success SHALL describe the actual final route and app URL, not merely a requested guard or scheduled transition. Browser visibility SHALL be changed separately by the host on the same selected tab.

#### Scenario: Agent shows a selected project
- **WHEN** a clean, ready app receives a valid projectId for show_workspace
- **THEN** it applies that board route and preference before success; the host can then show that same tab

#### Scenario: Agent shows the catalogue
- **WHEN** a clean, ready app receives show_workspace without projectId
- **THEN** it applies the catalogue route and its normal preference change before success

#### Scenario: A draft blocks showing
- **WHEN** the user has unsaved fields or note text
- **THEN** show_workspace returns conflict and leaves route, drafts and preference unchanged

### Requirement: Agent opens and shows the internal application
The skill SHALL reuse or open EasyTrack in a supported internal browser, bind ready native tools before task calls and show the selected workspace on request. It SHALL use WebMCP for CRUD, without shell browser openers, DOM automation or storage-origin substitution. Unsupported hosts and unshown-tab limitations SHALL be reported explicitly. Installing the skill SHALL NOT silently alter global configuration or create user chats.

#### Scenario: User asks to add a task with the app closed
- **WHEN** no connected EasyTrack document exists and the host supports the integration
- **THEN** the workflow opens the ordinary app URL in the internal browser, discovers/binds the ready session and creates only after resolving project/status IDs

#### Scenario: User asks to show tasks
- **WHEN** the user requests a selected project's tasks
- **THEN** the agent successfully applies show_workspace and makes the same selected internal tab visible

#### Scenario: The internal host lacks support
- **WHEN** native page-tool access or tab control is unavailable
- **THEN** the workflow explains that obstacle without switching browser/origin or claiming a task was saved

#### Scenario: Only unshown browser execution was verified
- **WHEN** the browser panel is unshown while the document reports visible
- **THEN** the workflow describes that exact support and does not promise execution in a hidden, unloaded or closed document

#### Scenario: A new-chat walkthrough is due
- **WHEN** release acceptance requires a real new user chat
- **THEN** the user opens that chat or separately explicitly requests its creation; the agent neither creates it autonomously nor records an unperformed walkthrough as passed
