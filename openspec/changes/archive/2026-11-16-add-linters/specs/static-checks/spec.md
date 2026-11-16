# Spec Delta

## Purpose

Обеспечивает обязательные статические проверки исходного кода — линтинг и проверку типов, — которые находят дефекты до отправки ветки и слияния и одинаково выполняются локально, в хуке pre-push и в CI.

## ADDED Requirements

### Requirement: Static checks in the required check
The required project check SHALL run JavaScript/TypeScript linting, CSS linting and type checking before the slower test steps. The same required check SHALL gate the pre-push hook, pull request CI and publication.

#### Scenario: Lint finding stops the required check early
- **WHEN** a contributor runs the required check on code with a lint finding
- **THEN** the check fails at the linting step, reports the file, line and rule, and does not start the test steps

#### Scenario: Push and pull request use the same static checks
- **WHEN** a branch with a type error is pushed through the pre-push hook or checked by pull request CI
- **THEN** the push is rejected and the pull request check fails with the same type error

### Requirement: Static check coverage
Linting SHALL cover all hand-written JavaScript, TypeScript and CSS source: application code, unit and browser tests, project scripts and build and test configuration in the repository root. Type checking and type-aware lint rules SHALL cover all of that source written in TypeScript. Generated output, installed dependencies and other checkouts nested in the repository directory SHALL be excluded.

#### Scenario: Browser test helper is type checked
- **WHEN** a TypeScript browser test helper uses an undefined Node API or a wrong type
- **THEN** type checking reports the error

#### Scenario: JavaScript project script is linted
- **WHEN** a JavaScript project script declares a variable that is never used
- **THEN** linting reports it

#### Scenario: Nested agent checkout is ignored
- **WHEN** another git worktree exists inside the repository directory
- **THEN** static checks do not report findings from its files

#### Scenario: Build output is ignored
- **WHEN** a production build or browser test report exists in the working tree
- **THEN** static checks do not report findings from those generated files

### Requirement: Every finding fails the check
Every static check finding SHALL fail the required check. Static checks SHALL NOT use a warning level, a baseline of accepted findings or an allowance of findings.

#### Scenario: Single finding fails the check
- **WHEN** exactly one lint or type finding exists anywhere in the covered source
- **THEN** the required check fails

### Requirement: Defect-focused rules
Linting SHALL detect defects rather than enforce formatting: promises that are neither awaited nor handled, promises passed where a non-promise is expected, violations of React hook rules and of the React Compiler's assumptions, and untyped values flowing into typed code. Formatting and stylistic preferences SHALL NOT fail linting.

#### Scenario: Unhandled promise is reported
- **WHEN** code calls an async storage operation without awaiting or handling its result
- **THEN** linting reports the unhandled promise

#### Scenario: Conditional hook call is reported
- **WHEN** a component calls a React hook inside a condition
- **THEN** linting reports the hook rule violation

#### Scenario: Untyped value is reported
- **WHEN** a value typed as `any` is assigned to a typed variable or passed as a typed argument
- **THEN** linting reports the unsafe use

#### Scenario: Formatting differences are not findings
- **WHEN** code differs only in semicolons, quote style or line wrapping
- **THEN** linting reports no finding

#### Scenario: CSS defect is reported
- **WHEN** a stylesheet contains an unknown property, a duplicate property or a duplicate selector
- **THEN** CSS linting reports it

### Requirement: Strict type checking for all code
Type checking SHALL apply strict mode and SHALL report unused local variables and parameters in application code, tests, scripts and configuration alike.

#### Scenario: Unused variable in a test is reported
- **WHEN** a unit test declares a local variable that is never read
- **THEN** type checking reports it

### Requirement: Scoped and justified rule suppressions
An inline suppression SHALL name the specific rule, SHALL apply to the smallest practical scope and SHALL state its reason. A suppression that no longer suppresses anything SHALL fail the check.

#### Scenario: Suppression without reason is rejected
- **WHEN** a change adds a suppression that names no rule or gives no reason
- **THEN** the change is not accepted: the check fails where the linter can detect it, and review rejects it otherwise

#### Scenario: Stale suppression fails the check
- **WHEN** code under a suppression is fixed so the suppressed rule no longer fires
- **THEN** the required check reports the unused suppression and fails

### Requirement: Protected static check configuration
Changes to linter configuration and TypeScript project configuration SHALL count as high-risk changes that need human approval before merge.

#### Scenario: Rule is disabled in configuration
- **WHEN** a pull request changes a linter configuration file or a TypeScript configuration file
- **THEN** the high-risk path report lists the file and the pull request requires human approval before merge
