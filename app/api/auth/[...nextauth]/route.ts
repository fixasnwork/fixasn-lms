import { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { authContext } from '@/lib/authContext';

function extractIP(req: NextRequest): string | null {
  // NextRequest.ip works at runtime but isn't in TS types yet
  const ip = (req as unknown as { ip?: string }).ip;
  if (ip) return ip.replace(/^::ffff:/, '');
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().replace(/^::ffff:/, '');
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.replace(/^::ffff:/, '');
  return null;
}

export const GET = (req: NextRequest) => {
  authContext.enterWith({ ip: extractIP(req) });
  return handlers.GET(req);
};

export const POST = (req: NextRequest) => {
  authContext.enterWith({ ip: extractIP(req) });
  return handlers.POST(req);
};
