# Design

## Context

См. мотивацию в [proposal.md](proposal.md). После архитектурного change сценарий уже разделён между `src/app/app.tsx`, Zustand store и presentation-компонентами `src/features/project-board/presentation/`; сейчас эти views всё ещё отображают постоянные `NameForm`, длинные текстовые кнопки и `<select>` прямо в колонках. Общие стили в `src/styles.css` минимальны, не содержат design tokens и объявляют Inter, не поставляя сам шрифт.

Домен хранит только проект, статус и карточку с именем и позицией. У карточки нет поля завершённости, даты, фильтра, заметки или ссылки. Данные, hash routing и сохранённое поведение покрываются RTL-тестом `src/app.test.tsx`.

## Goals / Non-Goals

**Goals:**

- Дать каталогам, доскам и контекстным действиям единую calm productivity-иерархию, не меняя существующие callbacks и store actions.
- Сделать каждую текущую операцию компактной, keyboard-accessible и пригодной для narrow viewport.
- Ввести ограниченный CSS token layer, чтобы новые presentation-компоненты не возвращались к разрозненным literal-стилям.
- Сделать визуальные состояния предсказуемыми и проверяемыми RTL-тестами.

**Non-Goals:**

- Не изменять domain types, use cases, repository API, Zustand contract, IndexedDB schema, hash format или поведение сохранения.
- Не добавлять drag-and-drop, сортировку или фильтры, темную тему, веб-шрифты, икон-пакет, UI framework, toast-систему или самостоятельную сущность «завершено».
- Не делать экран с постоянным сайдбаром или копировать информационную архитектуру и элементы Todoist.

## Decisions

### Светлая токенизированная visual system

`src/styles.css` станет владельцем CSS custom properties и базовых component classes; React-компоненты получат семантические class names, а не inline styles. Базовая единица сетки — 4 px.

| Категория | Значение |
| --- | --- |
| Фон приложения / поверхность | `#F7F8F7` / `#FFFFFF` |
| Основной / вторичный / приглушённый текст | `#17211F` / `#42514C` / `#68756F` |
| Граница / subtle surface | `#E2E8E5` / `#F0F3F1` |
| Teal accent / hover / focus ring | `#0F766E` / `#0B5F59` / `#99F6E4` |
| Ошибка / её фон | `#B42318` / `#FEF3F2` |
| Шрифт | `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| Размеры текста | body 16/24; supporting 14/20; section title 20/28; page title 28/34 на desktop и 24/30 на mobile |
| Вес | 400 body, 500 controls, 600 headings |
| Spacing | 4, 8, 12, 16, 24, 32, 40 px |
| Радиусы | 8 px controls, 12 px cards/columns, 16 px modal sheet |
| Тень | только поднятые surface: `0 1px 2px rgb(23 33 31 / 6%), 0 8px 24px rgb(23 33 31 / 8%)` |

Accent зарезервирован для primary action, active/focus state и выбранного действия, а не для разных статусов. Это даёт спокойную визуальную шкалу и отличает результат от красной палитры Todoist. Системный стек заменяет недоставляемый Inter: это исключает сетевой шрифт и сохраняет нативное чтение на iOS, Android и desktop. Вариант с внешним или bundled Inter отклонён из-за веса и отсутствия необходимости для данного сценария.

### Структура экранов и навигации

Каталог проектов остаётся отдельным экраном: app header содержит название «Трекер проектов» и primary button «Создать проект». Пустой каталог показывает спокойный explanatory card с той же формой создания сразу на экране; непустой — вертикальный список project cards с названием, кнопкой открытия и меню «Ещё» для переименования.

Доска использует компактный header: button/breadcrumb «Все проекты», название доски и меню действий проекта. Primary button «Добавить статус» находится в header. Ниже располагается горизонтально прокручиваемая область колонок. Каждая колонка показывает заголовок, счётчик карточек, меню «Ещё», link-button «Добавить карточку» и stack card surfaces. На desktop контейнер имеет max-width 1200 px и padding 32 px; на mobile — 16 px. Колонка имеет width 304 px на desktop и `min(304px, calc(100vw - 32px))` на mobile, поэтому сохраняется исходный доступ к нескольким статусам горизонтальной прокруткой.

Постоянный sidebar отклонён: он потребовал бы загружать полный каталог в workspace board и создал бы новую информационную архитектуру, хотя текущая навигация уже понятна и должна сохраниться.

### Компоненты и действия

`presentation` получает небольшой набор повторно используемых view-компонентов, не меняющих props в application/state:

- `Button` styles: primary teal, secondary outline, quiet/text, destructive only in error context; минимальная target area 44×44 px для icon-only control.
- `Field` и `NameForm`: label остаётся программно связанным с input; helper/error text получает `aria-describedby` и `role="alert"` только при ошибке.
- `ProjectCard`, `StatusColumn` и `CardView`: белые surfaces, border-first, осторожная тень только на hover/focus-within; card title — единственный визуальный primary content.
- `ActionMenu`: button с accessible name, `aria-haspopup="menu"` и Escape/return-focus. Его пункты остаются button controls с ясными labels; icon-only представление не заменяет label для screen reader.
- `ActionDialog`: один focus-managed native `<dialog>`-based component для create/rename/move. На wide screen это центрированный compact dialog, на narrow screen — CSS bottom sheet; закрытие через Escape, Cancel и overlay не сохраняет ничего. Opening control получает фокус после закрытия.
- Статусный counter — текстовый, например «3 карточки», а не цветовая метка. Статусы не получают предустановленных цветов или значений «готово».

В коде нет фильтров и их доменных данных, поэтому никаких filter chips, панели фильтров или «пустого результата фильтра» не добавляется. Если будущий change добавит фильтрацию, он должен использовать quiet outlined controls и показывать активный счётчик — это не задача данного change. Аналогично уведомление ограничено сохранённым error banner с `role="alert"`; success toast не создаётся, потому что сохранение уже подтверждается refresh-ом board snapshot.

### Состояния и feedback

`ProjectBoardApp` продолжает рендерить существующие `loading`, `catalogue`, `board` и `unavailable` workspace states, но меняет их presentation:

- **Loading:** skeleton заголовка и column placeholders с доступным текстом «Открываем рабочее пространство…»; данные и действия не имитируются.
- **Empty:** отдельные illustration-free cards для пустого каталога и доски без статусов с ровно одним явным next action.
- **Error:** storage unavailable — полноэкранный recovery state; неудачная mutation — persistently visible inline banner над текущим confirmed content. Оба используют понятный текст, а не только цвет.
- **Inactive:** disabled ordering action имеет ослабленный foreground, no hover and `cursor: not-allowed`, но остаётся читаемым. Это не состояние карточки.
- **Completed:** намеренно не добавляется. Колонка «Завершено» — обычный пользовательский статус; визуальное или доменное отличие должно быть согласовано отдельным change вместе с данными и правилами.

### Responsive и доступная реализация

Break point 640 px переключает dialog в sheet, уменьшает page gutters и сохраняет touch target; board не пытается сжать несколько columns в одну. `:focus-visible`, контраст текста и error, semantic `button`, `form`, `dialog`, heading hierarchy и aria labels остаются обязательными. CSS respects `prefers-reduced-motion`; допустимы только короткие 150–200 ms opacity/transform transitions, без essential motion.

Вместо новой UI library применяется нативный HTML + React и CSS, что сохраняет маленький bundle и local-first работу. Вместо drag-and-drop сохранится explicit move flow с выбором destination: он соответствует действующей спецификации и проверяем на touch и keyboard.

## Risks / Trade-offs

- [Прогрессивно раскрытые действия могут стать менее очевидны] → меню будут иметь доступные names, predictable placement и RTL-тесты на обнаружение каждого действия.
- [Нативный `<dialog>` ведёт себя по-разному в тестовом DOM и мобильных браузерах] → вынести API открытия/закрытия в один component, покрыть его focus/close tests и выполнить ручной iPhone/Android check перед release.
- [Косметический change случайно изменит операции или storage] → presentation вызывает только существующие callbacks; перед merge обязательны текущие persistence and failure scenarios.
- [Слишком много accent/теней вернёт prototype-ощущение] → один accent, border-first cards и visual QA по зафиксированным tokens.

## Migration Plan

1. Дождаться завершения и merge `adopt-modular-project-board-architecture`; перед началом подтвердить фактические entry points `src/app/app.tsx` и `features/project-board/presentation`.
2. Добавить tokens и primitive styles, затем заменить catalogue, board, columns, cards и forms без изменения store/domain/infrastructure.
3. Перенести существующие RTL сценарии на menu/dialog interactions, добавить state/accessibility/mobile checks и выполнить production build.
4. Выполнить ручную visual QA на desktop и mobile viewport. Rollback — обычный возврат presentation/CSS bundle; IndexedDB records и URL hashes совместимы, потому что migration отсутствует.

## Open Questions

Нет: exact microcopy и иконки выбираются во время implementation в границах этой системы и не меняют спецификацию.
