# Spec Delta

## Purpose

Обеспечивает достоверные и воспроизводимые результаты автоматических регрессионных проверок и сохраняет достаточную диагностику для разбора сбоев локально и в CI.

## ADDED Requirements

### Requirement: Completed-operation assertions
Regression checks SHALL evaluate the completed observable result of an asynchronous operation before performing a dependent action. They SHALL distinguish a rendered intermediate state from completed navigation, restored focus, or durable saving.

#### Scenario: Navigation changes the address before the panel closes
- **WHEN** a check leaves a card panel and the board address appears before the panel has closed
- **THEN** the check waits for the completed board view before issuing the next sequential navigation action

#### Scenario: Saving updates the view before the next action is ready
- **WHEN** a check sees newly rendered saved content while the relevant save action is still pending
- **THEN** the check waits for the operation to settle before opening another editor or asserting durable storage

#### Scenario: A control closes before focus is restored
- **WHEN** a check dismisses a dialog or panel and then uses a control affected by focus restoration
- **THEN** it waits for the expected restored focus before continuing

### Requirement: Guarded-navigation regression coverage
The required browser checks SHALL cover native close cancellation with a draft, rapid repeated Back with a draft, and their combination. They SHALL verify the guard decision, final destination, and saved content after Forward and reload without replacing real browser history or native close events with synthetic equivalents.

#### Scenario: User cancels native close and stays after rapid Back
- **WHEN** the browser warns about a draft, closing is cancelled, and rapid Back requests are followed by Stay
- **THEN** the check confirms one guard, the original card address, unchanged draft content, and no unintended history growth

#### Scenario: User saves after rapid Back and returns Forward
- **WHEN** rapid Back requests are followed by Save and leave after all drafts save successfully
- **THEN** the check confirms the intended board destination exactly once, a closed card panel, a usable Forward entry, and the saved content after Forward and reload

#### Scenario: Guarded departure fails or is discarded
- **WHEN** a guarded save fails or the user chooses Discard
- **THEN** checks confirm that failure retains the card and draft, while Discard applies the chosen destination without persisting the discarded draft

### Requirement: Native touch regression coverage
The required browser checks SHALL verify horizontal and vertical native scrolling from a card before hold activation, intentional drag after hold, and cancellation. A scroll assertion SHALL compare the target workspace's position before and after the gesture and SHALL NOT pass from pre-existing scroll position alone.

#### Scenario: Swipe scrolls without editing or navigation
- **WHEN** a native swipe begins on a card with available scroll range in its direction before hold activation
- **THEN** the check confirms movement of the target workspace in that direction, no card write, no drag activation, and no opened card details

#### Scenario: Hold and cancellation retain their semantics
- **WHEN** a native hold starts drag and the user completes or cancels it
- **THEN** the check confirms the intended placement on completion, no placement write on cancellation, no accidental opening on release, and working independent tap navigation afterwards

### Requirement: Isolated browser verification
A browser verification run SHALL use the build and test server belonging to its own checkout. A conflicting listener or concurrent build/output writer SHALL cause an explicit setup failure or require a separately isolated run; it SHALL NOT silently select another checkout's server or overwrite an active run's outputs.

#### Scenario: Another checkout occupies the selected port
- **WHEN** browser verification starts while another server occupies its selected port
- **THEN** it fails visibly or uses an explicitly selected separate port, and it does not reuse that server implicitly

#### Scenario: Independent checkouts run checks concurrently
- **WHEN** two checkouts run supported browser verification concurrently
- **THEN** their servers, build outputs and reports remain separate and each verifies its own source revision

### Requirement: First-failure evidence and acceptance
PR and publication checks SHALL preserve available browser failure reports and traces from the first failed attempt, including explicitly created browser contexts. A retry or later successful rerun SHALL NOT erase the original failure or count as evidence that its cause was fixed. The documented acceptance record SHALL identify the revision, environment, commands, repetitions and any failures.

#### Scenario: A browser check fails in either workflow
- **WHEN** a browser check fails in PR CI or the publication build
- **THEN** its available failure context, report and trace are uploaded with the run identity, the job remains failed, and failed publication checks do not deploy

#### Scenario: An earlier check fails before browser tests start
- **WHEN** architecture, unit checks or the build fail before browser artifacts exist
- **THEN** the original failing result and log remain authoritative and artifact collection does not replace that failure with a missing-file error

#### Scenario: A regression fix is accepted
- **WHEN** a previously failing scenario is reported as fixed
- **THEN** the record explains the cause and preserved behavior, includes repeated targeted runs without retries and the full required check result, and distinguishes local verification, GitHub checks and publication status
