import { supabase, isSupabaseReady } from './supabase';

const STORAGE_KEY = 'mama:session_id';

const newUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback.
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' ? crypto : { getRandomValues: (b) => {
    for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  }}).getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

export const getSessionId = () => {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = newUuid();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private mode / disabled storage — fall back to in-memory id.
    if (!getSessionId._memo) getSessionId._memo = newUuid();
    return getSessionId._memo;
  }
};

export const clearSessionId = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  getSessionId._memo = null;
};

// Fire-and-forget. Never throws, never blocks the UI.
export const recordStep = (step, patch = {}) => {
  try {
    const session_id = getSessionId();
    fetch('/api/onboarding/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, step, patch }),
      keepalive: true,
    }).catch(() => { /* swallow */ });
  } catch {
    /* swallow */
  }
};

export const completeSignup = async ({
  firstName, method, phone, email, password, agreedTerms,
}) => {
  const session_id = getSessionId();
  const res = await fetch('/api/onboarding/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id, firstName, method, phone, email, password, agreedTerms,
    }),
  });
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error(body.error || 'Could not create account');
    err.status = res.status;
    throw err;
  }
  return body; // { ok, auth_user_id, username, first_name }
};

export const signInWithProvider = async (provider) => {
  if (!isSupabaseReady()) {
    throw new Error('Social sign-in is not configured yet');
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/prototype` },
  });
  if (error) throw error;
};

// On app mount: if Supabase has a session, attach it to our onboarding row.
// Returns the hydrated profile or null.
export const promoteSession = async () => {
  if (!isSupabaseReady()) return null;
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session?.access_token) return null;

  const session_id = getSessionId();
  const res = await fetch('/api/onboarding/promote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, access_token: session.access_token }),
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
};

export const signOut = async () => {
  if (isSupabaseReady()) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
  clearSessionId();
};
