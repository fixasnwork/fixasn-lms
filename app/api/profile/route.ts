// ─────────────────────────────────────────────
// API: PATCH /api/profile — Update name & avatar
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, avatar } = body as { name?: string; avatar?: string | null };

  // At least one field must be provided
  if (name === undefined && avatar === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Validate name
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
    }
  }

  // Build update data
  const data: Record<string, string | null> = {};
  if (name !== undefined) data.name = name.trim();
  if (avatar !== undefined) data.avatar = avatar; // null = remove avatar

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
}
