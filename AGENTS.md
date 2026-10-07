# Agent instructions

## Verify locally before pushing

Before pushing a branch that changes application code, dependencies, tests, or CI:

1. Run `npm ci`.
2. Run `npm run check:architecture` when the script exists.
3. Run `npm run test:run` when the script exists; otherwise run the project's non-watch test command.
4. Run `npm run build`.
5. Do not push when any required command fails. Report the failing command and resolve or escalate the failure first.

## Synchronize local `main` after merge confirmation

When the user confirms that the agent's changes have been merged into GitHub, immediately:

1. Check the current branch and working tree.
2. Switch to the local `main` branch.
3. If the working tree is clean, run `git pull --ff-only origin main`.
4. Verify that local `main` is synchronized with `origin/main`.
5. If there are uncommitted changes or a conflict, do not overwrite or stash them automatically. Report the situation and ask the user how to proceed.
