# User Package Catalog

## Purpose

User-facing package catalog behavior for visibility, ownership indicators, and payment package selection.

## Requirements

### Requirement: User package lists exclude deleted packages
The system SHALL exclude soft-deleted packages from user-facing package lists and from hydrated package cache used by user pages.

#### Scenario: Soft-deleted package exists
- **WHEN** a package has `deletedAt` set
- **THEN** dashboard, buy, payment, and tryout user pages MUST NOT render that package as selectable or purchasable

### Requirement: Active paid packages are visible
The system SHALL render every active package in user-facing catalog contexts regardless of package-level `isTrial` value.

#### Scenario: Paket Starter is active
- **WHEN** `Paket Starter` is active
- **THEN** buy, payment, dashboard, and tryout user pages MUST include `Paket Starter` in their package lists

### Requirement: Buy page marks owned packages
The buy page SHALL identify packages owned by the current user using pending or verified payments and present the ownership indicator without visual truncation.

#### Scenario: User has pending payment for package
- **WHEN** current user has a payment with status `pending` for a package
- **THEN** buy page MUST show that package as `Dimiliki`
- **THEN** the `Dimiliki` indicator MUST be fully visible and not clipped or truncated
- **THEN** buy page MUST disable purchase action for that package

#### Scenario: User has verified payment for package
- **WHEN** current user has a payment with status `verified` for a package
- **THEN** buy page MUST show that package as `Dimiliki`
- **THEN** the `Dimiliki` indicator MUST be fully visible and not clipped or truncated
- **THEN** buy page MUST disable purchase action for that package

#### Scenario: User has no active ownership payment
- **WHEN** current user has no `pending` or `verified` payment for an active package
- **THEN** buy page MUST allow purchase action for that package

### Requirement: Payment selection uses database package records
The payment page SHALL use DB/API-backed package and bank data for selection and submission.

#### Scenario: User opens payment page with package id
- **WHEN** user opens `/payment?pkg=<packageId>` for an active package
- **THEN** payment page MUST resolve the package using DB/API package records
- **THEN** submitted payment MUST use the DB package ID

#### Scenario: User selects package manually
- **WHEN** user selects an active package on payment page
- **THEN** payment submission MUST use that package's DB ID
