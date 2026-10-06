# Agent instructions

## Synchronize local `main` after merge confirmation

When the user confirms that the agent's changes have been merged into GitHub, immediately:

1. Check the current branch and working tree.
2. Switch to the local `main` branch.
3. If the working tree is clean, run `git pull --ff-only origin main`.
4. Verify that local `main` is synchronized with `origin/main`.
5. If there are uncommitted changes or a conflict, do not overwrite or stash them automatically. Report the situation and ask the user how to proceed.
