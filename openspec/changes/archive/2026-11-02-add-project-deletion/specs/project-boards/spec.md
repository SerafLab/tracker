# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
