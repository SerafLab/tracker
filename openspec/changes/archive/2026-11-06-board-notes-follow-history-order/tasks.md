# Tasks

## 1. Board view data

- [x] 1.1 In `dexie-project-board-repository.ts` `boardView`, read the 5 oldest and the 5 newest notes per card from `[cardId+createdAt]`, merge by id and return them oldest first in `BoardView.previewNotes` (renamed from `recentNotes`; update the type comment in `domain/model.ts`); verify `dexie-project-board-repository.test.ts` covers 0, 1, 5, 6 and 12 notes (12 → ids 1–5 and 8–12), equal creation dates ordered by id, edits and deletions
- [x] 1.2 Rename `recentNotes` in `project-board-view.tsx`, `navigation.test.tsx`, `rendering.test.tsx`, `project-board-store.test.ts` and `card-note-preview.test.tsx`; verify `npx tsc -b` and those test files pass

## 2. Board card preview

- [x] 2.1 In `card-view.tsx` show `orderNotes(notes, order).slice(0, notesOpen ? RECENT_NOTE_LIMIT : 1)`; verify in `card-note-preview.test.tsx`: collapsed card shows the newest note by default and the oldest after "oldest first" is stored; with 8 notes the expanded list shows 8–4 or 1–5; toggling the order in the panel updates collapsed and expanded board cards at once
- [x] 2.2 Update `e2e/note-order.spec.ts` (`e2e/card-note-preview.spec.ts` checks only the default order and needs no change) (8 seeded notes on one card) so the 1280px board check covers a collapsed and an expanded card after toggling and after reload; verify with `npx playwright test e2e/card-note-preview.spec.ts e2e/note-order.spec.ts` on a unique `E2E_PORT`

## 3. Integration

- [x] 3.1 Repeat changed tests (`npx vitest --run --repeats=10 <files>`, `npx playwright test <files> --repeat-each=5`), view the 1280px board screenshot in both orders, and run `npm run check`
