import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Offline cache can still be used if previously populated.");
}

export const supabase = createClient(url ?? "https://placeholder.invalid", key ?? "public-placeholder", {
  auth: { persistSession: false, autoRefreshToken: false },
});
