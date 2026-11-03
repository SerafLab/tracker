# Spec Delta

## MODIFIED Requirements

### Requirement: Calm board and card presentation
The system SHALL present statuses as open columns on a warm neutral workspace, with individually bounded light cards and restrained green actions. Status columns SHALL have subtle visual boundaries that distinguish them from the workspace and from one another. Status headers SHALL show a compact card count and occupy a shared height so card lists begin at the same vertical position across columns, regardless of how many lines a status name wraps to. Priority flags SHALL remain readable text with distinct symbols or shapes, without assigning completion meaning to statuses. Existing visible move arrows and secondary controls SHALL remain available.

#### Scenario: User compares cards across statuses
- **WHEN** a board contains cards with all four priority-flag combinations
- **THEN** cards remain individually distinct, only enabled flags are labeled, and both move arrows and the card menu remain reachable

#### Scenario: Status names wrap to different numbers of lines
- **WHEN** a board has one status name that fits on one line and another that wraps to four lines
- **THEN** the columns remain visually distinguishable and card lists in all statuses begin at the same vertical position
