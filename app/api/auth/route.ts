// ─────────────────────────────────────────────
// API: Auth endpoints
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, email } = body;

  if (action === 'login') {
    // Simulated login - in production, verify with Google OAuth
    const isAdmin = email === 'admin@fixasn.id';
    
    return NextResponse.json({
      success: true,
      user: {
        name: isAdmin ? 'Admin FIX ASN' : 'User',
        email,
        avatar: isAdmin ? 'AD' : email[0].toUpperCase(),
      },
      role: isAdmin ? 'admin' : 'user',
    });
  }

  if (action === 'logout') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
