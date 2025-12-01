import { supabase } from "./supabase";

export async function initializeDatabase() {
  try {
    // Check if tables exist by trying to query users table
    const { error: usersError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (usersError?.code === "PGRST205") {
      // Table doesn't exist - display setup instructions but allow app to continue
      console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    ⚠️  SUPABASE SETUP REQUIRED ⚠️                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Your Supabase database needs to be initialized for full functionality.

STEP 1: Create Database Tables
────────────────────────────────
1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Click "New Query"
3. Copy and run the SQL from: SUPABASE_SETUP.md or supabase-schema.sql
4. Click "Run"

STEP 2: Create Storage Buckets
──────────────────────────────
1. Go to: https://app.supabase.com → Your Project → Storage
2. Create bucket: "task-attachments" (Public)
3. Create bucket: "submission-files" (Public)

The app will start now, but database features won't work until you complete setup above.
`);
      return; // Don't throw - allow app to start
    }

    if (usersError) {
      console.warn("Database connection check warning:", usersError.message);
      return; // Don't throw - allow app to continue
    }

    console.log("✓ Database schema verified");
  } catch (err: any) {
    console.warn("Database initialization warning:", err.message);
    // Don't throw - let app start anyway
  }
}
