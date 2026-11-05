# Spec Delta

## MODIFIED Requirements

### Requirement: Responsive application bar presentation
The application bar SHALL be a visually distinct, full-width light surface with a bottom boundary and content aligned with the main content width. In the catalogue, on the full card page and in service states it SHALL scroll with the document. On a project board, with or without an open card panel, the board workspace SHALL be bounded by the available viewport height below the application bar, using the dynamic viewport height on mobile browsers; the application bar SHALL remain at the top while the whole board scrolls inside the workspace vertically and horizontally, and the page itself SHALL not scroll. At a 320 px viewport, the brand, heading, settings gear and creation plus when applicable SHALL remain visible and operable without horizontal page overflow or hiding the plus in a menu.

#### Scenario: User works on a narrow screen
- **WHEN** the catalogue or board is viewed at a width of 320 or 390 px
- **THEN** the bar uses two layout rows, with the brand and action icons above a full-width heading, and no horizontal page overflow

#### Scenario: User works on a wide screen
- **WHEN** the catalogue or board is viewed at a width of 1280 or 1440 px with a short heading
- **THEN** the brand, heading, creation plus and settings gear occupy a single layout row in that order

#### Scenario: User scrolls the page
- **WHEN** the user scrolls below the top of a long catalogue or full card page
- **THEN** the application bar moves with the document rather than remaining fixed above the content

#### Scenario: User scrolls a board
- **WHEN** the user scrolls a board's content vertically or horizontally, with or without an open card panel, at 320, 390, 1280 or 1440 px
- **THEN** every status scrolls together inside the viewport-bounded workspace, the application bar stays at the top of the viewport in full on every width, and the document itself does not scroll
