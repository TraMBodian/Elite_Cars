import { createClient } from '@supabase/supabase-js';

const normalizeEnvironmentValue = (value: string | undefined): string | undefined => {
  const trimmedValue = value?.trim();
  if (
    trimmedValue &&
    trimmedValue.length >= 2 &&
    ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
      (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }
  return trimmedValue;
};

const supabaseUrl = normalizeEnvironmentValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvironmentValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

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

export const supabase =
  supabaseUrl && supabaseAnonKey && isValidSupabaseUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      })
    : null;
