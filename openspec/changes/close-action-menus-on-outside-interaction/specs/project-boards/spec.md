# Spec Delta

## ADDED Requirements

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
