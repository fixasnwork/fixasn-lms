// Diagnostic: trace why a specific user has/doesn't have video access.
// Run: npx tsx scripts/diagnose-video-access.ts <user-email>
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });
import prisma from "../lib/prisma";

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.log("Usage: npx tsx scripts/diagnose-video-access.ts <user-email>");
    console.log("\nAvailable users (first 5):");
    const users = await prisma.user.findMany({ take: 5, select: { email: true, role: true } });
    users.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
    await prisma.$disconnect();
    return;
  }

  console.log(`--- User: ${email} ---`);
  const user = await prisma.user.findUnique({ where: { email }, select: { email: true, role: true, isBlocked: true } });
  console.log("User row:", user);

  const purchases = await prisma.userPurchase.findMany({
    where: { userId: email },
    include: { package: { select: { id: true, name: true, includesVideoPembelajaran: true, deletedAt: true } }, payment: { select: { id: true, status: true } } },
  });
  console.log(`\nUserPurchase rows: ${purchases.length}`);
  purchases.forEach((p) => {
    console.log(`  - id=${p.id} pkg=${p.package.name} (video=${p.package.includesVideoPembelajaran}, pkgDeletedAt=${p.package.deletedAt}) payment=${p.payment?.status ?? "null"} deletedAt=${p.deletedAt}`);
  });

  const payments = await prisma.payment.findMany({
    where: { userId: email },
    include: { package: { select: { name: true, includesVideoPembelajaran: true } } },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\nPayment rows: ${payments.length}`);
  payments.forEach((p) => {
    console.log(`  - id=${p.id} pkg=${p.package.name} (video=${p.package.includesVideoPembelajaran}) status=${p.status} created=${p.createdAt.toISOString()}`);
  });

  // Run the exact access check the API does
  const qualifying = await prisma.userPurchase.findFirst({
    where: {
      userId: email,
      deletedAt: null,
      package: { is: { includesVideoPembelajaran: true, deletedAt: null } },
      OR: [
        { paymentId: null },
        { payment: { is: { status: { notIn: ["rejected", "expired", "blocked"] } } } },
      ],
    },
    select: { id: true },
  });
  console.log(`\nAccess check result: ${qualifying ? "✅ has access" : "❌ NO ACCESS (no qualifying UserPurchase)"}`);

  await prisma.$disconnect();
})();
