// @vitest-environment node
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pg = createRequire(import.meta.url)("pg");
const OriginalPool = pg.Pool;
const pools: InstanceType<typeof OriginalPool>[] = [];
const globalForPrisma = globalThis as unknown as { prisma?: unknown };

beforeEach(() => {
  delete globalForPrisma.prisma;
  vi.stubEnv("VERCEL", "");
  vi.spyOn(pg, "Pool").mockImplementation(function (options) {
    const pool = new OriginalPool(options);
    pools.push(pool);
    return pool;
  });
});

afterEach(async () => {
  await Promise.all(pools.splice(0).map((pool) => pool.end()));
  delete globalForPrisma.prisma;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Prisma runtime lifecycle", () => {
  async function loadPrisma(userAgent: string) {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@db.example.test:5432/postgres");
    vi.stubEnv("SUPABASE_CA_CERT_PATH", "");
    vi.stubGlobal("navigator", { userAgent });
    return (await import("./prisma")).default;
  }

  it("does not reuse a client between Worker route handler accesses", async () => {
    const prisma = await loadPrisma("Cloudflare-Workers");
    expect(prisma.user).not.toBe(prisma.user);
  });

  it("preserves the singleton in Node.js", async () => {
    const prisma = await loadPrisma("Node.js");
    expect(prisma.user).toBe(prisma.user);
    expect(pools).toHaveLength(1);
    expect(pools[0].options.max).toBe(10);
  });

  it("limits Vercel instances to one pooled connection", async () => {
    vi.stubEnv("VERCEL", "1");
    const prisma = await loadPrisma("Node.js");
    expect(prisma.user).toBe(prisma.user);
    expect(pools).toHaveLength(1);
    expect(pools[0].options.max).toBe(1);
  });

  it("reuses the production client across module reloads", async () => {
    const first = await loadPrisma("Node.js");
    const firstUser = first.user;
    const second = await loadPrisma("Node.js");
    expect(second.user).toBe(firstUser);
    expect(pools).toHaveLength(1);
  });
});
