# Implementation plan: active OpenSpec changes

Base: `34c1cc421872f8991d933248b9e887fc2aac344f` (`main` and `origin/main`, 2026-10-22).

| Change | Branch | Worktree | Owner | Sequence |
| --- | --- | --- | --- | --- |
| `unify-app-bar` | `codex/unify-app-bar` | `/private/tmp/traker-unify-app-bar` | app bar runner | First for shared UI contract |
| `delete-cards-and-statuses` | `codex/delete-cards-and-statuses` | `/private/tmp/traker-delete-cards-and-statuses` | deletion runner | Data work parallel; UI follows shared UI contract |
| Combined result | `codex/all-changes` | `/private/tmp/traker-all-changes` | main chat | Merged after user authorization |

Shared contracts: `AppBar` lives outside the board feature and owns the sole language selector and page `h1`. `ActionDialog` contains no language selector, traps focus, and makes the app bar inert while open. Deletion uses existing `ActionMenu` and the final `ActionDialog`; it adds no project deletion. Store reports nonempty-status refusal separately from storage failure and refreshes the board only after a saved mutation.

Acceptance: each change's specified component, store, IndexedDB, UI, keyboard, and 320 px cases; `openspec validate <change> --strict`; `npm run check` in each completed feature worktree. After authorized integration, run `npm run check` and cross-feature UI scenarios in the integration worktree.

The user authorized local commits and merges after both features were implemented and reviewed. Merge order: app bar, then deletion, then integration-specific checks. Publishing, PR creation, deployment, and archival remain outside that authorization.

## Verification recorded on 2026-10-22

- `codex/unify-app-bar`: all 8 tasks complete; strict OpenSpec validation and final `npm run check` pass (76 unit and 17 browser tests). Commit `e2e0c1b`.
- `codex/delete-cards-and-statuses`: all 9 tasks complete; strict OpenSpec validation and final `npm run check` pass (93 unit and 15 browser tests). Review found and fixed the committed-deletion/failed-refresh error contract. Commit `63caaab`.
- Temporary preview `/private/tmp/traker-combined-review` combined uncommitted work for early checks. Its full `npm run check` passed (96 unit and 19 browser tests). It exposed the last-status focus issue, which was fixed in the deletion branch before merging.
- Integration merge commits: `729a1dc` (app bar) and `da39a32` (deletion). The first merge passed `npm run check` (76 unit, 17 browser tests); the second passed (97 unit, 19 browser tests). One UI conflict was resolved with the already tested preview version. An integration-only browser assertion now verifies that deletion dialogs have no second language selector.
- No branch has been pushed, no PR exists, and OpenSpec changes remain active pending Git delivery and later confirmation of merge into `main`.
