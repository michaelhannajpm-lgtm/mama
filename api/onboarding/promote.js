import {
  json, isUuid, readJsonBody, supabaseCreds, sbHeaders,
  usernameBase, randomHex, cleanText,
} from '../_lib/supabase.js';
import { ensureMomProfile } from '../_lib/mom-profile-helpers.js';

const ALLOWED_PROVIDERS = new Set(['email', 'phone', 'google', 'facebook', 'apple']);

const fetchRowBySession = async (creds, sessionId) => {
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/onboarding_profiles?session_id=eq.${sessionId}&select=*`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
};

// Look up by auth_user_id — used when the same user comes back with a new
// localStorage session_id (cleared cookies, new device, etc). Without this,
// we'd try to PATCH a different row to set auth_user_id and hit a unique
// constraint violation, which surfaced as "Could not pick a unique username".
const fetchRowByAuthUser = async (creds, authUserId) => {
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/onboarding_profiles?auth_user_id=eq.${authUserId}&select=*`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
};

// Patch with username retry on conflict.
const patchWithUsernameRetry = async (creds, sessionId, baseRow, existingUsername) => {
  if (existingUsername) {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?session_id=eq.${sessionId}`,
      {
        method: 'PATCH',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
        body: JSON.stringify(baseRow),
      },
    );
    if (r.ok) {
      const rows = await r.json().catch(() => []);
      return { row: rows[0] || null, username: existingUsername };
    }
    const text = await r.text().catch(() => '');
    console.error('onboarding/promote patch failed', r.status, text);
    return { row: null, error: 'Could not update profile' };
  }

  const base = usernameBase(baseRow.first_name);
  const candidates = [base, `${base}${randomHex(4)}`, `${base}${randomHex(4)}`, `mama-${randomHex(8)}`];

  for (const username of candidates) {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?session_id=eq.${sessionId}`,
      {
        method: 'PATCH',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
        body: JSON.stringify({ ...baseRow, username }),
      },
    );
    if (r.ok) {
      const rows = await r.json().catch(() => []);
      return { row: rows[0] || null, username };
    }
    const text = await r.text().catch(() => '');
    if (r.status === 409 || /username/i.test(text)) continue;
    console.error('onboarding/promote patch failed', r.status, text);
    return { row: null, error: 'Could not update profile' };
  }

  return { row: null, error: 'Could not pick a unique username' };
};

const ensureRowExists = async (creds, sessionId) => {
  const existing = await fetchRowBySession(creds, sessionId);
  if (existing) return existing;
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/onboarding_profiles?on_conflict=session_id`,
    {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey, {
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify({ session_id: sessionId, current_step: 6 }),
    },
  );
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
};

const hydratedShape = (row) => ({
  session_id: row.session_id,
  auth_user_id: row.auth_user_id,
  first_name: row.first_name,
  username: row.username,
  contact_method: row.contact_method,
  phone: row.phone,
  email: row.email,
  location: row.location,
  distance: row.distance_miles,
  profile: {
    kidsAges: row.kids_ages || {},
    momTypes: row.mom_types || [],
    values: row.values || [],
    interests: row.interests || [],
  },
  prefs: {
    slots: row.slots || [],
    places: row.places || [],
  },
  social_links: row.social_links || {},
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Onboarding backend is not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const session_id = body.session_id;
  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  if (!isUuid(session_id)) return json(res, 400, { error: 'Valid session_id (uuid) required' });
  if (!access_token) return json(res, 400, { error: 'access_token required' });

  // 1. Verify the JWT and load the auth user.
  let user;
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: creds.serviceRoleKey,
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
    user = await r.json();
  } catch (e) {
    console.error('onboarding/promote auth check failed', e);
    return json(res, 502, { error: 'Could not verify session' });
  }

  if (!user?.id) return json(res, 401, { error: 'Auth user not found' });

  const provider = ALLOWED_PROVIDERS.has(user.app_metadata?.provider)
    ? user.app_metadata.provider
    : 'email';

  // 2. Find the onboarding row this user owns. Prefer the row already keyed by
  //    auth_user_id (returning user); otherwise fall back to the session_id
  //    row (first-time signup). Without the auth_user_id lookup, a returning
  //    user with a fresh localStorage session_id would try to PATCH a NEW
  //    row to set auth_user_id and hit a unique-constraint conflict.
  let existing = await fetchRowByAuthUser(creds, user.id);
  if (!existing) existing = await ensureRowExists(creds, session_id);
  if (!existing) return json(res, 500, { error: 'Could not load profile' });

  // From here on, all writes target the existing row's session_id.
  const targetSessionId = existing.session_id;

  // 3. Decide first_name and username.
  const oauthName = cleanText(
    user.user_metadata?.full_name
      || user.user_metadata?.name
      || (user.email ? user.email.split('@')[0] : null),
    80,
  );
  const firstName = existing.first_name || oauthName || 'Mama';

  const baseRow = {
    auth_user_id: user.id,
    first_name: firstName,
    contact_method: provider,
    auth_provider: provider,
    email: existing.email || user.email || null,
    phone: existing.phone || user.phone || null,
    completed_at: existing.completed_at || new Date().toISOString(),
    current_step: Math.max(existing.current_step || 0, 7),
  };

  const { row, username, error } = await patchWithUsernameRetry(
    creds, targetSessionId, baseRow, existing.username,
  );
  if (!row) return json(res, 500, { error: error || 'Could not save profile' });

  // Side effect: ensure the mom is in the discoverable directory.
  await ensureMomProfile(creds, row, username);

  return json(res, 200, { ok: true, ...hydratedShape({ ...row, username }) });
}
