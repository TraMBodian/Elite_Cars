import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const isValidSupabaseUrl = (value: string | undefined): value is string => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const hasInvalidSupabaseUrl = Boolean(supabaseUrl) && !isValidSupabaseUrl(supabaseUrl);
export const hasPartialSupabaseConfig = Boolean(supabaseUrl) !== Boolean(supabaseAnonKey);
export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
