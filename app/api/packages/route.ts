// ─────────────────────────────────────────────
// API: GET/PUT Packages
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_PACKAGES } from '@/data/packages';

// In-memory store (replace with database in production)
let packages = [...DEFAULT_PACKAGES];

export async function GET() {
  return NextResponse.json({ packages });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  // Validate and update packages
  if (Array.isArray(body.packages)) {
    packages = body.packages;
    return NextResponse.json({ success: true, packages });
  }

  return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
}
