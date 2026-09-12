// ─────────────────────────────────────────────
// API: GET/POST Banks (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export interface BankResponse {
  id: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapBankAccount(b: {
  id: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}): BankResponse {
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scope = searchParams.get("scope");

  const where: Record<string, unknown> = { deletedAt: null };
  if (scope !== "admin") {
    where.isActive = true;
  }

  const banks = await prisma.bankAccount.findMany({
    where,
    orderBy: { id: "asc" },
  });

  // DB is the source of truth; empty = admin has not configured banks yet.
  return NextResponse.json({ banks: banks.map(mapBankAccount) });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const bankName = String(body.bankName ?? "").trim();
    const accountNumber = String(body.accountNumber ?? "").trim();
    const accountHolder = String(body.accountHolder ?? "").trim();
    const isActive =
      body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: "bankName, accountNumber, and accountHolder are required" },
        { status: 400 },
      );
    }

    const bank = await prisma.bankAccount.create({
      data: { bankName, accountNumber, accountHolder, isActive },
    });

    return NextResponse.json(
      { success: true, bank: mapBankAccount(bank) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          error:
            "A bank account with this bank name and account number already exists",
        },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
