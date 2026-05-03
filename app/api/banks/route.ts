// ─────────────────────────────────────────────
// API: GET/PUT Banks (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_BANK_ACCOUNTS } from '@/data/packages';

function mapBankAccount(b: { id: number; bankName: string; accountNumber: string; accountHolder: string; isActive: boolean | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: b.id,
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    accountHolder: b.accountHolder,
    isActive: b.isActive ?? true,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export async function GET() {
  let banks = await prisma.bankAccount.findMany({ orderBy: { id: 'asc' } });

  // Fallback: seed from defaults if DB is empty
  if (banks.length === 0) {
    for (const b of DEFAULT_BANK_ACCOUNTS) {
      await prisma.bankAccount.create({ data: b });
    }
    banks = await prisma.bankAccount.findMany({ orderBy: { id: 'asc' } });
  }

  return NextResponse.json({ banks: banks.map(mapBankAccount) });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!Array.isArray(body.banks)) {
    return NextResponse.json({ error: 'Invalid data: banks must be an array' }, { status: 400 });
  }

  // Upsert by bankName+accountNumber (unique constraint)
  for (const b of body.banks) {
    await prisma.bankAccount.upsert({
      where: {
        bankName_accountNumber: {
          bankName: b.bankName as string,
          accountNumber: b.accountNumber as string,
        },
      },
      update: {
        accountHolder: b.accountHolder as string,
        isActive: b.isActive as boolean,
      },
      create: {
        bankName: b.bankName as string,
        accountNumber: b.accountNumber as string,
        accountHolder: b.accountHolder as string,
        isActive: b.isActive as boolean,
      },
    });
  }

  const banks = await prisma.bankAccount.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json({ success: true, banks: banks.map(mapBankAccount) });
}
