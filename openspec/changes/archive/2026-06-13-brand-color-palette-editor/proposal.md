## Why

FIX ASN has 150+ hardcoded hex color references (`#1B3A6B`, `#2563EB`, `#0C1E45`, etc.) scattered across 42 files. Changing the brand color requires editing every file manually. A CSS variable-based theming system lets admins control the brand palette from the settings page, with changes propagating instantly across all pages.

## What Changes

- Introduce 3 CSS custom properties for brand colors (`--brand-primary`, `--brand-secondary`, `--brand-dark`) in `globals.css`
- Add Tailwind v4 `@theme` block to expose these as `brand`, `brand-secondary`, `brand-dark` utility classes
- Replace all 150+ hardcoded color references across 42 files with CSS variable / Tailwind theme references
- Add a "Brand Colors" section to `app/admin/settings/page.tsx` with color pickers, live preview swatches, and preset schemes
- Extend `LogoConfig` (existing key-value store) with 3 new theme color keys
- Wire `useAppStore` to inject CSS variables on load from DB config
- Add auth guard (`requireAdmin`) to `PUT /api/logo-config`
- Add server-side CSS variable injection via `<style>` tag in admin layout for hard-refresh persistence
- Migrate all `alert()` calls to `sonner` toast notifications
- Add responsive layout fixes for color picker inputs across tablet breakpoints

## Capabilities

### New Capabilities
- `brand-theme`: CSS variable theming system — defines brand color tokens, Tailwind @theme integration, server-side and client-side CSS variable injection from DB config
- `brand-color-editor`: Admin UI for editing brand colors — color pickers in admin/settings with live preview, preset schemes, toast feedback, and persistence to logo-config API (admin-only)

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **42 component/page files**: Replace hardcoded hex with theme references
- `app/globals.css`: Add `@theme` block and `:root` CSS variables
- `lib/types.ts`: Extend `LogoConfig` interface with 3 theme color fields
- `store/useAppStore.ts`: Add CSS variable injection in `fetchLogoConfig`
- `hooks/useTryoutQueries.ts`: Update `DEFAULT_LOGO_CONFIG` with theme defaults
- `app/admin/settings/page.tsx`: Add BrandColorsCard with pickers, preview, presets
- `app/admin/layout.tsx`: Server-side prefetch + `<style>` injection for hard-refresh persistence
- `app/api/logo-config/route.ts`: Add `requireAdmin()` guard on PUT
- `components/ui/Button.tsx`: Update variant styles to use theme colors
- `components/admin/LogoEditor.tsx`: Responsive grid + toast migration
- No breaking changes — hex fallbacks ensure visual parity during migration
