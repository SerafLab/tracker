# EasyTrack task contract, version 1

These are operation labels. Invoke only the actual names and schemas returned by native discovery on the pinned document; the host may suffix names. Require the complete task API before treating the binding as ready.

`get_connection({})` returns `{ok:true,sessionId,data:{contractVersion:1,state,route,lastMutationSequence}}`. The nonempty `sessionId` is top-level. Read the actual documented `route` representation rather than assuming an object shape. States are `opening`, `ready`, `storage_unavailable`, `restart_required`. Missing document/host support is reported by the workflow as disconnected/incompatible, not a fabricated successful response.

All other inputs include `sessionId`. All mutation/navigation inputs also include `requestId`: a positive safe integer strictly increasing for fresh operations in that session. Unknown fields are invalid.

| Operation | Operation fields, excluding session/request metadata | Result data |
| --- | --- | --- |
| `list_projects` | None; read-only | Projects with stable IDs, names, creation dates |
| `get_board` | `projectId`; read-only | Project, ordered statuses/cards with stored descriptions |
| `create_project` | `name` | Saved project; no initial statuses |
| `rename_project` | `projectId`, `name` | Saved project |
| `create_status` | `projectId`, `name` | Saved status |
| `rename_status` | `statusId`, `name` | Saved status |
| `move_status` | `statusId`, `direction: "left" | "right"` | Board and change/unchanged outcome |
| `delete_status` | `statusId`, `confirm: true` | Deleted ID; nonempty refusal is an error |
| `create_card` | `statusId`, `name`, optional `important`, `urgent` (default false) | Saved card with ID, empty description and priority position |
| `update_card` | `cardId`, `name`, `important`, `urgent` | Saved card, retaining current description |
| `move_card` | `cardId`, destination `statusId`, `expected: {statusId, important, urgent}` | Saved card and saved/unchanged outcome |
| `delete_card` | `cardId`, `confirm: true` | Deleted ID; its stored notes are also removed |
| `show_workspace` | Optional `projectId` | Actual applied route and canonical app URL |

Success envelope: `{ok:true, sessionId, data}`. Failures use `{ok:false, sessionId, error:{code,message}}`. Persisted data remain authoritative when a successful mutation also carries `saved:true` and a separate view-refresh warning. Consult the discovered result description for the warning's concrete field names. Do not send unsupported `outputSchema`, `contractVersion`, `description` or anchor fields as operation arguments.

Error codes: `invalid_argument`, `not_found`, `conflict`, `status_not_empty`, `storage_unavailable`, `restart_required`, `disconnected`, `incompatible`, `outcome_unknown`.

Within a live session the app retains one active mutation and up to 64 completed results. Identical session/request/tool/arguments share or reuse a result; mismatched reuse conflicts. Eviction does not reset the accepted high-water sequence: an old evicted ID cannot execute again. The ledger does not survive a new document/session. It is not a reason to retry an unknown mutation automatically.

No task tools for project deletion, notes, description editing, presets, arbitrary anchors/reordering, batch or disconnect are provided. Session metadata binds a call to a document; it is not a credential replacing the browser's access controls.
