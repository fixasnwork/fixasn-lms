// ─────────────────────────────────────────────
// AUTH DATABASE HELPERS
// Used by NextAuth callbacks to find/create users
// ─────────────────────────────────────────────
import prisma from './prisma';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
}

/**
 * Find existing user by email, or create with default role='user'.
 * Records createdBy='system' and createdIP when auto-registering.
 */
export async function findOrCreateUser(
  email: string,
  name: string,
  avatar?: string | null,
  createdBy?: string,
  createdIP?: string | null,
): Promise<DbUser> {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return existing;
  }

  try {
    const cleanIP = createdIP ? createdIP.replace(/^::ffff:/i, '') : null;
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        avatar,
        role: 'user',
        createdBy: createdBy ?? 'system',
        createdIP: cleanIP,
      },
    });

    return newUser;
  } catch (error) {
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : undefined}`);
  }
}
