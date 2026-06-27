/**
 * Reset-and-Seed Script (Laravel migrations:fresh equivalent)
 *
 * 1. Drops all application tables in FK-safe order
 * 2. Seeds: permissions → rolePermissions → packages → bankAccounts
 * 3. Seeds: questions → questionOptions → tryouts → packageTryouts → tryoutQuestions
 * 4. Resets autoincrement sequences
 *
 * Usage:
 *   npx tsx scripts/reset-and-seed.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// ── Data imports ──────────────────────────────────────────────────────────
import { DEFAULT_PACKAGES, DEFAULT_BANK_ACCOUNTS } from "../data/packages";
import { DEFAULT_PACKAGE_BANKS } from "../data/questions";

// ── Permissions (mirrors db/schema.sql seed) ──────────────────────────────
const PERMISSIONS = [
  { name: "view_dashboard", description: "Access the user dashboard", category: "dashboard" },
  { name: "take_tryout", description: "Take tryout exams", category: "dashboard" },
  { name: "view_ranking", description: "View ranking leaderboard", category: "dashboard" },
  { name: "view_profile", description: "View and edit own profile", category: "dashboard" },
  { name: "view_payment_history", description: "View own payment history", category: "dashboard" },
  { name: "view_videos", description: "Access video learning materials", category: "dashboard" },
  { name: "view_admin", description: "Access the admin panel", category: "admin" },
  { name: "manage_questions", description: "Create, edit, delete questions", category: "admin" },
  { name: "manage_packages", description: "Create, edit, delete packages", category: "admin" },
  { name: "manage_tryouts", description: "Create, edit, delete tryouts and assign questions", category: "admin" },
  { name: "manage_payments", description: "View, verify, block payment proofs", category: "admin" },
  { name: "manage_users", description: "View and manage users", category: "admin" },
  { name: "manage_settings", description: "Manage logo config, bank accounts, site settings", category: "admin" },
  { name: "view_analytics", description: "View dashboard analytics and statistics", category: "admin" },
  { name: "upload_files", description: "Upload images and files", category: "system" },
];

const USER_ROLE_PERMISSIONS = [
  "view_dashboard", "take_tryout", "view_ranking", "view_profile",
  "view_payment_history", "view_videos", "upload_files",
];

// ── Prisma Client ─────────────────────────────────────────────────────────
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString, max: 10 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("═══ FixASN LMS — Reset & Seed ═══\n");

  // ── Phase 0: Drop all tables ──────────────────────────────────────────
  console.log("[1/4] Dropping existing tables...");

  const dropOrder = [
    "attemptAnswers",
    "userPurchases",
    "payments",
    "tryoutAttempts",
    "tryoutQuestions",
    "packageTryouts",
    "userPermissions",
    "rolePermissions",
    "questionOptions",
    "tryouts",
    "questions",
    "bankAccounts",
    "packages",
    "permissions",
    "users",
    "logoConfigEntries",
    // video-pembelajaran PR 1: new catalog table
    "videos",
  ];

  for (const table of dropOrder) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    console.log(`  DROPPED: ${table}`);
  }

  console.log("\n[2/4] Verifying tables exist...");
  const tableCheck = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  const existingTables = tableCheck.map((r) => r.tablename);
  console.log(`  Found ${existingTables.length} tables:`, existingTables.join(", "));

  // 16 known app tables + the `videos` table added in video-pembelajaran PR 1.
  const EXPECTED_TABLE_COUNT = 17;
  if (existingTables.length < EXPECTED_TABLE_COUNT) {
    console.error(
      `\n❌ Not all ${EXPECTED_TABLE_COUNT} tables exist. Please run: npx prisma db push`
    );
    process.exit(1);
  }

  // ── Phase 1: Seed permissions & role permissions ─────────────────────
  console.log("\n[3/4] Seeding permissions & roles...");

  await prisma.permission.createMany({ data: PERMISSIONS, skipDuplicates: true });
  const permCount = await prisma.permission.count();
  console.log(`  permissions: ${permCount} rows`);

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.name, p.id]));

  const userRolePerms = USER_ROLE_PERMISSIONS
    .filter((name) => permMap.has(name))
    .map((name) => ({
      role: "user",
      permissionId: permMap.get(name)!,
    }));

  await prisma.rolePermission.createMany({ data: userRolePerms, skipDuplicates: true });

  const adminRolePerms = allPerms.map((p) => ({
    role: "admin",
    permissionId: p.id,
  }));

  await prisma.rolePermission.createMany({ data: adminRolePerms, skipDuplicates: true });

  const rolePermCount = await prisma.rolePermission.count();
  console.log(`  rolePermissions: ${rolePermCount} rows (${userRolePerms.length} user + ${adminRolePerms.length} admin)`);

  // ── Phase 2: Seed packages & bank accounts ───────────────────────────
  console.log("\n[4/4] Seeding packages, bank accounts, questions, tryouts...");

  // Packages (auto-increment IDs — look up by name after creation)
  for (const p of DEFAULT_PACKAGES) {
    await prisma.package.upsert({
      where: { name: p.name },
      // On first insert, set the video flag from the static default. On update,
      // DO NOT touch includesVideoPembelajaran — preserve any admin toggle.
      create: {
        name: p.name,
        description: p.description,
        price: p.price,
        isTrial: p.isTrial,
        includesVideoPembelajaran: p.includesVideoPembelajaran ?? false,
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
      },
      update: {
        startDate: p.startDate ? new Date(p.startDate) : undefined,
        endDate: p.endDate ? new Date(p.endDate) : undefined,
      },
    });
  }
  const allPackages = await prisma.package.findMany();
  const pkgIdByName = new Map(allPackages.map((p) => [p.name, p.id]));
  console.log(`  packages: ${allPackages.length} rows`);

  // ── Sample Videos (dev-only; mirrors prisma/seed.ts block) ─────────────
  // The youtubeIds here are placeholders; replace with real FIX ASN content
  // before any non-dev deploy. Idempotent: re-running reset-and-seed will
  // not duplicate these rows.
  const sampleVideos = [
    // Three distinct, well-known public-domain demo IDs so reviewers can
    // visually confirm each category resolves to a different video.
    // Sintel (open movie), Big Buck Bunny (open movie), Tears of Steel
    // (open movie) — all from the Blender Foundation, safe for dev/demo.
    { title: "Pengantar TWK", youtubeId: "eRsGyueVLvQ", category: "TWK", sortOrder: 1, isPublished: true, durationSec: 888 },
    { title: "Pengantar TIU", youtubeId: "aqz-KE-bpKQ", category: "TIU", sortOrder: 1, isPublished: true, durationSec: 596 },
    { title: "Pengantar TKP", youtubeId: "TWzdRCc8Vic", category: "TKP", sortOrder: 1, isPublished: true, durationSec: 734 },
  ];
  for (const v of sampleVideos) {
    const existing = await prisma.video.findFirst({
      where: { title: v.title, category: v.category, deletedAt: null },
    });
    if (!existing) {
      await prisma.video.create({ data: v });
    }
  }
  console.log(`  videos: ${await prisma.video.count()} rows`);

  // Bank Accounts
  for (const b of DEFAULT_BANK_ACCOUNTS) {
    await prisma.bankAccount.upsert({
      where: { bankName_accountNumber: { bankName: b.bankName, accountNumber: b.accountNumber } },
      create: b,
      update: {},
    });
  }
  console.log(`  bankAccounts: ${await prisma.bankAccount.count()} rows`);

  // ── Phase 3: Seed tryouts, questions, M2M ─────────────────────────────
  const tryoutIdByPkgName = new Map<string, Map<string, number>>();
  const pkgTryoutRows: { packageId: number; tryoutId: number }[] = [];
  const questionRows: { category: string; question: string; correctAnswer: number | null }[] = [];
  const optionRows: { questionId: number; optionIndex: number; optionText: string; tkpValue: number | null }[] = [];
  const tryoutQuestionRows: { tryoutId: number; questionId: number; sortOrder: number }[] = [];
  const seenQIds = new Set<number>();

  for (const [pkgName, tryouts] of Object.entries(DEFAULT_PACKAGE_BANKS)) {
    if (!tryouts.length) continue;
    const packageId = pkgIdByName.get(pkgName);
    if (!packageId) { console.warn(`  ⚠ Package "${pkgName}" not found`); continue; }

    const tryoutMap = new Map<string, number>();
    for (const t of tryouts) {
      const questions = t.questions ?? [];
      const existing = await prisma.tryout.findFirst({
        where: { name: t.name, sortOrder: t.sortOrder, isTrial: t.isTrial },
        select: { id: true },
      });
      let tryoutId: number;
      if (existing) {
        tryoutId = existing.id;
        await prisma.tryout.update({
          where: { id: existing.id },
          data: { durationMin: t.isTrial ? 15 : 100 },
        });
      } else {
        const now = new Date();
        const farFuture = new Date('2099-12-31T23:59:59Z');
        const created = await prisma.tryout.create({
          data: { name: t.name, isTrial: t.isTrial, sortOrder: t.sortOrder, durationMin: t.isTrial ? 15 : 100, startDate: now, endDate: farFuture },
        });
        tryoutId = created.id;
      }
      tryoutMap.set(t.name, tryoutId);
      pkgTryoutRows.push({ packageId, tryoutId });

      questions.forEach((q, qi) => {
        if (!seenQIds.has(q.id)) {
          seenQIds.add(q.id);
          questionRows.push({
            category: q.category,
            question: q.question,
            correctAnswer: q.correctAnswer ?? null,
          });

          const opts = q.options ?? [];
          opts.forEach((opt, oi) => {
            optionRows.push({
              questionId: q.id,
              optionIndex: oi,
              optionText: opt,
              tkpValue: (q.tkpValues?.[oi]) ?? null,
            });
          });
        }
        tryoutQuestionRows.push({ tryoutId, questionId: q.id, sortOrder: qi + 1 });
      });
    }
    tryoutIdByPkgName.set(pkgName, tryoutMap);
  }

  // Insert questions and map original IDs → DB IDs
  await prisma.question.createMany({ data: questionRows });
  const allQuestions = await prisma.question.findMany({ select: { id: true } });
  const origToDb = new Map<number, number>();
  const sortedOrig = [...seenQIds].sort((a, b) => a - b);
  allQuestions.forEach((q, i) => origToDb.set(sortedOrig[i], q.id));

  await prisma.questionOption.createMany({
    data: optionRows.map((o) => ({ ...o, questionId: origToDb.get(o.questionId)! })),
    skipDuplicates: true,
  });

  await prisma.packageTryout.createMany({ data: pkgTryoutRows, skipDuplicates: true });

  await prisma.tryoutQuestion.createMany({
    data: tryoutQuestionRows.map((r) => ({
      tryoutId: r.tryoutId,
      questionId: origToDb.get(r.questionId) ?? r.questionId,
      sortOrder: r.sortOrder,
    })),
    skipDuplicates: true,
  });

  // Reset sequences
  await prisma.$executeRawUnsafe(`SELECT setval('questions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM questions))`);
  await prisma.$executeRawUnsafe(`SELECT setval('"questionOptions_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "questionOptions"))`);

  // ── Summary ──────────────────────────────────────────────────────────
  console.log("\n═══ Seed Complete ═══");
  console.log(`  permissions:      ${await prisma.permission.count()}`);
  console.log(`  rolePermissions:  ${await prisma.rolePermission.count()}`);
  console.log(`  packages:         ${await prisma.package.count()}`);
  console.log(`  bankAccounts:     ${await prisma.bankAccount.count()}`);
  console.log(`  tryouts:          ${await prisma.tryout.count()}`);
  console.log(`  questions:        ${await prisma.question.count()}`);
  console.log(`  questionOptions:  ${await prisma.questionOption.count()}`);
  console.log(`  packageTryouts:   ${await prisma.packageTryout.count()}`);
  console.log(`  tryoutQuestions:  ${await prisma.tryoutQuestion.count()}`);
  console.log(`  videos:           ${await prisma.video.count()}`);
  console.log(`  unique questions: ${seenQIds.size}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
