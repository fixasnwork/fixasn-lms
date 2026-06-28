## 1. Wire Payment → UserPurchase in POST

- [x] 1.1 In `app/api/payments/route.ts`, after the `prisma.payment.create` in `POST`, add a `prisma.userPurchase.upsert` keyed on `@@unique([userId, packageId])`, creating the row with `paymentId` set to the new payment if it does not exist, and updating `paymentId` / `deletedAt: null` if it does
- [x] 1.2 Confirm the upsert handles a previously soft-deleted grant by re-activating it (`update: { deletedAt: null }`)

## 2. Wire Payment status transitions in PUT

- [x] 2.1 In `app/api/payments/route.ts`, after the `prisma.payment.update` in `PUT`, branch on the new `body.status` value
- [x] 2.2 On `verified`: upsert the corresponding `UserPurchase` (idempotent — covers pre-existing payments created before this fix)
- [x] 2.3 On `rejected` / `expired` / `blocked`: `prisma.userPurchase.updateMany` with `where: { paymentId: data.id, deletedAt: null }` and `data: { deletedAt: new Date() }`
- [x] 2.4 Leave other status values (e.g., `pending`) untouched on the `UserPurchase`

## 3. Verify

- [x] 3.1 Run `npx tsc --noEmit` — typecheck clean
- [x] 3.2 Run `npx vitest run app/api/videos/` — 6/6 still pass (access check logic unchanged)
- [x] 3.3 Note: pre-existing failures in `app/api/packages/[packageId]/tryouts/route.test.ts` are unrelated to this fix
