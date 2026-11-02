# Batch analysis — 2026-11-01

Read-only investigation; no repository files were changed. All six changes report schema `spec-driven`, `state: ready`, zero completed tasks (details 23, drag 21, presets 13, header creation 9, deletion 13, MCP 21). `openspec status --change NAME --json` and `openspec instructions apply --change NAME --json` ran for each. Their prompt context configures openspec-explore interviewing only; this apply request does not trigger that interview.

## Starting state

Working directory `/Users/oleglebedev/Documents/ChatGPT/traker`, branch `codex/compact-app-bar`, HEAD `796aa8e21c0e63318c5a9058e0cff919fed974b2`. User changes: openspec/config.yaml modified; all six proposal directories untracked. Preserve originals; copy them into the integration worktree rather than stash/reset. Observed local main `7aad354997974b781606fb5971276c348cf8e556`, origin/main `4616b3408c34a1ee5f58513791785da73a65574a`; fetch and resolve the actual latest accepted base before worktree creation. Existing temporary worktrees contain earlier navigation/rendering/review changes; do not reuse or mutate blindly.

## Dependency graph and execution groups

Hard dependency: accepted add-card-details -> add-card-drag-and-drop. MCP core depends on a successful real IAB transport gate. DnD final integration depends on its real mobile sensor gate. For batch integration, adopt dependency order presets -> header creation -> card details -> project deletion -> drag-and-drop -> MCP. Details and deletion have no hard product dependency, but deleting after details gives one owner for the notes cascade; MCP last consumes final createProject/CardInput/CardPlacement contracts.

Practical parallel wave 1: details runner, presets runner, header runner in separate worktrees, with the parent running MCP transport experiment and coordination. They touch common files but isolated worktrees; prescribed behaviors are independent, expect explicit merges. If conflict costs are a concern, run deletion after details (not in parallel with it); header before details minimizes StatusColumn conflict. Do not start DnD runner on old CardView.

Suggested integration: branch `codex/all-active-changes`, worktree `/private/tmp/tracker-all-active-changes`. Six feature branches `codex/add-card-details`, `codex/add-card-drag-and-drop`, `codex/add-project-status-presets`, `codex/add-status-header-card-creation`, `codex/add-project-deletion`, `codex/add-agent-mcp-integration`, worktrees `/private/tmp/tracker-<change-name>`. Record actual base SHA when each is created; dependent branches start at accepted integration SHA. Parent owns integration exclusively; runners commit only their own work, never push/merge.

## Shared contracts to settle before runners edit

1. **Project creation.** Domain/application input becomes `CreateProjectInput { name, initialStatusNames: string[] }`, no string overload. Application resolves IDs/positions, presentation resolves locale. Repository `createProject` accepts project + ordered initial status records, saves projects/statuses/workspace atomically. UI default simple, explicit `[]` means no statuses. MCP table currently accepts only name; preserve that external tool schema by mapping it to an explicit empty `initialStatusNames` array in the adapter rather than silently creating localized presets. If MCP is intended to offer presets, that is a separate requirement decision.
2. **Card model.** `Card.description: string` mandatory, `CardInput` is name/description/important/urgent. Compact create supplies `description: ''`. Notes have id/cardId/text/createdAt/optional updatedAt. Use-case ID + clock injection, preserve note createdAt; updatedAt only on actual text changes. History order createdAt then id. Only trim outer whitespace for validating/persisting text, preserve internal line breaks/spaces.
3. **Schema.** Details exclusively owns Dexie v3 and notes `id, cardId, [cardId+createdAt]`, upgrades cards to empty descriptions preserving all existing flags/links/order. DnD, deletion, presets, MCP do not introduce another version. Existing v2 upgrade unconditionally assigns flags; ensure tests really cover required preservation and avoid overwriting already present fields in migration paths.
4. **Cascade.** deleteCard transaction includes notes + cards reorder. deleteProject transaction includes projects/statuses/cards/notes/workspace, reads current relationships inside transaction, removes only selected tree, clears lastProjectId conditionally, safe repeated deletion. Deleting notes does not require a new MCP tool. deleteStatus still rejects nonempty statuses.
5. **Card placement.** DnD replaces moveCard everywhere with CardPlacement `{ statusId, beforeCardId: Id|null, expected source statusId/important/urgent }` (choose exact property shape once). null appends to own priority group. Repository validates current source, target, project and anchor atomically; reject stale flags/status, self anchor, other group/project, missing anchor. No-op distinguished from committed success/failure. MCP move_card maps target ID to append placement using actual current card snapshot. Notes remain associated by card ID; no copies.
6. **Mutation state.** Shared stale guard for UI/MCP. Commit result differs from post-commit refresh result; never replay saved mutation because refresh failed. Refresh current workspace context without implicit board navigation. Details holds confirmed snapshot in store, drafts in React; another slice refresh cannot reset dirty fields/notes. DnD board pending guard includes conflicting card/status edits/deletions until refresh recovery. Existing `showBoard` in every mutation must be replaced/controlled, not copied into MCP.
7. **Navigation.** App remains sole hash/history owner, explicit routes catalogue/board/card. Card route #project/<project>/card/<card>. Sequence IDs discard stale async reads. Details registers dirty/save/discard guard with app; all internal links/history/PWA controlled update pass through it. Save fields then active note, retain successful first part if second fails. Forced restart after versionchange cannot attempt writes.
8. **AppBar.** One h1, sole language selector, optional catalogue brand navigation/card back action, optional create/rename/delete actions. Delete action exists only on board; card page has no project rename/delete/create. Delete/settings share gear ref and close settings before dialog.
9. **Creation controls.** Header and footer each ref, one CardDialog, remember actual opener; `.add-card` remains footer. Tests select explicit location, not `.first()`. Both use same plus style, 44px, footer one button with plus+label. Tooltip clipping must be tested at first/last scrolled column.
10. **MCP adapter.** External update_card has name/flags only; preserve existing description while assembling full CardInput and never erase it. Tool schemas must not expose delete_project or note operations. get_board can include actual saved descriptions without adding write semantics. Operation errors typed at repository/application boundary, missing renameProject/renameStatus/moveStatus/moveCard no longer successful no-op, except agreed repeatable deleteProject (not exposed via MCP).

## Actual specification conflicts requiring technical reconciliation

- **application-shell Contextual navigation and primary action is modified in details AND deletion.** Each delta repeats the old board state and omits the other's new content. Sequential naive sync would lose either card-page navigation or deletion. Before sync, merge their complete requirement/scenarios in the later deletion delta: retain card-detail route/guard/no project actions AND board project deletion. Historical archived specs should not be rewritten. This is technical consistency, no product choice.
- **project-boards Accessible controls is modified by details then DnD.** DnD intentionally removes arrows, preserves editing page. Sync details before DnD, never reverse. DnD Whole-card navigation intentionally replaces the details version; retain all other details requirements.
- **Persistent state says last project except card address.** Navigation parent must distinguish explicit catalogue destination from startup preferred-project fallback; current showRoute conflates them and relies on clearLastProject. Deletion must not require a second preference write after its atomic cascade.
- **MCP create/update/move APIs describe pre-preset/pre-details/pre-DnD fields.** Resolve as adapters as above, not backwards-compatible overloads. App's background refresh on details should preserve drafts while updating confirmed snapshot, even though MCP original prose mentions only catalogue/board.
- **Historical plan 2026-10-22 has outdated authorization limits.** New AGENTS.md authorizes full delivery and new request covers all six; do not inherit old no-push/no-archive limitation.

## Gates and unavoidable acceptance blockers

1. **MCP gate tasks 1.1–1.2 / design decision 2.** Must actually handshake from https://seraflab.github.io/tracker/ inside Codex IAB to loopback WS, without disabling protection/changing origin, then test hidden/background command + IndexedDB survives reopening same context. Ordinary localhost Playwright proves nothing here. Stop dependent core implementation if unsupported; report exact restriction and ask user for transport decision. No global MCP config mutation is authorized automatically. Final task 6.4 also requires real new-chat discovery after publish; do not claim setup/discovery complete merely from official client test.
2. **DnD tasks 1.3 / 5.2.** Requires real Chrome on iPhone/Android AND Safari iPhone early gate before final source integration, then final physical acceptance. Mouse 5px; touch hold 250ms/tolerance 5px, both native swipe axes pre-activation; cannot use permanent touch-action:none/custom touch engine/handle substitution. No physical devices were available to this analyst. Explicit task says emulation does not substitute and leave task unfinished if devices absent. Parent must get actual device evidence or revised requirement, cannot mark all done/archive/merge this feature without it.
3. **Dirty existing work / latest base.** Original proposals are untracked; initial copy needs deliberate staging in new worktree. Never switch original branch with changes/stash/reset. Fetch latest accepted main and preserve feature branches until accepted integration.
4. **Model settings.** Requested luna/sol/astra models are not offered by spawn API; report limitation and inherit available model. Read-only reviewer required before acceptance; parent should reserve/reuse a slot.

## Acceptance and delivery

Each runner reads all own context artifacts and task coordinates, implements + meaningful unit/repository/store/UI/e2e tests, records actual screenshots/manual QA, npm ci sets hook, `npm run check` passes. Parent obtains reviewer per feature, merges one at a time in dependency order, npm run check after EACH, checks cross-feature contracts. Integration regression should include preset creation -> both add buttons -> edit description/notes/dirty guard -> move/reorder retaining data -> delete project cascade including notes -> stale old link; both RU/EN, mobile widths and offline reload. MCP if gate passes: official-client end-to-end uses same IndexedDB + route unchanged for background edits, commit-success/refresh-failure, interrupted outcome_unknown, no replay, stale version guard.

Before ready PR sync deltas (reconcile shell conflict first) and archive COMPLETED changes in integration branch. Incomplete gated changes remain active and cannot be represented as completed. One integration PR, successful required GitHub checks, squash merge, verify Pages deployment. After merge confirm clean tree, sync local main ff-only and clean fully preserved known branches; dirty original work must not be overwritten or stashed automatically. Report exact delivered vs pending states.

## Execution record

Integration: `codex/all-active-changes`, `/private/tmp/tracker-all-active-changes`; accepted upstream `4616b3408c34a1ee5f58513791785da73a65574a`, proposals snapshot `3de01c2`.

| Change | Owner | Branch | Worktree | Base |
|---|---|---|---|---|
| add-project-status-presets | status_presets runner | codex/project-status-presets | /private/tmp/tracker-project-status-presets | 3de01c2 |
| add-status-header-card-creation | batch_analysis runner | codex/status-header-card-creation | /private/tmp/tracker-status-header-card-creation | 3de01c2 |
| add-card-details | card_details runner | codex/card-details | /private/tmp/tracker-card-details | 3de01c2 |
| add-project-deletion | pending runner after details | codex/project-deletion | /private/tmp/tracker-project-deletion | 3de01c2; update before runner |
| add-card-drag-and-drop | pending runner after details | pending | pending | accepted details integration |
| add-agent-mcp-integration | parent transport gate, runner after acceptance | pending | pending | final accepted integration |

User agreed to test the DnD prototype on physical target devices. Evidence still required before final integration. Requested role-specific models are unavailable; inherited model is used. `gh` is unavailable; GitHub connector will handle remote review and delivery. Original worktree remains dirty and untouched.

## Accepted integration checkpoints

- Presets `33cfc8a`: independent reviewer found no issues; 140 unit/UI +78 browser checks. Merged first.
- Header creation `a0598e8`: independent reviewer found no issues; 124 unit/UI +59 browser checks. Merged second.
- Integration regression explicitly selects the empty set for the long-list fixture (`6f9dde7`). Combined 145 unit/UI +80 browser checks passed.
- Both accepted deltas synced with scenario preservation and archived at `2026-11-01-*` (`e8a2006`); strict main-spec validation passed.
- MCP isolated production prerequisite PR20 merged as `5159b6b`, deploy+smoke succeeded. Existing SW navigation fallback initially hid the concrete experiment page; PR21 fixes only that URL, with a regression in a controlled browser context. Core MCP remains gated pending actual handshake.
- Details runner was interrupted by a usage limit; parent preserved/completed its work, then batch_analysis resumed as runner. Independent review identified whole-card lower-gap click, note-deletion focus while composing, and read-failure route preservation defects; all fixed with regressions. Final feature check143 unit/UI +65 browser passed; awaiting final review/merge.

## Continuation — 2026-11-02

Details `59f6498` passed final independent review with no remaining findings; integration `f3f1ae5` reconciled its model with presets/header controls. Main specs synced and details archived at `51aeffe`. Combined validation: 169 unit/UI + 90 browser checks, then 94 browser checks after adding the cross-feature default-preset → header creation → description/note → footer creation → offline-reopen scenario (`dfc24cc`).

Deletion and DnD branches both started at accepted base `51aeffe16a141b7986b88ee2ac2e09992c60933f`. `status_presets` owns deletion in `/private/tmp/tracker-project-deletion`. `batch_analysis` owns DnD in `/private/tmp/tracker-card-drag-and-drop`; exact placement contract is `{ statusId, beforeCardId: Id|null, expected: {statusId, important, urgent} }`. Repository result is `saved|unchanged`; store adds failure/refresh-failure outcomes.

The DnD sensor prototype on LAN port 4190 passed desktop input checks. The user received the requested iPhone Chrome/Safari and Android Chrome checklist and reported «всё хорошо, идем дальше». Device models/versions were not provided and must not be invented. This confirms the early prototype gate; final integrated device acceptance remains pending.

After the failed real loopback gate the user selected «Проверить WebMCP — инструменты самой страницы». Root owns the isolated `codex/webmcp-feasibility` experiment in `/private/tmp/tracker-webmcp-feasibility`; actual native IAB discovery, echo, marker write, close/reopen read and invocation with browser visibility false passed in a local secure context. Production-origin proof and any resulting public-contract revision remain separate requirements. The old stdio MCP core is not implemented.

## Delivery split after user merge — 2026-11-02

The user reported accidentally merging draft PR22. GitHub confirms it merged head `4e9683f` as `332726f16bc172949a5f6508bb578ce5812de3bc` using a merge commit. This contained only the four accepted implementations (presets, header/footer creation, details/notes, project deletion), their synchronized/archived specs, and the already-published feasibility prerequisites. All required checks and the Pages deployment/smoke passed. DnD and task-agent access remain active and were not part of that implementation.

Clean local main was fast-forwarded to `332726f`. Continuation integration is now `codex/remaining-active-changes` in the same `/private/tmp/tracker-all-active-changes` worktree. The local production WebMCP proof commit was preserved as `1ee36f3`; old integration branch remains available because its equivalent QA commit is not yet in main. The original user worktree remains untouched with its initial uncommitted proposals/config.

The user explicitly approved implementing WebMCP in place of the separate Node/stdio server after native production proof. Planner `status_presets` owns only coherent MCP artifact revision in `codex/agent-webmcp-integration`, `/private/tmp/tracker-agent-webmcp-integration`, base `1ee36f3`; core code begins after plan acceptance and the shared DnD placement interface is accepted. Native tool updates preserve current card description transactionally, without adding description/note write tools.

DnD implementation `e6c6734` is clean and under independent review by `card_details`. It passed 189 unit/UI +105 browser checks; task 5.2 final real-device verification and 5.3 sync/archive remain pending. Its LAN preview remains on port4190. Integration checks use4185, DnD e2e4183, deletion e2e4182, and feasibility e2e4184 to avoid sharing servers.
