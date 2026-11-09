import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const client = url && key ? createClient(url, key) : null;
export function requireClient() {
  if (!client)
    throw new Error(
      "The directory is not connected yet. Configure the Supabase environment variables to enable live data.",
    );
  return client;
}
