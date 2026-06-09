import { getSource } from './sources.js';
import { fetchRaw } from './connectors/google-places.js';
import { normalizeGooglePlace } from './normalize.js';
import { classifyCandidate } from './dedupe.js';
import { makeGradientPng, uploadGeneratedPng } from './images.js';
import {
  makeClient, createPlace, refreshPlace, linkCategory, addPhoto, recordSource,
  upsertSource, startRun, finishRun, loadExistingPlaces,
} from './writer.js';

// Run one source. dryRun => no writes, returns counts only.
export async function runIngestion({ sourceId, limit = 20, dryRun = false, logger = console, env }) {
  const source = getSource(sourceId);
  if (!source) throw new Error(`unknown source: ${sourceId}`);
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const sb = dryRun ? null : makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const counts = { fetched: 0, normalized: 0, created: 0, updated: 0, skipped: 0, errors: 0, review: 0 };
  const reviewItems = [];

  let runId = null;
  if (!dryRun) { await upsertSource(sb, source); runId = await startRun(sb, source.id); }
  let existing = dryRun ? [] : await loadExistingPlaces(sb);

  for (const { q, category } of source.queries) {
    try {
      const raw = await fetchRaw({ query: q, bias: source.bias, limit, apiKey, logger });
      counts.fetched += raw.length;
      for (const gp of raw) {
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
        } else if (verdict.action === 'create' || verdict.action === 'review') {
          const placeId = await createPlace(sb, cand);
          await linkCategory(sb, placeId, category);
          // Photos: Google refs first; gradient fallback when none.
          if (cand.photos.length) {
            for (let i = 0; i < cand.photos.length; i++) {
              await addPhoto(sb, placeId, { googleRef: cand.photos[i].googleRef, source: 'google', attribution: cand.photos[i].attribution, isHero: i === 0, sortOrder: i });
            }
          } else {
            const png = await makeGradientPng(cand.name);
            const url = await uploadGeneratedPng({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, slug: cand.slug, buffer: png });
            await addPhoto(sb, placeId, { url, source: 'generated', isHero: true });
          }
          await recordSource(sb, { sourceId: source.id, externalId: cand.externalId, placeId, sourceUrl: cand.sourceUrl, raw: gp });
          existing.push({ id: placeId, google_place_id: cand.googlePlaceId, name: cand.name, city: cand.city, lat: cand.lat, lng: cand.lng });
          if (verdict.action === 'review') counts.review++;
          counts.created++;
        }
      }
    } catch (e) {
      counts.errors++;
      logger.error?.(`query "${q}" failed: ${e.message}`);
    }
  }

  if (!dryRun) {
    const status = counts.errors === 0 ? 'succeeded' : (counts.created || counts.updated ? 'partial' : 'failed');
    await finishRun(sb, runId, status, { ...counts, summary: { review: counts.review } });
  }
  return { ...counts, reviewItems };
}
