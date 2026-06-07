## ADDED Requirements

### Requirement: Admin uploads hero image from file system

The system SHALL allow an admin to upload a hero landing page image from their local file system via the ImageUpload component in both the LogoEditor and the admin/landing hero section modal.

#### Scenario: File upload in LogoEditor succeeds

- **WHEN** admin selects a valid image file (JPG/PNG, ≤5MB) in the Hero Image section of LogoEditor
- **THEN** system uploads the file to Supabase Storage via `/api/upload`
- **AND** system receives a public URL
- **AND** system updates `logoConfig.heroImg` with the URL
- **AND** system displays a preview of the uploaded image

#### Scenario: File upload in admin/landing hero modal succeeds

- **WHEN** admin selects a valid image file in the hero section modal on `/admin/landing`
- **THEN** system uploads the file to Supabase Storage via `/api/upload`
- **AND** system receives a public URL
- **AND** system updates the draft `logoConfig.heroImg` with the URL
- **AND** system displays a preview of the uploaded image

#### Scenario: File upload fails

- **WHEN** admin selects an invalid file (wrong type, exceeds 5MB, or network error)
- **THEN** system displays an error message inline in the ImageUpload component
- **AND** system does NOT update `logoConfig.heroImg`

### Requirement: Admin pastes hero image URL

The system SHALL allow an admin to paste a hero image URL directly into the ImageUpload component in both editing locations.

#### Scenario: URL paste in LogoEditor

- **WHEN** admin pastes a valid image URL in the Hero Image URL input and clicks "Use URL"
- **THEN** system updates `logoConfig.heroImg` with the pasted URL
- **AND** system displays a preview of the image

#### Scenario: URL paste in admin/landing hero modal

- **WHEN** admin pastes a valid image URL in the hero section modal and clicks "Use URL"
- **THEN** system updates the draft `logoConfig.heroImg` with the pasted URL
- **AND** system displays a preview of the image

### Requirement: Admin clears hero image

The system SHALL allow an admin to remove the current hero image.

#### Scenario: Clear hero image

- **WHEN** admin clicks the clear button (×) on the hero image preview
- **THEN** system sets `logoConfig.heroImg` to an empty string
- **AND** system hides the preview
- **AND** system shows the URL paste and file upload inputs

### Requirement: Hero image persists through logo-config sync

The system SHALL persist the hero image URL to the database through the existing logo-config API when the admin syncs.

#### Scenario: Hero image saved to DB

- **WHEN** admin clicks "Simpan Perubahan" in LogoEditor (or "Simpan" in hero modal) then calls `syncLogoConfig()`
- **THEN** system sends `heroImg` value in PUT `/api/logo-config` request body
- **AND** system stores value in `LogoConfigEntry` row with `configKey = "heroImg"`
- **AND** subsequent page loads display the saved hero image

### Requirement: Hero image renders on landing page

The system SHALL display the configured hero image on the public landing page hero section.

#### Scenario: Custom hero image displayed

- **WHEN** a visitor loads the landing page
- **THEN** system reads `logoConfig.heroImg` from Zustand store
- **AND** if URL is non-empty, system renders it via Next.js `Image` component with `fill` and `object-cover`
- **AND** the image is placed in the hero section right column (230px height, rounded-2xl, with gradient overlay)

#### Scenario: Fallback when hero image fails to load

- **WHEN** the hero image URL is invalid or unreachable
- **THEN** the `HeroImage` component's `onError` handler triggers
- **AND** system falls back to Unsplash stock photo
