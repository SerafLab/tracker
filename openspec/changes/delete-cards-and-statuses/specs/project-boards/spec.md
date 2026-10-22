# Spec Delta

## ADDED Requirements

### Requirement: Confirmed card deletion
The system SHALL offer deletion in each card's action menu. It SHALL identify the selected card and the irreversible effect in a confirmation dialog, and SHALL delete only that card after explicit confirmation. Cancelling SHALL leave the board unchanged.

#### Scenario: User deletes a card
- **WHEN** the user confirms deletion of a named card
- **THEN** that card disappears from its status, the remaining cards retain their relative order, and the deletion persists after reload

#### Scenario: User cancels card deletion
- **WHEN** the user opens a card's deletion dialog and cancels it
- **THEN** the card and its status remain unchanged

#### Scenario: Cards share a name
- **WHEN** two cards share a name and the user confirms deletion for one of them
- **THEN** only the selected card is deleted

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
The system SHALL report deletion as successful only after it has been saved in local storage. If saving fails, the card or status SHALL remain visible and the interface SHALL report the failure.

#### Scenario: Card deletion cannot be saved
- **WHEN** the user confirms card deletion and storage rejects the change
- **THEN** the card remains in its original status and the interface reports the failure

#### Scenario: Status deletion cannot be saved
- **WHEN** the user confirms deletion of an empty status and storage rejects the change
- **THEN** the status remains on the board and the interface reports the failure
