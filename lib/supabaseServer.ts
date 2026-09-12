// ─────────────────────────────────────────────
// SERVER-SIDE SUPABASE CLIENT
// Uses secret API key for admin-level operations
// Must only be used in server components / API routes
// ─────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseServer() {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!supabaseSecretKey) throw new Error("SUPABASE_SECRET_KEY is not set");

  supabaseInstance = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return supabaseInstance;
}

// Lazy-access proxy: defers client creation until first use so route-handler
// module evaluation during `next build` (page-data collection) does not throw
// when SUPABASE_SECRET_KEY is only present at runtime.
export const supabaseServer = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop: string | symbol) {
    const client = getSupabaseServer();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
