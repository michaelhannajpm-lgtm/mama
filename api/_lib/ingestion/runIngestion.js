import { fetchRaw } from './connectors/google-places.js';
import { normalizeGooglePlace } from './normalize.js';
import { classifyCandidate } from './dedupe.js';
import { makeGradientPng, uploadGeneratedPng } from './images.js';
import {
  makeClient, createPlace, refreshPlace, linkCategory, addPhoto, recordSource,
  startRun, finishRun, loadExistingPlaces, setHeroPhoto,
} from './writer.js';
import { loadSource, ensureSource } from './source-store.js';

// Run one source. dryRun => no writes, returns counts only.
// Chunked mode: pass a numeric `sliceSize` to process only source.queries
// [offset, offset+sliceSize); the return includes { total, nextOffset, hasMore }
// for a job processor to continue across invocations. In chunked mode the
// ingestion_runs bookkeeping is skipped (the ingestion_jobs row is the record).
export async function runIngestion({ sourceId, limit = 20, dryRun = false, offset = 0, sliceSize = null, logger = console, env }) {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const sb = dryRun ? null : makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const sourceClient = sb || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) : null);
  const source = await loadSource(sourceClient, sourceId, { fallback: true });
  if (!source) throw new Error(`unknown source: ${sourceId}`);
  const counts = { fetched: 0, normalized: 0, created: 0, updated: 0, skipped: 0, errors: 0, review: 0 };
  const reviewItems = [];

  const chunked = sliceSize != null;
  const allQueries = source.queries;
  const slice = chunked ? allQueries.slice(offset, offset + sliceSize) : allQueries;

  let runId = null;
  if (!dryRun && !chunked) { await ensureSource(sb, source, 'places'); runId = await startRun(sb, source.id); }

  // Wrap the whole run so an unexpected throw (e.g. loadExistingPlaces) never
  // strands the ingestion_runs row in 'running'.
  try {
    const existing = dryRun ? [] : await loadExistingPlaces(sb);

    for (const { q, category } of slice) {
      let raw;
      try {
        raw = await fetchRaw({ query: q, bias: source.bias, limit, apiKey, logger });
      } catch (e) {
        counts.errors++;
        logger.error?.(`query "${q}" fetch failed: ${e.message}`);
        continue;
      }
      counts.fetched += raw.length;

      for (const gp of raw) {
        // Isolate per-candidate failures (e.g. a slug unique-index collision)
        // so one bad row doesn't drop the rest of the query's batch.
        try {
          const cand = normalizeGooglePlace(gp, { category, city: source.city });
          counts.normalized++;
          const verdict = classifyCandidate(cand, existing);

          if (dryRun) {
            if (verdict.action === 'create') counts.created++;
            else if (verdict.action === 'update') counts.updated++;
            else { counts.review++; reviewItems.push(cand.name); }
            continue;
          }

          if (verdict.action === 'update') {
            await refreshPlace(sb, verdict.matchId, cand);
            await linkCategory(sb, verdict.matchId, category);
            await recordSource(sb, { sourceId: source.id, externalId: cand.externalId, placeId: verdict.matchId, sourceUrl: cand.sourceUrl, raw: gp });
            counts.updated++;
          } else { // 'create' or 'review' — both insert a new staged row
            const placeId = await createPlace(sb, cand);
            await linkCategory(sb, placeId, category);
            // Photos: Google refs first; gradient fallback when none. Track the
            // first photo's URL so we can default the hero picture to it.
            let heroPhoto = null;
            if (cand.photos.length) {
              for (let i = 0; i < cand.photos.length; i++) {
                await addPhoto(sb, placeId, { googleRef: cand.photos[i].googleRef, source: 'google', attribution: cand.photos[i].attribution, isHero: i === 0, sortOrder: i });
              }
              // First Google photo, served via the key-safe proxy (width-agnostic).
              heroPhoto = `/api/places/photo?ref=${encodeURIComponent(cand.photos[0].googleRef)}`;
            } else {
              const png = await makeGradientPng(cand.name);
              const url = await uploadGeneratedPng({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, slug: cand.slug, buffer: png });
              await addPhoto(sb, placeId, { url, source: 'generated', isHero: true });
              heroPhoto = url;
            }
            // Default the hero picture to the first photo when none was set on
            // the new row (curated rows keep their own hero_photo).
            if (heroPhoto) await setHeroPhoto(sb, placeId, heroPhoto);
            await recordSource(sb, { sourceId: source.id, externalId: cand.externalId, placeId, sourceUrl: cand.sourceUrl, raw: gp });
            existing.push({ id: placeId, google_place_id: cand.googlePlaceId, name: cand.name, city: cand.city, lat: cand.lat, lng: cand.lng });
            // Count clean creates and review-flagged inserts separately and
            // mutually exclusively, so dry-run and live accounting agree.
            if (verdict.action === 'review') { counts.review++; reviewItems.push(cand.name); }
            else counts.created++;
          }
        } catch (e) {
          counts.errors++;
          logger.error?.(`candidate failed in query "${q}": ${e.message}`);
        }
      }
    }

    if (!dryRun && !chunked) {
      const wrote = counts.created || counts.updated || counts.review;
      const status = counts.errors === 0 ? 'succeeded' : (wrote ? 'partial' : 'failed');
      await finishRun(sb, runId, status, { ...counts, summary: { review: counts.review } });
    }
    const nextOffset = (chunked ? offset : 0) + slice.length;
    return { ...counts, reviewItems, total: allQueries.length, nextOffset, hasMore: chunked ? nextOffset < allQueries.length : false };
  } catch (e) {
    if (!dryRun && runId) {
      try { await finishRun(sb, runId, 'failed', { ...counts, summary: { review: counts.review, error: e.message } }); }
      catch { /* best effort — don't mask the original error */ }
    }
    throw e;
  }
}
