#!/usr/bin/env node
// Seed the Supabase dev project with realistic data for Phase 1.
// Idempotent: re-running upserts by `slug` (places, events) and
// `username` (mom_profiles) so duplicates aren't created.
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
//   node scripts/seed-supabase.mjs [--moms 200] [--places 50] [--events 30] [--reset]
//
// --reset deletes all rows where source='seed' (mom_profiles only)
// before inserting. Places + events are upsert-by-slug, so reset
// is rarely needed for them.

import { createClient } from '@supabase/supabase-js';
import { PLACES as LOCAL_PLACES } from '../src/data/places.js';
import { SUGGESTED_EVENTS as LOCAL_EVENTS } from '../src/data/events.js';
import { lookupCoords, DEFAULT_COORDS } from './seed-data/place-coords.js';
import { generateDisplayName, generateUsername } from './seed-data/name-pool.js';
import { photosForMom } from './seed-data/photo-pool.js';
import {
  MOM_TYPES, VALUES, INTERESTS, KID_AGES,
} from '../src/data/taxonomy.js';

const flags = process.argv.slice(2);
const flagValue = (name, fallback) => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : fallback;
};
const wantPlaces = parseInt(flagValue('--places', '50'), 10);
const wantEvents = parseInt(flagValue('--events', '30'), 10);
const wantMoms   = parseInt(flagValue('--moms',   '200'), 10);
const doReset    = flags.includes('--reset');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// -- Places ----------------------------------------------------------------

const buildPlacesPayload = () => {
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
      });
    }
  }
  return out.slice(0, wantPlaces);
};

const seedPlaces = async () => {
  const rows = buildPlacesPayload();
  console.log(`Seeding ${rows.length} places…`);
  const { error } = await sb
    .from('places')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`places upsert failed: ${error.message}`);
};

// -- Events ----------------------------------------------------------------

const buildEventsPayload = async () => {
  // Fetch place ids so we can FK events to them.
  const { data: places, error } = await sb
    .from('places')
    .select('id, slug, area');
  if (error) throw new Error(`places fetch failed: ${error.message}`);
  const placeBySlug = Object.fromEntries(places.map(p => [p.slug, p]));

  const out = [];
  for (const e of LOCAL_EVENTS) {
    // Find a place that matches the event's `place` text loosely (event.place
    // is a free-text label like 'Buddy Brew · Hyde Park'); fall back to first
    // place in the same area.
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
      tags: e.tags || [],
      hero_photo: e.photo || null,
      going_count: e.going || 0,
      visible: true,
    });
  }

  // If we want more events than the local file provides, pad with variants
  // (different days / buckets, same name + place).
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const buckets = ['morning','noon','afternoon','night-owl'];
  let i = out.length;
  while (out.length < wantEvents && i < wantEvents * 4) {
    const base = LOCAL_EVENTS[i % LOCAL_EVENTS.length];
    const dow = dows[i % dows.length];
    const bk  = buckets[i % buckets.length];
    // Cycle through real places so variants always FK to a real place.
    // (placeBySlug is keyed by *place* slug; base.id is an *event* slug, so
    // looking up placeBySlug[base.id] always missed.)
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
      tags: base.tags || [],
      hero_photo: base.photo || null,
      going_count: 2 + (i % 14),
      visible: true,
    });
    i++;
  }
  return out.slice(0, wantEvents);
};

const seedEvents = async () => {
  const rows = await buildEventsPayload();
  console.log(`Seeding ${rows.length} events…`);
  const { error } = await sb
    .from('events')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`events upsert failed: ${error.message}`);
};

// -- mom_profiles ----------------------------------------------------------

// Deterministic pseudo-random generator so re-runs produce the same data.
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

const NEIGHBORHOODS_FOR_SEED = [
  'Hyde Park', 'Seminole Heights', 'Downtown', 'South Tampa',
  'Tampa Heights', 'Channelside', 'Davis Islands', 'West Tampa',
  'New Tampa', 'Carrollwood', 'Westchase', 'Ybor City',
];

const SLOT_DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SLOT_BUCKETS = ['morning','noon','afternoon','night-owl'];

const buildMomProfilePayload = (idx, placesById) => {
  const rand = seededRand(idx + 1);

  const displayName = generateDisplayName(idx);
  const username    = generateUsername(idx);
  const age         = 24 + Math.floor(rand() * 20); // 24–44

  // 1–3 kids, each in a random KID_AGES bucket.
  const kidCount = 1 + Math.floor(rand() * 3);
  const kidsAges = {};
  for (let i = 0; i < kidCount; i++) {
    const ageBucket = KID_AGES[Math.floor(rand() * Math.min(KID_AGES.length, 4))]; // weighted toward 0–8
    kidsAges[ageBucket] = (kidsAges[ageBucket] || 0) + 1;
  }

  const momTypeIds = pickN(MOM_TYPES.filter(t => t.id !== 'prefer_not'), 1 + (rand() < 0.3 ? 1 : 0), rand)
    .map(t => t.label);

  const valuesList    = pickN(VALUES, 2 + Math.floor(rand() * 2), rand);          // 2–3
  const interestsList = pickN(INTERESTS.map(i => i.label), 2 + Math.floor(rand() * 3), rand); // 2–4

  const slotCount = 3 + Math.floor(rand() * 5); // 3–7
  const slotSet = new Set();
  while (slotSet.size < slotCount) {
    const d = SLOT_DAYS[Math.floor(rand() * SLOT_DAYS.length)];
    const b = SLOT_BUCKETS[Math.floor(rand() * SLOT_BUCKETS.length)];
    slotSet.add(`${d}-${b}`);
  }
  const freeSlots = [...slotSet];

  // 2–4 random place uuids
  const placeIds = Object.values(placesById);
  const pickedPlaces = pickN(placeIds, 2 + Math.floor(rand() * 3), rand);

  const neighborhood = NEIGHBORHOODS_FOR_SEED[Math.floor(rand() * NEIGHBORHOODS_FOR_SEED.length)];
  const coords = lookupCoords(neighborhood);
  // Jitter ±0.05° (~3 mi) so geo-density isn't artificial.
  const home_lat = +(coords.lat + (rand() - 0.5) * 0.05).toFixed(6);
  const home_lng = +(coords.lng + (rand() - 0.5) * 0.05).toFixed(6);

  const cityRoll = rand();
  const city = cityRoll < 0.85 ? 'Tampa, FL'
             : cityRoll < 0.95 ? 'St. Petersburg, FL'
             : 'Clearwater, FL';

  const distance_miles = [5, 10, 20, 30, 50][Math.floor(rand() * 5)];

  const verified  = rand() < 0.6;
  const visible   = rand() < 0.95;
  const lastActive = rand() < 0.9
    ? new Date(Date.now() - Math.floor(rand() * 30) * 86400000).toISOString()
    : new Date(Date.now() - (30 + Math.floor(rand() * 60)) * 86400000).toISOString();

  return {
    auth_user_id: null,
    display_name: displayName,
    username,
    age,
    bio: `${momTypeIds[0] || 'Mom'} of ${kidCount} living in ${neighborhood}. Looking for nearby moms with similar values and free time.`,
    photos: photosForMom(idx),
    kids_ages: kidsAges,
    mom_types: momTypeIds,
    values: valuesList,
    interests: interestsList,
    free_slots: freeSlots,
    places: pickedPlaces,
    preferred_event_ids: [],
    city,
    neighborhood,
    home_lat,
    home_lng,
    distance_miles,
    visible,
    verified,
    blocked_global: false,
    social_links: {},
    source: 'seed',
    last_active_at: lastActive,
  };
};

const seedMomProfiles = async () => {
  if (wantMoms <= 0) return;

  const { data: places, error: placesErr } = await sb
    .from('places')
    .select('id');
  if (placesErr) throw new Error(`places fetch failed: ${placesErr.message}`);
  const placesById = Object.fromEntries(places.map(p => [p.id, p.id]));

  if (Object.keys(placesById).length === 0) {
    console.warn('No places in database — moms will be seeded with empty places[].');
  }

  const rows = [];
  for (let i = 0; i < wantMoms; i++) {
    rows.push(buildMomProfilePayload(i, placesById));
  }

  console.log(`Seeding ${rows.length} mom_profiles…`);
  // Insert in chunks of 100 to keep request bodies small.
  const chunk = 100;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await sb
      .from('mom_profiles')
      .upsert(slice, { onConflict: 'username' });
    if (error) throw new Error(`mom_profiles upsert failed at chunk ${i}: ${error.message}`);
    process.stdout.write(`  chunk ${i + slice.length}/${rows.length}\r`);
  }
  process.stdout.write('\n');
};

// -- Main ------------------------------------------------------------------

const main = async () => {
  if (doReset) {
    console.log("--reset: deleting mom_profiles where source='seed'…");
    const { error } = await sb.from('mom_profiles').delete().eq('source', 'seed');
    if (error) throw new Error(`reset failed: ${error.message}`);
  }

  await seedPlaces();
  await seedEvents();
  await seedMomProfiles();
  console.log('Phase 1 seed complete ✓');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
