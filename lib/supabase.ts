import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided by the user
const DEFAULT_SUPABASE_URL = 'https://pelzofhwzcnzgmnlijaz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbHpvZmh3emNuemdtbmxpamF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzEwOTIsImV4cCI6MjEwMzM0NzA5Mn0.hCpoQUha_pnKqYtpKPpleF9k3ZX2VVSxJAdIHTlmtFE';

// Read values from build-time environment or fallback
let activeUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  DEFAULT_SUPABASE_URL;

let activeAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  DEFAULT_SUPABASE_ANON_KEY;

// On the client-side, restore from localStorage if previously updated
if (typeof window !== 'undefined') {
  const cachedUrl = localStorage.getItem('finanzza_supabase_url');
  const cachedKey = localStorage.getItem('finanzza_supabase_key');
  if (cachedUrl && cachedKey && cachedUrl.startsWith('https://')) {
    activeUrl = cachedUrl;
    activeAnonKey = cachedKey;
  }
}

export const isSupabaseConfigured = Boolean(
  activeUrl && 
  activeAnonKey && 
  activeUrl.startsWith('https://') &&
  activeAnonKey.length > 20
);

// Create the active client instance
let activeClient: SupabaseClient = createClient(
  activeUrl,
  activeAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Proxy object that forwards all accesses dynamically to the active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    // Return properties or methods from the live active client
    const value = Reflect.get(activeClient, prop);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  },
});

// Helper function to dynamically update the Supabase configuration at runtime
export function updateSupabaseConfig(url: string, anonKey: string) {
  if (url && anonKey && url.startsWith('https://') && url !== activeUrl) {
    activeUrl = url;
    activeAnonKey = anonKey;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('finanzza_supabase_url', url);
      localStorage.setItem('finanzza_supabase_key', anonKey);
    }

    activeClient = createClient(
      activeUrl,
      activeAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
    console.log('Supabase client successfully updated to custom runtime URL:', url);
  }
}

