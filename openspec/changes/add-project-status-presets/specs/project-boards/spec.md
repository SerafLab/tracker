# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
