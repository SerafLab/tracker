# project-boards Specification

## Purpose

Позволяет вести несколько личных проектов как локально сохраняемые доски со статусами и карточками, чтобы пользователь видел этапы своих объектов и мог к ним вернуться.

## Requirements

### Requirement: Project catalogue and board navigation
The system SHALL present a distinct project catalogue and one open project board at a time. It SHALL let the user view locally stored projects, create a project with a non-empty name through a primary creation control, rename an existing project, and open a project. Duplicate project names SHALL be permitted. Creating a project SHALL open its board, and the board SHALL provide a clear control to return to the catalogue.

#### Scenario: User creates and opens projects
- **WHEN** the user creates projects named "Поиск квартиры" and "Паспорт" and chooses one from the catalogue
- **THEN** the selected project's board is displayed without the other project's statuses or cards

#### Scenario: User submits an empty project name
- **WHEN** the user tries to create or rename a project with a name containing only whitespace
- **THEN** the project is not created or renamed and the interface indicates that a name is required

#### Scenario: User starts creating a project from a populated catalogue
- **WHEN** the user activates the catalogue's primary project-creation control
- **THEN** the interface exposes a focused form for the name without obscuring the creation action's purpose

### Requirement: Configurable ordered statuses
The system SHALL allow the user to create and rename statuses within the open project and change a status's position with explicit accessible controls. A newly created status SHALL be appended after the project's existing statuses. Duplicate status names SHALL be permitted. Secondary status operations MAY be progressively disclosed, provided their purpose remains reachable through semantic controls.

#### Scenario: User configures a new board
- **WHEN** a user opens a project that has no statuses
- **THEN** the board explains that a status must be created and provides a control to create one

#### Scenario: User reorders a status
- **WHEN** the user moves a status left or right using its explicit ordering control
- **THEN** the board shows the statuses in the resulting order

#### Scenario: User opens a status action menu
- **WHEN** the user activates a status's secondary-action control
- **THEN** the available rename and ordering actions are identifiable and operable without drag-and-drop

### Requirement: Cards always belong to a status
Система SHALL позволять создавать карточку с непустым названием в выбранном статусе, редактировать её название и признаки и перемещать в любой соседний статус всегда видимыми доступными кнопками-стрелками одним действием без подтверждения. Система SHALL также предоставлять вторичное действие выбора любого другого статуса. Каждая карточка SHALL принадлежать ровно одному статусу. Новая или перенесённая из другого статуса карточка SHALL помещаться после существующих карточек той же комбинации признаков в целевом статусе с соблюдением приоритетного порядка групп. Перенос SHALL сохранять оба признака. Вторичные действия карточки могут быть скрыты в меню, но SHALL сохранять семантические подписи.

#### Scenario: User moves a card between statuses
- **WHEN** пользователь переносит карточку из «Найдено» в «Договорились о просмотре»
- **THEN** карточка исчезает из «Найдено» и появляется в конце своей группы в «Договорились о просмотре» с прежними признаками

#### Scenario: User moves a card to an adjacent status
- **WHEN** пользователь активирует доступную левую или правую стрелку карточки
- **THEN** карточка сразу перемещается в соседний статус соответствующего направления, появляется после существующих карточек своей группы с прежними признаками и сохраняется без подтверждения

#### Scenario: User reaches a board boundary
- **WHEN** карточка находится в первом или последнем статусе
- **THEN** стрелка в сторону отсутствующего соседнего статуса остаётся видимой, обозначена как недоступная и не может быть активирована

#### Scenario: Project has one status
- **WHEN** карточка находится в единственном статусе доски
- **THEN** обе стрелки перемещения недоступны, а действие выбора другого статуса отсутствует

#### Scenario: Project has no statuses
- **WHEN** в открытом проекте нет статусов
- **THEN** интерфейс не предлагает создание карточки до создания статуса

#### Scenario: User opens a card action menu
- **WHEN** пользователь открывает меню вторичных действий карточки на доске с несколькими статусами
- **THEN** доступны действия редактирования названия и признаков и «Переместить в…», а форма перемещения обозначает выбранную карточку и предлагает все другие статусы, кроме текущего

#### Scenario: User chooses a nonadjacent status
- **WHEN** пользователь выбирает несоседний статус в форме перемещения и подтверждает
- **THEN** карточка перемещается напрямую в выбранный статус и появляется после его существующих карточек той же группы, сохраняя оба признака

#### Scenario: Card move cannot be saved
- **WHEN** сохранить перенос карточки не удаётся
- **THEN** карточка остаётся в исходном статусе на прежнем месте с прежними признаками, а интерфейс сообщает об ошибке

### Requirement: Persistent local board state
Система SHALL сохранять проекты, статусы, карточки, их названия, связи, оба признака карточек и явный порядок в локальном хранилище браузера между перезагрузками. При обновлении существующих данных система SHALL назначать старым карточкам оба выключенных признака и сохранять их прежний относительный порядок внутри статуса. После перезагрузки система SHALL открывать последний открытый проект, если он существует, иначе каталог проектов или его пустое состояние.

#### Scenario: User returns after reloading
- **WHEN** пользователь создаёт проекты и статусы, создаёт или переносит карточки, меняет их признаки и перезагружает приложение
- **THEN** данные, признаки, порядок групп и порядок внутри групп сохраняются, а доска последнего открытого проекта отображается снова

#### Scenario: Existing cards receive default flags
- **WHEN** пользователь впервые открывает обновлённое приложение с ранее сохранёнными карточками без признаков важности и срочности
- **THEN** каждая существующая карточка получает оба выключенных признака, а проекты, названия, связи и прежний порядок карточек внутри каждого статуса сохраняются

### Requirement: Accessible, mobile-usable board controls
The system SHALL expose primary project, status, and card operations through semantic controls usable without drag-and-drop. Card move arrows SHALL remain visible and usable by touch and keyboard on narrow screens. After a keyboard-initiated card move succeeds, focus SHALL return to a control on the moved card without an additional programmatic scroll of the board. The system SHALL provide compact contextual forms in a dialog on wider screens and a mobile-appropriate sheet or equivalent focus-managed surface on narrow screens. On a narrow viewport, all status columns and their primary controls SHALL remain reachable, including through horizontal scrolling when necessary.

#### Scenario: User works on a narrow viewport
- **WHEN** the board is displayed in a narrow mobile viewport with several statuses
- **THEN** the user can reach each status and create, rename, reorder, or move items through visible controls

#### Scenario: User edits from a narrow viewport
- **WHEN** the user starts a create, rename, or move action on a narrow viewport
- **THEN** its form is readable, receives focus, and can be completed or dismissed without losing access to the board

#### Scenario: Keyboard user moves a card
- **WHEN** a keyboard user activates an available card move control and the move succeeds
- **THEN** focus remains on an operable control of that card in its new status

#### Scenario: User moves a card on a narrow viewport
- **WHEN** a user activates an available card arrow on a narrow viewport
- **THEN** the card moves to the adjacent status without requiring a menu or form

### Requirement: Clear workspace interface states
The system SHALL distinguish loading, empty, error, and inactive controls with accessible text and visually distinct presentation. It SHALL not infer that a card is completed from a status name or assign completion semantics to a status.

#### Scenario: User opens an empty catalogue
- **WHEN** local storage opens successfully and contains no projects
- **THEN** the catalogue explains that no projects exist and provides an immediately understandable way to create the first project

#### Scenario: Project has no statuses
- **WHEN** the user opens a project without statuses
- **THEN** the board explains that a status is required before cards can be created and provides a control to add one

#### Scenario: An action is unavailable
- **WHEN** a status is already first or last in the order
- **THEN** its unavailable ordering action is visibly inactive and cannot be invoked

#### Scenario: User names a status "Завершено"
- **WHEN** a user creates or renames a status to "Завершено"
- **THEN** the system continues to treat it as a user-defined status without adding a completed field or automatic completion behavior to its cards

### Requirement: Local-storage failure is explicit
Система SHALL явно показывать ошибку локального хранилища и не сообщать об успешном сохранении мутации, которую не удалось записать. Название, признаки и связанный с ними порядок карточки SHALL сохраняться как одно целое: при отказе записи подтверждённые данные и порядок остаются прежними.

#### Scenario: Browser storage is unavailable
- **WHEN** приложение не может открыть локальное хранилище или записать в него данные
- **THEN** интерфейс сообщает о недоступности рабочей доски вместо представления несохранённых данных как постоянных

#### Scenario: Card editing cannot be saved
- **WHEN** пользователь сохраняет новое название и признаки карточки, но запись завершается ошибкой
- **THEN** доска сохраняет прежние название, метки и порядок карточек, форма остаётся открытой с введёнными значениями и сообщением об ошибке для повторной попытки

#### Scenario: Card creation cannot be saved
- **WHEN** пользователь создаёт карточку с выбранными признаками, но запись завершается ошибкой
- **THEN** карточка не появляется на доске, порядок существующих карточек не меняется, а форма сохраняет введённые значения и показывает ошибку

#### Scenario: Existing data migration fails
- **WHEN** приложение не может завершить обновление локальных данных карточек
- **THEN** обновление не оставляет частично изменённые карточки и интерфейс показывает ошибку открытия хранилища

### Requirement: Predictable dismissal of action menus
The system SHALL dismiss an open project, status, or card action menu when the user presses outside that menu with a mouse or touch, or moves keyboard focus outside it. The outside target SHALL retain its normal action and focus. Escape SHALL dismiss the menu and return focus to its trigger.

#### Scenario: User presses outside an action menu
- **WHEN** a project, status, or card action menu is open and the user clicks or taps outside its trigger and menu panel
- **THEN** that menu closes and the outside target performs its normal action without moving focus back to the menu trigger

#### Scenario: User switches between action menus
- **WHEN** an action menu is open and the user presses the trigger of another action menu
- **THEN** the first menu closes and the second opens with that single press

#### Scenario: Keyboard focus leaves an action menu
- **WHEN** an action menu is open and the user presses Tab to move focus beyond its trigger and menu panel
- **THEN** the menu closes and focus remains on the next focusable element

#### Scenario: User dismisses an action menu with Escape
- **WHEN** an action menu is open and the user presses Escape
- **THEN** the menu closes and focus returns to its trigger

#### Scenario: User interacts within an action menu
- **WHEN** an action menu is open and the user presses its trigger or an enabled action item
- **THEN** the trigger toggles that menu or the item invokes its action, respectively

### Requirement: Manual card importance and urgency
Система SHALL хранить у каждой карточки два независимых булевых признака: «Важная» и «Срочная». Оба признака новой карточки SHALL быть выключены по умолчанию. Система SHALL менять их только по явному выбору пользователя, без вывода из названия карточки, названия статуса, времени или других данных.

#### Scenario: User creates a card with default flags
- **WHEN** пользователь создаёт карточку, не меняя переключатели признаков
- **THEN** карточка сохраняется с обоими выключенными признаками

#### Scenario: User chooses any combination
- **WHEN** пользователь сохраняет карточку с обоими включёнными признаками, только важностью, только срочностью или обоими выключенными признаками
- **THEN** система сохраняет выбранную комбинацию, не изменяя один признак вследствие выбора другого

#### Scenario: Status names do not change flags
- **WHEN** пользователь переносит карточку в статус «Срочно» или «Завершено», переименовывает карточку или статус либо возвращается к доске позже
- **THEN** значения обоих признаков остаются прежними без явного изменения пользователем

### Requirement: Unified card creation and editing form
Система SHALL предоставлять при создании и редактировании карточки одну форму с обязательным названием и двумя подписанными переключателями признаков. Редактирование SHALL начинаться с сохранённых значений и сохранять все три поля одним действием. Форма SHALL быть доступна с клавиатуры и на узком экране; её подписи, ошибки и действия SHALL соответствовать выбранному русскому или английскому языку.

#### Scenario: User opens card creation
- **WHEN** пользователь открывает создание карточки в выбранном статусе
- **THEN** форма содержит пустое название и выключенные переключатели «Важная» и «Срочная»

#### Scenario: User edits name and flags together
- **WHEN** пользователь открывает редактирование из меню карточки, меняет название и оба признака и сохраняет
- **THEN** форма первоначально показывает сохранённые значения, а успешное сохранение применяет новое название и признаки вместе

#### Scenario: User submits an empty card name
- **WHEN** пользователь отправляет форму создания или редактирования с названием только из пробелов
- **THEN** система показывает ошибку обязательного названия и не сохраняет ни название, ни признаки, ни изменение порядка

#### Scenario: User cancels card editing
- **WHEN** пользователь меняет поля формы и закрывает её без сохранения
- **THEN** название, признаки и порядок карточки остаются прежними

#### Scenario: User edits on a narrow screen with a keyboard
- **WHEN** пользователь открывает форму карточки на узком экране и работает с клавиатуры
- **THEN** название и оба подписанных переключателя читаемы, доступны с клавиатуры, форма получает фокус и после закрытия возвращает его к действию вызвавшей карточки или создания

#### Scenario: User uses the English interface
- **WHEN** пользователь открывает форму карточки при выбранном английском языке
- **THEN** подписи признаков показаны как «Important» и «Urgent», остальные подписи и сообщения формы тоже на английском, а пользовательское название не переводится

### Requirement: Enabled card flags are visible
Система SHALL показывать на карточке отдельную текстовую метку каждого включённого признака на выбранном языке. Выключенный признак SHALL не создавать метку; карточка с обоими выключенными признаками SHALL отображаться без меток важности и срочности. Значение меток SHALL быть понятно без различения цветов.

#### Scenario: Card displays its enabled flags
- **WHEN** на доске показаны карточки с четырьмя возможными комбинациями признаков
- **THEN** они соответственно показывают две метки, только «Важная», только «Срочная» или ни одной метки

#### Scenario: User changes the interface language
- **WHEN** пользователь меняет язык интерфейса с русского на английский или обратно
- **THEN** видимые метки меняют язык без изменения сохранённых признаков, названий и порядка карточек

### Requirement: Stable card priority order in every status
Система SHALL упорядочивать карточки каждого статуса по важности по убыванию, затем по срочности по убыванию: оба признака; только важная; только срочная; без признаков. Внутри группы SHALL сохраняться относительный порядок. Создание, перенос из другого статуса и реальное изменение признаков SHALL помещать карточку в конец её группы. Сохранение без изменения признаков SHALL не менять её место.

#### Scenario: All four priority groups are present
- **WHEN** статус содержит карточки всех четырёх комбинаций признаков
- **THEN** карточки с обоими признаками идут первыми, затем только важные, затем только срочные, затем без признаков; этот порядок применяется к каждому статусу независимо от его названия и позиции

#### Scenario: User adds a card to a populated group
- **WHEN** пользователь создаёт карточку в статусе, где уже есть карточки её группы и групп ниже по приоритету
- **THEN** новая карточка появляется после всех карточек своей группы и перед группами ниже по приоритету, не меняя относительный порядок существующих карточек

#### Scenario: User changes flags into an existing group
- **WHEN** пользователь сохраняет фактическое изменение одного или обоих признаков карточки
- **THEN** сразу после успешного сохранения карточка появляется в конце группы новой комбинации, а остальные карточки сохраняют относительный порядок

#### Scenario: User changes flags into an empty group
- **WHEN** пользователь сохраняет признаки, комбинация которых ещё не представлена в статусе
- **THEN** карточка занимает место между группами выше и ниже по приоритету, не меняя относительный порядок остальных карточек

#### Scenario: User changes flags back later
- **WHEN** пользователь сохраняет другую комбинацию признаков, а затем отдельным сохранением возвращает предыдущую
- **THEN** карточка оказывается в конце восстановленной группы, а не на своём прежнем месте внутри неё

#### Scenario: User only renames or saves unchanged flags
- **WHEN** пользователь меняет только название либо сохраняет прежние значения признаков, в том числе после переключения и возврата к исходным значениям до сохранения
- **THEN** карточка остаётся на прежнем месте внутри своей группы

#### Scenario: User moves a card back into a status
- **WHEN** пользователь переносит карточку из другого статуса, в том числе возвращает её в статус, где она находилась раньше
- **THEN** карточка сохраняет признаки и становится последней в соответствующей группе целевого статуса; оставшиеся карточки обоих статусов сохраняют относительный порядок
