// @vitest-environment node
import fs from "node:fs";
import { X509Certificate } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPostgresConnectionOptions } from "./postgresConnection";

const databaseUrl = "postgresql://user:password@db.example.test:5432/postgres";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("getPostgresConnectionOptions", () => {
  it("provides a valid bundled CA without reading the runtime filesystem", () => {
    vi.stubEnv("SUPABASE_CA_CERT_PATH", "");
    const readFile = vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("No repository filesystem in Workers");
    });

    const options = getPostgresConnectionOptions(databaseUrl);

    expect(new X509Certificate(options.ssl.ca).subject).toContain("Supabase Root 2021 CA");
    expect(options.ssl.rejectUnauthorized).toBe(true);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("keeps the bundled certificate in sync with the repository certificate", () => {
    vi.stubEnv("SUPABASE_CA_CERT_PATH", "");
    const certificate = fs.readFileSync("prod-ca-2021.crt", "utf8");
    expect(new X509Certificate(getPostgresConnectionOptions(databaseUrl).ssl.ca).fingerprint256)
      .toBe(new X509Certificate(certificate).fingerprint256);
  });

  it("supports an explicit custom CA file", () => {
    vi.stubEnv("SUPABASE_CA_CERT_PATH", "custom-ca.crt");
    vi.spyOn(fs, "readFileSync").mockReturnValue("custom certificate");
    expect(getPostgresConnectionOptions(databaseUrl).ssl).toEqual({
      ca: "custom certificate",
      rejectUnauthorized: true,
    });
  });

  it("fails when an explicitly configured CA file is missing", () => {
    vi.stubEnv("SUPABASE_CA_CERT_PATH", "missing-ca.crt");
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => getPostgresConnectionOptions(databaseUrl)).toThrow("Check SUPABASE_CA_CERT_PATH");
  });

  it("removes URL SSL settings so they cannot override CA verification", () => {
    vi.stubEnv("SUPABASE_CA_CERT_PATH", "");
    const options = getPostgresConnectionOptions(`${databaseUrl}?sslmode=no-verify&sslrootcert=missing.crt&pgbouncer=true&application_name=test`);
    const url = new URL(options.connectionString);
    expect(url.searchParams.has("sslmode")).toBe(false);
    expect(url.searchParams.has("sslrootcert")).toBe(false);
    expect(url.searchParams.has("pgbouncer")).toBe(false);
    expect(url.searchParams.get("application_name")).toBe("test");
    expect(options.ssl.rejectUnauthorized).toBe(true);
  });
});
