// ─────────────────────────────────────────────
// API: Auth check (legacy — replaced by NextAuth.js)
// Returns current session info if authenticated
// ─────────────────────────────────────────────
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
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
