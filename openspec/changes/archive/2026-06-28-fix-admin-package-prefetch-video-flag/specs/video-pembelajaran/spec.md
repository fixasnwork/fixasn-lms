## MODIFIED Requirements

### Requirement: Package flag controls video access eligibility
The system SHALL mark packages whose purchase grants video access with a `Package.includesVideoPembelajaran` boolean. The flag MUST be surfaced consistently across every read path that returns `Package` to the client (admin list, admin layout SSR prefetch, user buy page, user dashboard, packages-for-tryout linking), and every read path MUST coerce the raw database value to a definitive boolean at the boundary so that pre-migration rows with `NULL` are never serialized as `null` or `undefined` to the client.

#### Scenario: Default is false
- **WHEN** a new package is created
- **THEN** `includesVideoPembelajaran` defaults to `false`.

#### Scenario: Admin toggles the flag
- **WHEN** an admin sets `Package.includesVideoPembelajaran = true` for a package
- **THEN** the value is persisted
- **AND** the value is surfaced as `true` in every read path: the `mapPackage` of `app/api/packages/route.ts` (collection), the `mapPackage` of `app/api/packages/[packageId]/route.ts` (per-id), and the `['packages']` prefetch mapper of `app/admin/layout.tsx` (admin SSR prefetch used by `HydrationBoundary`).

#### Scenario: Legacy NULL rows render as false
- **WHEN** a `Package` row exists with `includesVideoPembelajaran IS NULL` (pre-migration data)
- **THEN** every read path's mapper coerces the value via `Boolean(...)` so the client receives `false` (not `null` or `undefined`)
- **AND** the admin settings page renders the "🎬 Video" badge as hidden
- **AND** the package edit form renders the "Video Pembelajaran" checkbox as unchecked
- **AND** no React "changing uncontrolled input to controlled" warning is emitted.

#### Scenario: Direct DB edit is visible after a normal page load
- **WHEN** an admin or operator changes `Package.includesVideoPembelajaran` directly in the database (Supabase Studio, `prisma db push`, manual SQL — outside the admin form)
- **THEN** the next mount of any page using `usePackages` reflects the new value without requiring a manual browser cache clear
- **AND** the `usePackages` TanStack Query hook does not pin the response with a `staleTime` longer than the default (`0`).

## ADDED Requirements

### Requirement: Admin SSR prefetch mirrors API mappers
The `['packages']` server-side prefetch in `app/admin/layout.tsx` (used by `HydrationBoundary` to seed the admin client cache) MUST produce package objects with the same field shape and value semantics as the `/api/packages` response. The prefetch mapper MUST include `includesVideoPembelajaran` and coerce it via `Boolean(...)`, exactly matching the coercion used by `mapPackage` in `app/api/packages/route.ts`. If a future field is added to the `Package` type and surfaced by the API mappers, it MUST also be added to the SSR prefetch mapper in the same change.

#### Scenario: Prefetch object shape matches API response
- **WHEN** a developer inspects the dehydrated TanStack Query state rendered into the admin page HTML
- **THEN** each package object in the `['packages']` query contains the same keys as the JSON returned by `GET /api/packages`
- **AND** `includesVideoPembelajaran` is present and is a JSON boolean (never `null`, never missing).

#### Scenario: First admin render reflects server data
- **WHEN** an admin opens `/admin/settings` and the server prefetch has populated the cache
- **THEN** the first paint of the page (before any client refetch) shows the correct "🎬 Video" badge state and the correct checkbox state for every package.

### Requirement: Component checkbox state is always controlled
Client components that render checkboxes or text inputs bound to a `Package` field MUST coerce the prop value to a safe default at `useState` initialization so that `null` or `undefined` from the API never causes a "changing uncontrolled input to controlled" React warning. The same defensive coercion MUST be applied to `BankAccount` text and boolean fields in the admin settings page.

#### Scenario: PackageCard edit form
- **WHEN** an admin opens the edit form for any package, including one with a pre-migration `NULL` flag
- **THEN** the `isTrial` and `includesVideoPembelajaran` checkboxes initialize to `Boolean(pkg.<field>)` (resolves `null`/`undefined` to `false`)
- **AND** the `name`, `description`, and `price` inputs initialize to `pkg.<field> ?? ''` / `?? 0`.

#### Scenario: BankCard edit form
- **WHEN** an admin opens the edit form for any bank account
- **THEN** text inputs initialize to `bank.<field> ?? ''`
- **AND** the `isActive` checkbox initializes to `Boolean(bank.isActive)`.

#### Scenario: No React uncontrolled-input warning
- **WHEN** an admin opens `/admin/settings` against a database with any `NULL` flag values
- **THEN** the browser console emits zero warnings of the form "A component is changing an uncontrolled input to be controlled."
