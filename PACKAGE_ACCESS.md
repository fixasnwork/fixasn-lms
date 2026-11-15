# Package access duration

Admin Settings offers 1, 3, 6, or 12 months per package. API and database validation accept any positive integer number of months, independently of dropdown choices. Adding a dropdown option does not require a schema migration. Existing packages receive 1 year during the initial migration; new packages default to 1 month.

- `Package.startDate/endDate` define the sales window. Closing sales does not end an existing purchase's access. Tryouts retain their own scheduling window.
- Checkout snapshots duration into `Payment.accessDurationMonths`. Later package edits do not change that purchase.
- Pending payments do not grant access. First admin verification sets `verifiedAt` and `accessExpiresAt` in the same transaction as status and the purchase grant.
- Expiry uses calendar months in Asia/Makassar (WITA), with the last day clamped for shorter months. Access is denied at the expiry instant.
- Repeated verification never restarts the clock. A new payment is needed for a new access period; it starts when that payment is verified and does not stack on the previous period.
- Access checks evaluate all active verified payments. A pending renewal or revocation of one payment does not invalidate a different active payment.
- The migration copies the package's old end date into legacy verified payments; packages without an end date keep null expiry. Legacy pending payments receive the current package duration when verified. Legacy direct video grants without a payment remain valid.
- Tryout start/resume, attempt reads/writes, video catalog, PDF pages, and progress writes enforce access on the server. Admin question-bank reads are admin-only. Dashboard, profile and package ownership use the same verified/expiry rules.
- Client payment/video queries refresh on focus and every 30 seconds while mounted; server gates check expiry on every request.

Schema and SQL are prepared in `prisma/migrations/20261115000000_package_access_duration/migration.sql`. The follow-up migration `20261115000001_allow_positive_access_duration` replaces fixed option constraints with positive-integer checks, including on databases where the initial migration was already applied. Apply both pending migrations and generate the Prisma client before using this feature. These commands have not been run as part of this implementation. Tests were authored/updated but not executed; build and development server were not run.
