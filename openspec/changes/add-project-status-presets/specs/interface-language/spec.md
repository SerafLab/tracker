# Spec Delta

## ADDED Requirements

### Requirement: Localized initial status sets
Система SHALL показывать названия наборов, подписи выбора и предварительный список статусов на текущем языке интерфейса. При создании проекта система SHALL сохранять названия статусов на языке интерфейса в момент отправки формы. Английские наборы SHALL иметь следующий состав и порядок.

#### Scenario: English status-set catalogue
- **WHEN** пользователь открывает создание проекта на английском языке
- **THEN** поле «Status set» предлагает «Simple», «Search and selection», «Applications and documents», «Development», «Job search» и «No statuses»; выбран «Simple»

#### Scenario: English simple set
- **WHEN** пользователь создаёт проект с набором «Simple»
- **THEN** статусы: «To do», «In progress», «Done»

#### Scenario: English search and selection set
- **WHEN** пользователь создаёт проект с набором «Search and selection»
- **THEN** статусы: «Found», «Under consideration», «Shortlisted», «Not suitable»

#### Scenario: English applications and documents set
- **WHEN** пользователь создаёт проект с набором «Applications and documents»
- **THEN** статусы: «To prepare», «Submitted», «Awaiting response», «Completed»

#### Scenario: English development set
- **WHEN** пользователь создаёт проект с набором «Development»
- **THEN** статусы: «Planned», «On hold», «In development», «In review», «Done»

#### Scenario: English job search set
- **WHEN** пользователь создаёт проект с набором «Job search»
- **THEN** статусы: «Interested», «Applied», «Interviews», «Offer», «Rejected»

### Requirement: Saved preset names become project data
После создания проекта система SHALL считать названия его статусов сохранёнными данными пользователя: смена языка интерфейса SHALL не переводить, не заменять и не восстанавливать их, включая изменённые пользователем названия. Новый проект SHALL использовать язык интерфейса на момент своего создания.

#### Scenario: Interface language changes after creation
- **WHEN** пользователь создаёт проект на русском языке, переименовывает один из статусов и переключает интерфейс на английский
- **THEN** все сохранённые названия, включая переименованное, остаются прежними после переключения и перезагрузки

#### Scenario: Another project uses the newly selected language
- **WHEN** после переключения на английский пользователь создаёт ещё один проект с тем же набором
- **THEN** новый проект содержит английские статусы, а прежний проект не меняется

#### Scenario: Existing empty project receives a set after language change
- **WHEN** пользователь создал проект без статусов на русском языке, переключил интерфейс на английский и применил к этому проекту набор
- **THEN** новые статусы получают английские названия, которые затем сохраняются как данные проекта при дальнейшей смене языка
