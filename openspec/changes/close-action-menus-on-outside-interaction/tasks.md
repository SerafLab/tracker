# Tasks

## 1. Action menu dismissal

- [x] 1.1 Add outside pointer and focus handling to the shared `ActionMenu`, with listener cleanup, and verify a click or touch outside closes a project, status, or card menu while the target action still runs.
- [x] 1.2 Cover switching between menus, Tab focus departure, same-trigger toggling, enabled-item selection, and Escape focus restoration in interaction tests; verify the targeted test file passes.

## 2. Integration check

- [x] 2.1 Run `npm run check` and verify the repository's required checks pass with the new menu behavior.
