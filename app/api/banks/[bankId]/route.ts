// ─────────────────────────────────────────────
// API: PUT/DELETE single Bank Account (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bankId: string }> }
) {
  const { bankId: bankIdParam } = await params;
  const bankId = parseId(bankIdParam);
  if (!bankId) {
    return NextResponse.json({ error: 'Valid bankId is required' }, { status: 400 });
  }

  const bank = await prisma.bankAccount.findFirst({
    where: { id: bankId, deletedAt: null },
  });

  if (!bank) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  return NextResponse.json({
    bank: {
      id: bank.id,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountHolder: bank.accountHolder,
      isActive: bank.isActive ?? true,
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString(),
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bankId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { bankId: bankIdParam } = await params;
  const bankId = parseId(bankIdParam);
  if (!bankId) {
    return NextResponse.json({ error: 'Valid bankId is required' }, { status: 400 });
  }

  try {
    const existing = await prisma.bankAccount.findFirst({
      where: { id: bankId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const body = await request.json();

    const bankName = body.bankName !== undefined ? String(body.bankName).trim() : existing.bankName;
    const accountNumber = body.accountNumber !== undefined ? String(body.accountNumber).trim() : existing.accountNumber;
    const accountHolder = body.accountHolder !== undefined ? String(body.accountHolder).trim() : existing.accountHolder;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;

    if (!bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: 'bankName, accountNumber, and accountHolder cannot be empty' },
        { status: 400 }
      );
    }

    const bank = await prisma.bankAccount.update({
      where: { id: bankId },
      data: { bankName, accountNumber, accountHolder, isActive },
    });

    return NextResponse.json({
      success: true,
      bank: {
        id: bank.id,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountHolder: bank.accountHolder,
        isActive: bank.isActive ?? true,
        createdAt: bank.createdAt.toISOString(),
        updatedAt: bank.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A bank account with this bank name and account number already exists' },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bankId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { bankId: bankIdParam } = await params;
  const bankId = parseId(bankIdParam);
  if (!bankId) {
    return NextResponse.json({ error: 'Valid bankId is required' }, { status: 400 });
  }

  try {
    const existing = await prisma.bankAccount.findFirst({
      where: { id: bankId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Soft-delete
    await prisma.bankAccount.update({
      where: { id: bankId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
