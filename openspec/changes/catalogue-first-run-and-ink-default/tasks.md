# Tasks

## 1. Тема Ink по умолчанию

- [ ] 1.1 В `src/styles.css` перенести значения Ink в `:root`, а прежний блок `:root[data-theme="ink"]` заменить на `:root[data-theme="green"]` со значениями Green. Общие токены (фон, поверхности, поле, ошибки) остаются только в `:root`. Проверка: `node --test scripts/theme-contrast.check.mjs` после задачи 1.3.
- [ ] 1.2 Переключить механизм темы:
  - inline-скрипт в `index.html` ставит `data-theme="green"` только при точном значении `green`;
  - `applyTheme` в `src/ui/theme.ts` ставит атрибут для Green и снимает его для Ink;
  - `ThemeProvider` по умолчанию возвращает Ink.

  Обновить `src/ui/theme.test.tsx`: отсутствующее, неизвестное, `Green` в другом регистре и недоступное хранилище дают Ink без атрибута; `green` даёт атрибут; выбор сохраняется. Проверка: `npx vitest --run --repeats=10 src/ui/theme.test.tsx`.
- [ ] 1.3 Обновить `scripts/theme-contrast.check.mjs`: Ink читается из `:root`, Green — как `:root` с переопределением; проверка «переопределяются только токены темы» применяется к блоку Green; список зелёных литералов ищется в блоке Green. Проверка: `node --test scripts/theme-contrast.check.mjs`.
- [ ] 1.4 В `public/manifest.ru.webmanifest` и `public/manifest.en.webmanifest` указать `theme_color` `#2d496d`. Проверка: поиск `0F766E` находит только `public/icons/easytrack-icon.svg` и архив OpenSpec.
- [ ] 1.5 Обновить `e2e/color-theme.spec.ts`:
  - первый запуск и нераспознанное значение дают Ink, в меню отмечена «Чернильная»;
  - сохранённое `green` применяется до первой отрисовки;
  - переключение в обе стороны работает.

  Проверить все e2e, которые предполагают Green по умолчанию. Проверка: `npx playwright test e2e/color-theme.spec.ts e2e/app-bar.spec.ts --repeat-each=5` с уникальным `E2E_PORT`.
- [ ] 1.6 В `DESIGN.md`, раздел «Поверхности и цвет»:
  - «Чернильная» — тема по умолчанию;
  - `:root` содержит Ink, `data-theme="green"` переопределяет;
  - манифест использует акцент Ink.

  Проверка: в `DESIGN.md` нет «Зелёная» (по умолчанию).

## 2. Пустой каталог и быстрое создание

- [ ] 2.1 В `src/i18n/resources.ts`: добавить `firstProjectName` («Первый проект» / «First project»), удалить `firstProjectHelp` и `subtitle` в RU и EN. Проверка: `npx tsc -b` проходит, поиск удалённых ключей ничего не находит.
- [ ] 2.2 В `project-catalogue-view.tsx`:
  - удалить подзаголовок;
  - для пустого каталога вывести блок из design.md (решение 4): заголовок, кнопка `createProject` с `aria-disabled` во время сохранения и защитой `pending` ref, постоянный слот `role="alert"` с `saveError`, когда диалог создания закрыт;
  - общий `save-error` над содержимым показывать только при наличии проектов.

  Кнопка вызывает `onCreate` с `firstProjectName` и `presetStatusNames('simple', t)`. Проверка: unit-тест в задаче 2.5.
- [ ] 2.3 Перенаправить фокус: цель `'create'` и `focusCreation` при пустом каталоге ведут на кнопку блока, иначе — на «+» в app bar (design.md, решение 6). Обновить `src/features/project-board/presentation/project-deletion.test.tsx` и `e2e/project-deletion.spec.ts`, ограничив поиск кнопки областью `main` или `banner`. Проверка: эти файлы проходят с `--repeats=10` и `--repeat-each=5`.
- [ ] 2.4 В `src/styles.css` добавить стили блока из design.md (решение 4) и удалить `.page-subtitle` и `.catalogue-subtitle`, оставив `.muted-copy`. Проверка: поиск `page-subtitle` и `catalogue-subtitle` в `src` ничего не находит.
- [ ] 2.5 Unit-тесты быстрого создания по сценариям «Quick first-project creation in an empty catalogue»:
  - RU и EN название и статусы;
  - одно создание при двойном нажатии;
  - при ошибке проекта нет, сообщение в слоте, фокус на кнопке и она снова активна;
  - в каталоге с проектами кнопки нет;
  - фразы нет.

  Проверка: `npx vitest --run --repeats=10 <новый файл>`.
- [ ] 2.6 E2E `e2e/catalogue-first-run.spec.ts`. На каждом эталонном размере из `e2e/viewports.ts` в RU и EN проверить сценарии «Empty catalogue presentation»:
  - горизонтальный центр блока;
  - доля отступа 35–45 % при 1440×900 и 1280×800;
  - отступ сверху меньше нижнего и не меньше 24 px при 820×1180 и 390×844;
  - заголовок и кнопка видны без прокрутки при 568×320 и 320×568, кнопка во всю ширину на телефоне;
  - при ошибке позиция кнопки не меняется.

  Отдельно: нажатие создаёт «Первый проект» с тремя статусами и открывает доску, после перезагрузки она остаётся. Обновить существующие e2e, которые ищут «Создать проект» или фразу без области (`e2e/calm-board.spec.ts`, хелперы создания проекта). Проверка: `npx playwright test e2e/catalogue-first-run.spec.ts <изменённые файлы> --repeat-each=5` с уникальным `E2E_PORT`.
- [ ] 2.7 Документация:
  - `DESIGN.md`: раздел «Каталог» (блок первого запуска, ширина, ритм 24/12, отступы в `svh`, привязка к верху, рамка неактивной кнопки только в блоке, сетка сразу под app bar без подзаголовка); исправить размер h1 на телефоне на 20 px (17 px до 22.5rem);
  - `PRODUCT.md`, «Current Capabilities»: быстрое создание первого проекта и тема Ink по умолчанию; в «Brand Commitments» оставить историческую запись.

  Проверка: тексты соответствуют spec delta.

## 3. Итоговая проверка

- [ ] 3.1 Запустить `openspec validate catalogue-first-run-and-ink-default --strict` и `npm run check` с уникальным `E2E_PORT`. Обе команды проходят.
- [ ] 3.2 Выборочный визуальный просмотр по `docs/agents/rules/visual-review.md`:
  - пустой каталог при 1440×900, 820×1180, 390×844 и 568×320 в Ink (RU) и при 390×844 в Green (EN);
  - состояние ошибки при 390×844;
  - каталог с проектами при 1440×900.

  В отчёте перечислить просмотренное, результат и ограничения.
