#!/usr/bin/env node
// Thin CLI wrapper around api/_lib/seed.js — same flags as before.
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
//   node scripts/seed-supabase.mjs [--moms 200] [--places 50] [--events 30] [--reset]

import { runSeed } from '../api/_lib/seed.js';

const flags = process.argv.slice(2);
const flagValue = (name, fallback) => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : fallback;
};
const wantPlaces = parseInt(flagValue('--places', '50'), 10);
const wantEvents = parseInt(flagValue('--events', '30'), 10);
const wantMoms   = parseInt(flagValue('--moms',   '200'), 10);
const reset      = flags.includes('--reset');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const main = async () => {
  const result = await runSeed({
    supabaseUrl,
    serviceRoleKey,
    wantPlaces,
    wantEvents,
    wantMoms,
    reset,
    onProgress: ({ phase, message }) => {
      console.log(`[${phase}] ${message}…`);
    },
  });
  console.log(
    `Phase 1 seed complete ✓  ` +
    `places=${result.places} events=${result.events} moms=${result.moms}` +
    (reset ? ` (reset deleted ${result.reset.deleted})` : '')
  );
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
