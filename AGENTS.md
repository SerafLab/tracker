# Agent instructions

## Pre-push checks

`npm ci` configures the versioned `.githooks/pre-push` hook, which runs `npm run check`. Do not bypass the hook. Pull-request CI runs the same command and is the merge gate.

## Synchronize local `main` after merge confirmation

When the user confirms that the agent's changes have been merged into GitHub, immediately:

1. Check the current branch and working tree.
2. Switch to the local `main` branch.
3. If the working tree is clean, run `git pull --ff-only origin main`.
4. Verify that local `main` is synchronized with `origin/main`.
5. If the merged feature branch is known and the working tree is clean, delete it locally and from `origin` after confirming it is fully merged into `main`.
6. If there are uncommitted changes or a conflict, do not overwrite, stash, or delete a branch automatically. Report the situation and ask the user how to proceed.
