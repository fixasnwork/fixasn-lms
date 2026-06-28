// Diagnostic: show exactly what Prisma reads for the Video package.
// Run with: npx tsx scripts/diagnose-packages.ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import prisma from '../lib/prisma';

(async () => {
  const all = await prisma.package.findMany({
    select: {
      id: true,
      name: true,
      includesVideoPembelajaran: true,
      deletedAt: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('--- All packages (Prisma view) ---');
  console.log(JSON.stringify(all, null, 2));

  const video = all.filter((p) => p.name.toLowerCase().includes('video'));
  console.log('\n--- Video package summary ---');
  for (const p of video) {
    console.log(
      `id=${p.id} name="${p.name}" includesVideoPembelajaran=${JSON.stringify(
        p.includesVideoPembelajaran
      )} (typeof ${typeof p.includesVideoPembelajaran}) deletedAt=${p.deletedAt}`
    );
  }

  await prisma.$disconnect();
})();
