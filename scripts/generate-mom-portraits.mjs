#!/usr/bin/env node
// Generate a UNIQUE profile portrait for every mom_profiles row.
//
// For each mom: build a deterministic-yet-varied photoreal prompt, generate an
// image with OpenAI, upload the bytes to the public Vercel Blob `profiles/<slug>/`
// folder, and write the returned blob URL into mom_profiles.photos (replacing
// existing photos). The app renders photos[0], so portraits appear automatically.
//
// Idempotent + resumable: by default it skips moms that already have a
// profiles/ blob portrait, so re-running after an interruption (or a partial
// run) picks up exactly where it left off. Use --force to regenerate everyone.
//
// Usage:
//   npm run portraits -- --dry-run                 # print prompts + paths, no API calls, no writes
//   npm run portraits -- --limit 2                 # generate just the first 2 (smoke test)
//   npm run portraits -- --slug gabrielac164       # one mom by username slug
//   npm run portraits                              # all moms still missing a portrait
//   npm run portraits -- --force                   # regenerate ALL, overwriting
//   npm run portraits -- --rate 5                  # images per minute (default 5)
//   npm run portraits -- --model gpt-image-1-mini  # cheaper model variant
//   npm run portraits -- --quality medium          # gpt-image quality: low(default)|medium|high
import { readFileSync } from 'node:fs';
import { put } from '@vercel/blob';
import { slugForMom, blobPathForMom, buildPortraitPrompt, hasGeneratedPortrait } from '../api/_lib/mom-portrait.js';

// --- env: load .env directly (shell sourcing drops some keys) ---------------
const loadEnv = () => {
  for (const file of ['.env', '.env.local']) {
    let text;
    try { text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
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
  dryRun: !!flag('dry-run', false),
  force: !!flag('force', false),
  limit: flag('limit') ? Number(flag('limit')) : null,
  slug: flag('slug', null),
  rate: Number(flag('rate', 5)),                 // images per minute
  model: String(flag('model', 'gpt-image-1')),   // gpt-image-1 | gpt-image-1-mini | gpt-image-1.5 | ...
  size: String(flag('size', '1024x1024')),
  quality: String(flag('quality', 'low')),       // gpt-image: 'low'|'medium'|'high'|'auto'
};
const minIntervalMs = Math.max(0, Math.round(60000 / Math.max(1, opts.rate)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

const fail = (msg) => { console.error(`\n✖ ${msg}`); process.exit(1); };
if (!supabaseUrl || !serviceRoleKey) fail('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
if (!opts.dryRun && !openaiKey) fail('OPENAI_API_KEY not set');
if (!opts.dryRun && !blobToken) fail('BLOB_READ_WRITE_TOKEN not set');

const sbHeaders = (extra = {}) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  ...extra,
});

// --- supabase: page through every mom -------------------------------------
const fetchMoms = async () => {
  const select = 'id,username,display_name,photos';
  const base = `${supabaseUrl}/rest/v1/mom_profiles?select=${select}&order=id.asc`;
  if (opts.slug) {
    const r = await fetch(`${base}&username=eq.${encodeURIComponent(opts.slug)}`, { headers: sbHeaders() });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  const pageSize = 1000;
  const all = [];
  for (let page = 0; page < 200; page++) {
    const r = await fetch(`${base}&limit=${pageSize}&offset=${page * pageSize}`, { headers: sbHeaders() });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const batch = await r.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
};

// --- openai: generate one image, return PNG bytes -------------------------
const generateImage = async (prompt) => {
  // gpt-image models accept model/prompt/n/size/quality (low|medium|high|auto)
  // and return b64_json by default. Keep the body minimal to avoid schema 400s.
  const body = { model: opts.model, prompt, n: 1, size: opts.size, quality: opts.quality };
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = j?.error?.message || JSON.stringify(j).slice(0, 200);
    throw new Error(`OpenAI ${r.status}: ${detail}`);
  }
  // gpt-image-1 returns b64_json; dall-e-3 returns a temporary url — handle both.
  const item = j?.data?.[0] || {};
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item.url) {
    const img = await fetch(item.url);
    if (!img.ok) throw new Error(`image url fetch ${img.status}`);
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error('OpenAI returned no image data');
};

// --- main ------------------------------------------------------------------
const main = async () => {
  console.log(`\n▶ mom portraits — model=${opts.model} size=${opts.size} rate=${opts.rate}/min` +
    `${opts.dryRun ? ' [dry-run]' : ''}${opts.force ? ' [force]' : ''}`);

  const moms = await fetchMoms();
  const todo = moms.filter((m) => opts.force || !hasGeneratedPortrait(m));
  const skipped = moms.length - todo.length;
  const targets = opts.limit ? todo.slice(0, opts.limit) : todo;

  console.log(`  ${moms.length} moms · ${skipped} already done · ${targets.length} to generate` +
    `${opts.limit ? ` (limited to ${opts.limit})` : ''}\n`);

  let ok = 0, errored = 0;
  for (let i = 0; i < targets.length; i++) {
    const mom = targets[i];
    const slug = slugForMom(mom);
    const prompt = buildPortraitPrompt(mom);
    const label = `[${i + 1}/${targets.length}] ${mom.display_name || mom.username || mom.id} (${slug})`;

    if (opts.dryRun) {
      console.log(`${label}\n    → ${blobPathForMom(slug)}\n    ${prompt}\n`);
      ok++;
      continue;
    }

    const started = Date.now();
    try {
      const bytes = await generateImage(prompt);
      const blob = await put(blobPathForMom(slug), bytes, {
        access: 'public',
        contentType: 'image/png',
        allowOverwrite: true,
        token: blobToken,
      });
      const r = await fetch(`${supabaseUrl}/rest/v1/mom_profiles?id=eq.${mom.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ photos: [blob.url] }),
      });
      if (!r.ok) {
        // Blob is uploaded but the DB write failed — log the orphan for cleanup.
        throw new Error(`DB write failed (${r.status}); orphan blob: ${blob.url}`);
      }
      ok++;
      console.log(`✓ ${label} → ${blob.url}`);
    } catch (e) {
      errored++;
      console.error(`✗ ${label} — ${e.message}`);
    }

    // rate limit between generations (not after the last one)
    if (i < targets.length - 1) {
      const elapsed = Date.now() - started;
      if (elapsed < minIntervalMs) await sleep(minIntervalMs - elapsed);
    }
  }

  console.log(`\n▶ done — ${ok} ok · ${errored} errored · ${skipped} skipped\n`);
  if (errored) process.exitCode = 1;
};

main().catch((e) => fail(e.message));
