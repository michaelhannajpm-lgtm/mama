import { classifyCandidate } from './dedupe.js';
import { normalizeGooglePlace } from './normalize.js';
import { fetchRaw as googleFetchRaw } from './connectors/google-places.js';
import { createPlace, addPhoto, linkCategory, recordSource, refreshPlace } from './writer.js';
import { makeGradientPng, uploadGeneratedPng } from './images.js';
import { enrichOne, deriveArea, buildHeroPhoto } from './enrich.js';

// Event type -> primary place category (data-contract category mapping).
const EVENT_TO_PLACE = {
  swim: 'sports', gymnastics: 'sports', 'martial-arts': 'sports', 'kids-fitness': 'sports',
  'sports-event': 'sports', 'family-yoga': 'wellness', 'prenatal-class': 'wellness',
  'new-parent': 'wellness', 'parenting-class': 'wellness', breastfeeding: 'wellness',
  'support-group': 'wellness', camp: 'camps', 'break-camp': 'camps',
  stem: 'extracurricular', 'art-class': 'extracurricular', 'music-class': 'extracurricular',
  'dance-class': 'extracurricular', 'cooking-class': 'extracurricular',
  'language-class': 'extracurricular', tutoring: 'extracurricular', workshop: 'extracurricular',
  class: 'extracurricular',
};
export const inferPlaceCategory = (eventType) => EVENT_TO_PLACE[eventType] || 'fun';

const venueKey = (name, city) => `${(name || '').toLowerCase().trim()}|${(city || '').toLowerCase().trim()}`;

// Resolve an event's venue to a place id (dedupe-or-create). Returns
// { placeId, action } where action ∈ create|link|cached|none.
export async function resolveEventPlace(cand, ctx) {
  const {
    existingPlaces = [], venueCache = new Map(), sb = null, apiKey = null, env = {},
    dryRun = false, logger = console, googleSearch = googleFetchRaw, openai = null,
    bias = { lat: 27.9506, lng: -82.4572, radiusM: 25000 },
  } = ctx || {};

  if (!cand.placeName) return { placeId: null, action: 'none' };
  const key = venueKey(cand.placeName, cand.city);
  if (venueCache.has(key)) return { placeId: venueCache.get(key), action: 'cached' };

  // 1. Local dedupe (no API cost).
  const localCand = { googlePlaceId: null, name: cand.placeName, city: cand.city, lat: cand.lat, lng: cand.lng };
  const local = classifyCandidate(localCand, existingPlaces);
  if (local.action === 'update' || local.action === 'review') {
    venueCache.set(key, local.matchId);
    return { placeId: local.matchId, action: 'link' };
  }

  // 2. Google resolution (capture all the API).
  if (!apiKey) { return { placeId: null, action: 'none' }; } // no key → link-only, can't create
  let gp = null;
  try {
    const results = await googleSearch({ query: `${cand.placeName}, ${cand.address || cand.city}`, bias, limit: 1, apiKey, logger });
    gp = results?.[0] || null;
  } catch (e) { logger.warn?.(`venue google lookup failed: ${e.message}`); }
  if (!gp) return { placeId: null, action: 'none' };

  const placeCand = normalizeGooglePlace(gp, { category: inferPlaceCategory(cand.eventType), city: cand.city });

  // 3. Dedupe the resolved candidate (now has google_place_id + geo).
  const resolved = classifyCandidate(placeCand, existingPlaces);
  if (resolved.action === 'update' || resolved.action === 'review') {
    if (!dryRun && sb) await refreshPlace(sb, resolved.matchId, placeCand).catch(() => {});
    venueCache.set(key, resolved.matchId);
    return { placeId: resolved.matchId, action: 'link' };
  }

  // 4. Create via the place pipeline.
  if (dryRun || !sb) return { placeId: null, action: 'create' };
  const placeId = await createPlace(sb, {
    ...placeCand, review_status: 'needs_review', visible: false, origin: 'event',
  });
  await linkCategory(sb, placeId, placeCand.category);
  if (placeCand.photos?.length) {
    for (let i = 0; i < placeCand.photos.length; i++) {
      await addPhoto(sb, placeId, { googleRef: placeCand.photos[i].googleRef, source: 'google', attribution: placeCand.photos[i].attribution, isHero: i === 0, sortOrder: i });
    }
  } else {
    const png = await makeGradientPng(placeCand.name);
    const url = await uploadGeneratedPng({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, slug: placeCand.slug, buffer: png });
    await addPhoto(sb, placeId, { url, source: 'generated', isHero: true });
  }
  await recordSource(sb, { sourceId: cand.sourceId || 'place-from-event', externalId: placeCand.googlePlaceId, placeId, sourceUrl: placeCand.sourceUrl, raw: gp });

  // 5. Inline OpenAI enrichment (best-effort).
  if (openai) {
    try {
      const patch = await enrichOne(openai, { name: placeCand.name, category: placeCand.category, address: placeCand.address, rating: placeCand.rating, review_count: placeCand.reviewCount });
      const area = deriveArea(placeCand.lat, placeCand.lng);
      const hero = buildHeroPhoto((placeCand.photos || []).map((p, i) => ({ google_ref: p.googleRef, is_hero: i === 0 })));
      await sb.from('places').update({ ...patch, ...(area ? { area } : {}), ...(hero ? { hero_photo: hero } : {}) }).eq('id', placeId);
    } catch (e) { logger.warn?.(`venue enrich failed: ${e.message}`); }
  }

  existingPlaces.push({ id: placeId, google_place_id: placeCand.googlePlaceId, name: placeCand.name, city: placeCand.city, lat: placeCand.lat, lng: placeCand.lng });
  venueCache.set(key, placeId);
  return { placeId, action: 'create' };
}
