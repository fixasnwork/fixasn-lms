## Purpose

Defines persistent admin catalog management for packages, tryouts, package assignments, payment bank accounts, and shared question-bank tryout behavior.

## Requirements

### Requirement: Database-backed package CRUD
The system SHALL provide database-backed package create, read, update, and delete behavior for admin settings. Package mutations SHALL require an authenticated admin session. Package reads SHALL exclude rows where `deletedAt` is not null.

#### Scenario: Admin reads packages
- **WHEN** admin settings loads package data
- **THEN** the system returns packages from the database ordered by id and excludes soft-deleted packages

#### Scenario: Admin package prefetch excludes deleted packages
- **WHEN** an admin hard-refreshes an admin page that hydrates package query data
- **THEN** the server-prefetched package data excludes rows where `deletedAt` is not null

#### Scenario: Package tryout count reflects assignments
- **WHEN** admin settings displays package cards
- **THEN** each package card shows a tryout count based on current non-deleted `PackageTryout` assignments rather than stale stored count data

#### Scenario: Admin creates package
- **WHEN** an admin creates a package with name, description, price, trial flag, and active flag
- **THEN** the system creates a `Package` row and returns the created package with id, timestamps, and submitted fields

#### Scenario: Admin updates package
- **WHEN** an admin updates an existing package's editable fields
- **THEN** the system updates only that package row and preserves its id and historical relations

#### Scenario: Package mutation requires admin
- **WHEN** a package create, update, or delete request is made without an admin session
- **THEN** the system rejects the request with an unauthorized or forbidden response and does not change package data

#### Scenario: Delete package without linked history
- **WHEN** an admin deletes a package that has no linked payment or purchase records
- **THEN** the system marks the package as deleted, removes package-tryout assignment rows for that package, and excludes the package from later package reads

#### Scenario: Block package deletion with linked history
- **WHEN** an admin deletes a package that has one or more linked `Payment` or `UserPurchase` records
- **THEN** the system rejects deletion with a conflict response and leaves the package and its assignments unchanged

### Requirement: Database-backed tryout CRUD
The system SHALL provide database-backed tryout create, read, update, and delete behavior for admin settings. Tryout mutations SHALL require an authenticated admin session. Tryout reads SHALL exclude rows where `deletedAt` is not null.

#### Scenario: Admin reads tryouts
- **WHEN** admin settings loads tryout data
- **THEN** the system returns non-deleted tryouts from the database ordered by `sortOrder` and id

#### Scenario: Admin reads all manageable tryouts
- **WHEN** admin settings loads the global tryout management list
- **THEN** the system returns all non-deleted tryouts, including tryouts that are not assigned to any package

#### Scenario: Admin creates tryout
- **WHEN** an admin creates a tryout with name, trial flag, sort order, and duration minutes
- **THEN** the system creates a `Tryout` row and returns the created tryout with an empty question list or question count metadata

#### Scenario: Admin updates tryout
- **WHEN** an admin updates an existing tryout's name, trial flag, sort order, or duration minutes
- **THEN** the system updates only that tryout row and preserves its id, question links, package links, and attempt links

#### Scenario: Tryout mutation requires admin
- **WHEN** a tryout create, update, or delete request is made without an admin session
- **THEN** the system rejects the request with an unauthorized or forbidden response and does not change tryout data

#### Scenario: Delete tryout without attempt history
- **WHEN** an admin deletes a tryout that has no linked `TryoutAttempt` records
- **THEN** the system marks the tryout as deleted, removes package-tryout assignment rows for that tryout, and excludes the tryout from later tryout reads

#### Scenario: Block tryout deletion with attempt history
- **WHEN** an admin deletes a tryout that has one or more linked `TryoutAttempt` records
- **THEN** the system rejects deletion with a conflict response and leaves the tryout and its assignments unchanged

### Requirement: Package tryout assignment management
The system SHALL allow admins to manage which tryouts belong to each package through the `PackageTryout` junction table. Assignment mutations SHALL be atomic and SHALL require an authenticated admin session.

#### Scenario: Admin reads package tryout assignments
- **WHEN** admin settings requests assignments for a package
- **THEN** the system returns the non-deleted tryouts assigned to that package ordered by `sortOrder` and id

#### Scenario: Admin replaces package tryout assignments
- **WHEN** an admin submits a package's desired list of tryout ids
- **THEN** the system replaces that package's assignment rows with exactly those tryouts in one transaction

#### Scenario: Assignment replacement validates package and tryouts
- **WHEN** assignment replacement references a missing, deleted, or invalid package or tryout id
- **THEN** the system rejects the request with an error response and leaves existing assignments unchanged

#### Scenario: Assignment replacement updates package count
- **WHEN** an admin replaces a package's tryout assignments
- **THEN** the system updates the package's `tryoutCount` to match the number of assigned non-deleted tryouts

#### Scenario: Assignment mutation requires admin
- **WHEN** a package assignment mutation is made without an admin session
- **THEN** the system rejects the request with an unauthorized or forbidden response and does not change assignments

### Requirement: Database-backed bank account CRUD
The system SHALL provide database-backed bank account create, read, update, and delete behavior. Bank account mutations SHALL require an authenticated admin session. Bank account deletion SHALL soft-delete rows by setting `deletedAt`.

#### Scenario: User-visible bank read returns active accounts only
- **WHEN** the payment page requests bank accounts without admin options
- **THEN** the system returns only bank accounts where `isActive` is true and `deletedAt` is null

#### Scenario: Admin reads manageable bank accounts
- **WHEN** admin settings requests bank accounts with admin scope
- **THEN** the system returns non-deleted bank accounts including inactive accounts

#### Scenario: Admin creates bank account
- **WHEN** an admin creates a bank account with bank name, account number, account holder, and active flag
- **THEN** the system creates a `BankAccount` row and returns the created bank account with id and timestamps

#### Scenario: Admin updates bank account
- **WHEN** an admin updates an existing bank account's editable fields
- **THEN** the system updates only that bank account row and returns the updated bank account

#### Scenario: Admin soft-deletes bank account
- **WHEN** an admin deletes a bank account
- **THEN** the system sets `deletedAt`, excludes it from user-visible reads, and excludes it from admin manageable reads

#### Scenario: Bank mutation requires admin
- **WHEN** a bank account create, update, or delete request is made without an admin session
- **THEN** the system rejects the request with an unauthorized or forbidden response and does not change bank account data

### Requirement: Settings page uses persistent backend state
The admin settings page SHALL load packages, tryouts, package assignments, and bank accounts from backend API queries and SHALL persist all edits through backend mutations. The page SHALL not rely on Zustand-only setters as the source of persistence.

#### Scenario: Settings page loads real data
- **WHEN** an admin opens the settings page
- **THEN** the page fetches package, tryout, package-assignment, and bank-account data from API-backed React Query hooks

#### Scenario: Package changes persist after reload
- **WHEN** an admin creates or edits a package and reloads the settings page
- **THEN** the package change remains visible because it was saved to the database

#### Scenario: Package tryout assignments persist after reload
- **WHEN** an admin changes which tryouts belong to a package and reloads the settings page
- **THEN** the selected assignments remain visible because they were saved to the database

#### Scenario: Bank account changes persist after reload
- **WHEN** an admin creates, edits, or deletes a bank account and reloads the settings page
- **THEN** the bank account list reflects the database state after that mutation

#### Scenario: Successful mutation refreshes affected queries
- **WHEN** a settings mutation succeeds
- **THEN** the page invalidates or refetches the affected package, tryout, assignment, or bank queries and displays a success message

#### Scenario: Deleted package remains hidden after hard refresh
- **WHEN** an admin deletes a package and hard-refreshes the admin area
- **THEN** the package remains hidden because both API reads and server-prefetched query data exclude soft-deleted rows

#### Scenario: Settings shows one bank creation entry point
- **WHEN** admin settings displays the bank account section
- **THEN** the page shows a single `Tambah Rekening` button in the card header and uses it to open the bank creation form

#### Scenario: Failed mutation shows error
- **WHEN** a settings mutation fails validation, authorization, or conflict checks
- **THEN** the page displays the server error and does not present unsaved client state as saved

### Requirement: Admin question bank respects shared package tryouts
The admin question-bank page SHALL display tryouts according to package assignments and SHALL treat tryouts as shared entities across packages.

#### Scenario: Paid package shows assigned trial tryout
- **WHEN** a trial tryout is assigned to a paid package
- **THEN** the paid package tab in the admin question bank includes that trial tryout

#### Scenario: Shared tryout edits sync across packages
- **WHEN** an admin edits questions or duration for a tryout from one package tab
- **THEN** another package tab that includes the same tryout shows the same updated tryout state

#### Scenario: Trial tryout tab indicator
- **WHEN** a tryout tab in a paid package represents a trial tryout
- **THEN** the tab displays a visible `Trial` indicator
