// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
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
  });
});
