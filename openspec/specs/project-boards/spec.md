# project-boards Specification

## Purpose

Позволяет вести несколько личных проектов как локально сохраняемые доски со статусами и карточками, чтобы пользователь видел этапы своих объектов и мог к ним вернуться.

## Requirements

### Requirement: Project catalogue and board navigation
The system SHALL present a distinct project catalogue and one open project board at a time. It SHALL let the user view locally stored projects, create a project with a non-empty name through a primary creation control, rename an existing project, and open a project. Duplicate project names SHALL be permitted. Creating a project SHALL initialize its statuses from the selected status set and open its board, and the board SHALL provide a clear control to return to the catalogue.

#### Scenario: User creates and opens projects
- **WHEN** the user creates projects named "Поиск квартиры" and "Паспорт" and chooses one from the catalogue
- **THEN** the selected project's board is displayed without the other project's statuses or cards

#### Scenario: User submits an empty project name
- **WHEN** the user tries to create or rename a project with a name containing only whitespace
- **THEN** the project is not created or renamed and the interface indicates that a name is required

#### Scenario: User starts creating a project from a populated catalogue
- **WHEN** the user activates the catalogue's primary project-creation control
- **THEN** the interface exposes a focused form for the name and status-set selection without obscuring the creation action's purpose

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
Система SHALL позволять создавать карточку с непустым названием в выбранном статусе, редактировать её на странице карточки и переносить в любой другой статус перетаскиванием либо через «Переместить в…» в меню. Каждая карточка SHALL принадлежать ровно одному статусу. Новая карточка и перенос через меню SHALL помещаться в конец группы одинаковых признаков; перетаскивание SHALL выбирать место внутри этой группы с сохранением приоритетного порядка групп. Перенос SHALL сохранять название, описание, оба признака и заметки. Стрелки перемещения SHALL отсутствовать; вторичные действия SHALL сохранять семантические подписи.

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
- **THEN** доступны редактирование на странице карточки, удаление, «Переместить в…» и возможные шаги внутри группы; форма перемещения обозначает выбранную карточку и предлагает все другие статусы, кроме текущего

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
Система SHALL предоставлять основные действия проектов, статусов и карточек через семантические контролы без необходимости перетаскивания. Постоянно видимое верхнее меню карточки SHALL предоставлять перенос в другой статус и возможные шаги перестановки внутри группы. После клавиатурного переноса или перестановки фокус SHALL возвращаться к меню той же карточки без дополнительной программной прокрутки. Формы создания, переименования и переноса SHALL открываться в компактном диалоге на широком экране и подходящей мобильной поверхности с управлением фокусом на узком; редактирование карточки SHALL использовать её доступную страницу. Все статусы и основные контролы SHALL оставаться достижимыми на узком экране, включая горизонтальную прокрутку доски.

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
- **THEN** открывается доступная страница карточки вместо диалога, а возврат на доску сохраняет доступ к карточкам

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
Система SHALL создавать карточку через компактную форму с обязательным названием и двумя подписанными переключателями признаков, назначая пустое описание. Редактирование SHALL открывать страницу карточки с сохранёнными названием, описанием и признаками и сохранять четыре поля одним действием. Обе формы SHALL быть доступны с клавиатуры и на узком экране, с подписями, ошибками и действиями на выбранном русском или английском языке.

#### Scenario: User opens card creation
- **WHEN** пользователь открывает создание карточки в выбранном статусе
- **THEN** форма содержит пустое название и выключенные переключатели «Важная» и «Срочная», а создаваемое описание пусто

#### Scenario: User edits name and flags together
- **WHEN** пользователь открывает редактирование из меню карточки, меняет название и оба признака и сохраняет
- **THEN** страница первоначально показывает сохранённые значения, а успешное сохранение применяет название, описание и признаки вместе

#### Scenario: User submits an empty card name
- **WHEN** пользователь отправляет форму создания или редактирования с названием только из пробелов
- **THEN** система показывает ошибку обязательного названия и не сохраняет ни название, ни описание, ни признаки, ни изменение порядка

#### Scenario: User cancels card editing
- **WHEN** пользователь меняет поля страницы и подтверждает выход без сохранения
- **THEN** название, описание, признаки и порядок карточки остаются прежними

#### Scenario: User edits on a narrow screen with a keyboard
- **WHEN** пользователь открывает форму карточки на узком экране и работает с клавиатуры
- **THEN** название, описание при редактировании и оба подписанных переключателя читаемы и доступны с клавиатуры; форма создания получает фокус и возвращает его к созданию после закрытия, а страница редактирования поддерживает возврат на доску

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
The system SHALL offer one primary creation entry in the application bar for the current workspace screen: project creation in the catalogue and status creation on a board. That entry SHALL open the existing focused creation dialog or mobile sheet. Empty-state content SHALL explain the next step without duplicating the creation form or button.

#### Scenario: User opens an empty catalogue
- **WHEN** no projects exist
- **THEN** the catalogue explains the empty state and its application bar offers the only project-creation entry, which opens the project-name form

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
Система SHALL показывать статусы открытыми колонками на тёплом нейтральном фоне, отдельные светлые карточки и сдержанные зелёные действия. Заголовки статусов SHALL показывать компактный счётчик. Метки признаков SHALL оставаться читаемым текстом с различимыми символами или формами, без семантики завершения статусов. Меню карточки SHALL постоянно находиться справа от заголовка и оставаться доступным при длинном названии. Нижняя панель контролов, стрелки переноса и отдельная ручка перетаскивания SHALL отсутствовать.

#### Scenario: User compares cards across statuses
- **WHEN** на доске показаны карточки всех четырёх комбинаций признаков
- **THEN** карточки различимы, обозначены только включённые признаки, меню видно рядом с названием, а нижней панели и стрелок нет

#### Scenario: A card has a long name
- **WHEN** название карточки занимает несколько строк на широком или узком экране
- **THEN** оно переносится, не перекрывая постоянно видимое меню справа, а метки находятся под заголовком

### Requirement: Useful desktop board width and contained mobile scrolling
The system SHALL fit all four status columns of a four-status board at viewport widths 1280 and 1440 px without horizontal board scrolling. At 320 and 390 px, status columns SHALL retain readable cards and touch controls using horizontal scrolling contained within the board, with no horizontal page overflow. Long user names SHALL wrap without covering controls.

#### Scenario: User views a four-status board on desktop
- **WHEN** the viewport is 1280 or 1440 px wide and the board contains four statuses
- **THEN** all four status headers and card widths fit the working area at once

#### Scenario: User reaches another status on mobile
- **WHEN** the viewport is 320 or 390 px wide and the board contains several statuses with long names
- **THEN** the user can horizontally scroll the board to every status while the page width remains within the viewport and controls remain operable

### Requirement: Card creation follows its status list
Система SHALL показывать два входа создания карточки в каждом статусе: в заголовке перед меню действий и после списка, включая пустой. Верхний вход SHALL быть зелёным квадратным плюсом без видимой подписи, как добавление статуса; нижний SHALL сочетать такой же плюс с подписью в одной кнопке. Оба SHALL открывать одну форму в своём статусе и возвращать фокус к нажатому входу после закрытия без принудительной прокрутки к другому входу.

#### Scenario: User creates a card after reviewing a status
- **WHEN** пользователь достигает конца списка карточек статуса и активирует нижний вход создания
- **THEN** открывается существующая форма создания в этом статусе; закрытие формы возвращает фокус к нижней кнопке без изменения существующих карточек

#### Scenario: User creates a card from the status header
- **WHEN** пользователь активирует плюс в заголовке выбранного статуса
- **THEN** открывается та же форма создания карточки в этом статусе, что и с нижней кнопки, а закрытие возвращает фокус к верхнему плюсу

#### Scenario: User sees both creation entries
- **WHEN** на доске показан пустой или заполненный статус
- **THEN** перед меню в заголовке виден зелёный квадратный плюс с теми же размером, символом и оформлением, что у добавления статуса; после списка виден такой же плюс с подписью «Добавить карточку» или «Add card» на выбранном языке, образующие одну кнопку и одну остановку Tab

#### Scenario: User identifies the header action
- **WHEN** пользователь наводит указатель на верхний плюс или переводит на него фокус клавиатурой
- **THEN** доступна читаемая подсказка «Добавить карточку» или «Add card» на выбранном языке; верхняя кнопка также имеет соответствующее доступное имя для вспомогательных технологий

#### Scenario: User adds from the end of a long list
- **WHEN** пользователь прокручивает длинный список до нижней кнопки, открывает форму и закрывает её после создания или отмены
- **THEN** пользователю не требуется прокручивать к заголовку для добавления, фокус возвращается на нижнюю кнопку, а интерфейс не прокручивает доску к верхнему плюсу

#### Scenario: User creates a card using the keyboard
- **WHEN** пользователь переводит фокус на любой из двух входов и нажимает Enter или Space
- **THEN** форма получает фокус; после успешного сохранения, отмены или Escape фокус возвращается на конкретную кнопку, открывшую форму

#### Scenario: User sees long status names on different screens
- **WHEN** доска с длинными названиями статусов показана на ширине 320, 390, 1280 или 1440 px
- **THEN** названия переносятся, не перекрывая плюс, счётчик и меню; оба входа остаются доступны, зона верхней кнопки и квадратного плюса нижней кнопки составляет не менее 44 на 44 px, страница не получает горизонтальную прокрутку, а четыре статуса на 1280 и 1440 px помещаются без горизонтальной прокрутки доски

#### Scenario: Saving from either entry fails
- **WHEN** пользователь открывает форму любым из двух входов, вводит данные, а сохранение не удаётся
- **THEN** карточка не появляется, форма остаётся открытой с введёнными данными и сообщением об ошибке; после последующего закрытия фокус возвращается к исходному входу

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
После удаления открытого проекта система SHALL показывать каталог и исключать автоматическое открытие удалённого проекта. После удаления из каталога система SHALL оставаться в каталоге. При отсутствии проектов SHALL показываться его пустое состояние. Фокус SHALL переходить к следующему проекту, предыдущему при отсутствии следующего, либо созданию проекта при пустом каталоге; после удаления с доски — к созданию проекта.

#### Scenario: User deletes the open project
- **WHEN** удаление открытого проекта успешно сохранено
- **THEN** открывается каталог, маршрут и последний открытый проект больше не ссылаются на удалённый проект, фокус находится на создании проекта

#### Scenario: User deletes from catalogue
- **WHEN** пользователь удаляет проект из каталога, где есть другие проекты
- **THEN** каталог обновляется, остальные проекты сохраняют порядок, фокус переходит к следующему проекту или предыдущему, если следующего нет

#### Scenario: User deletes the last project
- **WHEN** пользователь удаляет единственный проект
- **THEN** каталог показывает пустое состояние и доступное создание проекта, которое получает фокус

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
Система SHALL начинать перенос за свободную площадь карточки после намеренного движения мыши либо удержания пальцем. Обычный свайп SHALL сохранять прокрутку до начала переноса. Меню и его действия SHALL не начинать перенос. Во время переноса система SHALL показывать карточку и допустимое место вставки в её группе выбранного статуса, включая пустой статус.

#### Scenario: User drags with a mouse
- **WHEN** пользователь нажимает на название, метку или свободную площадь карточки и перемещает мышь с нажатой основной кнопкой достаточно для начала жеста
- **THEN** начинается перенос без открытия страницы карточки, а допустимое место вставки видно до отпускания

#### Scenario: User holds on a phone
- **WHEN** пользователь удерживает палец на свободной площади карточки без начального свайпа
- **THEN** после удержания начинается перенос с видимой обратной связью; последующее движение управляет переносом, а отпускание в допустимом месте завершает его без открытия страницы

#### Scenario: User scrolls from a card
- **WHEN** пользователь начинает обычный вертикальный или горизонтальный свайп на карточке до активации удержанием
- **THEN** прокручивается соответствующая область, карточка не переносится и её страница не открывается

#### Scenario: Pointer is over a different priority group
- **WHEN** пользователь переносит карточку над областью другой группы признаков целевого статуса
- **THEN** показывается ближайшее допустимое место в собственной группе карточки либо место новой группы между приоритетными соседями; интерфейс не показывает вставку внутрь чужой группы

#### Scenario: User reaches an offscreen destination
- **WHEN** во время активного переноса пользователь подводит карточку к краю прокручиваемой доски либо длинного списка
- **THEN** соответствующая область автоматически прокручивается для достижения скрытых статусов или мест вставки, без горизонтального переполнения всей страницы

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
