import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  try {
    const entries = await prisma.logoConfigEntry.findMany();
    const config = Object.fromEntries(entries.map(e => [e.configKey, e.configValue]));
    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  try {
    const body = await request.json();
    const entries = Object.entries(body).map(([configKey, configValue]) => ({
      configKey,
      configValue: configValue as string | null,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.logoConfigEntry.deleteMany();
      for (const entry of entries) {
        await tx.logoConfigEntry.create({ data: entry });
      }
    });

    return NextResponse.json({ success: true, config: body });
  } catch {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
