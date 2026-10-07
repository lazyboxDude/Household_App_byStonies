import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-side client with the service role: it bypasses row level security, so it must never be
// imported from client code. Only the push sender uses it (to read every household's reminders).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
