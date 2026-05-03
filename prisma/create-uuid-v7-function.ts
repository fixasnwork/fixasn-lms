/**
 * Creates a uuid_generate_v7() function in Postgres for UUID v7 (time-ordered) IDs.
 * Run: npx tsx prisma/create-uuid-v7-function.ts
 */
import "dotenv/config";
import { Pool } from "pg";

const UUID_V7_SQL = `
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    unix_ts_ms BIGINT;
    uuid_bytes BYTEA;
BEGIN
    unix_ts_ms := floor(extract(epoch FROM clock_timestamp()) * 1000);
    uuid_bytes := gen_random_bytes(16);

    -- Set timestamp bytes (0-5, big endian)
    uuid_bytes := set_byte(uuid_bytes, 0, ((unix_ts_ms >> 40) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 1, ((unix_ts_ms >> 32) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 2, ((unix_ts_ms >> 24) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 3, ((unix_ts_ms >> 16) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 4, ((unix_ts_ms >> 8) & 255)::int);
    uuid_bytes := set_byte(uuid_bytes, 5, (unix_ts_ms & 255)::int);

    -- Set version bits (byte 6: 0111xxxx = 0x70-0x7F)
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 0x0F | 0x70)::int);

    -- Set variant bits (byte 8: 10xxxxxx = 0x80-0xBF)
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 0x3F | 0x80)::int);

    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;
`;

async function main() {
  // Use direct connection (not pgbouncer) for DDL
  const directUrl = process.env.DATABASE_URL!.replace(":6543/", ":5432/").replace("?pgbouncer=true", "");
  const pool = new Pool({ connectionString: directUrl, max: 1 });

  try {
    await pool.query(UUID_V7_SQL);
    console.log("✅ uuid_generate_v7() function created successfully");

    // Verify
    const result = await pool.query("SELECT uuid_generate_v7()");
    console.log(`   Test UUID: ${result.rows[0].uuid_generate_v7}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
