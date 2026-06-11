#!/usr/bin/env node
// Capture an event's image and store a durable copy in the public Vercel Blob
// events/ folder (store-image skill), then print the blob URL to put in
// events.hero_photo. Reuses the repo's storeEventImage() helper so the
// create-event skill never has to reinvent download/validate/upload.
//
// WHY this exists: WebFetch returns prose, not the <meta og:image> URL, so when
// importing from Eventbrite/venue/library pages the hero image silently got
// dropped. The --page mode pulls og:image / JSON-LD image straight from the raw
// HTML (Eventbrite serves a clean img.evbuc.com URL there), then uploads it.
//
// Usage:
//   # Page URL — extract og:image / JSON-LD image, download, upload:
//   node store-event-image.mjs --slug evt-eventbrite-foo --page <event-page-url>
//
//   # Direct image URL (e.g. the og:image fb-extract.sh already printed):
//   node store-event-image.mjs --slug evt-fb-bar --image <image-url>
//
//   --print-only   just resolve+print the source image URL, don't upload
//
// Prints JSON: { "source_image_url": "...", "hero_photo": "<blob url>", "pathname": "..." }
// hero_photo is null (with a reason on stderr) if nothing could be captured —
// non-fatal: create the event without an image and tell the user.
import { readFileSync } from 'node:fs';

// --- env: load .env directly (shell sourcing drops some keys) ---------------
const loadEnv = () => {
  for (const file of ['.env', '.env.local']) {
    let text;
    try { text = readFileSync(new URL(`../../../../${file}`, import.meta.url), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
};
loadEnv();

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const slug = flag('slug');
const page = flag('page');
const image = flag('image');
const printOnly = !!flag('print-only');

if (!slug || (!page && !image)) {
  console.error('usage: store-event-image.mjs --slug <evt-slug> (--page <url> | --image <url>) [--print-only]');
  process.exit(64);
}

// Browser UA — some CDNs (incl. Eventbrite) 403 a default fetch UA.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// Pull the best image URL out of a page's raw HTML.
//   1. og:image (most reliable — Eventbrite, venues, libraries, museums all set it)
//   2. JSON-LD schema.org/Event "image" (string or array)
//   3. twitter:image
const extractImageUrl = (html) => {
  const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) return decodeEntities(og[1]);

  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : [data, ...(data['@graph'] || [])];
      for (const node of nodes) {
        const img = node?.image;
        if (!img) continue;
        if (typeof img === 'string') return img;
        if (Array.isArray(img)) return typeof img[0] === 'string' ? img[0] : img[0]?.url;
        if (img.url) return img.url;
      }
    } catch { /* malformed JSON-LD block — skip */ }
  }

  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (tw) return decodeEntities(tw[1]);
  return null;
};
const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/').replace(/&#47;/g, '/');

const main = async () => {
  let sourceImageUrl = image && image !== true ? image : null;

  if (!sourceImageUrl && page) {
    const r = await fetch(page, { redirect: 'follow', headers: { 'user-agent': UA } });
    if (!r.ok) { console.error(`page fetch failed: ${r.status} ${page}`); print(null, null); return; }
    sourceImageUrl = extractImageUrl(await r.text());
    if (!sourceImageUrl) { console.error(`no og:image / JSON-LD image found on ${page}`); print(null, null); return; }
  }

  console.error(`source_image_url: ${sourceImageUrl}`);
  if (printOnly) { print(sourceImageUrl, null); return; }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN missing — cannot upload. Print-only result:');
    print(sourceImageUrl, null);
    return;
  }

  // Reuse the repo helper: downloads, sniffs magic bytes, uploads to events/<slug>/.
  const { storeEventImage } = await import('../../../../api/_lib/ingestion/image-blob.js');
  const stored = await storeEventImage({ imageUrl: sourceImageUrl, slug });
  if (!stored) { console.error('storeEventImage returned null (not an image / upload failed)'); print(sourceImageUrl, null); return; }
  print(sourceImageUrl, stored);
};

const print = (sourceImageUrl, stored) => {
  process.stdout.write(JSON.stringify({
    source_image_url: sourceImageUrl,
    hero_photo: stored?.url ?? null,
    pathname: stored?.pathname ?? null,
  }, null, 2) + '\n');
};

main().catch((e) => { console.error(e.message); print(null, null); process.exit(1); });
