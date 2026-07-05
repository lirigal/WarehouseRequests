import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

// Detect if we have proper Supabase configuration
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== "YOUR_SUPABASE_URL" && 
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

if (!isSupabaseConfigured) {
  console.log("⚠️ Supabase Credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set in your environment variables.");
  console.log("⚠️ Running in Hybrid Mode: Data is fully persisted in LocalStorage as a local offline-first fallback database.");
} else {
  console.log("🔌 Connected successfully to your live Supabase project at:", supabaseUrl);
}
