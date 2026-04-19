// ─────────────────────────────────────────────
// API: GET/PUT Banks
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BANK_ACCOUNTS } from '@/data/packages';

// In-memory store (replace with database in production)
let banks = [...DEFAULT_BANK_ACCOUNTS];

export async function GET() {
  return NextResponse.json({ banks });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  // Validate and update banks
  if (Array.isArray(body.banks)) {
    banks = body.banks;
    return NextResponse.json({ success: true, banks });
  }

  return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
}
