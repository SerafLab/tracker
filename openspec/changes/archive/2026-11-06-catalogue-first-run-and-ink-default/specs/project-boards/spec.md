# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
