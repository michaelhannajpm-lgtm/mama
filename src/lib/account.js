// Client API for the account-lifecycle endpoints (api/account/*).
//
// Each call pulls the Supabase access_token from the live session (same pattern
// as updateMomProfile in onboarding.js) and POSTs it to the matching route.
// Returns { ok: true, account_status } on success; throws an Error with a
// friendly message on failure. When there's no real session (e.g. the dev
// seeded-mom login), returns { ok: true, local: true } so the UI can still walk
// the flow locally without a backend round-trip.
import { supabase, isSupabaseReady } from './supabase';

const sessionToken = async () =>
  isSupabaseReady() ? (await supabase.auth.getSession()).data?.session?.access_token || null : null;

const post = async (path, body = {}) => {
  const access_token = await sessionToken();
  if (!access_token) return { ok: true, local: true }; // no real account — UI walks locally
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, ...body }),
    });
  } catch {
    throw new Error('Network error — please try again.');
  }
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(data?.error || 'Something went wrong — please try again.');
  return data;
};

export const deactivateAccount = () => post('/api/account/deactivate');
export const reactivateAccount = () => post('/api/account/reactivate');
export const restoreAccount    = () => post('/api/account/restore');
export const deleteAccount = ({ reasonCode, reasonNote } = {}) =>
  post('/api/account/delete', { reason_code: reasonCode, reason_note: reasonNote });
