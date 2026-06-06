# admin-question-bank-display Specification

## Purpose
TBD - created by archiving change fix-soal-option-image-display. Update Purpose after archive.
## Requirements
### Requirement: Admin question list renders every accepted option

The admin question bank list (`SoalTable` component, used in `/admin/soal`) SHALL render every answer option that the question editor (`saveSoal` in `app/admin/soal/page.tsx`) accepts as a valid input. An option is considered accepted when it has either a non-empty `optionText` or a non-null `optionImage`.

#### Scenario: Image-only option is visible
- **WHEN** a question has an option where `optionText` is empty or whitespace and `optionImage` is a non-empty URL
- **THEN** the list MUST display that option in the question row, labeled with its letter (A/B/C/…) and showing the image as a thumbnail

#### Scenario: Text-only option is visible
- **WHEN** a question has an option with non-empty `optionText` and `optionImage` is null
- **THEN** the list MUST display that option showing only its text (existing behavior preserved)

#### Scenario: Text-and-image option shows both
- **WHEN** a question has an option with both non-empty `optionText` and a non-null `optionImage`
- **THEN** the list MUST display both the option text and the image thumbnail for that option

### Requirement: Mobile and desktop render paths are consistent

The mobile list view and the desktop table view of the question list MUST produce the same set of visible options for the same question data. An option that is visible in one view SHALL be visible in the other.

#### Scenario: Image-only option visible on both viewports
- **WHEN** the same question with an image-only option is rendered through the mobile list path
- **AND** the same question is rendered through the desktop table path
- **THEN** both paths MUST display the same set of options, including the image-only option

### Requirement: Option images use the Next.js Image component

When a visible option has an `optionImage`, the list MUST render it using the Next.js `Image` component imported from `next/image` (NOT a raw HTML `<img>` element). The component MUST be configured with explicit `width` and `height` props matching the existing `questionImage` thumbnail sizing convention in the same component, and an accessible `alt` prop.

#### Scenario: Option image renders via next/image
- **WHEN** a visible option has a non-null `optionImage`
- **THEN** the list MUST render a Next.js `Image` component with `src` set to the option image URL, explicit `width` and `height` props, and an `alt` attribute
- **AND** MUST NOT render a raw HTML `<img>` element for the option image

#### Scenario: Option image dimensions match question image convention
- **WHEN** the list renders an option image
- **THEN** the `width` and `height` props of the `Image` component MUST match the dimensions already used by the `questionImage` thumbnail in the same render path (mobile list or desktop table)

