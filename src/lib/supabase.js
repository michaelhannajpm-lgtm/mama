import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// In dev without env vars we still want the app to load — we just create a
// no-op client that will fail any auth call gracefully.
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export const isSupabaseReady = () => supabase !== null;

// Guarantee a session so RLS + Realtime work for everyone. Returns the user id
// (auth.uid()) or null if auth isn't configured. Anonymous users can later
// linkIdentity() to upgrade in place (same uid).
export const ensureSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return anon?.user?.id || null;
};

export const getUserId = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
};
