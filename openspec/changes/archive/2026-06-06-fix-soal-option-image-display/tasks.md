## 1. Tests (Red phase — write failing tests first)

- [x] 1.1 In `components/admin/SoalTable.test.tsx`, add a `sampleQuestionWithImageOption` fixture with one image-only option, one text-only option, and one text+image option
- [x] 1.2 Add test: "renders image-only option in mobile list" — assert that the option letter and image element are present
- [x] 1.3 Add test: "renders image-only option in desktop table" — same assertion for the desktop path
- [x] 1.4 Add test: "renders text alongside image when both present" — assert text node AND a Next.js `Image` (rendered as `<img>` under the hood) with correct `src` for the same option. The test MUST confirm the component used is `next/image`, not a raw `<img>` (e.g. by checking the rendered `<img>` has the Next.js-generated `srcset`/loader markers, or by mocking `next/image`).
- [x] 1.5 Add test: "text-only option still renders text only" — regression guard for existing behavior
- [x] 1.6 Run `npm run test -- components/admin/SoalTable.test.tsx` and confirm all new tests fail (red)

## 2. Mobile list fix (Green phase — minimal impl)

- [x] 2.1 In `components/admin/SoalTable.tsx`, update the mobile `filledOpts` filter (line 26) to: `q.options.filter((o) => (o.optionText && o.optionText.trim().length > 0) || o.optionImage)`
- [x] 2.2 In the mobile option render block (lines 76-81), after the option text, render an `<Image>` thumbnail when `opt.optionImage` is present (use `w-16 h-16` to match the existing `questionImage` thumbnail sizing on mobile)
- [x] 2.3 When `opt.optionText` is empty/whitespace and `opt.optionImage` is present, ensure the letter prefix is still rendered (it already is — verify)
- [x] 2.4 Run mobile tests (1.2, 1.4, 1.5) and confirm they pass (green)

## 3. Desktop table fix (Green phase — keep views in lockstep)

- [x] 3.1 Apply the same `filledOpts` filter change to the desktop render path (line 133)
- [x] 3.2 In the desktop option render block (lines 175-180), render the `<Image>` thumbnail when `opt.optionImage` is present (use `w-12 h-12` to match the existing `questionImage` thumbnail sizing on desktop)
- [x] 3.3 Run desktop tests (1.3, 1.4, 1.5) and confirm they pass (green)
- [x] 3.4 Run the full `SoalTable.test.tsx` suite and confirm all tests pass

## 4. Refactor + verification

- [x] 4.1 Add a short code comment above each `filledOpts` declaration pointing to its twin (mobile ↔ desktop) to flag the duplication for a future refactor
- [x] 4.2 Run `npm run test` — full suite must pass
- [x] 4.3 Run `npm run lint` — no new warnings or errors
- [x] 4.4 Manual smoke test: in `/admin/soal`, create a question with an image-only option, save, and confirm the option appears in the list with its image thumbnail on both mobile and desktop viewports
- [x] 4.5 Manual smoke test: edit an existing text-only question, add an image to one of its options, save, and confirm the list shows both the text and the new image
