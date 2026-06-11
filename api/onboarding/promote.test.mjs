// Regression test for the silent profile-wipe bug.
//
// promote.js runs on every app load (promoteSession). It used to call
// ensureMomProfile UNCONDITIONALLY — an upsert with merge-duplicates that, on
// an existing row, overwrites every user-editable field (bio, photos, values,
// …) with the empty onboarding snapshot. So a returning mom's edits were wiped
// on her next visit. The fix: only seed the directory row when it's MISSING.
//
// These tests assert the orchestration: the mom_profiles upsert fires when the
// row is absent, and is SKIPPED when the row already exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

const { default: handler } = await import('./promote.js');

const AUTH_USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

// A fake res that captures what json() writes.
const makeRes = () => {
  const headers = {};
  return {
    statusCode: 0,
    body: null,
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    getHeader(k) { return headers[k.toLowerCase()]; },
    end(payload) { this.body = payload ? JSON.parse(payload) : null; },
  };
};

const onboardingRow = {
  session_id: SESSION_ID,
  auth_user_id: AUTH_USER_ID,
  first_name: 'Michael',
  username: 'michaelhanna',
  contact_method: 'email',
  email: 'm@example.com',
  current_step: 7,
};

// Install a fetch mock. `momProfileRows` is what GET mom_profiles returns the
// FIRST time it's queried (the existence check). Returns a list of the calls.
const installFetch = (momProfileRows) => {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    calls.push({ url, method });
    const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });

    if (url.includes('/auth/v1/user')) return ok({ id: AUTH_USER_ID, app_metadata: { provider: 'email' } });
    if (url.includes('/rest/v1/onboarding_profiles')) return ok([onboardingRow]);
    if (url.includes('/rest/v1/mom_profiles')) {
      if (method === 'GET') return ok(momProfileRows);
      // POST (ensureMomProfile upsert) — return minimal success.
      return ok([]);
    }
    return ok([]);
  };
  return calls;
};

const isMomUpsert = (c) =>
  c.method === 'POST' && c.url.includes('/rest/v1/mom_profiles') && c.url.includes('on_conflict=auth_user_id');

test('promote does NOT upsert mom_profiles when the row already exists (no clobber)', async () => {
  const existing = { id: 'aaa', auth_user_id: AUTH_USER_ID, bio: 'real bio', photos: ['p.jpg'] };
  const calls = installFetch([existing]);
  const req = { method: 'POST', body: { session_id: SESSION_ID, access_token: 'token' } };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200, 'promote succeeds');
  assert.ok(!calls.some(isMomUpsert), 'must not POST the mom_profiles merge-duplicates upsert for an existing row');
  // The user's saved edits flow back out untouched.
  assert.equal(res.body.profile.bio, 'real bio');
  assert.deepEqual(res.body.profile.photos, ['p.jpg']);
});

test('promote DOES seed mom_profiles when the row is missing (first signup)', async () => {
  const calls = installFetch([]); // no existing directory row
  const req = { method: 'POST', body: { session_id: SESSION_ID, access_token: 'token' } };
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200, 'promote succeeds');
  assert.ok(calls.some(isMomUpsert), 'must seed the directory row when none exists');
});
