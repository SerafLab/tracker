# Tasks

## 1. Кнопка-шеврон

- [x] 1.1 Добавить иконку `chevronDown` в `board-icon.tsx`, в `resources.ts` добавить ключи `showNotes` / `hideNotes` (ru, en). Проверка: `npx tsc -b` проходит.
- [x] 1.2 В `card-view.tsx` заменить текст кнопки на `<BoardIcon name="chevronDown" />`, перенести `recentNotesToggle` в `aria-label`, добавить класс `bar-hint` и `data-hint` по состоянию. Проверка: обновлённый `card-note-preview.test.tsx` проверяет отсутствие видимого текста, наличие svg, доступное имя с названием карточки, `aria-expanded` и `data-hint` в обоих состояниях; `npx vitest --run --repeats=10 src/features/project-board/presentation/card-note-preview.test.tsx` проходит.
- [x] 1.3 В `styles.css` переписать `.card-notes-toggle`: 24×24px, `margin-left: -11px`, `--text-secondary`, поворот иконки при `aria-expanded="true"`, удалить `::after`-стрелку, уменьшить отступ над кнопкой, подсказку справа только при `(hover: hover)` и `:focus-visible`. Проверка: шаг 1.4.
- [x] 1.4 В `e2e/card-note-preview.spec.ts` для 320px и широкого экрана проверить, что центр кнопки по x совпадает с линией `.card-note` (±1px), кнопка не меньше 24×24 и ниже последней заметки без пересечения с текстом, а подсказка появляется при фокусе с клавиатуры. Проверка: `npx playwright test e2e/card-note-preview.spec.ts --repeat-each=5` проходит с уникальным `E2E_PORT`.

## 2. Визуальная проверка и интеграция

- [x] 2.1 Снять и просмотреть карточку со свёрнутыми и раскрытыми заметками на 320px и на широком экране, в светлой теме и в теме Ink, плюс подсказку при наведении. Подобрать нижний отступ карточки. В отчёте указать, что именно просмотрено.
- [x] 2.2 Выполнить `npm run check` с уникальным `E2E_PORT`; убедиться, что `e2e/calm-board.spec.ts` и `e2e/note-order.spec.ts` проходят без изменений селекторов.
