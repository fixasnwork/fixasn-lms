# Tasks

Implementation order: schema → types → mappers → helpers → API → hooks → admin UI → user UI → dashboard → nav → CSP → seed → tests → docs. Each task is atomic; check off as you go.

## 1. Schema & Migration
- [ ] 1.1 Add `Video` model to `prisma/schema.prisma` (id, title, description, youtubeId, category, durationSec, sortOrder, isPublished, audit fields, index, `@@map("videos")`).
- [ ] 1.2 Add `includesVideoPembelajaran Boolean @default(false)` to `Package` model in `prisma/schema.prisma`.
- [ ] 1.3 Run `npx prisma migrate dev --name add_video_and_package_video_flag --create-only`; commit `prisma/migrations/<ts>_.../migration.sql`.
- [ ] 1.4 Run `npx prisma generate` to update Prisma client types.
- [ ] 1.5 (Local dev only) Run `npx prisma db push` to apply without migration history; CI/prod uses `migrate deploy` from step 1.3.

## 2. Types
- [ ] 2.1 Add `VideoCategory`, `Video`, `VideoListResponse` to `lib/types.ts`.
- [ ] 2.2 Extend `Package` interface in `lib/types.ts` with `includesVideoPembelajaran: boolean`.
- [ ] 2.3 Update `data/packages.ts` `Paket Video Belajar` row to include `includesVideoPembelajaran: true`.

## 3. Mappers
- [ ] 3.1 `app/api/packages/route.ts` `mapPackage`: add `includesVideoPembelajaran: pkg.includesVideoPembelajaran` to the returned object.
- [ ] 3.2 `app/api/packages/[packageId]/route.ts` `mapPackage`: same.

## 4. Helpers
- [ ] 4.1 `lib/video.ts`: implement and export `parseYouTubeId(input: string): string | null` per design §6.
- [ ] 4.2 `lib/video.test.ts`: unit-test all accepted + rejected inputs.

## 5. API Routes
- [ ] 5.1 `app/api/admin/videos/route.ts`: `GET` (requireAdmin, all incl unpublished) + `POST` (requireAdmin, body validation via `parseYouTubeId` + category allowlist, returns 201).
- [ ] 5.2 `app/api/admin/videos/[id]/route.ts`: `GET` (requireAdmin) + `PUT` (requireAdmin, partial update with re-validation) + `DELETE` (requireAdmin, soft-delete via `deletedAt`).
- [ ] 5.3 `app/api/videos/route.ts`: `GET` (requireActiveSession; admin → all published; else check `UserPurchase` w/ status NOT IN rejected/expired AND `package.includesVideoPembelajaran`; return `{videos, hasAccess, accessReason}`).
- [ ] 5.4 All three routes: include `export const dynamic = 'force-dynamic'; export const revalidate = 0;` to match convention.
- [ ] 5.5 All three routes: write `route.test.ts` files per design §14.

## 6. Hooks
- [ ] 6.1 `hooks/useVideoQueries.ts`: implement `useAdminVideos`, `useCreateVideo`, `useUpdateVideo`, `useDeleteVideo`, `useUserVideos` per design §10.
- [ ] 6.2 `hooks/useTryoutQueries.ts`: in `useCreatePayment`, add `queryClient.invalidateQueries({ queryKey: ['user-videos'] })` to the `onSuccess` handler.
- [ ] 6.3 `hooks/useVideoQueries.test.ts`: cover query keys, fetch URLs, optimistic update, rollback, invalidation.

## 7. Admin UI
- [ ] 7.1 `components/admin/video/VideoForm.tsx`: controlled form, `parseYouTubeId` live preview, category 3-button toggle, duration + sort + publish, "Preview on YouTube" link.
- [ ] 7.2 `components/admin/video/VideoTable.tsx`: desktop `<table>` + mobile card list, edit/delete buttons, soft-deleted row styling with `data-testid` selectors.
- [ ] 7.3 `app/admin/video/page.tsx`: page shell; wires the 4 admin hooks; renders `<VideoTable>` + add modal; handles loading + error + empty states.
- [ ] 7.4 `app/admin/settings/page.tsx`: add "Termasuk Video Pembelajaran" checkbox to the package edit/create form; bind to `pkg.includesVideoPembelajaran`; pass through on submit.
- [ ] 7.5 `components/layouts/AdminSidebar.tsx`: add `{ id: 'video', icon: '🎬', label: 'Video Belajar' }` to `navItems`; `handleNav('video')` routes to `/admin/video`.
- [ ] 7.6 `components/admin/video/VideoTable.test.tsx` + `VideoForm.test.tsx`: per design §14.

## 8. User UI
- [ ] 8.1 `app/(user)/video/page.tsx`: full rewrite to Client Component using `useUserVideos()`; four branches: loading / locked / empty / catalog.
- [ ] 8.2 Player Modal: `<iframe src="https://www.youtube.com/embed/{id}?rel=0" className="w-full aspect-video rounded-xl" allow="..." allowFullScreen />`.
- [ ] 8.3 Group videos by `category` in fixed order TWK → TIU → TKP; render each group's section with color-coded header.
- [ ] 8.4 `app/(user)/video/page.test.tsx`: cover all four branches + modal open.

## 9. Dashboard
- [ ] 9.1 `components/dashboard/DashboardHomeClient.tsx`: import `useUserVideos`; replace `StatCard` "Akses Video" hardcoded "Belum" with derived `hasAccess` (green "Aktif" / gray "Locked" badge).
- [ ] 9.2 Replace "🎬 Video Coming soon" badge on progress section with a CTA "Tonton video belajar →" linking to `/video` (or hide if `hasAccess === false` — show "Beli paket" instead).

## 10. CSP
- [ ] 10.1 `next.config.ts` `headers()`: add `frame-src https://www.youtube.com` to the `Content-Security-Policy` directive; preserve existing directives.
- [ ] 10.2 Manual verification: load `/video` with a published video; confirm iframe loads in dev.

## 11. Seed
- [ ] 11.1 `prisma/seed.ts`: extend package upsert to set `includesVideoPembelajaran` for `Paket Video Belajar` only; preserve admin's choice in the `update:` block.
- [ ] 11.2 `prisma/seed.ts`: add find-or-create loop for 3 sample videos (TWK/TIU/TKP), keyed by `(title, category)`.
- [ ] 11.3 `scripts/reset-and-seed.ts`: mirror the same two changes.

## 12. Admin Settings → Package Form wiring
- [ ] 12.1 Confirm POST `/api/packages` and PUT `/api/packages/[id]` read `body.includesVideoPembelajaran` via `Boolean(...)` patterns; no server-side change required, but verify by submitting a form and inspecting the saved row.
- [ ] 12.2 Confirm `mapPackage` in step 3 returns the field so the edit form pre-fills the checkbox correctly.

## 13. Validation
- [ ] 13.1 `npm run lint` — clean.
- [ ] 13.2 `npm run build` — TypeScript clean.
- [ ] 13.3 `npm run test` — all green.
- [ ] 13.4 `npx tsx prisma/seed.ts` — idempotent re-run, no duplicates.
- [ ] 13.5 Manual smoke (dev server): admin adds 3 videos → user without purchase sees locked → user with purchase sees catalog → Mulai opens modal → soft-delete removes from user view.

## 14. Documentation
- [ ] 14.1 `VIDEO.md` at repo root: living spec mirroring `TRYOUTS.md` structure (Goal, Schema, API, Admin UI, User UI, Hooks, Tests, Open Questions, Acceptance).
