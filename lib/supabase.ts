import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided by the user
const DEFAULT_SUPABASE_URL = 'https://pelzofhwzcnzgmnlijaz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbHpvZmh3emNuemdtbmxpamF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzEwOTIsImV4cCI6MjEwMzM0NzA5Mn0.hCpoQUha_pnKqYtpKPpleF9k3ZX2VVSxJAdIHTlmtFE';

// Support both NEXT_PUBLIC_ and VITE_ prefixes for seamless flexibility
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

