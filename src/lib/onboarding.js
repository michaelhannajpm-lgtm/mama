import { supabase, isSupabaseReady } from './supabase';
import { peekIncomingRef, clearIncomingRef, rememberMyCode } from './referral';

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

// ── Passwordless OTP auth ───────────────────────────────────────────────
// We removed passwords entirely. `signInWithOtp` sends a one-time code (and,
// for email, a magic link) and creates the user if they don't exist — so the
// SAME pair of calls powers both signup and login. After verifyOtp succeeds,
// the SIGNED_IN event triggers promoteSession (below), which creates the
// onboarding_profiles + mom_profiles rows — exactly the OAuth path.

const toPhoneE164 = (phone) => `+1${(phone || '').replace(/\D/g, '')}`;

const friendlyAuthError = (error) => {
  const msg = error?.message || 'Something went wrong';
  const friendly =
    /expired/i.test(msg) ? 'That code expired — tap “Resend code” for a new one.' :
    /invalid|incorrect|token/i.test(msg) ? "That code doesn't match. Double-check and try again." :
    /rate limit|too many|security purposes/i.test(msg) ? 'Too many attempts — wait a moment, then try again.' :
    msg;
  const err = new Error(friendly);
  err.status = error?.status;
  return err;
};

// Send a 6-digit code (email also gets a magic link) to phone or email.
// Creates the account on first use. Returns { local: true } ONLY when Supabase
// itself isn't configured (no env vars) — the zero-backend prototype mode. Once
// Supabase is live, any provider error (e.g. SMS not wired up, phone signups
// disabled) propagates so a misconfiguration fails loudly instead of silently
// faking success and accepting any code.
export const sendOtp = async ({ method, phone, email, firstName, agreedTerms }) => {
  if (!isSupabaseReady()) return { local: true };

  // Stored in user_metadata on account creation. promote.js reads first_name
  // back so the typed name survives into the mom directory.
  const data = {};
  if (firstName) { data.first_name = firstName; data.full_name = firstName; }
  if (agreedTerms != null) data.agreed_terms = !!agreedTerms;

  const target = method === 'phone'
    ? { phone: toPhoneE164(phone), options: { shouldCreateUser: true, data } }
    : {
        email: (email || '').trim().toLowerCase(),
        options: { shouldCreateUser: true, data, emailRedirectTo: `${window.location.origin}/` },
      };

  const { error } = await supabase.auth.signInWithOtp(target);
  if (error) throw friendlyAuthError(error);
  return { ok: true };
};

// Verify the 6-digit code → returns { session, user } on success. Only in the
// zero-backend prototype mode (no Supabase configured) is any 6-digit code
// accepted; with Supabase live, the real emailed/texted code is required.
export const verifyOtp = async ({ method, phone, email, token, local }) => {
  if (local || !isSupabaseReady()) {
    return { local: true, user: { id: `local-${getSessionId()}` } };
  }
  const params = method === 'phone'
    ? { phone: toPhoneE164(phone), token, type: 'sms' }
    : { email: (email || '').trim().toLowerCase(), token, type: 'email' };

  const { data, error } = await supabase.auth.verifyOtp(params);
  if (error) throw friendlyAuthError(error);
  return data; // { session, user }
};

// ── Change + verify the signed-in mom's contact info ────────────────────────
// Adding/changing a phone or email on an existing account is a different
// Supabase flow from login OTP: updateUser() stages the new value and sends a
// code, then verifyOtp({ type: 'phone_change' | 'email_change' }) confirms it.
// Returns { local: true } in demo mode (no Supabase) so the prototype still
// walks the UI.
export const requestContactChange = async ({ kind, value }) => {
  if (!isSupabaseReady()) return { local: true };
  const payload = kind === 'phone'
    ? { phone: toPhoneE164(value) }
    : { email: (value || '').trim().toLowerCase() };
  const { error } = await supabase.auth.updateUser(payload);
  if (error) throw friendlyAuthError(error);
  return { ok: true };
};

// Confirm the code, then mirror the now-verified value into mom_profiles +
// onboarding (server reads it back from the auth identity — the client value is
// never trusted for the mirror). Returns the verified { email, phone }.
export const confirmContactChange = async ({ kind, value, token }) => {
  if (!isSupabaseReady()) {
    return { local: true, email: kind === 'email' ? value : null, phone: kind === 'phone' ? value : null };
  }
  const params = kind === 'phone'
    ? { phone: toPhoneE164(value), token, type: 'phone_change' }
    : { email: (value || '').trim().toLowerCase(), token, type: 'email_change' };
  const { error } = await supabase.auth.verifyOtp(params);
  if (error) throw friendlyAuthError(error);

  const access_token = (await supabase.auth.getSession()).data?.session?.access_token || null;
  if (access_token) {
    try {
      const res = await fetch('/api/mom-profiles/sync-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token }),
      });
      if (res.ok) return res.json().catch(() => ({ ok: true }));
    } catch { /* best-effort mirror */ }
  }
  return { ok: true };
};

export const signInWithProvider = async (provider) => {
  if (!isSupabaseReady()) {
    throw new Error('Social sign-in is not configured yet');
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
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
  // Carry any invite code captured from a `?ref=` link so this signup gets
  // attributed to the referrer. Cleared once the promote succeeds.
  const ref = peekIncomingRef();
  const res = await fetch('/api/onboarding/promote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, access_token: session.access_token, ref }),
  });
  if (!res.ok) return null;
  const hydrated = await res.json().catch(() => null);
  if (hydrated) { if (ref) clearIncomingRef(); rememberMyCode(hydrated.username); }
  return hydrated;
};

// Patch the signed-in mom's mom_profiles row.
// Returns the updated profile on success; throws with a friendly message on
// failure. Silently no-ops (returns null) if the user isn't signed in — the
// caller should fall back to local-only state in that case.
// `opts.seedMomId` routes the write through the DEV-only seeded-mom endpoint
// when there's no real session (the dev "pick a seeded mom" login) — so seeded
// profiles are editable locally too.
export const updateMomProfile = async (patch, { seedMomId } = {}) => {
  const access_token = isSupabaseReady()
    ? (await supabase.auth.getSession()).data?.session?.access_token || null
    : null;

  let url, payload;
  if (access_token) {
    url = '/api/mom-profiles/update';
    payload = { access_token, patch };
  } else if (seedMomId) {
    url = '/api/dev/mom-profiles/update';
    payload = { seed_mom_id: seedMomId, patch };
  } else {
    return null; // not signed in and not a seeded user → caller keeps local state
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

// Presence heartbeat — best-effort, fire-and-forget. Sets the current user's
// mom_profiles.last_seen_at server-side (server clock). Soft no-op when neither
// signed in nor a seeded dev user.
export const sendHeartbeat = async ({ seedMomId } = {}) => {
  const access_token = isSupabaseReady()
    ? (await supabase.auth.getSession()).data?.session?.access_token || null
    : null;
  let payload;
  if (access_token) payload = { access_token };
  else if (seedMomId) payload = { seed_mom_id: seedMomId };
  else return;
  try {
    await fetch('/api/mom-profiles/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* best-effort */ }
};

// Fetch the current mom's referral summary — { ok, code, count, friends[] }.
// Authed by the real session (Bearer) or the dev seeded-mom id. Returns null on
// any failure so callers can simply skip the list.
export const fetchReferrals = async ({ seedMomId } = {}) => {
  const access_token = isSupabaseReady()
    ? (await supabase.auth.getSession()).data?.session?.access_token || null
    : null;
  try {
    if (access_token) {
      const res = await fetch('/api/referrals', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      return res.ok ? res.json().catch(() => null) : null;
    }
    if (seedMomId) {
      const res = await fetch(`/api/referrals?seedMomId=${encodeURIComponent(seedMomId)}`);
      return res.ok ? res.json().catch(() => null) : null;
    }
  } catch { /* best-effort */ }
  return null;
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
