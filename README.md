This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Midtrans payments

Choose the payment flow with `NEXT_PUBLIC_PAYMENT_MODE`, matching zonaapoteker. The default `manual` keeps FIX ASN's bank-transfer instructions, proof upload, and admin verification. Set `midtrans` to enable individual Midtrans Snap redirect checkout. Changing this public environment variable requires a rebuild; Docker build arguments and GitHub environment variables are wired for it. Existing Midtrans order status pages and notifications keep working after switching back to manual mode.

In Midtrans mode, payment-method logos and fee rules are copied from zonaapoteker: QRIS 0.7%, GoPay 2%, and Mandiri/BRI/BNI/Permata/CIMB virtual accounts Rp4,000. Percentage fees round upward to whole rupiah. Configure rules in `lib/paymentMethods.ts`; method selection and the price/admin/total breakdown appear before redirecting to Snap. Manual mode does not add these gateway fees.

Setup:

1. Apply the prepared `20261125000000_midtrans_payment_orders` migration through the normal migration process, then generate the Prisma client. Migration/application commands require explicit authorization under this repository's AGENTS.md.
2. For sandbox, build with `NEXT_PUBLIC_PAYMENT_MODE=midtrans`, and set `MIDTRANS_SERVER_KEY`, `MIDTRANS_SIGNATURE_SECRET_KEY`, `MIDTRANS_IS_PRODUCTION=false`, and `NEXT_PUBLIC_APP_URL`. The signing secret falls back to the Server Key for legacy merchant keys only. After key rotation, use the separate Signature Secret Key described in [Midtrans access keys](https://docs.midtrans.com/docs/access-keys). No public Client Key is needed for redirect checkout.
3. Configure the Midtrans Payment Notification URL as `https://<app-domain>/api/payments/midtrans/notification`. It must be publicly reachable over HTTPS. Checkout returns the user to `/payment/<orderId>`; browser query parameters never grant access.
4. Verify sandbox scenarios: successful/pending/denied/expired payments, duplicate notifications, incorrect signatures/amounts, cross-account order access, retry/resume, and unchanged access duration on repeated notifications. No sandbox transactions or test commands are run automatically.
5. For live payments, explicitly set `MIDTRANS_IS_PRODUCTION=true` with the corresponding live merchant keys. The production GitHub environment uses secrets `MIDTRANS_SERVER_KEY` / `MIDTRANS_SIGNATURE_SECRET_KEY` and variable `MIDTRANS_IS_PRODUCTION`. Compose deployments read the same variables from the server environment.

The backend recalculates prices and snapshots package name, amount, fee, total, and access duration per order. A valid notification triggers a server-side Midtrans status lookup; settlement or accepted capture activates `Payment`/`UserPurchase` atomically. An order lock prevents duplicate activation. Refunds revoke only that order's payment; repeated status checks do not undo an admin access block or restart access duration. Partial refunds retain access. Refund initiation remains in the Midtrans dashboard.

Snap orders expire after an explicit 24-hour deadline. A Core API 404 before the customer submits a payment method is expected and preserves the pending order. A checkout timeout keeps the same order reserved because Midtrans may already have created it; users/admins can check its status without generating another charge. If a checkout was created remotely but its redirect URL was lost, it requires support/reconciliation or expiry before another order can be created. Server status requests are limited to one per order per 15 seconds across app instances; webhook processing bypasses this polling limit.

Manual mode accepts proof uploads through `/api/payments` and activates access only after admin verification. In Midtrans mode, new manual submissions are disabled for regular users; historical manual payments still support admin verification. Checkout creation is disabled in manual mode, but gateway notifications and reconciliation remain enabled. A pending transaction in either flow prevents another purchase of the same package. Admin payments combines gateway and manual purchases in one table, with server-side search, filters, pagination, and a Midtrans status check action. Paid content continues to use the existing verified-payment access rules. The implementation adds no group purchases, seat counts, or claim codes.

Users can view both flows at `/purchases` (Riwayat Pembelian in the sidebar and mobile More menu). The owner-scoped `/api/purchases` merges 20 records per page using separate source cursors; gateway-linked payments are excluded from the manual source to avoid duplicate entries. Pending gateway orders link to their existing status/checkout page. Manual orders have an owner-only detail page with proof, verification status, and access duration. Proof images are fetched only on the manual detail page. Open-package actions follow the actual linked payment's access status, including expiry and admin blocks. Manual payment amounts were not snapshotted, so totals are hidden when unavailable. No additional database migration is needed for the history feature beyond the Midtrans order schema.

The admin `/admin/payments` uses shadcn Table, Select, Dropdown Menu, Badge, Dialog, and Pagination. `GET /api/admin/payments` applies search (name/email/reference/package), source, payment status, and access status before pagination. A parameterized Postgres union excludes gateway-linked payments from the manual source. Details and proof are loaded through admin-guarded `GET /api/admin/payments/<source>/<id>` only when requested. The matching PATCH endpoint supports manual verify/reject, gateway status reconciliation, package access block/restore, and account ban/unban. State is validated again after row locking; restoring access does not restart its expiry, and gateway payments cannot be manually verified. Legacy manual blocks without a recorded verification return to pending on unblock. The admin layout no longer preloads all payment proofs, and the sidebar no longer shows a fabricated pending count. This revamp does not add schema changes.
