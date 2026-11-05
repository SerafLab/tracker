# Design

## Context

`boardView` reads at most `RECENT_NOTE_LIMIT` (5) newest notes per card from the `[cardId+createdAt]` index and returns them oldest first in `BoardView.recentNotes`. `CardView` shows `notes.slice(-1)` collapsed and `orderNotes(notes, order)` expanded. The order lives in `NoteOrderProvider` (React context inside `ProjectBoardApp`); the store and the repository know nothing about it. The store calls `boardView` from about ten places after mutations and navigation.

## Goals / Non-Goals

**Goals:**
- Board cards show the first one or five notes of the history in the chosen order (see specs).
- Toggling the order updates the board at once, without a repository read.

**Non-Goals:**
- Labels, chevron and toggle look (`card-notes-chevron`).
- Panel history, stored data, WebMCP output.

## Decisions

1. **The board view carries both ends of each history.** `boardView` reads the 5 oldest and the 5 newest notes per card (two `limit(5)` index reads, one forward and one `reverse()`), merges them by id and returns them oldest first: up to 10 notes per card. The 5 oldest overall are the first five of this list, the 5 newest are the last five, because the merge keeps the full `(createdAt, id)` order.
   - Alternative: pass the order into `boardView` and reread on toggle. Rejected: the order would have to reach the store and every one of its `boardView` calls, toggling would cost a read and a flash of stale notes, and the presentation-only preference would leak into the data layer.
   - Alternative: load all notes of every card. Rejected: unbounded board reads for long histories.
2. **Rename `BoardView.recentNotes` to `previewNotes`.** The list is no longer "recent"; the comment on the type states "up to five oldest and five newest notes per card, oldest first". i18n keys `recentNotes`/`recentNotesToggle` stay as they are.
3. **One presentation helper picks what the card shows.** `CardView` computes `orderNotes(notes, order).slice(0, notesOpen ? RECENT_NOTE_LIMIT : 1)`. The expand toggle still appears when the card has more than one note: the merged list has more than one entry exactly when the history does.

## Risks / Trade-offs

- [Two index reads per card instead of one] → Both are bounded by `limit(5)` inside the same read transaction; boards hold few cards, so the cost is negligible.
- [`codex/card-notes-chevron` edits the neighbouring line of `card-view.tsx` and the same preview tests] → Keep this change's edits to the `shownNotes` line and test expectations; resolve any textual conflict on whichever branch merges second and rerun `npm run check`.
