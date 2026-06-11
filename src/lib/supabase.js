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

// Synchronous, best-effort check for a persisted Supabase session in
// localStorage. supabase-js stores the token under `sb-<projectRef>-auth-token`
// (chunked as `…-auth-token.0`, `.1` for large sessions). We only need to know
// whether a token *might* exist so the app can show a neutral loading gate
// instead of flashing the Landing screen while promoteSession() resolves.
// Returns false (→ Landing renders instantly) for genuinely new visitors and
// whenever storage is unavailable. Never throws.
export const hasStoredSession = () => {
  if (!supabase) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.includes('-auth-token') && localStorage.getItem(key)) {
        return true;
      }
    }
  } catch { /* storage disabled (private mode) — treat as no session */ }
  return false;
};

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
