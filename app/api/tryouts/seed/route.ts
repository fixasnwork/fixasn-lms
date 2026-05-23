// ─────────────────────────────────────────────
// API: POST /api/tryouts/seed
// Idempotently seeds all tryout slots from
// DEFAULT_PACKAGE_BANKS into the database via Prisma.
// ─────────────────────────────────────────────
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_PACKAGE_BANKS } from '@/data/questions';

export async function POST() {
  try {
    // Build name → id lookup for packages
    const packages = await prisma.package.findMany();
    const pkgIdByName = new Map(packages.map((p) => [p.name, p.id]));

    let seededCount = 0;

    for (const [pkgName, tryouts] of Object.entries(DEFAULT_PACKAGE_BANKS)) {
      if (tryouts.length === 0) continue;

      const packageId = pkgIdByName.get(pkgName);
      if (!packageId) {
        console.warn(`Package "${pkgName}" not found, skipping`);
        continue;
      }

      for (const tryoutInput of tryouts) {
        const questions = tryoutInput.questions ?? [];

        // Upsert tryout (match by name + sortOrder + isTrial)
        const existing = await prisma.tryout.findFirst({
          where: { name: tryoutInput.name, isTrial: tryoutInput.isTrial, sortOrder: tryoutInput.sortOrder },
        });

        let tryoutId: number;
        if (existing) {
          tryoutId = existing.id;
          await prisma.tryout.update({
            where: { id: existing.id },
            data: {
              name: tryoutInput.name,
              isTrial: tryoutInput.isTrial,
              sortOrder: tryoutInput.sortOrder,
              durationMin: tryoutInput.isTrial ? 15 : 100,
            },
          });
        } else {
          const created = await prisma.tryout.create({
            data: {
              name: tryoutInput.name,
              isTrial: tryoutInput.isTrial,
              sortOrder: tryoutInput.sortOrder,
              durationMin: tryoutInput.isTrial ? 15 : 100,
            },
          });
          tryoutId = created.id;
        }

        // Package-tryout link
        await prisma.packageTryout.upsert({
          where: { packageId_tryoutId: { packageId, tryoutId } },
          update: {},
          create: { packageId, tryoutId },
        });

        // Questions, options, and tryout-question links
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];

          const qExisting = await prisma.question.findFirst({
            where: { question: q.question, category: q.category },
          });

          let questionId: number;
          if (qExisting) {
            questionId = qExisting.id;
          } else {
            const created = await prisma.question.create({
              data: {
                category: q.category,
                question: q.question,
                correctAnswer: q.correctAnswer ?? null,
                questionImage: q.questionImage ?? null,
                explanation: q.explanation ?? null,
                explanationImage: q.explanationImage ?? null,
              },
            });
            questionId = created.id;
          }

          // Tryout-question link
          await prisma.tryoutQuestion.upsert({
            where: { tryoutId_questionId: { tryoutId, questionId } },
            update: {},
            create: { tryoutId, questionId, sortOrder: qi + 1 },
          });

          // Options
          const opts = q.options ?? [];
          for (let oi = 0; oi < opts.length; oi++) {
            const opt = opts[oi];
            const optText = opt ?? '';
            const tkpVal = q.tkpValues?.[oi] ?? null;

            await prisma.questionOption.upsert({
              where: { questionId_optionIndex: { questionId, optionIndex: oi } },
              update: { optionText: optText, optionImage: q.optionImages?.[oi] ?? null, tkpValue: tkpVal },
              create: {
                questionId,
                optionIndex: oi,
                optionText: optText,
                optionImage: q.optionImages?.[oi] ?? null,
                tkpValue: tkpVal,
              },
            });
          }
        }

        seededCount++;
      }
    }

    return NextResponse.json({ success: true, seeded: seededCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
