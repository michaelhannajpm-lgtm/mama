#!/usr/bin/env node
// CLI wrapper around api/_lib/ingestion/runIngestion.js.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... \
//   node scripts/ingest-family-data.mjs --source google-places-tampa --dry-run --limit 5
import { runIngestion } from '../api/_lib/ingestion/runIngestion.js';

const flags = process.argv.slice(2);
const val = (name, fb) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : fb; };
const sourceId = val('--source', 'google-places-tampa');
const limit = parseInt(val('--limit', '20'), 10);
const dryRun = flags.includes('--dry-run');

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
};
if (!env.GOOGLE_PLACES_API_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY'); process.exit(1); }
if (!dryRun && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (required for live writes)');
  process.exit(1);
}

runIngestion({ sourceId, limit, dryRun, env, logger: console })
  .then(c => {
    console.log(`\n${dryRun ? 'DRY RUN' : 'INGEST'} [${sourceId}]`);
    console.log(`  fetched=${c.fetched} normalized=${c.normalized} would-create/created=${c.created} ` +
      `updated=${c.updated} needs-review=${c.review} skipped=${c.skipped} errors=${c.errors}`);
    if (dryRun && c.reviewItems?.length) console.log(`  review samples: ${c.reviewItems.slice(0, 8).join(', ')}`);
  })
  .catch(e => { console.error(e); process.exit(1); });
