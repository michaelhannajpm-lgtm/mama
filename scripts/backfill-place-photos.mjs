#!/usr/bin/env node
// Backfill durable Vercel Blob copies of every Google Places photo.
//
// Walks place_photos rows that are source='google' and have no blob_url yet,
// downloads the image bytes from Google (honoring a per-minute rate limit),
// uploads them to the public Vercel Blob `places/` folder, and writes the blob
// URL back to the row (and the place's hero_photo when the photo is the hero).
//
// Idempotent + resumable: it only ever selects rows still missing a blob_url, so
// re-running after an interruption picks up exactly where it left off. Each
// attempt records fetch_status + fetch_attempted_at, so failures are auditable.
//
// Usage:
//   npm run backfill:photos                      # all missing, default 60/min
//   npm run backfill:photos -- --rate 30         # 30 downloads per minute
//   npm run backfill:photos -- --limit 5         # only the first 5 (smoke test)
//   npm run backfill:photos -- --dry-run         # list what would run, no writes
//   npm run backfill:photos -- --place bayshore  # one place by slug
//   npm run backfill:photos -- --skip-failed     # don't retry previously-failed
//   npm run backfill:photos -- --width 1600      # max source width (px)
import { readFileSync } from 'node:fs';
import { ensurePhotoBlob } from '../api/_lib/place-photo-blob.js';

// --- env: load .env without shell sourcing (which drops some keys) ----------
const loadEnv = () => {
  for (const file of ['.env', '.env.local']) {
    let text;
    try { text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const k = m[1];
      let v = m[2].replace(/^["']|["']$/g, '');
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
};
loadEnv();

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const opts = {
  rate: Number(flag('rate', 60)),       // downloads per minute
  limit: flag('limit') ? Number(flag('limit')) : null,
  width: Number(flag('width', 1200)),
  dryRun: !!flag('dry-run', false),
  skipFailed: !!flag('skip-failed', false),
  place: flag('place', null),           // slug filter
};
const minIntervalMs = Math.max(0, Math.round(60000 / Math.max(1, opts.rate)));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleKey = process.env.GOOGLE_PLACES_API_KEY;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const missing = Object.entries({ SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey, GOOGLE_PLACES_API_KEY: googleKey, BLOB_READ_WRITE_TOKEN: blobToken })
  .filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.error(`Missing env: ${missing.join(', ')}`); process.exit(1); }

const creds = { supabaseUrl, serviceRoleKey };
const restHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- fetch all candidate photos (paged, stable order) ----------------------
const fetchCandidates = async () => {
  const pageSize = 1000;
  const out = [];
  for (let offset = 0; ; offset += pageSize) {
    const params = new URLSearchParams();
    params.set('select', 'id,place_id,google_ref,is_hero,fetch_status,places(slug)');
    params.append('source', 'eq.google');
    params.append('blob_url', 'is.null');
    params.append('google_ref', 'not.is.null');
    if (opts.skipFailed) params.append('fetch_status', 'is.null');
    if (opts.place) params.append('places.slug', `eq.${opts.place}`);
    params.set('order', 'place_id.asc,sort_order.asc');
    params.set('limit', String(pageSize));
    params.set('offset', String(offset));
    const r = await fetch(`${supabaseUrl}/rest/v1/place_photos?${params}`, { headers: restHeaders });
    if (!r.ok) throw new Error(`fetch candidates ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
    const page = await r.json();
    // When filtering by place slug, the embedded join still returns rows whose
    // place doesn't match (slug null) — drop those.
    out.push(...(opts.place ? page.filter(p => p.places) : page));
    if (page.length < pageSize) break;
  }
  return opts.limit ? out.slice(0, opts.limit) : out;
};

// --- main ------------------------------------------------------------------
const run = async () => {
  console.log(`[backfill] rate=${opts.rate}/min (${minIntervalMs}ms apart) width=${opts.width}px` +
    `${opts.place ? ` place=${opts.place}` : ''}${opts.skipFailed ? ' skip-failed' : ''}${opts.dryRun ? ' DRY-RUN' : ''}`);
  const candidates = await fetchCandidates();
  console.log(`[backfill] ${candidates.length} photo(s) need a blob`);
  if (!candidates.length) return;

  if (opts.dryRun) {
    const etaMin = (candidates.length * minIntervalMs / 60000).toFixed(1);
    console.log(`[backfill] DRY-RUN: would download+upload ${candidates.length} photo(s), ~${etaMin} min at this rate`);
    candidates.slice(0, 10).forEach(p => console.log(`  - ${p.places?.slug || p.place_id}  ${p.google_ref}${p.is_hero ? '  (hero)' : ''}`));
    if (candidates.length > 10) console.log(`  … +${candidates.length - 10} more`);
    return;
  }

  let ok = 0, failed = 0;
  const startedAt = Date.now();
  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];
    const tick = Date.now();
    const res = await ensurePhotoBlob({
      creds, photo: p, slug: p.places?.slug, key: googleKey, width: opts.width, blobToken,
    });
    if (res.status === 'success') ok++;
    else { failed++; console.warn(`[backfill] FAIL ${p.places?.slug || p.place_id} ${p.google_ref}: ${res.error}`); }

    if ((i + 1) % 25 === 0 || i + 1 === candidates.length) {
      const rate = (ok + failed) / ((Date.now() - startedAt) / 60000);
      console.log(`[backfill] ${i + 1}/${candidates.length}  ok=${ok} failed=${failed}  (${rate.toFixed(0)}/min)`);
    }
    // Pace to the rate limit (skip the wait on the last item).
    if (i + 1 < candidates.length) {
      const elapsed = Date.now() - tick;
      if (elapsed < minIntervalMs) await sleep(minIntervalMs - elapsed);
    }
  }
  console.log(`[backfill] done: ok=${ok} failed=${failed} total=${candidates.length}`);
  if (failed) console.log('[backfill] re-run to retry failures (they stay blob_url=null); inspect fetch_error for causes.');
};

run().catch(e => { console.error('[backfill] fatal:', e.message); process.exit(1); });
