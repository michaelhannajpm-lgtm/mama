import { eventTimeParts, localDateKey } from './time.js';
import { mapEventType } from './map-event-type.js';
import { gradientForName } from './images.js';

const slugBase = (s) => (s || '')
  .toLowerCase().replace(/[''']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const eventSlug = (name, { sourceId, startsAt, timezone = 'America/New_York', recurringText } = {}) => {
  const date = startsAt ? localDateKey(startsAt, timezone) : null;
  const tail = date || (recurringText ? slugBase(recurringText) : 'recurring');
  return `${slugBase(sourceId)}-${slugBase(name)}-${tail}`.replace(/-+/g, '-');
};

// Confidence: more complete records score higher. Bounded (0,1].
const scoreConfidence = (i) => {
  let s = 0.4;
  if (i.startsAt) s += 0.2;
  if (i.placeName) s += 0.15;
  if (i.sourceUrl) s += 0.1;
  if (i.description) s += 0.1;
  if (i.externalId) s += 0.05;
  return Math.min(1, +s.toFixed(3));
};

export const normalizeEvent = (i, { source, fetchedAt } = {}) => {
  const timezone = i.timezone || 'America/New_York';
  const { dayOfWeek, bucket, timeLabel } = eventTimeParts(i.startsAt, timezone);
  const { type, categories } = mapEventType(i.name, i.description || i.sourceCategory || '');
  const city = i.city || source?.city || 'Tampa, FL';
  return {
    kind: 'dated',
    name: i.name || 'Untitled event',
    slug: eventSlug(i.name, { sourceId: source?.id, startsAt: i.startsAt, timezone, recurringText: i.recurringText }),
    description: i.description || null,
    startsAt: i.startsAt || null,
    endsAt: i.endsAt || null,
    timezone,
    dayOfWeek, bucket, timeLabel,
    recurring: i.recurringText || 'One-time',
    eventType: type,
    eventCategories: categories,
    city,
    placeName: i.placeName || null,
    address: i.address || null,
    lat: i.lat ?? null,
    lng: i.lng ?? null,
    website: i.website || null,
    sourceUrl: i.sourceUrl || null,
    externalId: i.externalId || null,
    ageMin: i.ageMin ?? null,
    ageMax: i.ageMax ?? null,
    priceSummary: i.priceSummary || null,
    imageUrl: i.imageUrl || null,
    kidAges: Array.isArray(i.kidAges) ? i.kidAges : [],
    tags: Array.isArray(i.tags) ? i.tags : [],
    hue: `linear-gradient(135deg, ${gradientForName(i.name || '')[0]} 0%, ${gradientForName(i.name || '')[1]} 100%)`,
    fetchedAt: fetchedAt || null,
    confidence: scoreConfidence(i),
  };
};
