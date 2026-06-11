// Shared helpers for the account-lifecycle endpoints (api/account/*).
//
// Every lifecycle route does the same first two steps: verify the caller's
// Supabase access_token, then load the mom_profiles row they own. This module
// centralizes that so deactivate / reactivate / delete / restore can't drift.
import { sbHeaders } from './supabase.js';

// Verify a Supabase access_token against /auth/v1/user. Returns the auth user
// object, or null on any failure. Never throws.
export const verifyAccessToken = async (creds, accessToken) => {
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: creds.serviceRoleKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.error('account/verifyAccessToken failed', e);
    return null;
  }
};

// Verify the token AND load the caller's mom_profiles row. Returns one of:
//   { user, row }                         — success
//   { error: 'message', status: 4xx/5xx } — failure (caller forwards verbatim)
// Anonymous sessions are rejected: they have no real account to act on.
export const loadOwnMomProfile = async (creds, accessToken) => {
  const user = await verifyAccessToken(creds, accessToken);
  if (!user?.id) return { error: 'Invalid or expired session', status: 401 };
  if (user.is_anonymous === true) return { error: 'Not signed in', status: 401 };

  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/mom_profiles?auth_user_id=eq.${user.id}&select=*`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('account/loadOwnMomProfile fetch failed', r.status, text);
    return { error: 'Could not load account', status: 502 };
  }
  const rows = await r.json().catch(() => []);
  if (!rows.length) return { error: 'No account found for this user', status: 404 };
  return { user, row: rows[0] };
};

// PATCH the caller's mom_profiles row (by auth_user_id) with `patch`. Returns
// { ok: true, row } or { error, status }.
export const patchOwnMomProfile = async (creds, authUserId, patch) => {
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/mom_profiles?auth_user_id=eq.${authUserId}`,
    {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    },
  );
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('account/patchOwnMomProfile failed', r.status, text);
    return { error: 'Could not update account', status: 502 };
  }
  const rows = await r.json().catch(() => []);
  return { ok: true, row: rows[0] || null };
};

// Merge `{ privacy: { discoverable: false } }` into the existing settings jsonb
// without clobbering other settings. Pure — returns the next settings object.
export const hideFromDiscovery = (settings) => {
  const s = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  return { ...s, privacy: { ...(s.privacy || {}), discoverable: false } };
};

export const RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// True when a 'deleted' account is still inside its 30-day restore window.
export const withinRestoreWindow = (deletedAtIso, now = Date.now()) =>
  !!deletedAtIso && !Number.isNaN(Date.parse(deletedAtIso))
  && now - Date.parse(deletedAtIso) < RESTORE_WINDOW_MS;

// ISO timestamp 30 days before `now` — the purge cutoff. Rows deleted strictly
// before this are past their restore window and eligible for hard removal.
export const purgeCutoffIso = (now = Date.now()) => new Date(now - RESTORE_WINDOW_MS).toISOString();

// True when a mom_profiles row should be hard-purged: soft-deleted AND past the
// 30-day restore window. Pure — drives both the purge sweep and its test.
export const isPurgeable = (row, now = Date.now()) =>
  !!row && row.account_status === 'deleted' && !withinRestoreWindow(row.deleted_at, now);
