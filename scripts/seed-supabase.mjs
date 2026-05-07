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
    out.push({
      slug: `${base.id}-v${i}`,
      name: `${base.name} (extra)`,
      place_id: placeBySlug[base.id]?.id || null,
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

// -- Main ------------------------------------------------------------------

const main = async () => {
  if (doReset) {
    console.log("--reset: deleting mom_profiles where source='seed'…");
    const { error } = await sb.from('mom_profiles').delete().eq('source', 'seed');
    if (error) throw new Error(`reset failed: ${error.message}`);
  }

  await seedPlaces();
  await seedEvents();
  // Mom_profiles seeded by Task 13.
  console.log('Phase 1 places + events seeded ✓');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
