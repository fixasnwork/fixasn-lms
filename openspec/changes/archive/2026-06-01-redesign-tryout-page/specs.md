# Redesign Tryout Page - Package-Centric View

## Requirements

### Requirement: Trial card always visible
The trial card SHALL always be displayed at the top of the tryout page, regardless of user authentication or purchase status.

#### Scenario: Unauthenticated user sees trial
- **WHEN** user visits tryout page without authentication
- **THEN** trial card is shown with "Coba Sekarang" button

#### Scenario: Authenticated user with purchases sees trial
- **WHEN** authenticated user visits tryout page
- **THEN** trial card is shown at top, above other sections

### Requirement: Show available packages for purchase
The page SHALL display unpurchased packages with a "Beli" button that redirects to `/buy`.

#### Scenario: User has no purchases
- **WHEN** user has no verified or pending payments
- **THEN** all active non-trial packages are shown in "Available" section

#### Scenario: User has some purchases
- **WHEN** user owns package A but not package B
- **THEN** only package B is shown in "Available" section

#### Scenario: User owns all packages
- **WHEN** user has verified/pending payments for all active packages
- **THEN** "Available" section is hidden entirely

#### Scenario: Click "Beli" button
- **WHEN** user clicks "Beli" on any package card
- **THEN** user is redirected to `/buy` page

### Requirement: Show owned packages with progress
The page SHALL display owned packages with progress indicator and per-tryout details.

#### Scenario: Package with no attempts
- **WHEN** user owns a package but has no attempts
- **THEN** progress shows "0/N tryout selesai"
- **AND** all tryouts show "Belum dikerjakan"

#### Scenario: Package with partial attempts
- **WHEN** user has attempted 3 of 10 tryouts in a package
- **THEN** progress shows "3/10 tryout selesai"

#### Scenario: Package with all attempts
- **WHEN** user has attempted all tryouts in a package
- **THEN** progress shows "N/N tryout selesai"

### Requirement: Show best score per tryout
For each tryout, the page SHALL display the best (highest) total score from all attempts.

#### Scenario: Single attempt
- **WHEN** user has one attempt with score 520
- **THEN** tryout shows "Skor: 520"

#### Scenario: Multiple attempts
- **WHEN** user has attempts with scores 380, 520, 450
- **THEN** tryout shows "Skor: 520" (best score)

#### Scenario: No attempts
- **WHEN** user has no attempts for a tryout
- **THEN** tryout shows "Belum dikerjakan"

### Requirement: Start/resume tryout from package view
Each tryout in an owned package SHALL have a "Mulai" button to start or resume.

#### Scenario: Start new tryout
- **WHEN** user clicks "Mulai" on unattempted tryout
- **THEN** new attempt is created and user navigates to tryout page

#### Scenario: Resume incomplete tryout
- **WHEN** user clicks "Mulai" on incomplete attempt
- **THEN** existing attempt is resumed

#### Scenario: Retry completed tryout
- **WHEN** user clicks "Mulai" on completed tryout
- **THEN** new attempt is created (allows retry)

### Requirement: Loading state
The page SHALL show loading indicators while data is being fetched.

#### Scenario: Initial load
- **WHEN** page is loading tryout data
- **THEN** loading spinner is shown with "Memuat data tryout..." text

#### Scenario: Data loaded
- **WHEN** all data has loaded
- **THEN** loading indicator disappears and content is shown
