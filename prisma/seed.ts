/**
 * Seed script — run AFTER prisma db push has created all tables.
 * Usage: npx tsx prisma/seed.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getPostgresConnectionOptions } from "../lib/postgresConnection";

async function main() {
  const { DEFAULT_PACKAGES, DEFAULT_BANK_ACCOUNTS } = await import("../data/packages");
  const { DEFAULT_PACKAGE_BANKS } = await import("../data/questions");

  const pool = new Pool({ ...getPostgresConnectionOptions(), max: 10 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  // ── 1. Permissions ────────────────────────────────────────────────────
  const PERMS = [
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
  const USER_PERMS = ["view_dashboard","take_tryout","view_ranking","view_profile","view_payment_history","view_videos","upload_files"];

  console.log("[1/6] Seeding permissions...");
  await prisma.permission.createMany({ data: PERMS, skipDuplicates: true });
  const allP = await prisma.permission.findMany();
  const pMap = new Map(allP.map((p) => [p.name, p.id]));

  const userRolePerms = USER_PERMS.filter((n) => pMap.has(n)).map((n) => ({ role: "user", permissionId: pMap.get(n)! }));
  await prisma.rolePermission.createMany({ data: userRolePerms, skipDuplicates: true });
  const adminRolePerms = allP.map((p) => ({ role: "admin", permissionId: p.id }));
  await prisma.rolePermission.createMany({ data: adminRolePerms, skipDuplicates: true });
  console.log(`   ✓ permissions: ${await prisma.permission.count()} | rolePermissions: ${await prisma.rolePermission.count()}`);

  // ── 2. Packages → capture name→id map ─────────────────────────────────
  console.log("[2/6] Seeding packages...");
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
        accessDurationMonths: p.accessDurationMonths ?? 1,
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
  console.log(`   ✓ packages: ${allPackages.length}`);

  // ── 3. Tryouts → capture (packageName, tryoutName) → id map ───────────
  console.log("[3/6] Seeding tryouts & package-tryout links...");
  const tryoutIdByPkgName = new Map<string, Map<string, number>>(); // pkgName → Map<tryoutName, id>
  const pkgTryoutRows: { packageId: number; tryoutId: number }[] = [];

  for (const [pkgName, tryouts] of Object.entries(DEFAULT_PACKAGE_BANKS)) {
    if (!tryouts.length) continue;
    const packageId = pkgIdByName.get(pkgName);
    if (!packageId) { console.warn(`   ⚠ Package "${pkgName}" not found, skipping`); continue; }

    const tryoutMap = new Map<string, number>();
    for (const t of tryouts) {
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
    }
    tryoutIdByPkgName.set(pkgName, tryoutMap);
  }

  await prisma.packageTryout.createMany({ data: pkgTryoutRows, skipDuplicates: true });
  console.log(`   ✓ tryouts: ${await prisma.tryout.count()} | packageTryouts: ${await prisma.packageTryout.count()}`);

  // ── 4. Questions → capture (originalId) → (dbId) ──────────────────────
  console.log("[4/6] Seeding questions & options...");
  const questionRows: { category: string; question: string; correctAnswer: number | null; questionImage?: string | null; explanation?: string | null; explanationImage?: string | null }[] = [];
  const optionRows: { category?: string; question?: string; questionId?: number; optionIndex: number; optionText: string | null; optionImage?: string | null; tkpValue?: number | null }[] = [];
  const tryoutQuestionRows: { tryoutId: number; questionId: number; sortOrder: number }[] = [];
  const seen = new Set<number>();

  for (const [pkgName, tryouts] of Object.entries(DEFAULT_PACKAGE_BANKS)) {
    for (const t of tryouts) {
      const tryoutId = tryoutIdByPkgName.get(pkgName)?.get(t.name);
      if (!tryoutId) continue;

      const questions = t.questions ?? [];
      questions.forEach((q, qi) => {
        if (!seen.has(q.id)) {
          seen.add(q.id);
          questionRows.push({
            category: q.category,
            question: q.question,
            correctAnswer: q.correctAnswer ?? null,
            questionImage: q.questionImage ?? null,
            explanation: q.explanation ?? null,
            explanationImage: q.explanationImage ?? null,
          });

          const opts = q.options ?? [];
          opts.forEach((opt, oi) => {
            optionRows.push({
              questionId: q.id, // temporary — replaced below
              optionIndex: oi,
              optionText: opt,
              optionImage: q.optionImages?.[oi] ?? null,
              tkpValue: (q.tkpValues?.[oi]) ?? null,
            });
          });
        }
        tryoutQuestionRows.push({ tryoutId, questionId: q.id, sortOrder: qi + 1 });
      });
    }
  }

  // Insert questions and build originalId → dbId map
  await prisma.question.createMany({ data: questionRows });
  const allQuestions = await prisma.question.findMany({ select: { id: true } });
  const originalIdToDbId = new Map<number, number>();
  // Since we inserted in order and original IDs were sequential, map by insertion order
  const sortedOriginalIds = [...seen].sort((a, b) => a - b);
  allQuestions.forEach((q, i) => {
    originalIdToDbId.set(sortedOriginalIds[i], q.id);
  });

  // Fix optionRows questionId references
  const resolvedOptions = optionRows.map((o) => ({
    ...o,
    questionId: originalIdToDbId.get(o.questionId!)!,
  }));
  await prisma.questionOption.createMany({ data: resolvedOptions, skipDuplicates: true });
  console.log(`   ✓ questions: ${allQuestions.length} | options: ${await prisma.questionOption.count()}`);

  // ── 5. Tryout-Question M2M (resolve original question IDs to db IDs) ──
  console.log("[5/6] Seeding tryout-question links...");
  const resolvedTQ = tryoutQuestionRows.map((r) => ({
    tryoutId: r.tryoutId,
    questionId: originalIdToDbId.get(r.questionId) ?? r.questionId,
    sortOrder: r.sortOrder,
  }));
  await prisma.tryoutQuestion.createMany({ data: resolvedTQ, skipDuplicates: true });
  console.log(`   ✓ tryoutQuestions: ${await prisma.tryoutQuestion.count()}`);

  // ── 6. Bank Accounts ──────────────────────────────────────────────────
  console.log("[6/6] Seeding bank accounts...");
  for (const b of DEFAULT_BANK_ACCOUNTS) {
    await prisma.bankAccount.upsert({
      where: { bankName_accountNumber: { bankName: b.bankName, accountNumber: b.accountNumber } },
      create: b,
      update: {},
    });
  }
  console.log(`   ✓ bankAccounts: ${await prisma.bankAccount.count()}`);

  // ── 7. Sample Videos (opt-in for local development only) ──────────────
  // These IDs are placeholder demos and must never be published in production.
  // Set SEED_SAMPLE_VIDEOS=true explicitly when seeding a local database.
  if (process.env.SEED_SAMPLE_VIDEOS === "true") {
    console.log("[7/7] Seeding sample videos...");
    const sampleVideos = [
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
    console.log(`   ✓ videos: ${await prisma.video.count()}`);
  } else {
    console.log("[7/7] Skipping sample videos (set SEED_SAMPLE_VIDEOS=true for local development)");
  }

  // ── Reset autoincrement sequences ─────────────────────────────────────
  await prisma.$executeRawUnsafe(`SELECT setval('questions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM questions))`);
  await prisma.$executeRawUnsafe(`SELECT setval('"questionOptions_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "questionOptions"))`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n═══ SEED COMPLETE ═══");
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
  console.log(`  unique questions inserted: ${seen.size}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
