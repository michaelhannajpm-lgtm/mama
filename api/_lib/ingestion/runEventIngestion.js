import OpenAI from 'openai';
import { getEventSource } from './sources.js';
import { normalizeEvent } from './normalize-event.js';
import { classifyEventCandidate } from './dedupe-event.js';
import { resolveEventPlace } from './resolve-place.js';
import {
  makeClient, createEvent, refreshEvent, linkEventCategory, recordEventSource,
  loadExistingEvents, loadIngestablePlaces, upsertSource, startRun, finishRun, loadExistingPlaces,
} from './writer.js';
import { parseEventbrite, fetchRaw as ebFetch } from './connectors/eventbrite.js';
import { fetchRaw as icsFetch } from './connectors/ics.js';
import { fetchRaw as jsonLdFetch } from './connectors/json-ld.js';
import { fetchRaw as fbFetch } from './connectors/facebook-graph.js';
import { fetchRaw as placeWebFetch } from './connectors/place-website.js';

// Yields { intermediate, raw } intermediates for a source (dispatch by type).
async function* fetchIntermediates(source, { env, limit, since, placeId, allPlaces, logger, sb }) {
  if (source.type === 'eventbrite') {
    for (const { q } of source.queries || [{ q: 'family kids' }]) {
      const items = await ebFetch({ query: q, since, limit, token: env.EVENTBRITE_API_TOKEN, logger });
      for (const it of items) yield { intermediate: it };
    }
  } else if (source.type === 'ics') {
    if (!source.url) { logger.warn?.(`ics source ${source.id} has no url`); return; }
    for (const it of await icsFetch({ url: source.url, defaultCity: source.city, sourceCategory: source.defaultType, logger })) yield { intermediate: it };
  } else if (source.type === 'json_ld') {
    for (const it of await jsonLdFetch({ url: source.url, sourceCategory: source.defaultType, logger })) yield { intermediate: it };
  } else if (source.type === 'facebook_graph') {
    if (!env.META_GRAPH_TOKEN) throw new Error('facebook_graph disabled: no META_GRAPH_TOKEN');
    for (const it of await fbFetch({ pageId: source.pageId, token: env.META_GRAPH_TOKEN, logger })) yield { intermediate: it };
  } else if (source.type === 'place_website') {
    const places = await loadIngestablePlaces(sb, { onlyApproved: !allPlaces, placeId });
    for (const place of places) {
      try {
        for (const it of await placeWebFetch({ place, logger })) yield { intermediate: it };
      } catch (e) { logger.error?.(`place-website ${place.name}: ${e.message}`); }
    }
  } else {
    throw new Error(`unknown event source type: ${source.type}`);
  }
}

// Run one event source. dryRun => no writes, counts only.
export async function runEventIngestion({ sourceId, limit = 50, since = null, dryRun = false, placeId = null, allPlaces = false, venueLimit = 100, logger = console, env }) {
  const source = getEventSource(sourceId);
  if (!source) throw new Error(`unknown event source: ${sourceId}`);

  const sb = dryRun ? null : makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const openai = (!dryRun && env.OPENAI_API_KEY) ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  const counts = { fetched: 0, normalized: 0, created: 0, updated: 0, review: 0, skipped: 0, errors: 0, venuesResolved: 0, placesCreatedFromVenues: 0, venuesLinked: 0, placesScanned: 0 };
  const reviewItems = [];

  let runId = null;
  if (!dryRun) { await upsertSource(sb, source); runId = await startRun(sb, source.id); }
  const existingEvents = dryRun ? [] : await loadExistingEvents(sb);
  const existingPlaces = dryRun ? [] : await loadExistingPlaces(sb);
  const venueCache = new Map();

  try {
    for await (const { intermediate, raw } of fetchIntermediates(source, { env, limit, since, placeId, allPlaces, logger, sb })) {
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
          await recordEventSource(sb, { sourceId: source.id, externalId: cand.externalId, eventId: verdict.matchId, sourceUrl: cand.sourceUrl, raw: raw || intermediate });
          counts.updated++;
        } else {
          const eventId = await createEvent(sb, cand, placeId2);
          for (const c of cand.eventCategories || [cand.eventType]) await linkEventCategory(sb, eventId, c);
          await recordEventSource(sb, { sourceId: source.id, externalId: cand.externalId, eventId, sourceUrl: cand.sourceUrl, raw: raw || intermediate });
          existingEvents.push({ id: eventId, external_id: cand.externalId, name: cand.name, starts_at: cand.startsAt, place_id: placeId2, source_url: cand.sourceUrl });
          if (verdict.action === 'review') counts.review++;
          counts.created++;
        }
      } catch (e) { counts.errors++; logger.error?.(`event "${intermediate?.name}" failed: ${e.message}`); }
    }
  } catch (e) { counts.errors++; logger.error?.(`source ${source.id} failed: ${e.message}`); }

  if (!dryRun) {
    const status = counts.errors === 0 ? 'succeeded' : (counts.created || counts.updated ? 'partial' : 'failed');
    await finishRun(sb, runId, status, { ...counts, summary: { review: counts.review, venuesResolved: counts.venuesResolved, placesCreatedFromVenues: counts.placesCreatedFromVenues } });
  }
  return { ...counts, reviewItems };
}
