# Spec Delta

## MODIFIED Requirements

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
The system SHALL expose primary project, status, and card operations through semantic controls usable without drag-and-drop. Card move arrows SHALL remain visible and usable by touch and keyboard on narrow screens. After a keyboard-initiated card move succeeds, focus SHALL return to a control on the moved card without an additional programmatic scroll of the board. The system SHALL provide compact creation, rename, and move forms in a dialog on wider screens and a mobile-appropriate sheet or equivalent focus-managed surface on narrow screens; card editing SHALL use its accessible detail panel or full page. On a narrow viewport, all status columns and their primary controls SHALL remain reachable, including through horizontal scrolling when necessary.

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

#### Scenario: User opens card editing on mobile
- **WHEN** пользователь выбирает редактирование карточки на узком экране
- **THEN** подробности карточки открываются на весь экран вместо диалога, а возврат на доску сохраняет доступ к карточкам


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

## ADDED Requirements

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

