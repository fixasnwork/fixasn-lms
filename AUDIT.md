# Frontend Audit — Missing & Incomplete Features

> Generated from codebase analysis. Last updated: April 2026.

---

## Summary

The frontend has a complete UI shell, but almost nothing is connected to a real backend. Authentication, payments, package ownership, rankings, image uploads, question persistence, and video features are all simulated or stubbed. The most functional parts are the **tryout engine** (taking a test, scoring) and the **admin soal editor**.

---

## Incomplete / Stub Pages

### 1. Video Page — `app/dashboard/video/page.tsx`
**Entire feature is stubbed.**

- Prominent "Coming Soon" banner: "Video pembelajaran sedang dalam tahap produksi"
- `📥 PDF` button — **no onClick handler** (dead UI, line 107)
- `▶️ Mulai` button — **no onClick handler** (dead UI, line 110)
- All video data (categories, titles, durations, view counts) is hardcoded inline
- No auth gating for video package access

---

### 2. Profile Page — `app/dashboard/profile/page.tsx`
**Minimal read-only display only.**

- Only shows `name`, `email`, and hardcoded `"Google OAuth"` string
- No profile editing, avatar upload, account settings, or password change

---

### 3. Tryout Page — `app/dashboard/tryout/page.tsx`
**Package ownership system is entirely broken.**

- `ownedPkgIds: string[] = []` (line 60) is **always empty** — never populated from any source
- "Owned Packages" section **never renders** (guarded by `ownedPkgIds.length > 0`)
- Every package always appears as locked — purchase flow is disconnected
- Payment modal uses `placehold.co` fake proof images; completion calls `setPayStep('success')` without any backend call
- "Ulangi Tryout" button only closes review mode — does not restart the tryout

---

### 4. Admin Landing Editor — `app/admin/landing/page.tsx`
**5 dead Edit buttons with explicit placeholder comment.**

- Explicit comment on line 20: `{/* Other sections placeholder */}`
- 5 section cards (Hero Section, Struktur SKD, Testimoni, Kontak & WA, Banner Promo)
- Each has an "Edit" `<Button>` with **no onClick handler** — all 5 are dead UI (lines 38-39)
- The "Section Lainnya" area is a UI shell with no functionality

---

### 5. Admin Dashboard — `app/admin/page.tsx`
**All data is hardcoded inline literals.**

- "Total Peserta" = `"15.234"`, "Pendapatan Bulan Ini" = `"Rp 12,4M"` — static demo values
- Recent payments list is inline static data
- Package popularity percentages are inline literals (`65`, `82`, `48`, `31`)
- No connection to any real data source

---

### 6. Admin Payments — `app/admin/payments/page.tsx`
**Entirely demo data with unpersisted field.**

- Uses `SAMPLE_PAYMENTS` array (line 8: `"Sample payment data for admin demo"`)
- `blockReason` form field collected but **discarded on submit** — never persisted anywhere
- `useAuthStore` imported but **never used**
- All proof images use `placehold.co` URLs

---

### 7. Ranking Page — `app/dashboard/ranking/page.tsx`
**Mock data, non-functional filter, display bug.**

- `RANKINGS` array is 10 fabricated entries with fake names/quotes
- Tab filter (Semua/Mingguan/Bulanan) toggles state but **never filters data** — same list always shown
- **Bug**: `r.rank + 3` (line 98) shows ranks 7-13 instead of 4-10
- Uses `window.location.href` instead of Next.js `router.push()` (line 130)

---

### 8. Dashboard Home — `app/dashboard/page.tsx`
**Stats are hardcoded mock values.**

- `remainingTryouts = 10`, `usedTryouts = 3`, `unlockedVideo = false` — all inline with `// Mock data` comments

---

## Incomplete Components

### 9. Image Upload — `components/admin/ImageUpload.tsx`
**Fake upload — generates placeholders instead of persisting files.**

- Upload handler skips actual upload entirely
- Generates `https://placehold.co/...` URL instead of real cloud storage
- Comments on lines 23-24: `"In a real app, upload to cloud storage"` / `"For now, use a placeholder"`

---

### 10. MathText — `components/ui/MathText.tsx`
**Named "MathText" but renders plain text.**

- Component body is just `<span>{text}</span>` — no LaTeX/KaTeX rendering

---

## Backend Disconnects

### 11. Auth Store — `store/useAuthStore.ts`
**No persistence, no tokens, no API calls.**

- `login()` and `logout()` only update local Zustand state
- No JWT, no session cookie, no localStorage
- No call to `/api/auth` — auth store is decoupled from auth API route
- State resets on every page reload

---

### 12. App Store — `store/useAppStore.ts`
**No backend sync — all 9 actions are local-only.**

| Action | Behavior |
|---|---|
| `setPackages` | Local state only — no API call |
| `setBanks` | Local state only — no API call |
| `setQuestions` | Local state only — no API call |
| `setDurationMin` | Local state only — no API call |
| `setTryoutSets` | Local state only — no API call |
| `setPackageBanks` | Local state only — no API call |
| `setTrialSet` | Local state only — no API call |
| `setLogoConfig` | Local state only — no API call |
| `resetToDefaults` | Resets to hardcoded defaults — no API call |

---

### 13. API Routes — All In-Memory / Echo-Back

| Route | Issue |
|---|---|
| `api/auth` | Simulated only. No OAuth, no JWT. Comment: "Simulated login - in production, verify with Google OAuth" |
| `api/packages` | In-memory store, resets on restart. Comment: "In-memory store (replace with database in production)" |
| `api/banks` | Same in-memory pattern. Placeholder bank account numbers (`1234567890`, etc.) |
| `api/questions` | `POST` echoes back without saving. Comment: "In production, this would save to database". No `PUT` or `DELETE` endpoints |

---

## Content Gaps in Data

| Issue | Details |
|---|---|
| **18/20 tryout slots are empty** | In `DEFAULT_PACKAGE_BANKS`, only p1-t1, p1-t2, p2-t1, p2-t2, p3-t1, p3-t2 have questions. All others have `questions: []` |
| **Package p4 (Video Belajar) missing** | Exists in `DEFAULT_PACKAGES` but has no entry in `DEFAULT_PACKAGE_BANKS` |
| **Only 15/110 questions have explanations** | `EXPLANATIONS` in `data/constants.ts` covers IDs: 1-5, 31-35, 46, 54. Rest show fallback text |
| **TKP questions 101-110 duplicated** | Identical verbatim between Set A and Set B |
| **`DEFAULT_TRYOUT_SETS` have empty questions** | Both sets start with `questions: []` |
| **Fabricated marketing stats** | `defaultLogoConfig` has "15.000+ Peserta Aktif", "98% Tingkat Kelulusan" — hardcoded claims, no data source |

---

## Bugs

| File | Line | Bug |
|---|---|---|
| `dashboard/ranking/page.tsx` | 98 | Off-by-3: `{r.rank + 3}` should be `{r.rank}` — shows 7-13 instead of 4-10 |
| `dashboard/ranking/page.tsx` | 130 | Uses `window.location.href` instead of `router.push()` |
| `dashboard/payment/page.tsx` | 204 | Chinese text in Indonesian UI: `"untuk加快确认"` |
| `dashboard/payment/page.tsx` | 319 | Chinese text in Indonesian UI: `"Sampaikan你已经 transfer dan"` |
| `admin/soal/page.tsx` | 122 | `saveSoal()` defined but never called — logic duplicated inline in modal button |
| `layouts/Navbar.tsx` | 17-19 | `handleRegister` and `handleLogin` are identical — no registration flow |

---

## Dead Code — Unused Imports

| File | Unused Import |
|---|---|
| `app/dashboard/page.tsx` | `Badge` |
| `app/dashboard/payment/page.tsx` | `Badge` |
| `app/dashboard/ranking/page.tsx` | `Badge` |
| `app/login/page.tsx` | `Modal` |
| `app/admin/payments/page.tsx` | `useAuthStore` |
| `app/admin/soal/page.tsx` | `Badge` |
| `app/dashboard/tryout/page.tsx` | `user` from `useAuthStore`, `unlockedVideo` state |
| `components/landing/LandingPage.tsx` | `Badge` |
| `components/landing/TestimonialsSection.tsx` | `Card` |
| `store/useAuthStore.test.ts` | `UserRole` (test file) |
| `app/api/packages/route.test.ts` | `data` variable (test file) |

---

## Dead UI — Buttons/Links Without Handlers

| File | Element | Line |
|---|---|---|
| `app/dashboard/video/page.tsx` | `📥 PDF` button | 107 |
| `app/dashboard/video/page.tsx` | `▶️ Mulai` button | 110 |
| `app/admin/landing/page.tsx` | 5x "Edit" buttons (Hero, SKD, Testimoni, WA, Banner) | 38-39 |
| `app/dashboard/ranking/page.tsx` | Tab filter buttons (Tous/Mingguan/Bulanan) | 72-86 — toggle state but don't filter data |

---

## Priority Recommendations

### High Priority
1. **Fix `ownedPkgIds`** — connect to real purchase history so owned/locked state works
2. **Connect payments to backend** — POST payment proofs, persist to database, trigger admin verification flow
3. **Implement auth persistence** — JWT/session + localStorage hydration on load
4. **Build out remaining 18 empty tryout slots** — 90% of tryout content is missing
5. **Fix ranking page** — real data source + fix off-by-3 bug + implement tab filtering

### Medium Priority
6. **Wire up admin landing section editors** — 5 dead Edit buttons
7. **Implement video page** — real video player, PDF download, auth gating
8. **Add profile editing** — name, email, avatar upload
9. **Fix image upload** — real cloud storage (S3/Cloudinary/etc.)
10. **Fix `blockReason` persistence** in admin payments

### Low Priority
11. **Replace all `placehold.co` URLs** with real uploaded images
12. **Add explanations** to remaining 95 questions
13. **Implement registration flow** — currently `handleRegister === handleLogin`
14. **Replace fabricated marketing stats** with real data
15. **Fix TKP question duplication** between Set A and Set B
16. **Fix Chinese text** in payment page
17. **Remove unused imports** (cleanup)
