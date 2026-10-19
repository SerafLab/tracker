# Design

## Context

`ActionMenu` is shared by project menus in the catalogue and board, status menus, and card menus. It currently tracks local open state, focuses the first enabled item on opening, and listens for Escape. It does not observe interaction outside its own buttons. See [proposal.md](./proposal.md) for the user-facing problem.

## Goals / Non-Goals

**Goals:** Keep dismissal behavior in the shared menu component, preserve normal outside interactions, and maintain intentional keyboard focus behavior.

**Non-Goals:** Change the menu's visual design, action set, or dialog behavior.

## Decisions

### Observe pointer and focus events while a menu is open

Attach document-level `pointerdown` and `focusin` listeners only while an `ActionMenu` is open. Treat the trigger and panel as one interaction boundary. A pointer press or focus move outside that boundary closes the menu without cancelling the event or restoring trigger focus. `pointerdown` covers mouse and touch and lets the destination receive its subsequent click. A focus move also handles Tab without requiring special handling for the menu's position in the page's tab order.

Alternative considered: a page-wide overlay. It would intercept the first outside press and could block the target's action, contrary to the agreed behavior.

### Keep Escape and selection semantics

Retain the existing Escape handler and explicit trigger focus restoration. Keep selection closing the menu before invoking the action. The trigger remains inside the boundary so pressing it can toggle its own menu. When a second trigger is pressed, the first menu's outside listener closes it and the second trigger opens its menu on the same interaction.

Alternative considered: a global menu coordinator. The existing local state and shared outside boundary already express the required single-open behavior, so a coordinator would add unnecessary shared state.

## Risks / Trade-offs

- [Focus movement during a press can close a menu before its click handler runs] → Ignore focus and pointer events originating within that menu's trigger or panel; cover switching and item selection in interaction tests.
- [Document listeners can linger after unmount] → Register them in an effect that cleans up whenever the menu closes or unmounts.
