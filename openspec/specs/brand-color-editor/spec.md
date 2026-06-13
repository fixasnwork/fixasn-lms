## Requirements

### Requirement: Brand Colors section in admin settings
The admin settings page (`app/admin/settings/page.tsx`) SHALL contain a "Brand Colors" section (`BrandColorsCard` component) with a Card component containing color pickers for the 3 brand theme variables, live preview swatches, and preset color schemes.

#### Scenario: Admin sees brand color section
- **WHEN** admin navigates to `/admin/settings`
- **THEN** a "🎨 Warna Brand" Card is visible below existing sections
- **AND** it displays 3 color picker inputs labeled "Warna Primer", "Warna Sekunder", "Warna Gelap"
- **AND** each picker shows the current color value as a hex string
- **AND** values are initialized from the database-stored `LogoConfig` (via `useLogoConfig` hook)

#### Scenario: Admin sees live preview swatches
- **WHEN** admin navigates to `/admin/settings`
- **THEN** a preview section shows 3 swatches using the current brand colors:
  - Gradient hero swatch (primary→secondary gradient with sample heading/text)
  - Sidebar swatch (dark→primary gradient with placeholder navigation bars)
  - Button swatch (primary gradient CTA button + outline button with primary border)
- **AND** swatches update in real-time as admin changes color picker values

#### Scenario: Admin sees preset schemes
- **WHEN** admin navigates to `/admin/settings`
- **THEN** preset buttons are visible: "FIX ASN Default", "Hijau", "Ungu", "Merah"
- **AND** clicking a preset updates all 3 color pickers to the preset values
- **AND** the live preview swatches update to reflect the new colors

### Requirement: Color picker with hex input
Each brand color SHALL have a dual-input control: a native `<input type="color">` picker and a text `<input>` showing the hex value. Changing either input updates the other.

#### Scenario: Admin picks color via color input
- **WHEN** admin clicks the color swatch and selects `#FF5733`
- **THEN** the hex text input updates to `#FF5733`
- **AND** the live preview swatches update to reflect the new color

#### Scenario: Admin types hex value
- **WHEN** admin types `#00FF00` in the hex text input
- **THEN** the color swatch updates to show green
- **AND** the live preview swatches update to reflect the new color

### Requirement: Responsive color picker layout
The color picker grid SHALL use responsive breakpoints that prevent overlapping on tablet-sized screens.

#### Scenario: Tablet breakpoint (768px - 1023px)
- **WHEN** viewing on iPad Mini (768px), iPad Air (820px), or iPad Pro (1024px)
- **THEN** color pickers display in a 3-column grid (`md:grid-cols-3`)
- **AND** no fields overlap or wrap awkwardly
- **AND** color input swatches are `w-10 h-10` with visible border and `flex-shrink-0`
- **AND** hex text inputs have `min-w-0` to prevent overflow

#### Scenario: Mobile breakpoint (< 640px)
- **WHEN** viewing on phones
- **THEN** color pickers display in a single-column stack (`grid-cols-1`)
- **AND** color input swatches remain visible (not collapsed to a line)

### Requirement: Persist brand colors to logo-config API (admin-only)
Saving brand colors SHALL use the existing `PUT /api/logo-config` endpoint, which requires admin authentication via `requireAdmin()` guard. GET remains public for landing page consumption.

#### Scenario: Save brand colors
- **WHEN** admin changes a brand color and clicks "💾 Simpan"
- **THEN** the button shows "⏳ Menyimpan…" and becomes disabled
- **AND** `setLogoConfig` updates Zustand store with new theme color values
- **AND** `syncLogoConfig()` sends a `PUT /api/logo-config` request with all LogoConfig fields
- **AND** the `logoConfigEntries` table is updated with the new `themePrimary`, `themeSecondary`, `themeDark` keys
- **AND** a toast notification shows "Warna brand berhasil disimpan!"

#### Scenario: Save brand colors fails
- **WHEN** the PUT request fails (network error or server error)
- **THEN** a toast notification shows "Gagal menyimpan konfigurasi."
- **AND** the save button becomes enabled again

#### Scenario: Unauthorized PUT rejected
- **WHEN** a non-admin or unauthenticated user sends a PUT to `/api/logo-config`
- **THEN** the server returns 401 Unauthorized (no session) or 403 Forbidden (non-admin role)
- **AND** the logo-config data is not modified

#### Scenario: Admin layout hard refresh persistence
- **WHEN** admin performs a hard refresh (Cmd+Shift+R) on any admin page
- **THEN** `app/admin/layout.tsx` prefetches `logo-config` from Prisma on the server
- **AND** an inline `<style>` tag injects `--brand-primary`, `--brand-secondary`, `--brand-dark` CSS variables
- **AND** the admin UI renders with the database-stored brand colors (no flash of defaults)

### Requirement: Form fields update after save
After saving brand colors and cache invalidation, the color picker form fields SHALL reflect the newly saved database values.

#### Scenario: Form fields refresh from DB
- **WHEN** admin saves brand colors successfully
- **THEN** `queryClient.invalidateQueries({ queryKey: ['logo-config'] })` is called
- **AND** `useLogoConfig()` refetches from API, returning fresh DB data
- **AND** `userPrimary`, `userSecondary`, `userDark` local overrides are cleared to `null`
- **AND** the derived display values fall back to the fresh `logoConfig` data
- **AND** the color picker inputs show the newly saved colors

### Requirement: Loading indicator on save button
The save button SHALL show a loading state while saving is in progress.

#### Scenario: Button shows loading during save
- **WHEN** admin clicks "💾 Simpan"
- **THEN** the button text changes to "⏳ Menyimpan…"
- **AND** the button is disabled
- **WHEN** save completes (success or failure)
- **THEN** the button returns to "💾 Simpan" and becomes enabled

### Requirement: Toast notifications instead of alert
Save success and error feedback SHALL use `sonner` toast notifications, not browser `alert()` dialogs.

#### Scenario: Success toast
- **WHEN** brand colors are saved successfully
- **THEN** a green toast slides in from bottom-right: "Warna brand berhasil disimpan!"

#### Scenario: Error toast
- **WHEN** brand colors fail to save
- **THEN** a red toast slides in from bottom-right: "Gagal menyimpan konfigurasi."
