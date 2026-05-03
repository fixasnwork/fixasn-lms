-- ============================================================================
-- FixASN LMS — Database Migration v1 → v2
-- Run in Supabase SQL Editor  |  Idempotent (safe to re-run)
-- Transforms snake_case legacy schema → camelCase v2 schema
-- ============================================================================

-- ── 1. QUESTIONS ───────────────────────────────────────────────────────────
-- Rename legacy columns (safe: skips if already renamed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='cat') THEN
    ALTER TABLE questions RENAME COLUMN cat TO category;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='q') THEN
    ALTER TABLE questions RENAME COLUMN q TO question;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='q_img') THEN
    ALTER TABLE questions RENAME COLUMN q_img TO "questionImage";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='ans') THEN
    ALTER TABLE questions RENAME COLUMN ans TO "correctAnswer";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='explanation_img') THEN
    ALTER TABLE questions RENAME COLUMN explanation_img TO "explanationImage";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='created_at') THEN
    ALTER TABLE questions RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='updated_at') THEN
    ALTER TABLE questions RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS "createdBy"  TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "createdIP"  TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "updatedBy"  TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "updatedIP"  TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

-- ── 2. QUESTION OPTIONS (extract from JSONB columns) ───────────────────────
CREATE TABLE IF NOT EXISTS "questionOptions" (
  id           SERIAL PRIMARY KEY,
  "questionId" INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  "optionIndex" INTEGER NOT NULL CHECK ("optionIndex" BETWEEN 0 AND 4),
  "optionText"  TEXT,
  "optionImage" TEXT,
  "tkpValue"    INTEGER,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("questionId", "optionIndex")
);

-- Migrate opts (JSON text array) → questionOptions.optionText  (safe: skips if column missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='opts') THEN
    INSERT INTO "questionOptions" ("questionId", "optionIndex", "optionText", "createdAt", "updatedAt")
    SELECT q.id, idx - 1, opt::TEXT, COALESCE(q."createdAt", now()), COALESCE(q."updatedAt", now())
    FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements_text(q.opts) WITH ORDINALITY AS arr(opt, idx)
    WHERE q.opts IS NOT NULL AND jsonb_typeof(q.opts) = 'array'
    ON CONFLICT ("questionId", "optionIndex") DO NOTHING;
  END IF;
END $$;

-- Migrate opt_imgs (JSON text array) → questionOptions.optionImage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='opt_imgs') THEN
    UPDATE "questionOptions" qo
    SET "optionImage" = sub.img
    FROM (
      SELECT q.id AS qid, idx - 1 AS oi,
             CASE WHEN elem IN ('null', '') THEN NULL ELSE elem END AS img
      FROM questions q
      CROSS JOIN LATERAL jsonb_array_elements_text(q.opt_imgs) WITH ORDINALITY AS arr(elem, idx)
      WHERE q.opt_imgs IS NOT NULL AND jsonb_typeof(q.opt_imgs) = 'array'
    ) sub
    WHERE qo."questionId" = sub.qid AND qo."optionIndex" = sub.oi;
  END IF;
END $$;

-- Migrate tkp_vals (JSON int array) → questionOptions.tkpValue
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='tkp_vals') THEN
    UPDATE "questionOptions" qo
    SET "tkpValue" = sub.val::INTEGER
    FROM (
      SELECT q.id AS qid, idx - 1 AS oi, elem AS val
      FROM questions q
      CROSS JOIN LATERAL jsonb_array_elements_text(q.tkp_vals) WITH ORDINALITY AS arr(elem, idx)
      WHERE q.tkp_vals IS NOT NULL AND jsonb_typeof(q.tkp_vals) = 'array'
    ) sub
    WHERE qo."questionId" = sub.qid AND qo."optionIndex" = sub.oi;
  END IF;
END $$;

-- Drop legacy JSON columns after extraction
ALTER TABLE questions DROP COLUMN IF EXISTS opts;
ALTER TABLE questions DROP COLUMN IF EXISTS tkp_vals;
ALTER TABLE questions DROP COLUMN IF EXISTS opt_imgs;

-- ── 3. PACKAGES ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='created_at') THEN
    ALTER TABLE packages RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='updated_at') THEN
    ALTER TABLE packages RENAME COLUMN updated_at TO "updatedAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packages' AND column_name='tryouts') THEN
    ALTER TABLE packages RENAME COLUMN tryouts TO "tryoutCount";
  END IF;
END $$;

ALTER TABLE packages ADD COLUMN IF NOT EXISTS "isTrial"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS "isActive"   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS "createdBy"  TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS "createdIP"  TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS "updatedBy"  TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS "updatedIP"  TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

-- Drop legacy boolean columns (replaced by isActive)
ALTER TABLE packages DROP COLUMN IF EXISTS popular;
ALTER TABLE packages DROP COLUMN IF EXISTS video;
ALTER TABLE packages DROP COLUMN IF EXISTS coming_soon;

-- ── 4. BANK ACCOUNTS ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='bank') THEN
    ALTER TABLE bank_accounts RENAME COLUMN bank  TO "bankName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='norek') THEN
    ALTER TABLE bank_accounts RENAME COLUMN norek TO "accountNumber";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='atas') THEN
    ALTER TABLE bank_accounts RENAME COLUMN atas  TO "accountHolder";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='created_at') THEN
    ALTER TABLE bank_accounts RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='updated_at') THEN
    ALTER TABLE bank_accounts RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "isActive"   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "createdBy"  TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "createdIP"  TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "updatedBy"  TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "updatedIP"  TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

-- ── 5. USERS ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at') THEN
    ALTER TABLE users RENAME COLUMN created_at TO "createdAt";
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdBy"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdIP"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedBy"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedIP"  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;

-- ── 6. TRYOUT_QUESTIONS → rename columns to camelCase ─────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tryout_questions' AND column_name='tryout_id') THEN
    ALTER TABLE tryout_questions RENAME COLUMN tryout_id TO "tryoutId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tryout_questions' AND column_name='question_id') THEN
    ALTER TABLE tryout_questions RENAME COLUMN question_id TO "questionId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tryout_questions' AND column_name='sort_order') THEN
    ALTER TABLE tryout_questions RENAME COLUMN sort_order TO "sortOrder";
  END IF;
END $$;

ALTER TABLE tryout_questions ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE tryout_questions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 7. LOGO CONFIG (JSONB → key-value table) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "logoConfigEntries" (
  id           SERIAL PRIMARY KEY,
  "configKey"   TEXT UNIQUE NOT NULL,
  "configValue" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='logo_config') THEN
    INSERT INTO "logoConfigEntries" ("configKey", "configValue", "createdAt", "updatedAt")
    SELECT key, value::TEXT, COALESCE(lc.updated_at, now()), COALESCE(lc.updated_at, now())
    FROM logo_config lc
    CROSS JOIN LATERAL jsonb_each_text(lc.config) AS kv(key, value)
    WHERE lc.config IS NOT NULL AND lc.config::TEXT != '{}'
    ON CONFLICT ("configKey") DO UPDATE SET "configValue" = EXCLUDED."configValue";
  END IF;
END $$;

DROP TABLE IF EXISTS logo_config CASCADE;

-- ── 8. TRYOUT ATTEMPTS ───────────────────────────────────────────────────
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "userId"      TEXT;
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "userName"    TEXT;
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "tryoutId"    TEXT;
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "twkScore"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "tiuScore"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "tkpScore"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tryout_attempts ADD COLUMN IF NOT EXISTS "totalScore"  INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tryout_attempts' AND column_name='created_at') THEN
    ALTER TABLE tryout_attempts RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tryout_attempts' AND column_name='updated_at') THEN
    ALTER TABLE tryout_attempts RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;

-- ── 9. NEW TABLES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rolePermissions" (
  id             SERIAL PRIMARY KEY,
  role           TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  "permissionId" INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, "permissionId")
);

CREATE TABLE IF NOT EXISTS "userPermissions" (
  id             SERIAL PRIMARY KEY,
  "userId"       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "permissionId" INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  "isGranted"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("userId", "permissionId")
);

CREATE TABLE IF NOT EXISTS "packageTryouts" (
  id          SERIAL PRIMARY KEY,
  "packageId" TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  "tryoutId"  TEXT NOT NULL REFERENCES tryouts(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("packageId", "tryoutId")
);

CREATE TABLE IF NOT EXISTS "attemptAnswers" (
  id              SERIAL PRIMARY KEY,
  "attemptId"     INTEGER NOT NULL REFERENCES tryout_attempts(id) ON DELETE CASCADE,
  "questionIndex" INTEGER NOT NULL,
  "selectedOption" INTEGER NOT NULL DEFAULT -1,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("attemptId", "questionIndex")
);

-- Rename user_purchases → userPurchases if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_purchases') THEN
    ALTER TABLE user_purchases RENAME TO "userPurchases";
  END IF;
END $$;

-- Create userPurchases if it doesn't exist
CREATE TABLE IF NOT EXISTS "userPurchases" (
  id          SERIAL PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES users(email),
  "packageId" TEXT NOT NULL REFERENCES packages(id),
  "paymentId" TEXT REFERENCES payments(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("userId", "packageId")
);

-- ── 10. TRIGGERS (auto-update updatedAt) ──────────────────────────────────

CREATE OR REPLACE FUNCTION "updateUpdatedAt"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_questions_updatedAt') THEN
    CREATE TRIGGER trg_questions_updatedAt BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAt"();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_packages_updatedAt') THEN
    CREATE TRIGGER trg_packages_updatedAt BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAt"();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_users_updatedAt') THEN
    CREATE TRIGGER trg_users_updatedAt BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAt"();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tryoutAttempts_updatedAt') THEN
    CREATE TRIGGER "trg_tryoutAttempts_updatedAt" BEFORE UPDATE ON tryout_attempts FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAt"();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tryouts_updatedAt') THEN
    CREATE TRIGGER tryouts_updatedAt BEFORE UPDATE ON tryouts FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAt"();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_bankAccounts_updatedAt') THEN
    CREATE TRIGGER "trg_bankAccounts_updatedAt" BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION "updateUpdatedAt"();
  END IF;
END $$;

-- ── 11. SEED PERMISSIONS ──────────────────────────────────────────────────

INSERT INTO permissions (name, description, category) VALUES
  ('view_dashboard', 'Access the user dashboard', 'dashboard'),
  ('take_tryout', 'Take tryout exams', 'dashboard'),
  ('view_ranking', 'View ranking leaderboard', 'dashboard'),
  ('view_profile', 'View and edit own profile', 'dashboard'),
  ('view_payment_history', 'View own payment history', 'dashboard'),
  ('view_videos', 'Access video learning materials', 'dashboard'),
  ('view_admin', 'Access the admin panel', 'admin'),
  ('manage_questions', 'Create, edit, delete questions', 'admin'),
  ('manage_packages', 'Create, edit, delete packages', 'admin'),
  ('manage_tryouts', 'Create, edit, delete tryouts and assign questions', 'admin'),
  ('manage_payments', 'View, verify, block payment proofs', 'admin'),
  ('manage_users', 'View and manage users', 'admin'),
  ('manage_settings', 'Manage logo config, bank accounts, site settings', 'admin'),
  ('view_analytics', 'View dashboard analytics and statistics', 'admin'),
  ('upload_files', 'Upload images and files', 'system')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "rolePermissions" (role, "permissionId")
SELECT 'user', id FROM permissions WHERE name IN (
  'view_dashboard', 'take_tryout', 'view_ranking', 'view_profile',
  'view_payment_history', 'view_videos', 'upload_files'
)
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "rolePermissions" (role, "permissionId")
SELECT 'admin', id FROM permissions
ON CONFLICT (role, "permissionId") DO NOTHING;

-- ── 12. CLEANUP ───────────────────────────────────────────────────────────

DROP TABLE IF EXISTS tryout_sets CASCADE;
DROP TABLE IF EXISTS tryout_set_questions CASCADE;

-- ── DONE ──────────────────────────────────────────────────────────────────
