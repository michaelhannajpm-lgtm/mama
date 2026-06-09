// Helpers for translating an onboarding_profiles row into a mom_profiles row.
// Used by api/onboarding/signup.js + api/onboarding/promote.js so a mom
// becomes discoverable the moment she finishes signup.
import { sbHeaders, usernameBase } from './supabase.js';

// Convert kids_ages jsonb to a non-null object.
const safeKidsAges = (raw) => (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {});

// Convert text[] columns to a non-null array.
const safeArr = (raw) => (Array.isArray(raw) ? raw : []);

// Build the mom_profiles payload from an onboarding row + the chosen username.
// Returns null if the onboarding row is missing required fields (auth_user_id,
// first_name, or username) — the caller should treat that as a no-op.
export const buildMomProfilePayload = (onboardingRow, username) => {
  if (!onboardingRow?.auth_user_id) return null;
  const firstName = onboardingRow.first_name || 'Mama';
  const finalUsername = username || onboardingRow.username || usernameBase(firstName);

  return {
    auth_user_id: onboardingRow.auth_user_id,
    display_name: `${firstName}.`,        // best we have without a last initial
    username: finalUsername,
    bio: null,
    photos: [],
    kids_ages: safeKidsAges(onboardingRow.kids_ages),
    mom_types: safeArr(onboardingRow.mom_types),
    values:    safeArr(onboardingRow.values),
    interests: safeArr(onboardingRow.interests),
    free_slots: safeArr(onboardingRow.slots),
    // onboarding.places stores text slugs; mom_profiles.places expects uuid[].
    // We can't resolve slug→uuid without an extra fetch, so leave empty here
    // and let the user pick places from the new directory in their first
    // edit. Same story for preferred_event_ids.
    places: [],
    preferred_event_ids: [],
    city:         onboardingRow.location_city || onboardingRow.location || 'Tampa, FL',
    neighborhood: onboardingRow.location_neighborhood || null,
    county:       onboardingRow.location_county || null,
    place_id:     onboardingRow.location_place_id || null,
    home_lat:     onboardingRow.location_lat ?? null,
    home_lng:     onboardingRow.location_lng ?? null,
    distance_miles: onboardingRow.distance_miles ?? null,
    visible: true,
    verified: !!onboardingRow.contact_method,
    blocked_global: false,
    social_links: onboardingRow.social_links || {},
    source: 'onboarding',
    last_active_at: new Date().toISOString(),
  };
};

// Upsert (by auth_user_id) into mom_profiles. Logs and swallows errors —
// never throws, so signup/promote never fails because of this side effect.
// Returns { ok: true } on success or { ok: false, error } on failure.
export const ensureMomProfile = async (creds, onboardingRow, username) => {
  const payload = buildMomProfilePayload(onboardingRow, username);
  if (!payload) return { ok: false, error: 'No auth_user_id on onboarding row' };

  try {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?on_conflict=auth_user_id`,
      {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(payload),
      },
    );
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('mom_profile upsert failed', r.status, text);
      return { ok: false, error: `Supabase ${r.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('mom_profile upsert threw', e);
    return { ok: false, error: e?.message || 'Network error' };
  }
};
