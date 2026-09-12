/**
 * Weekly ping to keep Supabase free-tier project from pausing.
 * Run: npx tsx scripts/ping-supabase.ts
 * Env: SUPABASE_URL, SUPABASE_SECRET_KEY (anon/publishable key with read access, or service key)
 */
export {};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
 console.error("PING FAILED: set SUPABASE_URL and SUPABASE_SECRET_KEY");
 process.exit(1);
}

const now = () => new Date().toISOString();

try {
 // Simple read on an existing table — counts as DB activity.
 const res = await fetch(
  `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/users?select=id&limit=1`,
  {
   headers: { apikey: SUPABASE_SECRET_KEY },
  },
 );

 if (res.ok) {
  console.log(`${now()} ping ok (${res.status})`);
 } else {
  console.error(
   `${now()} PING FAILED status=${res.status} ${await res.text()}`,
  );
  process.exit(1);
 }
} catch (err) {
 console.error(`${now()} PING FAILED:`, err);
 process.exit(1);
}
