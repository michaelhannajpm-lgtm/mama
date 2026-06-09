// Facebook Graph public-page events connector. BUILT but the source is disabled
// (no META_GRAPH_TOKEN yet). parseGraphEvents is pure (fixture-tested).
const cityState = (loc) => {
  const c = loc?.city, r = loc?.state;
  return c && r ? `${c}, ${r}` : (c || null);
};

export const parseGraphEvents = (body) => {
  const data = body && Array.isArray(body.data) ? body.data : [];
  return data.map(ev => ({
    name: ev.name || 'Untitled',
    description: ev.description || null,
    startsAt: ev.start_time ? new Date(ev.start_time).toISOString() : null,
    endsAt: ev.end_time ? new Date(ev.end_time).toISOString() : null,
    placeName: ev.place?.name || null,
    lat: ev.place?.location?.latitude ?? null,
    lng: ev.place?.location?.longitude ?? null,
    city: cityState(ev.place?.location) || 'Tampa, FL',
    sourceUrl: ev.id ? `https://facebook.com/events/${ev.id}` : null,
    externalId: ev.id ? String(ev.id) : null,
    sourceCategory: 'facebook',
  }));
};

export async function fetchRaw({ pageId, token, logger = console }) {
  if (!token) throw new Error('META_GRAPH_TOKEN not set — facebook_graph source is disabled');
  const url = `https://graph.facebook.com/v19.0/${pageId}/events?fields=name,description,start_time,end_time,place&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`facebook-graph ${r.status}`);
  return parseGraphEvents(await r.json());
}
