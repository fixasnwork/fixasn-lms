## ADDED Requirements

### Requirement: CSS custom properties for brand colors
The system SHALL define three CSS custom properties on `:root` for brand theming:
- `--brand-primary` (default: `#1B3A6B`)
- `--brand-secondary` (default: `#2563EB`)
- `--brand-dark` (default: `#0C1E45`)

#### Scenario: CSS variables are defined on page load
- **WHEN** any page of the application loads
- **THEN** `document.documentElement.style.getPropertyValue('--brand-primary')` returns a valid hex color
- **AND** `document.documentElement.style.getPropertyValue('--brand-secondary')` returns a valid hex color
- **AND** `document.documentElement.style.getPropertyValue('--brand-dark')` returns a valid hex color

### Requirement: Tailwind v4 @theme integration
The system SHALL expose the brand CSS variables as Tailwind theme tokens via `@theme inline` in `globals.css`, enabling utility classes like `text-brand`, `bg-brand-secondary`, `from-brand-dark`.

#### Scenario: Tailwind utility classes resolve to brand colors
- **WHEN** a component uses `className="text-brand"`
- **THEN** the element's text color is `var(--brand-primary, #1B3A6B)`
- **WHEN** a component uses `className="bg-brand-secondary"`
- **THEN** the element's background color is `var(--brand-secondary, #2563EB)`
- **WHEN** a component uses `className="from-brand-dark"`
- **THEN** the element's gradient start color is `var(--brand-dark, #0C1E45)`

### Requirement: All hardcoded brand hex references replaced
Every occurrence of the following hex values in Tailwind class strings SHALL be replaced with the corresponding theme utility class:
- `#1B3A6B` → `brand` (primary)
- `#2563EB` → `brand-secondary`
- `#0C1E45` → `brand-dark`

#### Scenario: No hardcoded brand hex in components
- **WHEN** searching all `.tsx` and `.ts` files in `components/` and `app/`
- **THEN** zero occurrences of `[#1B3A6B]`, `[#2563EB]`, or `[#0C1E45]` exist in Tailwind class strings

### Requirement: Client-side CSS variable injection
The system SHALL inject CSS custom properties from the database-stored `LogoConfig` into `document.documentElement.style` when `fetchLogoConfig` completes.

#### Scenario: DB config overrides default colors
- **WHEN** `logoConfigEntries` table contains `themePrimary = "#FF0000"`
- **AND** `fetchLogoConfig()` completes
- **THEN** `document.documentElement.style.getPropertyValue('--brand-primary')` returns `#FF0000`
- **AND** all elements using `text-brand` render with red text

#### Scenario: Missing DB theme keys use defaults
- **WHEN** `logoConfigEntries` has no `themePrimary` key
- **AND** `fetchLogoConfig()` completes
- **THEN** `--brand-primary` retains its CSS default value of `#1B3A6B`

### Requirement: Server-side CSS variable injection in admin layout
The admin layout (`app/admin/layout.tsx`) SHALL prefetch `logo-config` from Prisma on the server and inject an inline `<style>` tag overriding `:root` CSS variables, ensuring brand colors are applied immediately on hard refresh without a flash of default colors.

#### Scenario: Hard refresh on admin page loads with correct colors
- **WHEN** admin performs a hard refresh (Cmd+Shift+R) on any admin page (e.g., `/admin/settings`, `/admin/dashboard`)
- **THEN** the admin layout's server-side render includes an inline `<style>` tag:
  ```css
  :root {
    --brand-primary: <DB value>;
    --brand-secondary: <DB value>;
    --brand-dark: <DB value>;
  }
  ```
- **AND** the admin sidebar renders with database-stored gradient colors (not defaults)
- **AND** all brand-colored elements on the page render with database-stored colors
- **AND** no flash of default `#1B3A6B`/`#2563EB`/`#0C1E45` is visible during page load

#### Scenario: Brand colors default when no DB config exists
- **WHEN** no `themePrimary`, `themeSecondary`, or `themeDark` keys exist in `logoConfigEntries`
- **THEN** the server-side `<style>` tag injects the default hex values (`#1B3A6B`, `#2563EB`, `#0C1E45`)
- **AND** the admin UI renders with default brand colors

### Requirement: API auth guard for writes
The `PUT /api/logo-config` endpoint SHALL require admin authentication. The `GET /api/logo-config` endpoint SHALL remain public (no auth required).

#### Scenario: Admin PUT succeeds
- **WHEN** an authenticated admin sends a PUT to `/api/logo-config`
- **THEN** `requireAdmin()` passes (session exists + role === "admin")
- **AND** the config is persisted to the database

#### Scenario: Non-admin PUT rejected
- **WHEN** a non-admin authenticated user sends a PUT to `/api/logo-config`
- **THEN** the server returns 403 Forbidden
- **AND** the config is not modified

#### Scenario: Unauthenticated PUT rejected
- **WHEN** an unauthenticated request sends a PUT to `/api/logo-config`
- **THEN** the server returns 401 Unauthorized
- **AND** the config is not modified

#### Scenario: GET remains public
- **WHEN** any request (authenticated or not) sends a GET to `/api/logo-config`
- **THEN** the server returns the current logo-config data
- **AND** no auth check is performed
