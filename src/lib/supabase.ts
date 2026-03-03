import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ffqwhjmvpjyyynhsmtje.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcXdoam12cGp5eXluaHNtdGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODgyNTAsImV4cCI6MjA4ODA2NDI1MH0._e7eU4FtcqTgT-uWH41wzE99qIUQvHcbzZf8A5yIfRE";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);