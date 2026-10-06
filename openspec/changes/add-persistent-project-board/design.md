# Design

## Context

The current React entry page contains no product data or navigation. This change introduces the first user-owned data model while preserving the static GitHub Pages delivery model. See [proposal.md](proposal.md) for motivation and [ADR-0002](../../../docs/adr/0002-indexeddb-and-versioned-backups.md) for the already accepted storage direction.

## Goals / Non-Goals

**Goals:**

- Define a small, normalized, durable model for projects, statuses, cards, and the last-open-project preference.
- Make all mutations explicit, ordered, and testable through one repository boundary.
- Provide a responsive, keyboard-operable baseline for the central board workflow.

**Non-Goals:**

- Designing notes, links, next actions, deletion rules, backup/import, synchronization, PWA caching, or drag-and-drop.
- Adding a global state-management library or a UI-component library.
- Supporting data migration from an earlier user-data schema; no such schema exists yet.

## Decisions

### Normalized local entities with explicit order

Use separate project, status, card, and workspace-preference records. Statuses reference their project; cards reference their status; every entity receives a UUID. Store a numeric explicit position for statuses and cards rather than deriving order from creation time.

This makes project isolation and a card's single status ownership direct invariants, and makes reordering durable. An embedded board document was considered but would make targeted mutation and later migration of independent entities more difficult.

### Dexie repository is the sole UI data boundary

Implement the accepted IndexedDB choice with Dexie and expose queries and mutations through a repository module. React components consume application-facing data and operations rather than IndexedDB tables directly. Mutations that affect ordering or transfer a card update their affected records transactionally; a failure leaves the UI in a visible failure state rather than optimistic unsaved state.

Direct component-level IndexedDB calls were rejected because they would scatter persistence rules and complicate unit tests. An in-memory store was rejected because it violates the agreed repeat-open behavior.

### One selected board with a hash-addressable view

Use the agreed hash-routing approach to distinguish the project catalogue from an open board and retain the selected project in a workspace-preference record. On start, a valid last-open project is opened; absent or stale selection goes to the catalogue. The board includes a direct return path to the catalogue.

Keeping all boards in one view was rejected: it weakens project isolation and becomes difficult to use on a phone. Relying only on route state was rejected because the agreed return behavior must survive reloads.

### Explicit controls over gesture-only interaction

Use semantic forms, buttons, and selectors for creation, rename, status ordering, and card movement. The board may horizontally scroll its status columns at narrow widths. Drag-and-drop is deliberately absent from this change.

This supports keyboard and touch use with predictable behavior. Gesture-first ordering was rejected pending real-phone validation.

### Error-first storage startup and mutation handling

Initialize the repository before rendering an interactive workspace. If opening storage fails, render an actionable unavailable-state instead of a deceptive empty board. If an individual persistence mutation fails, keep the previously confirmed state and announce the failure.

Proceeding with an ephemeral in-memory board was rejected because it would make data loss appear to be successful persistence.

## Risks / Trade-offs

- [IndexedDB is unavailable, blocked, or quota-limited] → Detect open/write failures, surface an unavailable or failed-save state, and cover the repository error path in tests.
- [Position collisions after repeated moves] → Centralize position recalculation in repository transactions and test move/reorder edge cases.
- [Narrow screens make a wide board hard to scan] → Use horizontally reachable columns and preserve explicit non-drag controls; assess the installed/offline experience in its dedicated change.
- [A future schema changes after real data exists] → Start with a versioned Dexie schema and follow ADR-0002's forward-only migration rule.

## Migration Plan

1. Introduce the initial IndexedDB schema and repository; existing deployments have no user-data schema to migrate.
2. Deploy the change through the existing Pages workflow and verify the documented multi-project persistence scenario against the production build.
3. If a defect is found after users have created data, release a forward-compatible correction rather than treating an older bundle as a data rollback, in accordance with ADR-0002.
