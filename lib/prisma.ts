import { PrismaClient } from "@prisma/client";
import { cache } from "react";
import { getPostgresConnectionOptions } from "@/lib/postgresConnection";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | undefined;

function isCloudflareWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function createPrismaClient(): PrismaClient {
  const postgresOptions = getPostgresConnectionOptions();

  // Lazy-load pg adapter only when actually needed (avoids build-time crash)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  const pool = new Pool({
    ...postgresOptions,
    max: 10,
    // Workers cannot reuse sockets owned by another request. Retire each
    // connection when released; keep normal pooling for the Node.js server.
    ...(isCloudflareWorker() ? { maxUses: 1 } : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// React cache is scoped to a server render. In route handlers (outside React's
// cache context), this creates a fresh client rather than a global singleton.
const getWorkerPrisma = cache(createPrismaClient);

function getPrisma(): PrismaClient {
  if (isCloudflareWorker()) return getWorkerPrisma();
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (prismaInstance) return prismaInstance;
  prismaInstance = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
  return prismaInstance;
}

// Lazy-access proxy: defers PrismaClient creation until first DB call.
// Prevents build-time crash when DATABASE_URL is not available during
// Next.js page data collection (prerendering).
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getPrisma();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
}) as PrismaClient;

export default prisma;
