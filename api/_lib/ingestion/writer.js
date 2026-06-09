import { createClient } from '@supabase/supabase-js';

export const makeClient = (supabaseUrl, serviceRoleKey) =>
  createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// Map a normalized candidate → places row. NEW rows are staged for review.
const candidateToRow = (c) => ({
  slug: c.slug, name: c.name, category: c.category, area: c.area || null,
  city: c.city, description: c.description || null, tags: c.tags || [],
  address: c.address || null, website: c.website || null, reference_url: c.referenceUrl || null,
  phone: c.phone || null, google_place_id: c.googlePlaceId || null,
  google_maps_url: c.googleMapsUrl || null, business_status: c.businessStatus || null,
  price_level: c.priceLevel ?? null, rating: c.rating ?? null, review_count: c.reviewCount || 0,
  lat: c.lat ?? null, lng: c.lng ?? null, amenities: c.amenities || {}, good_for: c.goodFor || [],
  hero_photo: c.heroPhoto || null, last_seen_at: new Date().toISOString(),
  source_confidence: c.confidence ?? null,
  visible: false, review_status: 'needs_review',
});

// Insert a brand-new place; returns its id.
export const createPlace = async (sb, candidate) => {
  const { data, error } = await sb.from('places').insert(candidateToRow(candidate)).select('id').single();
  if (error) throw new Error(`create place failed: ${error.message}`);
  return data.id;
};

// Update an existing place WITHOUT touching curator-owned fields. Only refresh
// source-of-truth facts + last_seen_at; never flip visible/review_status here.
export const refreshPlace = async (sb, placeId, candidate) => {
  const patch = {
    address: candidate.address ?? null, phone: candidate.phone ?? null,
    website: candidate.website ?? null, rating: candidate.rating ?? null,
    review_count: candidate.reviewCount || 0, business_status: candidate.businessStatus ?? null,
    google_place_id: candidate.googlePlaceId ?? null, last_seen_at: new Date().toISOString(),
    source_confidence: candidate.confidence ?? null,
  };
  const { error } = await sb.from('places').update(patch).eq('id', placeId);
  if (error) throw new Error(`refresh place failed: ${error.message}`);
};

// Default the hero picture to a chosen photo URL (e.g. the first photo) on a
// freshly-created place. Only called at create time, so it never clobbers a
// curator-set hero_photo.
export const setHeroPhoto = async (sb, placeId, heroPhoto) => {
  const { error } = await sb.from('places').update({ hero_photo: heroPhoto }).eq('id', placeId);
  if (error) throw new Error(`set hero photo failed: ${error.message}`);
};

export const linkCategory = async (sb, placeId, categoryId) => {
  await sb.from('place_categories').upsert({ place_id: placeId, category_id: categoryId }, { onConflict: 'place_id,category_id' });
};

export const addPhoto = async (sb, placeId, photo) => {
  const { error } = await sb.from('place_photos').insert({
    place_id: placeId, url: photo.url || null, google_ref: photo.googleRef || null,
    source: photo.source, attribution: photo.attribution || null, is_hero: !!photo.isHero,
    sort_order: photo.sortOrder || 0,
  });
  if (error) throw new Error(`add photo failed: ${error.message}`);
};

export const recordSource = async (sb, { sourceId, externalId, placeId, sourceUrl, raw }) => {
  await sb.from('source_records').upsert({
    source_id: sourceId, external_id: externalId, record_type: 'place',
    place_id: placeId, source_url: sourceUrl || null, raw: raw || null,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'source_id,external_id,record_type' });
};

export const upsertSource = async (sb, source) => {
  await sb.from('ingestion_sources').upsert({
    id: source.id, name: source.name, source_type: source.type, city: source.city,
    county: source.county || null, enabled: source.enabled !== false,
    cadence_hours: source.cadenceHours || 24, parser_version: source.parserVersion || 'v1',
  }, { onConflict: 'id' });
};

export const startRun = async (sb, sourceId) => {
  const { data, error } = await sb.from('ingestion_runs')
    .insert({ source_id: sourceId, status: 'running' }).select('id').single();
  if (error) throw new Error(`start run failed: ${error.message}`);
  return data.id;
};

export const finishRun = async (sb, runId, status, counts) => {
  await sb.from('ingestion_runs').update({
    status, finished_at: new Date().toISOString(),
    fetched_count: counts.fetched || 0, normalized_count: counts.normalized || 0,
    created_count: counts.created || 0, updated_count: counts.updated || 0,
    skipped_count: counts.skipped || 0, error_count: counts.errors || 0,
    summary: counts.summary || {},
  }).eq('id', runId);
};

export const loadExistingPlaces = async (sb) => {
  const { data, error } = await sb.from('places').select('id,google_place_id,name,city,lat,lng');
  if (error) throw new Error(`load places failed: ${error.message}`);
  return data || [];
};
