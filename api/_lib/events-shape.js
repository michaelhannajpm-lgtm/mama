// Reshape flat DB event rows into the client structure the app already uses
// (SUGGESTED_EVENTS), enforcing the place-visibility gate.
const placeVisible = (row) => row.places == null || row.places.visible === true;

const toUi = (row) => ({
  id: row.id,
  slug: row.slug,
  day: row.day_of_week,
  bucket: row.bucket,
  time: row.time_label,
  name: row.name,
  place: row.place_name || row.places?.name || '',
  going: row.going_count || 0,
  recurring: row.recurring || 'Weekly',
  tags: row.tags || [],
  indoor: row.indoor ?? null,
  mi: typeof row.mi === 'number' ? row.mi : 1.0,
  kidAges: row.kid_ages || [],
  hue: row.hue || 'linear-gradient(135deg, #E96B7D 0%, #D9A441 100%)',
  photo: row.hero_photo || row.places?.hero_photo || null,
  kind: row.kind,
  startsAt: row.starts_at || null,
  eventType: row.event_type || null,
});

// All visible rows (place-gated) in UI shape.
export const reshapeEvents = (rows) => (rows || []).filter(placeVisible).map(toUi);

// Split into recurring + upcoming dated within a window.
export const splitEvents = (rows, { now = new Date(), windowDays = 14 } = {}) => {
  const ui = reshapeEvents(rows);
  const horizon = new Date(now.getTime() + windowDays * 86400000);
  const recurring = ui.filter(e => e.kind !== 'dated');
  const thisWeek = ui
    .filter(e => e.kind === 'dated' && e.startsAt && new Date(e.startsAt) >= now && new Date(e.startsAt) <= horizon)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  return { recurring, thisWeek };
};
