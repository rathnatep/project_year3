import { supabase } from "./supabase";

export async function initializeDatabase() {
  try {
    // Check if tables exist by trying to query users table
    const { error: usersError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (usersError?.code === "PGRST205") {
      // Table doesn't exist, create schema
      console.log("Creating database schema...");

      // We'll use the SQL editor in Supabase to create tables
      // For now, we'll create them via individual insert attempts
      // which will fail gracefully if tables don't exist yet
      
      // Since we can't run raw SQL from client, we need to tell user to create tables
      console.warn(`
⚠️  SUPABASE SETUP REQUIRED ⚠️
Your Supabase database needs to be initialized.

Please run these SQL commands in your Supabase SQL Editor (https://app.supabase.com):

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('teacher', 'student'))
);

CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  join_code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'text_file' CHECK(task_type IN ('text_file')),
  due_date TEXT NOT NULL,
  file_url TEXT
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text_content TEXT,
  file_url TEXT,
  submitted_at TEXT NOT NULL,
  score INTEGER,
  UNIQUE(task_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(announcement_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.reminder_dismissals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dismissed_at TEXT NOT NULL,
  UNIQUE(task_id, student_id)
);
      `);

      // For storage buckets
      console.warn(`
Also, create these storage buckets in Supabase (Storage > New Bucket):
1. "task-attachments" (Public)
2. "submission-files" (Public)
      `);

      throw new Error("Database schema not initialized. See instructions above.");
    }

    if (usersError) {
      console.error("Database connection error:", usersError);
      throw usersError;
    }

    console.log("✓ Database schema verified");
  } catch (err: any) {
    console.error("Failed to initialize database:", err.message);
    throw err;
  }
}
