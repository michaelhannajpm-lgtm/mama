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

// ------------------------------------------------------------------- events

const eventCandidateToRow = (c, placeId) => ({
  slug: c.slug, name: c.name, kind: c.kind || 'dated', event_type: c.eventType || 'other',
  city: c.city, place_id: placeId || null, place_name: c.placeName || null, area: c.area || null,
  day_of_week: c.dayOfWeek, bucket: c.bucket, time_label: c.timeLabel,
  starts_at: c.startsAt || null, ends_at: c.endsAt || null, timezone: c.timezone || 'America/New_York',
  recurring: c.recurring || 'One-time', description: c.description || null,
  website: c.website || null, source_url: c.sourceUrl || null, external_id: c.externalId || null,
  tags: c.tags || [], kid_ages: c.kidAges || [], indoor: c.indoor ?? null, hue: c.hue || null,
  age_min: c.ageMin ?? null, age_max: c.ageMax ?? null, price_summary: c.priceSummary || null,
  going_count: 0, hero_photo: c.heroPhoto || null,
  visible: false, review_status: 'needs_review',
  last_seen_at: new Date().toISOString(), source_confidence: c.confidence ?? null,
});

export const createEvent = async (sb, candidate, placeId) => {
  const base = eventCandidateToRow(candidate, placeId);
  // Slug is unique. Distinct events can derive the same name+date slug; per the
  // data-contract, disambiguate with a numeric suffix only on collision.
  for (let attempt = 0; attempt < 25; attempt++) {
    const row = attempt === 0 ? base : { ...base, slug: `${base.slug}-${attempt + 1}` };
    const { data, error } = await sb.from('events').insert(row).select('id').single();
    if (!error) return data.id;
    const isSlugCollision = error.code === '23505' && /slug/i.test(error.message || '');
    if (!isSlugCollision) throw new Error(`create event failed: ${error.message}`);
  }
  throw new Error(`create event failed: slug ${base.slug} collided 25 times`);
};

// Refresh source-of-truth facts only; never flip visible/review_status.
export const refreshEvent = async (sb, eventId, candidate, placeId) => {
  const patch = {
    description: candidate.description ?? null, website: candidate.website ?? null,
    source_url: candidate.sourceUrl ?? null, starts_at: candidate.startsAt ?? null,
    ends_at: candidate.endsAt ?? null, price_summary: candidate.priceSummary ?? null,
    place_id: placeId ?? null, place_name: candidate.placeName ?? null,
    last_seen_at: new Date().toISOString(), source_confidence: candidate.confidence ?? null,
  };
  const { error } = await sb.from('events').update(patch).eq('id', eventId);
  if (error) throw new Error(`refresh event failed: ${error.message}`);
};

export const linkEventCategory = async (sb, eventId, categoryId) => {
  await sb.from('event_categories').upsert({ event_id: eventId, category_id: categoryId }, { onConflict: 'event_id,category_id' });
};

export const recordEventSource = async (sb, { sourceId, externalId, eventId, sourceUrl, raw, contentHash }) => {
  await sb.from('source_records').upsert({
    source_id: sourceId, external_id: externalId, record_type: 'event',
    event_id: eventId, source_url: sourceUrl || null, raw: raw || null, content_hash: contentHash || null,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'source_id,external_id,record_type' });
};

export const loadExistingEvents = async (sb) => {
  const { data, error } = await sb.from('events').select('id,external_id,name,starts_at,place_id,source_url,hero_photo');
  if (error) throw new Error(`load events failed: ${error.message}`);
  return data || [];
};

// Places eligible for website crawling. onlyApproved=true => approved-only.
export const loadIngestablePlaces = async (sb, { onlyApproved = true, placeId = null } = {}) => {
  let q = sb.from('places').select('id,name,city,area,website,review_status').not('website', 'is', null);
  if (placeId) q = q.eq('id', placeId);
  else if (onlyApproved) q = q.eq('review_status', 'approved');
  const { data, error } = await q;
  if (error) throw new Error(`load ingestable places failed: ${error.message}`);
  return (data || []).filter(p => p.website);
};

export const setEventImage = async (sb, eventId, { heroPhoto, imageSourceUrl }) => {
  const { error } = await sb.from('events').update({ hero_photo: heroPhoto, image_source_url: imageSourceUrl || null }).eq('id', eventId);
  if (error) throw new Error(`set event image failed: ${error.message}`);
};
