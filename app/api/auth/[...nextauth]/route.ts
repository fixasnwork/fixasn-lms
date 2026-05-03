import { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { authContext } from '@/lib/authContext';

function extractIP(req: NextRequest): string | null {
  // NextRequest.ip works in both dev and production
  if (req.ip) return req.ip.replace(/^::ffff:/, '');
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().replace(/^::ffff:/, '');
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.replace(/^::ffff:/, '');
  return null;
}

export const GET = (req: NextRequest, ctx: any) => {
  authContext.enterWith({ ip: extractIP(req) });
  return handlers.GET(req, ctx);
};

export const POST = (req: NextRequest, ctx: any) => {
  authContext.enterWith({ ip: extractIP(req) });
  return handlers.POST(req, ctx);
};
