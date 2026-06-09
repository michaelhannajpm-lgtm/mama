#!/usr/bin/env node
// CLI wrapper. Dispatches by source type:
//   google_places                              -> place pipeline (runIngestion)
//   eventbrite|ics|json_ld|facebook_graph|place_website -> event pipeline (runEventIngestion)
//
// Usage:
//   node scripts/ingest-family-data.mjs --source eventbrite-tampa-family --dry-run --limit 5
//   node scripts/ingest-family-data.mjs --source place-websites --place <uuid>
import { runIngestion } from '../api/_lib/ingestion/runIngestion.js';
import { runEventIngestion } from '../api/_lib/ingestion/runEventIngestion.js';
import { getSource, getEventSource } from '../api/_lib/ingestion/sources.js';

const flags = process.argv.slice(2);
const val = (name, fb) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : fb; };
const sourceId = val('--source', 'google-places-tampa');
const limit = parseInt(val('--limit', '20'), 10);
const since = val('--since', null);
const place = val('--place', null);
const venueLimit = parseInt(val('--venue-limit', '100'), 10);
const allPlaces = flags.includes('--all-places');
const dryRun = flags.includes('--dry-run');

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  EVENTBRITE_API_TOKEN: process.env.EVENTBRITE_API_TOKEN,
  META_GRAPH_TOKEN: process.env.META_GRAPH_TOKEN,
};
if (!dryRun && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (required for live writes)');
  process.exit(1);
}

const isEvent = !!getEventSource(sourceId);
const run = isEvent
  ? runEventIngestion({ sourceId, limit, since, dryRun, placeId: place, allPlaces, venueLimit, env, logger: console })
  : runIngestion({ sourceId, limit, dryRun, env, logger: console });

run.then(c => {
  console.log(`\n${dryRun ? 'DRY RUN' : 'INGEST'} [${sourceId}] (${isEvent ? 'events' : 'places'})`);
  console.log(`  fetched=${c.fetched} normalized=${c.normalized} created=${c.created} updated=${c.updated} ` +
    `needs-review=${c.review ?? 0} skipped=${c.skipped} errors=${c.errors}`);
  if (isEvent) console.log(`  venuesResolved=${c.venuesResolved} placesCreatedFromVenues=${c.placesCreatedFromVenues} venuesLinked=${c.venuesLinked}`);
  if (dryRun && c.reviewItems?.length) console.log(`  review samples: ${c.reviewItems.slice(0, 8).join(', ')}`);
}).catch(e => { console.error(e); process.exit(1); });
