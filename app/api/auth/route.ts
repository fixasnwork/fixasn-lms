// ─────────────────────────────────────────────
// API: Auth check (legacy — replaced by NextAuth.js)
// Returns current session info if authenticated
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(_request?: NextRequest) {
  const session = await auth();
  if (!session?.user || (session as { isSessionStale?: boolean }).isSessionStale) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const isAdmin = session.user.email === 'admin@fixasn.id';

  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.user.name || 'Pengguna',
      email: session.user.email,
      avatar: session.user.image || session.user.email?.[0]?.toUpperCase(),
    },
    role: isAdmin ? 'admin' : 'user',
  });
}
