# Agent instructions

## Pre-push checks

`npm ci` configures the versioned `.githooks/pre-push` hook, which runs `npm run check`. Do not bypass the hook. Pull-request CI runs the same command and is the merge gate.

## Feature delivery and OpenSpec lifecycle

Completing implementation tasks and passing checks means a change is **ready for
review**, not delivered. Keep its OpenSpec change active until the Git delivery
lifecycle is complete.

1. Do not create a commit, push a branch, create a pull request, merge, or deploy
   unless the user explicitly asks for that action.
2. Do not archive an OpenSpec change merely because every task checkbox is
   complete. By default, archive only after the implementation is committed,
   pushed, and the user confirms it has merged into `main`.
3. Sync delta specs into `openspec/specs/` as part of that post-merge closure.
   A user may explicitly request an earlier sync or archive; record that choice
   and state that the Git delivery lifecycle remains incomplete.
4. When implementation is ready but any delivery step has not been authorized or
   completed, report the exact state (for example, “verified locally; changes
   are uncommitted”) and ask for the next Git action. Do not call it released or
   fully delivered.

## Synchronize local `main` after merge confirmation

When the user confirms that the agent's changes have been merged into GitHub, immediately:

1. Check the current branch and working tree.
2. Switch to the local `main` branch.
3. If the working tree is clean, run `git pull --ff-only origin main`.
4. Verify that local `main` is synchronized with `origin/main`.
5. If the merged feature branch is known and the working tree is clean, delete it locally and from `origin` after confirming it is fully merged into `main`.
6. If there are uncommitted changes or a conflict, do not overwrite, stash, or delete a branch automatically. Report the situation and ask the user how to proceed.
