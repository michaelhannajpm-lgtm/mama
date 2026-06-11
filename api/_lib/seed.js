// Shared seed implementation. Used by:
//   scripts/seed-supabase.mjs   (CLI wrapper)
//   api/admin/seed.js           (HTTP wrapper)
//
// Idempotent: places + events upsert by `slug`, mom_profiles by `username`.
// `reset: true` deletes mom_profiles before insert. The default reset scope is
// `seed`; pass `resetMoms: 'all'` for a full mom directory wipe.

import { createClient } from '@supabase/supabase-js';
import { PLACES as LOCAL_PLACES } from '../../src/data/places.js';
import { SUGGESTED_EVENTS as LOCAL_EVENTS, LOCAL_DATED_EVENTS } from '../../src/data/events.js';
import { MOM_TYPES, VALUES, INTERESTS, KID_AGES } from '../../src/data/taxonomy.js';
import { TAMPA_BAY_AREAS } from '../../src/data/tampa-bay-areas.js';
import { lookupCoords, DEFAULT_COORDS } from '../../scripts/seed-data/place-coords.js';
import { generateDisplayName, generateUsername } from '../../scripts/seed-data/name-pool.js';
import { photosForMom } from '../../scripts/seed-data/photo-pool.js';
import { extractFamilyTags } from '../../src/lib/family-tags.js';

const buildPlacesPayload = (wantPlaces) => {
  const out = [];
  for (const [category, list] of Object.entries(LOCAL_PLACES)) {
    for (const p of list) {
      const coords = lookupCoords(p.area) || DEFAULT_COORDS;
      out.push({
        slug: p.id,
        name: p.name,
        area: p.area,
        city: 'Tampa, FL',
        category,
        description: p.desc || null,
        tags: p.tags || [],
        hero_photo: null,
        badge: null,
        rating: null,
        review_count: 0,
        lat: coords.lat,
        lng: coords.lng,
        visible: true,
        review_status: 'approved',
        last_seen_at: new Date().toISOString(),
      });
    }
  }
  return out.slice(0, wantPlaces);
};

const buildEventsPayload = async (sb, wantEvents) => {
  const { data: places, error } = await sb.from('places').select('id, slug, area');
  if (error) throw new Error(`places fetch failed: ${error.message}`);

  const out = [];
  for (const e of LOCAL_EVENTS) {
    const match = places.find(p => e.place?.toLowerCase().includes(p.slug.replace(/-/g, ' ')))
      || places.find(p => p.area && e.place?.includes(p.area))
      || places[0];
    out.push({
      slug: e.id,
      name: e.name,
      place_id: match?.id || null,
      city: 'Tampa, FL',
      day_of_week: e.day,
      bucket: e.bucket,
      time_label: e.time,
      recurring: e.recurring || 'Weekly',
      kind: 'recurring',
      tags: e.tags || [],
      kid_ages: e.kidAges || [],
      hero_photo: e.photo || null,
      going_count: e.going || 0,
      visible: true,
    });
  }

  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const buckets = ['morning','noon','afternoon','night-owl'];
  let i = out.length;
  while (out.length < wantEvents && i < wantEvents * 4) {
    const base = LOCAL_EVENTS[i % LOCAL_EVENTS.length];
    const dow = dows[i % dows.length];
    const bk  = buckets[i % buckets.length];
    const variantPlace = places[i % places.length];
    out.push({
      slug: `${base.id}-v${i}`,
      name: `${base.name} (extra)`,
      place_id: variantPlace?.id || null,
      city: 'Tampa, FL',
      day_of_week: dow,
      bucket: bk,
      time_label: base.time,
      recurring: 'Weekly',
      kind: 'recurring',
      tags: base.tags || [],
      kid_ages: base.kidAges || [],
      hero_photo: base.photo || null,
      going_count: 2 + (i % 14),
      visible: true,
    });
    i++;
  }
  // Curated dated showcase events for the Home rail — fresh starts_at each seed.
  const now = Date.now();
  for (const e of LOCAL_DATED_EVENTS) {
    const match = places.find(p => e.place && p.area && e.place.includes(p.area)) || places[0];
    out.push({
      slug: e.id,
      name: e.name,
      place_id: match?.id || null,
      city: 'Tampa, FL',
      day_of_week: null,
      bucket: null,
      time_label: e.time,
      recurring: null,
      kind: 'dated',
      starts_at: new Date(now + (e.daysAhead || 3) * 86400000).toISOString(),
      tags: e.tags || [],
      kid_ages: e.kid_ages || [],
      event_type: e.event_type || null,
      hero_photo: e.photo || null,
      going_count: e.going || 0,
      visible: true,
      review_status: 'approved',
    });
  }

  // Keep all curated dated rows; cap only the recurring fill.
  const datedSlugs = new Set(LOCAL_DATED_EVENTS.map(e => e.id));
  const dated = out.filter(r => datedSlugs.has(r.slug));
  const recurringRows = out.filter(r => !datedSlugs.has(r.slug)).slice(0, Math.max(0, wantEvents - dated.length));
  return [...recurringRows, ...dated];
};

// Deterministic pseudo-random so re-runs match.
const seededRand = (seed) => {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x735a2d97);
    s ^= s >>> 13;
    s = Math.imul(s, 0x9b8d6e35);
    s ^= s >>> 16;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
};

const pickN = (arr, n, rand) => {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

const SLOT_DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SLOT_BUCKETS = ['morning','noon','afternoon','night-owl'];

const MOM_TYPE_LABEL_BY_ID = Object.fromEntries(MOM_TYPES.map(t => [t.id, t.label]));
const RESET_MOM_SCOPES = new Set(['seed', 'all']);

const momBio = ({ momTypeIds, kidCount, area, interestsList, rand }) => {
  const type = MOM_TYPE_LABEL_BY_ID[momTypeIds[0]] || 'Mom';
  const where = area.neighborhood || area.label || area.city || 'Tampa Bay';
  const hooks = [
    `usually up for ${interestsList[0]?.toLowerCase() || 'park hangs'}`,
    `looking for kid-friendly plans near ${where}`,
    'happy to trade local tips and low-pressure playdates',
    'always saving ideas for easy weekends around Tampa Bay',
  ];
  return `${type} of ${kidCount} in ${where}. ${hooks[Math.floor(rand() * hooks.length)]}.`;
};

const buildMomProfilePayload = (idx, placeIds, eventIds) => {
  const rand = seededRand(idx + 1);

  const displayName = generateDisplayName(idx);
  const username    = generateUsername(idx);
  const age         = 24 + Math.floor(rand() * 20);

  const kidCount = 1 + Math.floor(rand() * 3);
  const kidsAges = {};
  for (let i = 0; i < kidCount; i++) {
    const ageBucket = KID_AGES[Math.floor(rand() * Math.min(KID_AGES.length, 4))];
    kidsAges[ageBucket] = (kidsAges[ageBucket] || 0) + 1;
  }

  const momTypeIds = pickN(MOM_TYPES.filter(t => t.id !== 'prefer_not'), 1 + (rand() < 0.3 ? 1 : 0), rand)
    .map(t => t.id);

  const valuesList    = pickN(VALUES, 2 + Math.floor(rand() * 2), rand);
  const interestsList = pickN(INTERESTS.map(i => i.label), 2 + Math.floor(rand() * 3), rand);

  const slotCount = 3 + Math.floor(rand() * 5);
  const slotSet = new Set();
  while (slotSet.size < slotCount) {
    const d = SLOT_DAYS[Math.floor(rand() * SLOT_DAYS.length)];
    const b = SLOT_BUCKETS[Math.floor(rand() * SLOT_BUCKETS.length)];
    slotSet.add(`${d}-${b}`);
  }
  const freeSlots = [...slotSet];

  const pickedPlaces = pickN(placeIds, 2 + Math.floor(rand() * 3), rand);
  const pickedEvents = pickN(eventIds, 1 + Math.floor(rand() * 4), rand);

  const area = TAMPA_BAY_AREAS[Math.floor(rand() * TAMPA_BAY_AREAS.length)] || TAMPA_BAY_AREAS[0];
  const home_lat = +(area.lat + (rand() - 0.5) * 0.045).toFixed(6);
  const home_lng = +(area.lng + (rand() - 0.5) * 0.045).toFixed(6);

  const distance_miles = [5, 10, 20, 30, 50][Math.floor(rand() * 5)];

  // Every seeded mom is a verified mom with a linked Facebook profile, so the
  // demo directory reads as fully vetted. Instagram/TikTok stay random for
  // variety; Facebook + verified are guaranteed.
  const verified  = true;
  const visible   = rand() < 0.95;
  const blocked   = rand() < 0.02; // ~2% blocked — surfaces the Blocked admin pill
  const lastActiveMs = Date.now() - Math.floor(rand() * (rand() < 0.9 ? 30 : 90)) * 86400000;
  const lastActive = new Date(lastActiveMs).toISOString();
  const lastSeen   = new Date(lastActiveMs - Math.floor(rand() * 3600 * 24) * 1000).toISOString();
  // ~4% deactivated, ~1% deleted — exercises the lifecycle buttons in admin.
  const lifecycleRoll = rand();
  let accountStatus = 'active';
  let deactivatedAt = null;
  let deletedAt = null;
  if (lifecycleRoll < 0.01) {
    accountStatus = 'deleted';
    deletedAt = new Date(Date.now() - Math.floor(rand() * 14) * 86400000).toISOString();
  } else if (lifecycleRoll < 0.05) {
    accountStatus = 'deactivated';
    deactivatedAt = new Date(Date.now() - Math.floor(rand() * 90) * 86400000).toISOString();
  }
  const socialLinks = { facebook: `https://facebook.com/${username}` };
  if (rand() < 0.55) socialLinks.instagram = `@${username}`;
  if (rand() < 0.2) socialLinks.tiktok = `@${username}mama`;
  // Per-signal verification flags — the admin Social tab renders these as the
  // {instagram, facebook, photo} pill set. Photo verified iff the mom has at
  // least one photo; social verified iff she's linked any social account.
  const verificationSignals = {
    instagram: !!socialLinks.instagram,
    facebook: !!socialLinks.facebook,
    photo: photosForMom(idx).length > 0,
  };

  // Derive the same AI-style familyTags a real user gets, from the mom's bio +
  // her interests/values, so the tag dimension actually matches real users.
  const bio = momBio({ momTypeIds, kidCount, area, interestsList, rand });
  const familyTags = extractFamilyTags(`${bio} ${interestsList.join(' ')} ${valuesList.join(' ')}`);

  return {
    auth_user_id: null,
    display_name: displayName,
    username,
    age,
    bio,
    photos: photosForMom(idx),
    kids_ages: kidsAges,
    mom_types: momTypeIds,
    values: valuesList,
    interests: interestsList,
    free_slots: freeSlots,
    places: pickedPlaces,
    preferred_event_ids: pickedEvents,
    city: area.city,
    neighborhood: area.neighborhood,
    county: area.county,
    place_id: area.id,
    home_lat,
    home_lng,
    distance_miles,
    visible,
    verified,
    blocked_global: blocked,
    account_status: accountStatus,
    deactivated_at: deactivatedAt,
    deleted_at: deletedAt,
    social_links: socialLinks,
    settings: {
      privacy: { verified_only_dms: true },
      notifications: { new_matches: true, messages: true },
      verification: verificationSignals,
      familyTags,
    },
    source: 'seed',
    last_active_at: lastActive,
    last_seen_at: lastSeen,
  };
};

// Main entry. Returns { places, events, moms, reset } counts. Throws on first error.
// onProgress is an optional callback receiving { phase, message } for streaming UI.
export const runSeed = async ({
  supabaseUrl,
  serviceRoleKey,
  wantPlaces = 50,
  wantEvents = 33,
  wantMoms = 1000,
  reset = true,
  resetMoms = 'seed',
  onProgress = () => {},
}) => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('supabaseUrl and serviceRoleKey are required');
  }
  const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const momResetScope = RESET_MOM_SCOPES.has(resetMoms) ? resetMoms : 'seed';
  const result = { reset: { deleted: 0, scope: momResetScope }, places: 0, events: 0, moms: 0 };

  if (reset) {
    onProgress({
      phase: 'reset',
      message: momResetScope === 'all'
        ? 'deleting all mom_profiles'
        : "deleting mom_profiles where source='seed'",
    });
    let resetQuery = sb
      .from('mom_profiles')
      .delete({ count: 'exact' });
    resetQuery = momResetScope === 'all'
      ? resetQuery.not('id', 'is', null)
      : resetQuery.eq('source', 'seed');
    const { count, error } = await resetQuery;
    if (error) throw new Error(`reset failed: ${error.message}`);
    result.reset.deleted = count || 0;
  }

  // Places
  const placesRows = buildPlacesPayload(wantPlaces);
  onProgress({ phase: 'places', message: `seeding ${placesRows.length} places` });
  {
    const { error } = await sb.from('places').upsert(placesRows, { onConflict: 'slug' });
    if (error) throw new Error(`places upsert failed: ${error.message}`);
    result.places = placesRows.length;
  }

  // Categories metadata (idempotent) + primary-category memberships.
  {
    const CATS = [
      ['fun','Fun','PartyPopper',1],['sports','Sports','Trophy',2],['wellness','Wellness','Heart',3],
      ['schools','Schools','GraduationCap',4],['childcare','Childcare','Baby',5],
      ['extracurricular','Extracurricular','Palette',6],['camps','Camps','Tent',7],['health','Health','Stethoscope',8],
    ];
    const { error: catErr } = await sb.from('categories').upsert(
      CATS.map(([id, label, icon, sort_order]) => ({ id, label, icon, kind: 'place', sort_order })),
      { onConflict: 'id' });
    if (catErr) throw new Error(`categories upsert failed: ${catErr.message}`);

    const { data: seededPlaces, error: spErr } = await sb.from('places').select('id, category');
    if (spErr) throw new Error(`places re-fetch failed: ${spErr.message}`);
    if (seededPlaces?.length) {
      const { error: pcErr } = await sb.from('place_categories').upsert(
        seededPlaces.map(p => ({ place_id: p.id, category_id: p.category })),
        { onConflict: 'place_id,category_id' });
      if (pcErr) throw new Error(`place_categories upsert failed: ${pcErr.message}`);
    }
  }

  // Events
  const eventsRows = await buildEventsPayload(sb, wantEvents);
  onProgress({ phase: 'events', message: `seeding ${eventsRows.length} events` });
  {
    const { error } = await sb.from('events').upsert(eventsRows, { onConflict: 'slug' });
    if (error) throw new Error(`events upsert failed: ${error.message}`);
    result.events = eventsRows.length;
  }

  // Mom profiles
  if (wantMoms > 0) {
    const { data: places, error: placesErr } = await sb.from('places').select('id');
    if (placesErr) throw new Error(`places fetch failed: ${placesErr.message}`);
    const placeIds = (places || []).map(p => p.id);
    const { data: events, error: eventsErr } = await sb.from('events').select('id');
    if (eventsErr) throw new Error(`events fetch failed: ${eventsErr.message}`);
    const eventIds = (events || []).map(e => e.id);

    const rows = [];
    for (let i = 0; i < wantMoms; i++) rows.push(buildMomProfilePayload(i, placeIds, eventIds));

    onProgress({ phase: 'moms', message: `seeding ${rows.length} mom_profiles` });
    const chunk = 100;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error } = await sb.from('mom_profiles').upsert(slice, { onConflict: 'username' });
      if (error) throw new Error(`mom_profiles upsert failed at chunk ${i}: ${error.message}`);
    }
    result.moms = rows.length;
  }

  return result;
};
