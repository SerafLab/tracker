# project-boards Specification

## Purpose

Позволяет вести несколько личных проектов как локально сохраняемые доски со статусами и карточками, чтобы пользователь видел этапы своих объектов и мог к ним вернуться.

## Requirements

### Requirement: Project catalogue and board navigation
The system SHALL present a distinct project catalogue and one open project board at a time. It SHALL let the user view locally stored projects in an adaptive tile grid, create a project with a non-empty name through a primary creation control, rename an existing project, and open a project. Each project tile SHALL show the project name and the total number of its cards across all statuses. Duplicate project names SHALL be permitted. Creating a project SHALL initialize its statuses from the selected status set and open its board, and the board SHALL provide a clear control to return to the catalogue.

#### Scenario: User creates and opens projects
- **WHEN** the user creates projects named "Поиск квартиры" and "Паспорт" and chooses one from the catalogue
- **THEN** the selected project's board is displayed without the other project's statuses or cards

#### Scenario: User submits an empty project name
- **WHEN** the user tries to create or rename a project with a name containing only whitespace
- **THEN** the project is not created or renamed and the interface indicates that a name is required

#### Scenario: User starts creating a project from a populated catalogue
- **WHEN** the user activates the catalogue's primary project-creation control
- **THEN** the interface exposes a focused form for the name and status-set selection without obscuring the creation action's purpose

#### Scenario: User views projects in the catalogue
- **WHEN** the catalogue contains one or more projects
- **THEN** each project appears as a tile in an adaptive grid, with its name, its total card count across all statuses, and its rename action available

#### Scenario: User views a project with no cards
- **WHEN** a project has no cards in any of its statuses
- **THEN** its tile shows a localized count of zero cards

#### Scenario: User views the catalogue on a narrow screen
- **WHEN** the catalogue is displayed on a narrow viewport
- **THEN** project tiles remain readable and operable without horizontal page overflow

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
Система SHALL позволять создавать карточку с непустым названием в выбранном статусе, редактировать её в подробностях карточки (панели или полной странице) и переносить в любой другой статус перетаскиванием либо через «Переместить в…» в меню. Каждая карточка SHALL принадлежать ровно одному статусу. Новая карточка и перенос через меню SHALL помещаться в конец группы одинаковых признаков; перетаскивание SHALL выбирать место внутри этой группы с сохранением приоритетного порядка групп. Перенос SHALL сохранять название, описание, оба признака и заметки. Стрелки перемещения SHALL отсутствовать; вторичные действия SHALL сохранять семантические подписи.

#### Scenario: User moves a card between statuses
- **WHEN** пользователь переносит карточку из «Найдено» в «Договорились о просмотре»
- **THEN** карточка исчезает из «Найдено» и появляется в выбранном месте своей группы при перетаскивании либо в конце группы при переносе через меню, сохраняя содержимое, признаки и заметки

#### Scenario: User moves a card to an adjacent status
- **WHEN** пользователь перетаскивает карточку в соседний статус и отпускает в допустимом месте
- **THEN** карточка перемещается в показанное место своей группы и сохраняется без дополнительного подтверждения

#### Scenario: User reaches a board boundary
- **WHEN** карточка находится в первом или последнем статусе
- **THEN** отсутствующих соседних статусов нет среди целей переноса, стрелки не показываются, а меню остаётся доступным

#### Scenario: Project has one status
- **WHEN** карточка находится в единственном статусе доски
- **THEN** «Переместить в…» отсутствует, но перестановка внутри группы остаётся доступна при наличии других карточек той же группы

#### Scenario: Project has no statuses
- **WHEN** в открытом проекте нет статусов
- **THEN** интерфейс не предлагает создание карточки до создания статуса

#### Scenario: User opens a card action menu
- **WHEN** пользователь открывает меню карточки на доске с несколькими статусами
- **THEN** доступны редактирование в подробностях карточки, удаление, «Переместить в…» и возможные шаги внутри группы; форма перемещения обозначает выбранную карточку и предлагает все другие статусы, кроме текущего

#### Scenario: User chooses a nonadjacent status
- **WHEN** пользователь выбирает несоседний статус в форме перемещения и подтверждает
- **THEN** карточка перемещается напрямую в конец своей группы выбранного статуса, сохраняя содержимое, оба признака и заметки

#### Scenario: Card move cannot be saved
- **WHEN** сохранить перенос карточки не удаётся
- **THEN** карточка остаётся в исходном статусе на прежнем месте с прежними содержимым, признаками и заметками, а интерфейс сообщает об ошибке

### Requirement: Persistent local board state
Система SHALL сохранять проекты, статусы, карточки, их названия, связи, описание, оба признака карточек, заметки с датами и явный порядок в локальном хранилище браузера между перезагрузками. При обновлении существующих данных система SHALL назначать оба выключенных признака только карточкам, у которых эти поля отсутствуют, сохраняя имеющиеся значения признаков и прежний относительный порядок внутри статуса. После перезагрузки система SHALL открывать карточку при её корректном адресе, иначе последний открытый проект, если он существует, либо каталог проектов или его пустое состояние.

#### Scenario: User returns after reloading
- **WHEN** пользователь создаёт проекты и статусы, создаёт или переносит карточки, меняет их признаки и перезагружает приложение с адресом доски
- **THEN** данные, признаки, порядок групп и порядок внутри групп сохраняются, а доска последнего открытого проекта отображается снова

#### Scenario: Existing cards receive default flags
- **WHEN** пользователь впервые открывает обновлённое приложение с ранее сохранёнными карточками без признаков важности и срочности
- **THEN** каждая существующая карточка получает оба выключенных признака, а проекты, названия, связи и прежний порядок карточек внутри каждого статуса сохраняются

#### Scenario: Existing cards receive empty descriptions
- **WHEN** пользователь открывает обновлённое приложение с сохранёнными карточками без описания и заметок
- **THEN** каждой карточке назначается пустое описание и пустая история, сохраняя проекты, связи, имена, имеющиеся признаки и порядок

### Requirement: Accessible, mobile-usable board controls
Система SHALL предоставлять основные действия проектов, статусов и карточек через семантические контролы без необходимости перетаскивания. Постоянно видимое верхнее меню карточки SHALL предоставлять перенос в другой статус и возможные шаги перестановки внутри группы. После клавиатурного переноса или перестановки фокус SHALL возвращаться к меню той же карточки без дополнительной программной прокрутки. Формы создания, переименования и переноса SHALL открываться в компактном диалоге на широком экране и подходящей мобильной поверхности с управлением фокусом на узком; редактирование карточки SHALL использовать её доступную панель или полную страницу. Все статусы и основные контролы SHALL оставаться достижимыми на узком экране, включая горизонтальную прокрутку доски.

#### Scenario: User works on a narrow viewport
- **WHEN** доска с несколькими статусами показана на узком экране
- **THEN** пользователь может достичь каждого статуса и создавать, переименовывать, переставлять и перемещать объекты через видимые контролы

#### Scenario: User edits from a narrow viewport
- **WHEN** пользователь начинает создание, переименование или перенос на узком экране
- **THEN** форма читаема, получает фокус и позволяет завершить либо отменить действие без потери доступа к доске

#### Scenario: Keyboard user moves a card
- **WHEN** пользователь с клавиатуры подтверждает «Переместить в…» и перенос успешно сохраняется
- **THEN** фокус оказывается на доступном меню той же карточки в новом статусе без дополнительной программной прокрутки

#### Scenario: User moves a card on a narrow viewport
- **WHEN** пользователь открывает верхнее меню карточки на узком экране и подтверждает выбранный другой статус
- **THEN** карточка перемещается в конец своей группы без необходимости перетаскивания или наличия стрелок

#### Scenario: User opens card editing on mobile
- **WHEN** пользователь выбирает редактирование карточки на узком экране
- **THEN** подробности карточки открываются на весь экран вместо диалога, а возврат на доску сохраняет доступ к карточкам

#### Scenario: User reorders cards through the menu
- **WHEN** пользователь выбирает «Поднять выше» или «Опустить ниже» в меню карточки
- **THEN** карточка меняется местами с непосредственным соседом той же группы в выбранном направлении, фокус возвращается на её меню, а страница карточки не открывается

#### Scenario: No adjacent peer exists
- **WHEN** карточка первая, последняя или единственная в своей группе
- **THEN** меню содержит только возможные направления перестановки и не предлагает шаг в соседнюю группу

#### Scenario: User works in English
- **WHEN** выбран английский язык интерфейса
- **THEN** меню, инструкции переноса, сообщения об ошибках и объявления результата представлены на английском; пользовательские названия, признаки и порядок не меняются

### Requirement: Clear workspace interface states
The system SHALL distinguish loading, empty, error, and inactive controls with accessible text and visually distinct presentation. It SHALL not infer that a card is completed from a status name or assign completion semantics to a status.

#### Scenario: User opens an empty catalogue
- **WHEN** local storage opens successfully and contains no projects
- **THEN** the catalogue invites the user to start with the first project and offers a button that creates it in one action

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
Система SHALL явно показывать ошибку локального хранилища и не сообщать об успешном сохранении мутации, которую не удалось записать. Название, описание, признаки и связанный с ними порядок карточки SHALL сохраняться как одно целое: при отказе записи подтверждённые данные и порядок остаются прежними.

#### Scenario: Browser storage is unavailable
- **WHEN** приложение не может открыть локальное хранилище или записать в него данные
- **THEN** интерфейс сообщает о недоступности рабочей доски вместо представления несохранённых данных как постоянных

#### Scenario: Card editing cannot be saved
- **WHEN** пользователь сохраняет новое название, описание и признаки карточки, но запись завершается ошибкой
- **THEN** доска сохраняет прежние название, описание, метки и порядок карточек, редактор остаётся открытым с введёнными значениями и сообщением об ошибке для повторной попытки

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
Система SHALL создавать карточку через компактную форму с обязательным названием и двумя подписанными переключателями признаков, назначая пустое описание. Редактирование SHALL открывать подробности карточки с сохранёнными названием, описанием и признаками и сохранять четыре поля одним действием без закрытия панели или страницы. Обе формы SHALL быть доступны с клавиатуры и на узком экране, с подписями, ошибками и действиями на выбранном русском или английском языке.

#### Scenario: User opens card creation
- **WHEN** пользователь открывает создание карточки в выбранном статусе
- **THEN** форма содержит пустое название и выключенные переключатели «Важная» и «Срочная», а создаваемое описание пусто

#### Scenario: User edits name and flags together
- **WHEN** пользователь открывает редактирование из меню карточки, меняет название и оба признака и сохраняет
- **THEN** панель или полная страница первоначально показывает сохранённые значения, а успешное сохранение применяет название, описание и признаки вместе, оставляя подробности открытыми

#### Scenario: User submits an empty card name
- **WHEN** пользователь отправляет форму создания или редактирования с названием только из пробелов
- **THEN** система показывает ошибку обязательного названия и не сохраняет ни название, ни описание, ни признаки, ни изменение порядка

#### Scenario: User cancels card editing
- **WHEN** пользователь меняет поля панели или страницы и подтверждает выход без сохранения
- **THEN** название, описание, признаки и порядок карточки остаются прежними

#### Scenario: User edits on a narrow screen with a keyboard
- **WHEN** пользователь открывает форму карточки на узком экране и работает с клавиатуры
- **THEN** название, описание при редактировании и оба подписанных переключателя читаемы и доступны с клавиатуры; форма создания получает фокус и возвращает его к созданию после закрытия, а подробности поддерживают возврат на доску

#### Scenario: User uses the English interface
- **WHEN** пользователь открывает форму карточки при выбранном английском языке
- **THEN** подписи признаков показаны как «Important» и «Urgent», остальные подписи и сообщения формы тоже на английском, а пользовательское название не переводится

### Requirement: Enabled card flags are visible
Система SHALL показывать на карточке отдельную текстовую метку каждого включённого признака на выбранном языке. Метки SHALL стоять сразу под названием карточки и перед превью описания, в порядке «Важная», «Срочная». Выключенный признак SHALL не создавать метку; карточка с обоими выключенными признаками SHALL отображаться без меток важности и срочности. Значение меток SHALL быть понятно без различения цветов.

#### Scenario: Card displays its enabled flags
- **WHEN** на доске показаны карточки с четырьмя возможными комбинациями признаков
- **THEN** они соответственно показывают две метки, только «Важная», только «Срочная» или ни одной метки

#### Scenario: Flags precede the description preview
- **WHEN** на доске показана карточка с включённым признаком и непустым описанием
- **THEN** метки находятся между названием и превью описания, а превью следует за ними

#### Scenario: User changes the interface language
- **WHEN** пользователь меняет язык интерфейса с русского на английский или обратно
- **THEN** видимые метки меняют язык без изменения сохранённых признаков, названий и порядка карточек

### Requirement: Stable card priority order in every status
Система SHALL упорядочивать карточки каждого статуса по важности по убыванию, затем по срочности по убыванию: оба признака; только важная; только срочная; без признаков. Внутри группы SHALL сохраняться относительный порядок, кроме явной перестановки перетаскиванием или шагом через меню. Создание, перенос через «Переместить в…» и реальное изменение признаков SHALL помещать карточку в конец её группы. Перетаскивание SHALL позволять выбирать любое место только внутри группы неизменных признаков в текущем или другом статусе. Сохранение без изменения признаков SHALL не менять место карточки.

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
- **WHEN** пользователь меняет только название, описание или заметки либо сохраняет прежние значения признаков, в том числе после переключения и возврата к исходным значениям до сохранения
- **THEN** карточка остаётся на прежнем месте внутри своей группы

#### Scenario: User moves a card back into a status
- **WHEN** пользователь возвращает карточку в прежний статус
- **THEN** карточка сохраняет признаки и занимает выбранное место своей группы при перетаскивании либо конец группы при переносе через меню; остальные карточки обоих статусов сохраняют относительный порядок

#### Scenario: User chooses an exact peer position
- **WHEN** пользователь перетаскивает карточку перед, между или после карточек той же группы в текущем или другом статусе
- **THEN** после сохранения карточка находится в показанном месте, а относительный порядок остальных карточек не меняется

#### Scenario: Destination has no matching group
- **WHEN** пользователь переносит карточку в пустой статус либо статус без карточек с такой комбинацией признаков
- **THEN** место вставки показано между группами выше и ниже по приоритету, а отпущенная карточка занимает именно это место без изменения признаков

### Requirement: Single primary creation entry in catalogue and board
The system SHALL offer one primary creation entry in the application bar for the current workspace screen: project creation in the catalogue and status creation on a board. That entry SHALL open the existing focused creation dialog or mobile sheet. Empty-state content SHALL explain the next step without duplicating the creation form or the application-bar entry. Two separate actions are not such duplicates: quick first-project creation in an empty catalogue and the status-set selection on a board without statuses.

#### Scenario: User opens an empty catalogue
- **WHEN** no projects exist
- **THEN** the application bar offers the project-creation entry, which opens the project-name and status-set form, and the empty catalogue additionally offers quick first-project creation without a form

#### Scenario: User opens a project with no statuses
- **WHEN** the project has no statuses
- **THEN** the board explains that a status is needed and its application bar offers the only status-creation entry, which opens the status-name form

#### Scenario: User creates after data exists
- **WHEN** the catalogue has projects or the board has statuses
- **THEN** the same application-bar creation entry remains available and opens the corresponding form

### Requirement: Confirmed card deletion
The system SHALL offer deletion in each card's action menu. It SHALL identify the selected card and the irreversible effect in a confirmation dialog, and SHALL delete only that card and all of its notes atomically after explicit confirmation. The confirmation SHALL explain that its description and notes will also be lost. Cancelling SHALL leave the board unchanged.

#### Scenario: User deletes a card
- **WHEN** the user confirms deletion of a named card
- **THEN** that card and all of its notes disappear, the remaining cards retain their relative order, and the deletion persists after reload

#### Scenario: User cancels card deletion
- **WHEN** the user opens a card's deletion dialog and cancels it
- **THEN** the card and its status remain unchanged

#### Scenario: Cards share a name
- **WHEN** two cards share a name and the user confirms deletion for one of them
- **THEN** only the selected card is deleted

#### Scenario: Cascading deletion fails
- **WHEN** запись удаления карточки или любой её заметки завершается ошибкой
- **THEN** карточка и все её заметки остаются без изменений, частичное удаление не происходит

### Requirement: Empty-status deletion with protection for cards
The system SHALL offer deletion in each status's action menu. It SHALL identify the selected status and the irreversible effect in a confirmation dialog. It SHALL delete the status only while it contains no cards, including when it is the project's last status. If it contains cards, the system SHALL keep it and explain that the cards must first be moved or deleted.

#### Scenario: User deletes an empty status
- **WHEN** the user confirms deletion of an empty status
- **THEN** that status disappears, the remaining statuses retain their relative order, and the deletion persists after reload

#### Scenario: User deletes the last empty status
- **WHEN** the user confirms deletion of the project's only status and it is empty
- **THEN** the board shows its no-status state with a way to add a status

#### Scenario: User attempts to delete a nonempty status
- **WHEN** the user activates deletion of a status containing cards
- **THEN** the status and its cards remain unchanged and the interface explains that the cards must be moved or deleted first

#### Scenario: Status gains a card before confirmation completes
- **WHEN** a card is added to the selected status after its deletion dialog opens but before deletion is saved
- **THEN** the status and card remain and the interface explains why deletion was refused

#### Scenario: User cancels status deletion
- **WHEN** the user opens a status's deletion dialog and cancels it
- **THEN** the status and its cards remain unchanged

### Requirement: Deletion reflects persisted state
The system SHALL report deletion as successful only after it has been saved in local storage. If saving fails, the card, status, or project and its contents SHALL remain visible and unchanged, and the interface SHALL report the failure. A failed project deletion SHALL leave its confirmation open for retry without navigating away or changing the last-opened project.

#### Scenario: Card deletion cannot be saved
- **WHEN** the user confirms card deletion and storage rejects the change
- **THEN** the card remains in its original status and the interface reports the failure

#### Scenario: Status deletion cannot be saved
- **WHEN** the user confirms deletion of an empty status and storage rejects the change
- **THEN** the status remains on the board and the interface reports the failure

#### Scenario: Project deletion cannot be saved
- **WHEN** пользователь подтверждает удаление проекта, но запись любой части удаления завершается ошибкой
- **THEN** весь проект, статусы, карточки, последний открытый проект и маршрут остаются прежними, диалог показывает ошибку и позволяет повторить попытку

### Requirement: Calm board and card presentation
Система SHALL показывать статусы ограниченными колонками на тёплом нейтральном фоне, отдельные светлые карточки и сдержанные действия в акцентном цвете активной цветовой темы. Колонки SHALL иметь сдержанные визуальные границы. Заголовки статусов SHALL показывать компактный счётчик и занимать общую высоту, чтобы списки начинались на одной вертикальной позиции независимо от переносов названий. Метки признаков SHALL оставаться читаемым текстом с различимыми символами или формами, без семантики завершения статусов. Меню карточки SHALL постоянно находиться справа от заголовка и оставаться доступным при длинном названии. Иконка меню SHALL быть визуально выровнена по центру первой строки названия карточки, сохраняя удобную для касания область действия и видимый фокус. Нижняя панель контролов, стрелки переноса и отдельная ручка перетаскивания SHALL отсутствовать.

#### Scenario: User compares cards across statuses
- **WHEN** на доске показаны карточки всех четырёх комбинаций признаков
- **THEN** карточки различимы, обозначены только включённые признаки, меню видно рядом с названием, а нижней панели и стрелок нет

#### Scenario: A card has only a short name
- **WHEN** у карточки есть только короткое название в одну строку, без описания, заметок и меток
- **THEN** иконка меню и строка названия визуально выровнены по одной горизонтали, меню остаётся доступным для касания и показывает фокус при навигации с клавиатуры

#### Scenario: A card has a long name
- **WHEN** название карточки занимает несколько строк на широком или узком экране
- **THEN** оно переносится, не перекрывая постоянно видимое меню справа; иконка меню выровнена по первой строке названия, а метки находятся под заголовком

#### Scenario: Status names wrap to different numbers of lines
- **WHEN** a board has one status name that fits on one line and another that wraps to four lines
- **THEN** the columns remain visually distinguishable and card lists in all statuses begin at the same vertical position

### Requirement: Useful desktop board width and contained mobile scrolling
The system SHALL fit all four status columns of a four-status board at viewport widths 1280 and 1440 px without horizontal board scrolling. At 320 and 390 px, status columns SHALL retain readable cards and touch controls using horizontal scrolling of the board workspace, the same area that scrolls the board vertically, with no horizontal page overflow. Long user names SHALL wrap without covering controls.

#### Scenario: User views a four-status board on desktop
- **WHEN** the viewport is 1280 or 1440 px wide and the board contains four statuses
- **THEN** all four status headers and card widths fit the working area at once

#### Scenario: User reaches another status on mobile
- **WHEN** the viewport is 320 or 390 px wide and the board contains several statuses with long names
- **THEN** the user can horizontally scroll the board workspace to every status while the page width remains within the viewport, status headers remain at the top of the workspace, and controls remain operable

### Requirement: Initial status-set selection
Система SHALL предлагать при создании проекта пять наборов статусов и вариант «Без статусов». В каждой новой форме SHALL быть выбран «Простой». До создания пользователь SHALL видеть упорядоченные названия статусов выбранного набора. Выбор SHALL быть доступен с клавиатуры и на узком экране.

#### Scenario: User accepts the default
- **WHEN** пользователь открывает создание проекта и сохраняет непустое название без смены набора
- **THEN** открывается проект со статусами «Простой» в заданном порядке и без карточек

#### Scenario: User previews a different set
- **WHEN** пользователь выбирает другой набор
- **THEN** форма показывает его названия в порядке будущих статусов и сохраняет введённое название проекта

#### Scenario: User chooses no statuses
- **WHEN** пользователь создаёт проект с вариантом «Без статусов»
- **THEN** открывается доска без статусов с существующим пояснением и действием добавления статуса

#### Scenario: A new form resets the selection
- **WHEN** пользователь закрывает форму с другим выбранным набором и открывает создание проекта снова
- **THEN** выбран «Простой» независимо от предыдущего выбора

#### Scenario: User selects a set on a narrow screen
- **WHEN** пользователь создаёт проект при ширине 320 или 390 px либо использует только клавиатуру
- **THEN** название, выбор набора, просмотр его статусов и действия формы доступны без горизонтального переполнения страницы

### Requirement: Built-in status-set contents
Система SHALL создавать статусы каждого встроенного набора в точном порядке, указанном в сценариях ниже. «На паузе» SHALL находиться непосредственно перед «В разработке». Названия на английском SHALL соответствовать спецификации языка интерфейса.

#### Scenario: Simple set
- **WHEN** пользователь создаёт проект с набором «Простой» на русском языке
- **THEN** статусы: «Нужно сделать», «В процессе», «Готово»

#### Scenario: Search and selection set
- **WHEN** пользователь создаёт проект с набором «Поиск и выбор» на русском языке
- **THEN** статусы: «Найдено», «На рассмотрении», «В избранном», «Не подходит»

#### Scenario: Applications and documents set
- **WHEN** пользователь создаёт проект с набором «Заявки и документы» на русском языке
- **THEN** статусы: «Подготовить», «Отправлено», «Ожидаю ответа», «Завершено»

#### Scenario: Development set
- **WHEN** пользователь создаёт проект с набором «Разработка» на русском языке
- **THEN** статусы: «Запланировано», «На паузе», «В разработке», «На проверке», «Готово»

#### Scenario: Job search set
- **WHEN** пользователь создаёт проект с набором «Поиск работы» на русском языке
- **THEN** статусы: «Интересно», «Отклик отправлен», «Собеседования», «Предложение», «Отказ»

### Requirement: Status sets initialize independent editable statuses
Созданные из набора статусы SHALL быть обычными статусами проекта: пользователь SHALL иметь возможность переименовывать, добавлять, переставлять и удалять их по существующим правилам. Набор SHALL не задавать обязательных переходов, автоматического завершения или связи между проектами. Существующие проекты SHALL не получать статусы автоматически.

#### Scenario: User customizes one project
- **WHEN** пользователь меняет названия, порядок или состав статусов проекта, созданного из набора
- **THEN** изменения сохраняются после перезагрузки и не меняют другие проекты или встроенные наборы

#### Scenario: User moves a card to an alternative outcome
- **WHEN** пользователь переносит карточку из «Собеседования» напрямую в «Отказ» либо из «На проверке» в «На паузе»
- **THEN** работают существующие средства перемещения без обязательного прохождения промежуточных статусов и автоматического изменения признаков

#### Scenario: Existing project is reopened
- **WHEN** пользователь открывает ранее созданный проект, включая проект без статусов
- **THEN** его сохранённые статусы и карточки остаются прежними

### Requirement: Atomic project initialization
Система SHALL сохранять новый проект, его начальные статусы с порядком и выбор последнего открытого проекта как одно целое. При отказе записи SHALL не оставаться частичного проекта или новых статусов, прежний последний проект SHALL сохраняться, а форма SHALL оставаться открытой с названием, набором и сообщением об ошибке. Пока сохранение выполняется, повторная отправка SHALL не создавать дубликат.

#### Scenario: Status initialization cannot be saved
- **WHEN** сохранение одного из начальных статусов завершается ошибкой
- **THEN** новый проект и все его статусы отсутствуют, прежние данные и последний проект сохранены, форма позволяет повторить попытку с теми же значениями

#### Scenario: User retries after failure
- **WHEN** пользователь повторяет сохранение после устранения ошибки
- **THEN** создаётся один проект с полным выбранным набором и открывается его доска

#### Scenario: User submits twice while saving
- **WHEN** пользователь повторно активирует создание до завершения первой отправки
- **THEN** выполняется только одно создание проекта

#### Scenario: Initialization survives reload
- **WHEN** проект с выбранным набором успешно создан и приложение перезагружено
- **THEN** открывается этот проект с полным сохранённым набором в исходном порядке

### Requirement: Confirmed project deletion
Система SHALL предлагать «Удалить проект» в меню каждого проекта каталога и настройках его доски. Диалог SHALL показывать название, количество статусов и карточек, предупреждение об окончательном удалении всего содержимого без восстановления и кнопки «Отмена» / «Удалить проект». Ввод названия SHALL не требоваться. Удаление SHALL выполняться только после явного подтверждения.

#### Scenario: User starts deletion from catalogue
- **WHEN** пользователь выбирает удаление проекта из его меню в каталоге
- **THEN** открывается подтверждение выбранного проекта с количеством его статусов и карточек, включая нулевые значения

#### Scenario: User starts deletion from board
- **WHEN** пользователь выбирает «Удалить проект» в настройках открытой доски
- **THEN** открывается такое же подтверждение для текущего проекта

#### Scenario: User cancels deletion
- **WHEN** пользователь выбирает «Отмена» или закрывает подтверждение без удаления
- **THEN** проект, его содержимое и текущий экран остаются неизменными

### Requirement: Atomic project cascade deletion
Система SHALL окончательно удалять выбранный по идентификатору проект, все принадлежащие ему статусы, карточки и заметки карточек как одно целое, независимо от заполненности. Остальные проекты, их содержимое и порядок SHALL сохраняться. Удаление SHALL сохраняться после перезагрузки и работать офлайн.

#### Scenario: User deletes a populated project
- **WHEN** пользователь подтверждает удаление проекта с несколькими статусами и карточками
- **THEN** проект, все его статусы, карточки и их заметки удаляются без необходимости предварительно очищать статусы и не появляются после перезагрузки

#### Scenario: User deletes an empty project
- **WHEN** пользователь подтверждает удаление проекта без статусов или с пустыми статусами
- **THEN** проект и его статусы удаляются

#### Scenario: Projects share a name
- **WHEN** два проекта имеют одинаковое название и пользователь подтверждает удаление одного
- **THEN** удаляется только выбранный проект с его содержимым, второй проект остаётся неизменным

### Requirement: Project deletion navigation and focus
После удаления открытого проекта система SHALL показывать каталог и исключать автоматическое открытие удалённого проекта. После удаления из каталога система SHALL оставаться в каталоге. При отсутствии проектов SHALL показываться его пустое состояние. Фокус SHALL переходить к следующему проекту, предыдущему при отсутствии следующего, либо к кнопке быстрого создания при пустом каталоге; после удаления с доски — к созданию проекта в app bar, а при пустом каталоге — к кнопке быстрого создания.

#### Scenario: User deletes the open project
- **WHEN** удаление открытого проекта успешно сохранено, и в каталоге остаются другие проекты
- **THEN** открывается каталог, маршрут и последний открытый проект больше не ссылаются на удалённый проект, фокус находится на создании проекта в app bar

#### Scenario: User deletes the only open project
- **WHEN** удаление открытого проекта успешно сохранено, и других проектов нет
- **THEN** открывается пустой каталог, маршрут и последний открытый проект больше не ссылаются на удалённый проект, фокус находится на кнопке «Создать проект» в блоке пустого каталога

#### Scenario: User deletes from catalogue
- **WHEN** пользователь удаляет проект из каталога, где есть другие проекты
- **THEN** каталог обновляется, остальные проекты сохраняют порядок, фокус переходит к следующему проекту или предыдущему, если следующего нет

#### Scenario: User deletes the last project
- **WHEN** пользователь удаляет единственный проект из каталога
- **THEN** каталог показывает пустое состояние, а фокус находится на кнопке «Создать проект» в его блоке

#### Scenario: User follows an old project link
- **WHEN** пользователь перезагружает приложение или возвращается по истории к ссылке удалённого проекта
- **THEN** приложение показывает каталог, а не доску удалённого проекта

### Requirement: Accessible project deletion confirmation
Подтверждение удаления проекта SHALL работать с клавиатуры и на узком экране, соответствовать языку интерфейса RU/EN и первоначально фокусировать «Отмена». Закрытие без удаления SHALL возвращать фокус к вызвавшему действию. Во время сохранения SHALL исключаться повторная отправка удаления.

#### Scenario: Keyboard user cancels
- **WHEN** пользователь открывает подтверждение клавиатурой и нажимает Escape
- **THEN** начальный фокус был на «Отмена», диалог закрывается и фокус возвращается к меню выбранного проекта или шестерёнке доски

#### Scenario: User deletes on mobile in English
- **WHEN** пользователь открывает подтверждение в английском интерфейсе при ширине 320 или 390 px
- **THEN** название, количества, предупреждение и кнопки читаемы и доступны, тексты локализованы, пользовательское название не переводится

#### Scenario: User confirms repeatedly
- **WHEN** пользователь повторно активирует подтверждение, пока удаление сохраняется
- **THEN** повторная операция удаления не запускается

### Requirement: Card drag activation and preview
Система SHALL начинать перенос за свободную площадь карточки после намеренного движения мыши либо удержания пальцем. Обычный свайп SHALL сохранять прокрутку до начала переноса. Меню и его действия SHALL не начинать перенос. Во время переноса система SHALL показывать карточку и допустимое место вставки в её группе выбранного статуса, включая пустой статус. Место вставки SHALL вычисляться только среди видимых карточек, не скрытых под заголовком статуса.

#### Scenario: User drags with a mouse
- **WHEN** пользователь нажимает на название, метку или свободную площадь карточки и перемещает мышь с нажатой основной кнопкой достаточно для начала жеста
- **THEN** начинается перенос без открытия страницы карточки, а допустимое место вставки видно до отпускания

#### Scenario: User holds on a phone
- **WHEN** пользователь удерживает палец на свободной площади карточки без начального свайпа
- **THEN** после удержания начинается перенос с видимой обратной связью; последующее движение управляет переносом, а отпускание в допустимом месте завершает его без открытия страницы

#### Scenario: User scrolls from a card
- **WHEN** пользователь начинает обычный вертикальный или горизонтальный свайп на карточке до активации удержанием
- **THEN** рабочая область доски прокручивается по соответствующей оси, карточка не переносится и её страница не открывается

#### Scenario: Pointer is over a different priority group
- **WHEN** пользователь переносит карточку над областью другой группы признаков целевого статуса
- **THEN** показывается ближайшее допустимое место в собственной группе карточки либо место новой группы между приоритетными соседями; интерфейс не показывает вставку внутрь чужой группы

#### Scenario: Pointer is over a status header
- **WHEN** доска прокручена вниз, и пользователь ведёт переносимую карточку над прилипшим заголовком статуса
- **THEN** место вставки показывается так, как у верхнего края видимой части списка этого статуса, не среди скрытых под заголовком карточек, а рабочая область доски автоматически прокручивается вверх

#### Scenario: User reaches an offscreen destination
- **WHEN** во время активного переноса пользователь подводит карточку к краю рабочей области доски
- **THEN** рабочая область автоматически прокручивается по соответствующей оси для достижения скрытых статусов или мест вставки, без горизонтального переполнения всей страницы

#### Scenario: User cancels or drops outside the board
- **WHEN** пользователь нажимает Escape во время переноса, жест отменяется системой или карточка отпущена вне допустимой цели
- **THEN** временный вид переноса исчезает, исходные статус и порядок сохраняются, запись переноса не выполняется и страница карточки не открывается

#### Scenario: Drop does not change position
- **WHEN** пользователь отпускает карточку в её исходном месте
- **THEN** порядок и данные не меняются, лишняя запись не выполняется и страница карточки не открывается

### Requirement: Card placement is persisted atomically
Система SHALL сохранять перенос или перестановку только как одну подтверждённую операцию со статусом и порядком затронутых карточек. При ошибке записи исходные данные SHALL сохраняться целиком и показываться ошибка. Во время сохранения система SHALL блокировать повторный перенос и конфликтующие операции затронутой доски. После перезагрузки, включая офлайн, SHALL сохраняться подтверждённый порядок.

#### Scenario: User reloads after reordering
- **WHEN** пользователь переставляет карточку внутри группы, переносит другую в точное место другого статуса и перезагружает доступное офлайн приложение
- **THEN** оба подтверждённых расположения сохраняются вместе с названиями, описаниями, признаками и заметками

#### Scenario: Placement cannot be saved
- **WHEN** запись переноса или перестановки отклоняется в любой части операции
- **THEN** все затронутые карточки остаются в прежних статусах и относительном порядке без частичного переноса, а интерфейс сообщает об ошибке

#### Scenario: User repeats an operation while saving
- **WHEN** после отпускания карточки или выбора шага через меню сохранение ещё продолжается
- **THEN** повторный перенос, перестановка и конфликтующее изменение доски не запускаются до завершения текущей операции

#### Scenario: Destination becomes unavailable
- **WHEN** к моменту сохранения целевой статус или выбранный ориентир места больше не существует либо больше не относится к допустимой группе и проекту
- **THEN** перенос отклоняется целиком с понятной ошибкой, а карточка не получает несуществующий статус или место в чужой группе

#### Scenario: Refresh fails after a committed placement
- **WHEN** запись расположения уже подтверждена хранилищем, но обновление отображаемой доски завершается ошибкой
- **THEN** интерфейс сообщает об ошибке обновления, не предлагает повторно записать уже сохранённый перенос и позволяет повторить чтение; после успешного чтения показано сохранённое расположение

### Requirement: Board card description preview
На карточке доски система SHALL показывать до трёх строк сохранённого непустого описания обычным текстом. Предпросмотр SHALL быть частью области открытия подробностей карточки; веб-ссылки в нём SHALL не открываться самостоятельно. Пустое описание SHALL не занимать места на карточке.

#### Scenario: Card has a long description
- **WHEN** пользователь открывает доску с карточкой, у которой сохранено описание длиннее трёх строк
- **THEN** карточка показывает начало описания не более чем в трёх строках, а полное описание доступно в панели и на странице карточки

#### Scenario: Card has no description
- **WHEN** описание карточки пустое или состоит только из пробельных символов
- **THEN** на доске нет пустого блока или подписи предпросмотра

#### Scenario: Description contains a web link
- **WHEN** сохранённое описание содержит веб-ссылку и пользователь нажимает на её текст в предпросмотре
- **THEN** открывается панель карточки, а веб-ссылка доступна для открытия в подробностях

#### Scenario: Description changes
- **WHEN** пользователь сохраняет новое описание или очищает существующее и возвращается на доску
- **THEN** предпросмотр отражает последнее успешно сохранённое описание либо исчезает после очистки; несохранённый текст на доске не появляется

### Requirement: Recent note preview on board cards
На карточке доски система SHALL показывать первую сохранённую заметку истории в порядке, выбранном пользователем для истории заметок: самую новую при «сначала новые» (по умолчанию) и самую старую при «сначала старые». Каждый предпросмотр SHALL занимать не более трёх строк текста. Порядок SHALL определяться датой создания заметок, а не временем редактирования. Текст и веб-ссылки SHALL оставаться обычным текстом; нажатие на текст SHALL открывать подробности карточки с полной историей так же, как нажатие на карточку.

#### Scenario: Card has no notes
- **WHEN** у карточки нет заметок
- **THEN** блок предпросмотра заметок и управление раскрытием отсутствуют

#### Scenario: Card has one note
- **WHEN** у карточки есть одна заметка длиннее трёх строк
- **THEN** на доске показано не более трёх строк этой заметки и нет управления раскрытием

#### Scenario: Collapsed card follows the chosen order
- **WHEN** выбран порядок «сначала старые» и у карточки восемь заметок
- **THEN** свёрнутая карточка показывает самую старую заметку, а при «сначала новые» — самую новую

#### Scenario: Older note is edited
- **WHEN** пользователь изменяет текст старой заметки и возвращается на доску
- **THEN** заметка остаётся на месте, определяемом её датой создания; сохранённый новый текст виден на доске, если заметка входит в показанные

#### Scenario: Preview contains a web link
- **WHEN** пользователь нажимает на текст веб-ссылки в предпросмотре
- **THEN** открываются подробности карточки, в которых ссылку можно открыть отдельно

### Requirement: Expand recent notes independently
Если у карточки больше одной заметки, система SHALL предоставлять отдельную доступную кнопку раскрытия. Раскрытая карточка SHALL показывать первые не более пяти заметок истории в порядке, выбранном пользователем для истории заметок (по умолчанию от новых к старым), начиная с первоначально видимой; каждая SHALL занимать не более трёх строк. Повторное нажатие SHALL сворачивать список до первой заметки в этом порядке. Кнопка SHALL не открывать страницу карточки и не мешать её остальным контролам.

#### Scenario: Card has between two and five notes
- **WHEN** пользователь раскрывает карточку с четырьмя заметками
- **THEN** видны все четыре заметки в выбранном порядке по дате создания, без повтора первой

#### Scenario: Card has more than five notes
- **WHEN** пользователь раскрывает карточку с восемью заметками
- **THEN** видны пять самых новых при «сначала новые» или пять самых старых при «сначала старые», в этом порядке, а вся история доступна на странице карточки

#### Scenario: User collapses notes
- **WHEN** пользователь повторно нажимает кнопку раскрытия
- **THEN** остаётся только первая заметка в выбранном порядке и кнопка показывает свёрнутое состояние

#### Scenario: Keyboard user expands notes
- **WHEN** пользователь активирует кнопку клавиатурой на узком экране
- **THEN** список раскрывается без перехода на страницу карточки, состояние кнопки и её назначение доступны вспомогательным технологиям, а ссылка на карточку, меню карточки и перетаскивание остаются доступны

#### Scenario: User returns after note changes
- **WHEN** пользователь добавляет, изменяет или удаляет заметку на странице карточки и возвращается на доску
- **THEN** предпросмотр и состав показанных заметок отражают только сохранённую историю этой карточки

#### Scenario: Expanded notes follow the default order
- **WHEN** пользователь, ещё не выбиравший порядок, раскрывает карточку с тремя заметками
- **THEN** самая новая заметка показана первой, на том же месте, где она была видна в свёрнутом состоянии

#### Scenario: User changes the order while the board is visible
- **WHEN** на широком экране пользователь переключает порядок в панели карточки, а на доске есть свёрнутые и раскрытые карточки с более чем пятью заметками
- **THEN** без перезагрузки свёрнутые карточки показывают первую заметку нового порядка, а раскрытые — первые пять заметок в новом порядке

### Requirement: Apply a status set to an existing project without statuses
Система SHALL предлагать выбор встроенного набора в существующем проекте без статусов и SHALL сохранять весь выбранный набор атомарно. Действие SHALL быть недоступно в проекте с хотя бы одним статусом и SHALL не перемещать карточки.

#### Scenario: User fills an empty board
- **WHEN** пользователь открывает ранее созданный проект без статусов, выбирает набор и подтверждает действие
- **THEN** доска показывает все статусы набора в заданном порядке, а после перезагрузки они остаются на месте

#### Scenario: User previews a set on an empty board
- **WHEN** пользователь выбирает другой набор в форме пустой доски
- **THEN** форма показывает будущие названия в правильном порядке; вариант «Без статусов» не предлагается

#### Scenario: Project already has statuses
- **WHEN** пользователь открывает проект с хотя бы одним статусом
- **THEN** действие применения набора отсутствует, существующие статусы и карточки не меняются

#### Scenario: Applying the set fails
- **WHEN** запись одного из статусов набора завершается ошибкой
- **THEN** проект остаётся без статусов, форма сохраняет выбор и показывает ошибку для повторной попытки

#### Scenario: Another status appears before applying the set
- **WHEN** статус появляется в проекте между открытием формы и сохранением набора
- **THEN** применение отклоняется как конфликт, ни один статус набора не добавляется, а доска обновляется до сохранённого состояния

#### Scenario: User submits the set twice
- **WHEN** пользователь повторно активирует применение набора до завершения первой записи
- **THEN** выполняется только одна операция и дубликаты статусов не появляются

### Requirement: Placement result as a transient notification
Система SHALL сообщать об успешно сохранённом или неизменившемся расположении карточки временным уведомлением приложения, без строки над доской и без сдвига статусов. Промежуточное состояние записи SHALL не показываться текстом; доска остаётся заблокированной до завершения записи. Ошибки переноса и сбой обновления доски SHALL оставаться постоянными сообщениями на доске и не дублироваться временным уведомлением.

#### Scenario: Placement is saved
- **WHEN** пользователь переносит или переставляет карточку перетаскиванием либо через меню, и запись подтверждена
- **THEN** появляется временное уведомление «Расположение карточки сохранено.», колонки доски не смещаются по вертикали, а при переносе с клавиатуры фокус остаётся на меню той же карточки

#### Scenario: Placement does not change
- **WHEN** перенос завершается без изменения расположения
- **THEN** появляется временное уведомление «Расположение карточки не изменилось.» и запись не выполняется

#### Scenario: Placement is being saved
- **WHEN** запись переноса ещё выполняется
- **THEN** над доской не появляется текст о сохранении, а повторный перенос и конфликтующие изменения не запускаются

#### Scenario: Placement cannot be saved
- **WHEN** запись переноса отклоняется
- **THEN** на доске показывается постоянное сообщение об ошибке сохранения, временное уведомление не появляется, и текст ошибки не повторяется во второй области

#### Scenario: Board is reread after a refresh failure
- **WHEN** после ошибки обновления доски пользователь нажимает «Повторить чтение» и чтение успешно
- **THEN** постоянное сообщение об ошибке исчезает и появляется временное уведомление «Расположение карточки сохранено.»

#### Scenario: Consecutive moves
- **WHEN** пользователь подряд сохраняет два переноса
- **THEN** второе уведомление заменяет первое и объявляется заново, даже если текст совпадает

### Requirement: Board scrolls as one workspace
Рабочая область доски под верхней панелью SHALL прокручивать всю доску целиком: вертикально, а при нехватке ширины и горизонтально. Документ SHALL не прокручиваться. Списки карточек статусов SHALL не иметь собственной прокрутки. Все статусы доски SHALL иметь одну высоту: по самому длинному списку, но не меньше доступной высоты рабочей области.

#### Scenario: User scrolls a long status
- **WHEN** один статус содержит больше карточек, чем помещается в рабочей области, и пользователь прокручивает доску вниз колесом, свайпом, клавишами или полосой прокрутки на 320, 390, 1280 или 1440 px
- **THEN** все статусы прокручиваются вместе как одна доска, ни один список не прокручивается отдельно, а документ и верхняя панель остаются на месте

#### Scenario: Statuses have different numbers of cards
- **WHEN** на доске есть статус с длинным списком и статус с одной карточкой или без карточек
- **THEN** границы обоих статусов доходят до низа самого длинного списка, а при прокрутке до конца доски короткий статус остаётся видимым на всю высоту

#### Scenario: Board content is shorter than the workspace
- **WHEN** все списки доски короче доступной высоты рабочей области
- **THEN** статусы занимают доступную высоту рабочей области, а доска не прокручивается вертикально

#### Scenario: User scrolls a narrow board in both directions
- **WHEN** доска с несколькими статусами и длинным списком показана на 320 или 390 px
- **THEN** пользователь достигает каждого статуса горизонтальной прокруткой и конца каждого списка вертикальной прокруткой той же рабочей области, а страница не получает горизонтального переполнения

#### Scenario: Card panel is open on a wide screen
- **WHEN** на ширине 1280 или 1440 px рядом с доской открыта панель карточки
- **THEN** доска и панель прокручиваются независимо друг от друга, а прокрутка доски не сдвигает панель

### Requirement: Status headers stay visible while the board scrolls
Заголовок каждого статуса с названием, счётчиком, плюсом создания карточки и меню SHALL оставаться у верхнего края рабочей области доски, пока на экране виден его статус. Заголовок SHALL иметь непрозрачный фон и постоянную тонкую границу снизу, чтобы прокручиваемые под ним карточки не просвечивали. Заголовки всех статусов SHALL сохранять общую высоту, поэтому списки начинаются на одной линии.

#### Scenario: User scrolls far down a long status
- **WHEN** пользователь прокручивает доску ниже первой карточки длинного статуса
- **THEN** заголовки всех видимых статусов, включая короткие и пустые, остаются у верхнего края рабочей области сразу под верхней панелью, а их плюс и меню доступны указателем, касанием и клавиатурой

#### Scenario: Cards pass under a header
- **WHEN** карточки при прокрутке уходят под заголовок статуса
- **THEN** их содержимое не видно сквозь заголовок, а граница под заголовком видна одинаково до и после прокрутки

#### Scenario: User scrolls a narrow board horizontally
- **WHEN** на 320 или 390 px доска прокручена вниз, а затем горизонтально к другому статусу
- **THEN** заголовки сдвигаются по горизонтали вместе со своими статусами и остаются у верхнего края рабочей области

#### Scenario: Status names wrap differently while scrolled
- **WHEN** одно название статуса занимает одну строку, другое переносится на несколько строк, и доска прокручена вниз
- **THEN** все заголовки имеют одну высоту, а первые видимые карточки под ними не перекрыты

### Requirement: Focus is not obscured by status headers
Когда клавиатурный фокус переходит на карточку или её контрол в прокручиваемой доске, система SHALL прокручивать доску так, чтобы элемент с фокусом был полностью виден ниже заголовков статусов и выше нижнего края рабочей области.

#### Scenario: Keyboard user moves up a long status
- **WHEN** на 320 или 1440 px пользователь прокрутил длинный статус до конца и переходит Shift+Tab к карточкам выше видимой части
- **THEN** каждая карточка или её меню с фокусом полностью видны ниже заголовка статуса и не перекрыты им

#### Scenario: Keyboard user moves down a long status
- **WHEN** пользователь переходит Tab к карточкам ниже видимой части доски
- **THEN** элемент с фокусом прокручивается в видимую часть рабочей области, а его индикатор фокуса не перекрыт заголовком или верхней панелью

### Requirement: Board action menus close when their trigger is hidden
Открытое меню карточки или статуса SHALL закрываться, когда при прокрутке доски его кнопка оказывается под заголовком статуса либо за пределами видимой части рабочей области доски. Меню, кнопка которого остаётся видимой, SHALL следовать за ней при прокрутке.

#### Scenario: Card menu trigger scrolls under a status header
- **WHEN** у карточки открыто меню, и пользователь прокручивает доску так, что кнопка меню уходит под заголовок статуса
- **THEN** меню закрывается и не остаётся поверх заголовка без видимой кнопки

#### Scenario: Menu trigger leaves the workspace horizontally
- **WHEN** на узком экране открыто меню карточки или статуса, и пользователь прокручивает доску горизонтально так, что кнопка меню выходит за край рабочей области
- **THEN** меню закрывается

#### Scenario: Menu trigger remains visible
- **WHEN** открыто меню, и прокрутка доски оставляет его кнопку видимой
- **THEN** меню остаётся открытым рядом с кнопкой

### Requirement: Board errors stay visible while scrolling
Сообщения об ошибке сохранения доски и о неудачном повторном чтении после переноса SHALL показываться в неподвижной полосе между верхней панелью и рабочей областью доски. Полоса SHALL оставаться видимой при любой вертикальной и горизонтальной прокрутке доски, не перекрывать доску и уменьшать её рабочую область, пока сообщение показано.

#### Scenario: Error appears while the board is scrolled down
- **WHEN** доска прокручена вниз, и сохранение изменения доски завершается ошибкой
- **THEN** сообщение об ошибке видно под верхней панелью без прокрутки к началу доски и объявляется вспомогательным технологиям

#### Scenario: Error appears on a horizontally scrolled narrow board
- **WHEN** на 320 или 390 px доска прокручена горизонтально к последнему статусу, и повторное чтение после переноса не удаётся
- **THEN** сообщение и действие повтора видны целиком в пределах ширины экрана и доступны, а страница не получает горизонтального переполнения

#### Scenario: Error is dismissed
- **WHEN** сообщение об ошибке доски исчезает после успешного повтора или нового сохранения
- **THEN** полоса исчезает, а рабочая область доски снова занимает всю высоту под верхней панелью без изменения положения прокрутки доски

### Requirement: Board scroll position survives card details
Доска SHALL сохранять вертикальное и горизонтальное положение прокрутки, когда пользователь открывает карточку из доски в панели и затем закрывает панель или раскрывает её на полную страницу и возвращается к доске.

#### Scenario: User expands a card and returns
- **WHEN** пользователь прокрутил доску вниз, открыл карточку в панели, выбрал «Открыть на всю страницу», а затем вернулся к доске действием «Назад к доске» или браузерным «Назад»
- **THEN** после разрешения несохранённых изменений доска показана с тем же положением прокрутки, что и перед открытием карточки

#### Scenario: User opens a card on a narrow screen
- **WHEN** на 320 или 390 px пользователь открывает карточку из доски, прокрученной вниз и вбок, и закрывает её
- **THEN** доска показана с теми же вертикальным и горизонтальным положением прокрутки

### Requirement: Card creation from the status header
Система SHALL показывать в заголовке каждого статуса перед меню действий единственный вход создания карточки: квадратный плюс в акцентном цвете активной цветовой темы без видимой подписи, как добавление статуса, с доступным именем и подсказкой «Добавить карточку». Плюс SHALL открывать форму создания в своём статусе и после закрытия возвращать фокус на себя без прокрутки доски. Нижнего входа под списком SHALL не быть. Новая карточка SHALL занимать место по правилам порядка без прокрутки к ней.

#### Scenario: User creates a card from the status header
- **WHEN** пользователь активирует плюс в заголовке выбранного статуса
- **THEN** открывается форма создания карточки в этом статусе, а закрытие возвращает фокус к этому плюсу

#### Scenario: User creates a card while the board is scrolled
- **WHEN** доска прокручена вниз по длинному статусу, и пользователь создаёт карточку плюсом в прилипшем заголовке этого статуса
- **THEN** карточка появляется на своём месте по правилам порядка, счётчик статуса увеличивается на одну, фокус возвращается на плюс, а положение прокрутки доски не меняется, даже если новая карточка вне видимой части

#### Scenario: Board shows no lower creation entry
- **WHEN** показана доска с карточками или без них, на любой ширине
- **THEN** под списком ни одного статуса нет кнопки создания карточки; в каждом статусе есть ровно одна остановка Tab создания карточки, в его заголовке

#### Scenario: Board has no cards
- **WHEN** ни в одном статусе нет карточек, включая случай, когда статусы существуют, но пусты, в том числе после удаления последней карточки нативным агентом
- **THEN** плюсы создания карточки остаются в заголовках всех статусов, а глобальный плюс добавления статуса остаётся доступным

#### Scenario: User identifies the header action
- **WHEN** пользователь наводит указатель на плюс в заголовке или переводит на него фокус клавиатурой, в том числе когда заголовок прилип к верхнему краю рабочей области
- **THEN** доступна читаемая и не обрезанная подсказка «Добавить карточку» или «Add card» на выбранном языке; кнопка также имеет соответствующее доступное имя для вспомогательных технологий

#### Scenario: User creates a card using the keyboard
- **WHEN** пользователь переводит фокус на плюс в заголовке и нажимает Enter или Space
- **THEN** форма получает фокус; после успешного сохранения, отмены или Escape фокус возвращается на этот плюс

#### Scenario: User sees long status names on different screens
- **WHEN** доска с длинными названиями статусов показана на ширине 320, 390, 1280 или 1440 px
- **THEN** названия переносятся, не перекрывая плюс, счётчик и меню; зона плюса составляет не менее 44 на 44 px, страница не получает горизонтальную прокрутку, а четыре статуса на 1280 и 1440 px помещаются без горизонтальной прокрутки доски

#### Scenario: Saving a new card fails
- **WHEN** пользователь открывает форму плюсом в заголовке, вводит данные, а сохранение не удаётся
- **THEN** карточка не появляется, форма остаётся открытой с введёнными данными и сообщением об ошибке; после последующего закрытия фокус возвращается к плюсу, если он остаётся доступным

### Requirement: Icon-only recent notes toggle
Кнопка раскрытия последних заметок на карточке доски SHALL показывать только иконку-шеврон без видимого текста. Шеврон SHALL стоять на оси вертикальной линии заметок сразу под последней показанной заметкой и SHALL указывать вниз в свёрнутом состоянии и вверх в раскрытом. Доступное имя кнопки SHALL включать название карточки. При наведении указателя и фокусе с клавиатуры SHALL появляться подсказка с действием кнопки.

#### Scenario: Collapsed card shows only a chevron
- **WHEN** у карточки больше одной заметки и они свёрнуты
- **THEN** под последней заметкой виден шеврон, указывающий вниз, без текста; название карточки на доске не повторяется

#### Scenario: Expanded card shows an upward chevron
- **WHEN** пользователь раскрывает заметки карточки
- **THEN** шеврон стоит под последней показанной заметкой и указывает вверх

#### Scenario: Chevron sits on the notes line
- **WHEN** карточка с несколькими заметками показана на экране шириной 320px или на широком экране
- **THEN** центр шеврона по горизонтали совпадает с вертикальной линией заметок, область нажатия не меньше 24×24px и не перекрывает текст заметок

#### Scenario: Screen reader user finds the toggle
- **WHEN** пользователь вспомогательной технологии переходит к кнопке раскрытия
- **THEN** её имя содержит название карточки, а состояние сообщается как свёрнутое или раскрытое

#### Scenario: Pointer or keyboard user sees the hint
- **WHEN** пользователь наводит указатель на шеврон или переводит на него фокус клавиатурой
- **THEN** появляется подсказка «Показать заметки» в свёрнутом состоянии или «Свернуть заметки» в раскрытом

### Requirement: Quick first-project creation in an empty catalogue
В пустом каталоге система SHALL предлагать основную кнопку «Создать проект» / «Create project». Одно её нажатие без формы SHALL создавать проект «Первый проект» / «First project» на языке интерфейса в момент создания с набором статусов «Простой» и открывать его доску. Создание SHALL подчиняться правилам атомарной инициализации проекта. Ошибка SHALL показываться под кнопкой, кнопка SHALL оставаться доступной для повтора. В каталоге с проектами кнопки нет.

#### Scenario: User creates the first project in one action
- **WHEN** каталог пуст, выбран русский язык, и пользователь нажимает «Создать проект» в блоке пустого каталога
- **THEN** без диалога создаётся проект «Первый проект» со статусами «Нужно сделать», «В процессе», «Готово» без карточек, и открывается его доска

#### Scenario: User creates the first project in English
- **WHEN** выбран английский язык, и пользователь нажимает «Create project» в блоке пустого каталога
- **THEN** создаётся проект «First project» со статусами набора «Simple» на английском

#### Scenario: Project name does not follow later language changes
- **WHEN** пользователь создал проект быстрым созданием на русском, а затем переключил язык на английский
- **THEN** проект по-прежнему называется «Первый проект», его можно переименовать как любой другой проект

#### Scenario: Quick creation cannot be saved
- **WHEN** сохранение проекта или одного из его статусов при быстром создании завершается ошибкой
- **THEN** проекта и его статусов нет, каталог остаётся пустым, под кнопкой показано сообщение об ошибке, а кнопка снова доступна и сохраняет фокус

#### Scenario: User activates quick creation twice
- **WHEN** пользователь повторно нажимает кнопку до завершения первого сохранения
- **THEN** создаётся только один проект; пока сохранение выполняется, кнопка неактивна и заметно отличается от активной

#### Scenario: Catalogue has projects
- **WHEN** в каталоге есть хотя бы один проект
- **THEN** блока пустого каталога и кнопки быстрого создания нет; проекты создаются через «+» в app bar

### Requirement: Empty catalogue presentation
Пустой каталог SHALL показывать один блок без подложки-карточки, содержащий только заголовок «Начните с первого проекта», кнопку быстрого создания и область сообщения об ошибке. Блок SHALL быть по центру по горизонтали. По вертикали блок SHALL стоять в оптическом центре: на широких экранах около 2/5 свободной высоты под app bar сверху; на высоких экранах и телефонах отступ сверху SHALL быть ограничен. Блок SHALL помещаться без обрезки на любом поддерживаемом размере экрана.

#### Scenario: Block is centred horizontally
- **WHEN** пустой каталог показан на любом эталонном размере экрана на любом языке
- **THEN** горизонтальный центр блока совпадает с центром области содержимого, текст выровнен по центру, горизонтального переполнения нет

#### Scenario: Block sits at the optical centre on wide screens
- **WHEN** пустой каталог показан при 1440×900 или 1280×800
- **THEN** расстояние от app bar до блока составляет от 35 до 45 % суммы свободных расстояний над блоком (до app bar) и под ним (до нижнего края окна)

#### Scenario: Block stays in the upper part on tall screens and phones
- **WHEN** пустой каталог показан при 820×1180 или 390×844
- **THEN** расстояние от app bar до блока меньше расстояния от блока до нижнего края окна и не меньше 24 px

#### Scenario: Short or narrow viewport
- **WHEN** пустой каталог показан при 568×320 или 320×568
- **THEN** заголовок и кнопка полностью видны в первом экране без прокрутки, а на телефоне кнопка занимает всю ширину блока

#### Scenario: Error does not move the block
- **WHEN** под кнопкой появляется сообщение об ошибке сохранения
- **THEN** положение заголовка и кнопки не меняется; если сообщение не помещается в окно, страница прокручивается, а не обрезается

#### Scenario: Catalogue does not show a tagline
- **WHEN** каталог показан пустым или с проектами
- **THEN** фразы «Держите важные дела в понятном порядке.» / «Keep important tasks in clear order.» нет; при наличии проектов сетка начинается сразу под app bar
