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

// Local-only fallback used when the API isn't reachable (e.g. `npm run dev`
// without `vercel dev`). Demo flow continues; real signup happens once the
// serverless functions are live in production.
const localSignupFallback = ({ firstName }) => ({
  ok: true,
  auth_user_id: `local-${getSessionId()}`,
  username: firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'mama',
  first_name: firstName.trim(),
  local: true,
});

export const completeSignup = async ({
  firstName, method, phone, email, password, agreedTerms,
}) => {
  const session_id = getSessionId();
  let res;
  try {
    res = await fetch('/api/onboarding/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id, firstName, method, phone, email, password, agreedTerms,
      }),
    });
  } catch {
    // Network-level failure (no backend running) — fall back to local mode.
    return localSignupFallback({ firstName });
  }
  // 404 = serverless function not deployed locally; proceed in local mode.
  if (res.status === 404) return localSignupFallback({ firstName });
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  // Backend reachable but a feature isn't configured (e.g. Supabase phone
  // signups disabled, SMS provider missing) — fall back so the demo keeps
  // moving rather than blocking the user on infra config.
  const msg = (body && body.error) || '';
  if (!res.ok && /disabled|not configured|not enabled|not available|provider/i.test(msg)) {
    return localSignupFallback({ firstName });
  }
  if (!res.ok) {
    const err = new Error(msg || 'Could not create account');
    err.status = res.status;
    throw err;
  }
  return body; // { ok, auth_user_id, username, first_name }
};

// Sign in an existing user with phone or email + password.
// Returns the supabase session on success; throws with a friendly message on failure.
export const signInWithPassword = async ({ method, phone, email, password }) => {
  if (!isSupabaseReady()) {
    throw new Error('Sign-in is not configured yet');
  }
  const credentials = method === 'phone'
    ? { phone: `+1${phone.replace(/\D/g, '')}`, password }
    : { email: (email || '').trim().toLowerCase(), password };
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    // Friendly message — Supabase returns "Invalid login credentials" by default
    const msg = error.message || 'Could not sign in';
    const friendly =
      /invalid login credentials/i.test(msg) ? 'Wrong email/phone or password.' :
      /email not confirmed/i.test(msg) ? 'Please confirm your email before signing in.' :
      msg;
    const err = new Error(friendly);
    err.status = error.status;
    throw err;
  }
  return data;
};

export const signInWithProvider = async (provider) => {
  if (!isSupabaseReady()) {
    throw new Error('Social sign-in is not configured yet');
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/live` },
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

// Patch the signed-in mom's mom_profiles row.
// Returns the updated profile on success; throws with a friendly message on
// failure. Silently no-ops (returns null) if the user isn't signed in — the
// caller should fall back to local-only state in that case.
export const updateMomProfile = async (patch) => {
  if (!isSupabaseReady()) return null;
  const { data } = await supabase.auth.getSession();
  const access_token = data?.session?.access_token;
  if (!access_token) return null;

  let res;
  try {
    res = await fetch('/api/mom-profiles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, patch }),
    });
  } catch {
    return null; // backend not reachable (e.g. `npm run dev` without `vercel dev`)
  }
  // 404 → no mom_profile row yet (older signup, or local-mode signup). Treat
  // as a soft miss so the local edit still lands and we don't block the user.
  if (res.status === 404) return null;
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error(body?.error || 'Could not save profile');
    err.status = res.status;
    throw err;
  }
  return body.profile || null;
};

// Subscribe to Supabase auth state changes (SIGNED_IN, SIGNED_OUT, …).
// Returns an unsubscribe function. No-op (returns () => {}) when supabase
// isn't configured. The hash-token detection on a fresh OAuth callback
// fires SIGNED_IN here AFTER the createClient race has settled.
export const onAuthChange = (handler) => {
  if (!isSupabaseReady()) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    handler(event, session);
  });
  return () => data?.subscription?.unsubscribe?.();
};

export const signOut = async () => {
  if (isSupabaseReady()) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
  clearSessionId();
};
