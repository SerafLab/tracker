# Design

## Context

См. proposal.md — Why. Требования — в `specs/project-boards/spec.md` и `specs/color-theme/spec.md`.

Текущее состояние:
- `ProjectCatalogueView` всегда выводит подзаголовок и общий `save-error`. Пустое состояние — `section.empty-state.surface-card` с заголовком и абзацем; класс `empty-state` также используется на пустой доске.
- Создание проекта: `onCreate(input) → Promise<boolean>`, внутри `store.createProject`. Создание атомарно, при ошибке выставляется `saveError` в store, после успеха открывается доска (`project-board-app.tsx`, `onCreate`). Диалог защищается от повторной отправки через `pending` ref.
- Фокус после удаления проекта: в каталоге `focusTarget = 'create'` при пустом списке; после удаления с доски — `focusCatalogueCreation`. В обоих случаях фокус получает `createTrigger` («+» в app bar).
- Тема: `:root` содержит Green, `:root[data-theme="ink"]` переопределяет токены темы. Inline-скрипт в `index.html` ставит `ink` только при точном сохранённом значении `ink`. `ThemeProvider` читает атрибут, `applyTheme` ставит или снимает его. `scripts/theme-contrast.check.mjs` разбирает оба блока CSS.
- Эталонные размеры экрана заданы в `e2e/viewports.ts`.

Макет блока утвердил пользователь вместе с дизайнером. Итоговый файл: `/private/tmp/claude-501/-Users-oleglebedev-Documents-ChatGPT-traker/da5dda37-6f86-49ce-a50b-52275fe2ab98/scratchpad/catalogue-design-spec.md`. Значения из него перенесены ниже, чтобы изменение не зависело от временного файла.

## Goals / Non-Goals

**Goals:**
- Блок первого запуска по утверждённому макету, без новых токенов и брейкпоинтов.
- Быстрое создание через тот же путь `onCreate`, что и у диалога: атомарность, навигация и обработка ошибки не дублируются.
- Тема по умолчанию задаётся самим CSS, без отдельной ветки «нет значения» в скриптах.

**Non-Goals:**
- Новое действие в store или use case: быстрое создание — это обычное создание с заранее заданными входными данными.
- Общая рамка для всех неактивных кнопок.
- Миграция сохранённых настроек.

## Decisions

### 1. Быстрое создание переиспользует `onCreate`

Кнопка вызывает `onCreate({ name: t('firstProjectName'), initialStatusNames: presetStatusNames('simple', t) })`. Повторное нажатие блокирует `pending` ref, как в `ProjectCreateDialog`.

- Атомарность, переход на доску и `createdProjectId` для фокуса на доске уже реализованы в этом пути.
- Отвергнуто: отдельный метод store `createFirstProject`. Он повторил бы существующую логику без новой гарантии.

### 2. Ошибку в блоке показывает существующий `saveError` store

Слот `role="alert"` всегда присутствует в DOM под кнопкой. Сообщение `saveError` выводится в нём, когда каталог пуст и диалог создания закрыт. Общий `save-error` над содержимым в пустом каталоге не выводится.

- Остаётся один источник состояния ошибки.
- Постоянный live-region надёжно объявляет сообщение.
- Ошибка при создании через «+» по-прежнему показывается в диалоге.

### 3. Во время сохранения кнопка — `aria-disabled`, а не `disabled`

Chromium снимает фокус с элемента, который получил `disabled`. Тогда после ошибки фокус не вернулся бы на кнопку, а спецификация требует, чтобы он остался.

- Во время сохранения кнопка получает `aria-disabled="true"`, нажатие игнорируется по `pending` ref, блок получает `aria-busy`.
- Вид кнопки задаёт селектор `[aria-disabled="true"]`: фон canvas, текст `--text-disabled`, рамка `--border-strong`. Рамка нужна только в этом блоке: неактивная кнопка без неё на фоне почти не видна (1.09:1).
- Отвергнуто: `disabled` с последующим `focus()` после ошибки. Фокус мигает, а программный перевод фокуса может вызвать лишнее объявление.

### 4. Разметка и стили блока

```tsx
<main className="app-shell catalogue-first-run">
  <section className="catalogue-first-run-block" aria-labelledby={headingId} aria-busy={saving}>
    <h2 id={headingId}>{t('firstProject')}</h2>
    <button ref={quickCreate} className="button button-primary" aria-disabled={saving || undefined}>{t('createProject')}</button>
    <div className="catalogue-first-run-alert" role="alert">{saveError && !creating ? <p className="save-error">{t('saveError')}</p> : null}</div>
  </section>
</main>
```

```css
/* First run is top-anchored: the alert below the button never moves the block. */
.app-shell.catalogue-first-run { --shell-top: clamp(1.5rem, 48svh - 8.75rem, 20rem); }
.catalogue-first-run-block { max-width: 26rem; margin-inline: auto; text-align: center; }
.catalogue-first-run-block h2 { margin: 0; font-size: 1.5rem; line-height: 2rem; font-weight: 600; letter-spacing: -.02em; text-wrap: balance; }
.catalogue-first-run-block .button { margin-top: 1.5rem; min-height: 3rem; padding-inline: 1.5rem; font-size: .9375rem; }
.catalogue-first-run-block .button[aria-disabled="true"] { background: var(--canvas); color: var(--text-disabled); border-color: var(--border-strong); cursor: default; }
.catalogue-first-run-alert { margin-top: .75rem; text-align: start; }
.catalogue-first-run-alert .save-error { margin: 0; }
@media (max-width: 40.625rem) {
  .app-shell.catalogue-first-run { --shell-top: clamp(1.5rem, 30svh - 3rem, 10rem); }
  .catalogue-first-run-block h2 { font-size: 1.125rem; line-height: 1.625rem; }
  .catalogue-first-run-block .button { width: 100%; }
}
```

- Блок привязан к верху через `--shell-top`, поэтому появление ошибки ничего не сдвигает. Отвергнуто центрирование по содержимому (flex по высоте): оно сдвигает блок вверх, когда появляется ошибка.
- `svh`, а не `dvh`: отступ не прыгает при появлении и скрытии панели браузера на телефоне.
- Расчётные отступы сверху:

| Размер | Отступ |
|---|---|
| 1440×900 | 292 px (≈40 % свободной высоты) |
| 1280×800 | 244 px (≈38 %) |
| 820×1180 | 320 px (потолок 20rem) |
| 390×844 | 160 px (потолок 10rem) |
| 568×320 | 48 px |
| 320×568 | 122 px |

- Ширина 568 px меньше брейкпоинта 40.625rem, поэтому там действует мобильная формула.
- Пустая доска продолжает использовать `.empty-state` без изменений.
- `.page-subtitle` и `.catalogue-subtitle` удаляются, `.muted-copy` остаётся.

### 5. Одинаковое имя у «+» и кнопки блока

Обе кнопки называются «Создать проект» (ключ `createProject`). Так выбрал пользователь.

- «+» находится в app bar (`banner`), кнопка блока — в `main`. Тесты различают их по области.
- Отвергнуто: другое доступное имя у кнопки блока, например «Создать проект «Первый проект»». Видимая подпись решена пользователем. Расширенное имя заметно для скринридеров и может звучать странно, а пользу от него не проверить без пользователей.

### 6. Фокус на кнопку блока

Цель `'create'` в каталоге и флаг `focusCreation` разрешаются так: при пустом каталоге — кнопка блока, иначе — `createTrigger` в app bar. Новых состояний не нужно: решение принимается в одном месте, в эффекте фокуса `ProjectCatalogueView`.

### 7. Ink по умолчанию через CSS

- `:root` получает значения Ink. Прежний блок `:root[data-theme="ink"]` становится `:root[data-theme="green"]` со значениями Green.
- Inline-скрипт ставит `data-theme="green"` только при точном значении `green`. `applyTheme('green')` ставит атрибут, `applyTheme('ink')` снимает его. `ThemeProvider` читает `dataset.theme === 'green' ? 'green' : 'ink'`.
- При любой ошибке чтения хранилища или нераспознанном значении атрибута нет, и действует Ink. Значение по умолчанию задаётся в одном месте, в `:root`.
- `scripts/theme-contrast.check.mjs`: Ink читается из `:root`, Green — как `:root` плюс переопределение. Проверка «переопределяются только токены темы» применяется к блоку Green.
- Отвергнуто: оставить Green в `:root` и ставить `ink` в скрипте при отсутствии значения. Тогда значение по умолчанию оказалось бы в трёх местах, а при сбое скрипта появлялась бы тема Green.

### 8. Манифест

`theme_color` в обоих манифестах становится `#2d496d`. `background_color` остаётся `#F7F8F7`: это фон заставки, к теме он не относится.

## Risks / Trade-offs

- [Пользователи, которые не выбирали тему, после обновления увидят Ink] → Это решение пользователя. Сохранённый выбор «Зелёная» не меняется.
- [Тесты ищут кнопку «Создать проект» без указания области и в пустом каталоге получат две кнопки] → В e2e и unit-тестах ограничить поиск областью `banner` или `main`.
- [Установленная PWA с `theme_color` из старого манифеста] → Браузер обновит манифест при следующей проверке. Влияние только косметическое.
- [Макеты дизайнера не отрисовывались] → В задачах предусмотрен выборочный визуальный просмотр на эталонных размерах в Ink и Green.
- [`48svh − 8.75rem` рассчитан на высоту блока 104 px] → Сценарии спецификации проверяют диапазон 35–45 %, а не точные пиксели.

## Migration Plan

Миграции данных нет. Откат — revert PR: сохранённые значения `green` и `ink` остаются валидными в обеих версиях.
