## ADDED Requirements

### Requirement: Admin shell adapts to standard Tailwind breakpoints
The admin layout SHALL render usable content at Tailwind standard viewport breakpoints (`sm`, `md`, `lg`, `xl`) without page-level horizontal overflow caused by the layout shell.

#### Scenario: Mobile admin shell has no desktop width constraint
- **WHEN** an admin page is viewed below the `md` breakpoint
- **THEN** the main content SHALL use the available viewport width without a desktop sidebar max-width calculation

#### Scenario: Desktop admin shell reserves sidebar space
- **WHEN** an admin page is viewed at or above the `md` breakpoint
- **THEN** the main content SHALL reserve space for the fixed admin sidebar and remain within the visible viewport

#### Scenario: Mobile admin content clears fixed navigation
- **WHEN** an admin page is viewed below the `md` breakpoint
- **THEN** the main content SHALL include enough bottom spacing for the fixed mobile navigation and safe-area inset

### Requirement: Admin navigation remains reachable on mobile and desktop
The admin navigation SHALL keep all admin destinations reachable across mobile and desktop layouts while avoiding crowded mobile bottom navigation.

#### Scenario: Desktop admin navigation shows all destinations
- **WHEN** an admin page is viewed at or above the `md` breakpoint
- **THEN** the fixed sidebar SHALL display all admin destinations and the logout action

#### Scenario: Mobile admin navigation uses More menu
- **WHEN** an admin page is viewed below the `md` breakpoint
- **THEN** high-frequency admin destinations SHALL appear in the bottom navigation and lower-frequency destinations SHALL be reachable behind a "More" menu

#### Scenario: Mobile More menu closes after navigation
- **WHEN** an admin selects a destination from the mobile "More" menu
- **THEN** the menu SHALL close and the app SHALL navigate to the selected admin page

### Requirement: Admin content controls remain readable and tappable
Admin pages and admin-specific components SHALL adapt cards, forms, modals, upload controls, and action groups so primary information and controls remain readable and tappable on mobile, tablet, and desktop viewports.

#### Scenario: Admin cards stack on mobile
- **WHEN** an admin page displays statistic cards or management cards below the `sm` breakpoint
- **THEN** the cards SHALL stack or use a compact grid without clipping labels, values, or primary actions

#### Scenario: Admin forms stack fields on narrow screens
- **WHEN** an admin settings or branding form is viewed below the `md` breakpoint
- **THEN** form fields and editor panels SHALL stack vertically and inputs SHALL fit within the viewport

#### Scenario: Admin action groups wrap on narrow screens
- **WHEN** an admin card or form displays multiple action buttons below the `sm` breakpoint
- **THEN** the actions SHALL wrap or become full-width so each action remains visible and tappable

#### Scenario: Admin modals fit mobile viewports
- **WHEN** an admin modal is opened below the `sm` breakpoint
- **THEN** the modal content SHALL fit within the viewport with internal scrolling for overflow content

### Requirement: Payment verification is responsive
The payment verification admin page SHALL preserve all payment review actions while adapting payment summary, filter, proof, and block flows to mobile, tablet, and desktop viewports.

#### Scenario: Payment list stacks on mobile
- **WHEN** payment records are displayed below the `md` breakpoint
- **THEN** each payment SHALL present user identity, status, package, date, and available actions in a stacked card layout without requiring horizontal page scrolling

#### Scenario: Payment filters wrap on mobile
- **WHEN** payment filters are displayed below the `sm` breakpoint
- **THEN** filter controls SHALL wrap within the viewport and remain tappable

#### Scenario: Payment proof remains reviewable on mobile
- **WHEN** an admin opens payment proof below the `sm` breakpoint
- **THEN** proof details, proof image, and available verification actions SHALL remain visible through responsive layout or modal scrolling

### Requirement: Question management uses mobile cards
The question management admin interface SHALL render `SoalTable` as a true card list on mobile while preserving the existing table-oriented density for wider viewports.

#### Scenario: SoalTable renders cards on mobile
- **WHEN** `SoalTable` is viewed below the `md` breakpoint
- **THEN** each question SHALL render as a card containing category, question preview, option summary, answer summary, images when present, and edit/delete actions

#### Scenario: SoalTable renders table on larger viewports
- **WHEN** `SoalTable` is viewed at or above the `md` breakpoint
- **THEN** questions SHALL render in the table layout with columns for number, category, question, options, answer, and actions

#### Scenario: Mobile question actions are directly accessible
- **WHEN** an admin views a question card below the `md` breakpoint
- **THEN** edit and delete actions SHALL be visible without horizontal scrolling

### Requirement: Responsive implementation preserves existing behavior
Responsive admin UI changes SHALL NOT alter admin authorization, route paths, API contracts, data fetching behavior, or persisted data.

#### Scenario: Admin routes remain unchanged
- **WHEN** the responsive admin UI change is applied
- **THEN** existing admin route paths SHALL continue to resolve with the same authorization requirements

#### Scenario: Admin data APIs remain unchanged
- **WHEN** admin pages fetch or mutate payments, packages, banks, questions, logo configuration, or uploads
- **THEN** the existing API endpoints and request/response contracts SHALL remain unchanged

#### Scenario: Production build remains valid
- **WHEN** the responsive admin UI change is complete
- **THEN** the application SHALL pass the production build
