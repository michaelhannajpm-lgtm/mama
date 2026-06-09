import OpenAI from 'openai';
import { normalizeEvent } from './normalize-event.js';
import { classifyEventCandidate } from './dedupe-event.js';
import { resolveEventPlace } from './resolve-place.js';
import {
  makeClient, createEvent, refreshEvent, linkEventCategory, recordEventSource,
  loadExistingEvents, loadIngestablePlaces, startRun, finishRun, loadExistingPlaces,
  setEventImage,
} from './writer.js';
import { loadSource, ensureSource } from './source-store.js';
import { storeEventImage } from './image-blob.js';
import { parseEventbrite, fetchRaw as ebFetch } from './connectors/eventbrite.js';
import { fetchRaw as icsFetch } from './connectors/ics.js';
import { fetchRaw as jsonLdFetch } from './connectors/json-ld.js';
import { fetchRaw as fbFetch } from './connectors/facebook-graph.js';
import { fetchRaw as placeWebFetch } from './connectors/place-website.js';

// Build the work list + a per-unit fetcher for a source. The work list is what
// gets sliced for chunked/continuable runs (place_website => one unit per place;
// feed/api sources => a single unit).
async function buildWork(source, { env, limit, since, placeId, allPlaces, logger, sb }) {
  if (source.type === 'eventbrite') {
    return { workList: ['eventbrite'], fetchUnit: () => ebFetch({ since, limit, token: env.EVENTBRITE_API_TOKEN, logger }) };
  }
  if (source.type === 'ics') {
    if (!source.url) { logger.warn?.(`ics source ${source.id} has no url`); return { workList: [], fetchUnit: async () => [] }; }
    return { workList: ['ics'], fetchUnit: () => icsFetch({ url: source.url, defaultCity: source.city, sourceCategory: source.defaultType, logger }) };
  }
  if (source.type === 'json_ld') {
    return { workList: ['json_ld'], fetchUnit: () => jsonLdFetch({ url: source.url, sourceCategory: source.defaultType, logger }) };
  }
  if (source.type === 'facebook_graph') {
    if (!env.META_GRAPH_TOKEN) throw new Error('facebook_graph disabled: no META_GRAPH_TOKEN');
    return { workList: ['facebook_graph'], fetchUnit: () => fbFetch({ pageId: source.pageId, token: env.META_GRAPH_TOKEN, logger }) };
  }
  if (source.type === 'place_website') {
    const places = await loadIngestablePlaces(sb, { onlyApproved: !allPlaces, placeId });
    return { workList: places, isPlaces: true, fetchUnit: (place) => placeWebFetch({ place, logger }) };
  }
  throw new Error(`unknown event source type: ${source.type}`);
}

// Run one event source. dryRun => no writes, counts only.
// Chunked mode: pass a numeric `sliceSize` to process only workList
// [offset, offset+sliceSize); the return includes { total, nextOffset, hasMore }
// so a job processor can continue across invocations.
export async function runEventIngestion({ sourceId, limit = 50, since = null, dryRun = false, offset = 0, sliceSize = null, placeId = null, allPlaces = false, venueLimit = 100, logger = console, env }) {
  const sb = dryRun ? null : makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const sourceClient = sb || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) : null);
  const source = await loadSource(sourceClient, sourceId, { fallback: true });
  if (!source) throw new Error(`unknown event source: ${sourceId}`);
  const openai = (!dryRun && env.OPENAI_API_KEY) ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  const counts = { fetched: 0, normalized: 0, created: 0, updated: 0, review: 0, skipped: 0, errors: 0, venuesResolved: 0, placesCreatedFromVenues: 0, venuesLinked: 0, placesScanned: 0 };
  const reviewItems = [];

  const chunked = sliceSize != null;
  let runId = null;
  if (!dryRun && !chunked) { await ensureSource(sb, source, 'events'); runId = await startRun(sb, source.id); }
  const existingEvents = dryRun ? [] : await loadExistingEvents(sb);
  const existingPlaces = dryRun ? [] : await loadExistingPlaces(sb);
  const venueCache = new Map();

  const { workList, fetchUnit, isPlaces } = await buildWork(source, { env, limit, since, placeId, allPlaces, logger, sb });
  const slice = chunked ? workList.slice(offset, offset + sliceSize) : workList;

  for (const unit of slice) {
    if (isPlaces) counts.placesScanned++;
    let intermediates;
    try { intermediates = await fetchUnit(unit); }
    catch (e) { counts.errors++; logger.error?.(`fetch unit failed: ${e.message}`); continue; }
    for (const intermediate of intermediates) {
      counts.fetched++;
      try {
        const cand = normalizeEvent(intermediate, { source, fetchedAt: new Date().toISOString() });
        cand.sourceId = source.id;
        counts.normalized++;

        // Venue → place (skip for place_website; placeId already known on the intermediate).
        let placeId2 = intermediate.placeId || null;
        if (!placeId2 && cand.placeName) {
          if (counts.venuesResolved < venueLimit) {
            const res = await resolveEventPlace(cand, { existingPlaces, venueCache, sb, apiKey: env.GOOGLE_PLACES_API_KEY, env, dryRun, logger, openai });
            placeId2 = res.placeId;
            counts.venuesResolved++;
            if (res.action === 'create') counts.placesCreatedFromVenues++;
            else if (res.action === 'link' || res.action === 'cached') counts.venuesLinked++;
          }
        }
        cand.placeId = placeId2;

        const verdict = classifyEventCandidate(cand, existingEvents);
        if (dryRun) {
          if (verdict.action === 'create') counts.created++;
          else if (verdict.action === 'update') counts.updated++;
          else { counts.review++; reviewItems.push(cand.name); }
          continue;
        }

        if (verdict.action === 'update') {
          await refreshEvent(sb, verdict.matchId, cand, placeId2);
          await linkEventCategory(sb, verdict.matchId, cand.eventType);
          await recordEventSource(sb, { sourceId: source.id, externalId: cand.externalId, eventId: verdict.matchId, sourceUrl: cand.sourceUrl, raw: intermediate });
          if (cand.imageUrl) {
            const ex = existingEvents.find(e => e.id === verdict.matchId);
            if (ex && !ex.hero_photo) {
              const stored = await storeEventImage({ imageUrl: cand.imageUrl, slug: cand.slug, logger });
              if (stored?.url) { try { await setEventImage(sb, verdict.matchId, { heroPhoto: stored.url, imageSourceUrl: cand.imageUrl }); } catch (e) { logger.warn?.(`set image: ${e.message}`); } }
            }
          }
          counts.updated++;
        } else {
          const eventId = await createEvent(sb, cand, placeId2);
          for (const c of cand.eventCategories || [cand.eventType]) await linkEventCategory(sb, eventId, c);
          await recordEventSource(sb, { sourceId: source.id, externalId: cand.externalId, eventId, sourceUrl: cand.sourceUrl, raw: intermediate });
          existingEvents.push({ id: eventId, external_id: cand.externalId, name: cand.name, starts_at: cand.startsAt, place_id: placeId2, source_url: cand.sourceUrl });
          if (cand.imageUrl) {
            const stored = await storeEventImage({ imageUrl: cand.imageUrl, slug: cand.slug, logger });
            if (stored?.url) { try { await setEventImage(sb, eventId, { heroPhoto: stored.url, imageSourceUrl: cand.imageUrl }); } catch (e) { logger.warn?.(`set image: ${e.message}`); } }
          }
          if (verdict.action === 'review') counts.review++;
          counts.created++;
        }
      } catch (e) { counts.errors++; logger.error?.(`event "${intermediate?.name}" failed: ${e.message}`); }
    }
  }

  if (!dryRun && !chunked) {
    const status = counts.errors === 0 ? 'succeeded' : (counts.created || counts.updated ? 'partial' : 'failed');
    await finishRun(sb, runId, status, { ...counts, summary: { review: counts.review, venuesResolved: counts.venuesResolved, placesCreatedFromVenues: counts.placesCreatedFromVenues } });
  }
  const nextOffset = (chunked ? offset : 0) + slice.length;
  return { ...counts, reviewItems, total: workList.length, nextOffset, hasMore: chunked ? nextOffset < workList.length : false };
}
