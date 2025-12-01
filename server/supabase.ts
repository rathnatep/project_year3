import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database schema on first run
export async function initializeSupabase() {
  try {
    // Tables will be created by migrations in Supabase
    // This function just validates the connection
    const { data, error } = await supabase.from("users").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" which is fine - tables exist
      console.warn("Supabase connection check:", error);
    }
  } catch (err) {
    console.error("Failed to initialize Supabase:", err);
  }
}
