#!/usr/bin/env node
// CLI wrapper around api/_lib/ingestion/enrich.js — fills empty fields on
// ingested places (area + hero_photo deterministically; description/tags/
// good_for/age_min/age_max/amenities via Claude).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... \
//   node scripts/enrich-places.mjs --dry-run --limit 3
//   node scripts/enrich-places.mjs --limit 80          # live write
//   node scripts/enrich-places.mjs --overwrite         # re-enrich all fields
import { runEnrich, DEFAULT_MODEL } from '../api/_lib/ingestion/enrich.js';

const flags = process.argv.slice(2);
const val = (name, fb) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : fb; };
const limit = flags.includes('--limit') ? parseInt(val('--limit'), 10) : null;
const dryRun = flags.includes('--dry-run');
const overwrite = flags.includes('--overwrite');
const model = val('--model', process.env.ENRICH_MODEL || DEFAULT_MODEL);

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
if (!env.OPENAI_API_KEY) { console.error('Missing OPENAI_API_KEY'); process.exit(1); }
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (needed to read + write places)');
  process.exit(1);
}

runEnrich({ env, limit, dryRun, overwrite, model, logger: console })
  .then(c => {
    console.log(`\n${dryRun ? 'DRY RUN' : 'ENRICH'} [${model}]`);
    console.log(`  total=${c.total} enriched=${c.enriched} skipped=${c.skipped} ai-calls=${c.aiCalls} errors=${c.errors}`);
    for (const s of c.samples) {
      console.log(`  • ${s.name}`);
      if (s.area) console.log(`      area: ${s.area}`);
      if (s.description) console.log(`      desc: ${s.description}`);
      if (s.age_min != null) console.log(`      ages: ${s.age_min}-${s.age_max}  tags: ${(s.tags || []).join(', ')}`);
      if (s.good_for) console.log(`      good_for: ${(s.good_for || []).join(', ')}`);
    }
  })
  .catch(e => { console.error(e); process.exit(1); });
