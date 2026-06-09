// Eventbrite public search connector. parseEventbrite is pure (fixture-tested);
// fetchRaw paginates with bounded retry/backoff and a field expansion for venue.
const cityState = (addr) => {
  const c = addr?.city, r = addr?.region;
  return c && r ? `${c}, ${r}` : (c || null);
};
const num = (v) => (v == null || v === '' ? null : Number(v));

export const parseEventbrite = (body) => {
  const events = body && Array.isArray(body.events) ? body.events : [];
  return events.map(ev => {
    const a = ev.venue?.address;
    return {
      name: ev.name?.text || 'Untitled',
      description: ev.description?.text || null,
      startsAt: ev.start?.utc || null,
      endsAt: ev.end?.utc || null,
      timezone: ev.start?.timezone || 'America/New_York',
      placeName: ev.venue?.name || null,
      address: a?.localized_address_display || null,
      lat: num(a?.latitude),
      lng: num(a?.longitude),
      city: cityState(a) || 'Tampa, FL',
      website: ev.url || null,
      sourceUrl: ev.url || null,
      externalId: String(ev.id),
      sourceCategory: 'eventbrite',
      priceSummary: ev.is_free ? 'Free' : (ev.is_free === false ? 'Paid' : null),
      imageUrl: ev.logo?.original?.url || ev.logo?.url || null,
    };
  });
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const EB = 'https://www.eventbriteapi.com/v3';

async function ebGet(url, token, logger) {
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && attempt <= 3) {
      const wait = Number(r.headers.get('Retry-After')) * 1000 || attempt * 1000;
      logger.warn?.(`eventbrite ${r.status}, retry ${attempt} in ${wait}ms`); await sleep(wait); continue;
    }
    const t = await r.text().catch(() => ''); throw new Error(`eventbrite ${r.status}: ${t.slice(0, 200)}`);
  }
}

// Personal-account events: list the user's organizations, then each org's events.
// (Eventbrite removed public keyword search; org events are not keyword-filtered —
// relevance filtering happens downstream/admin.)
export async function fetchRaw({ since, limit = 50, token, logger = console }) {
  const orgsBody = await ebGet(`${EB}/users/me/organizations/`, token, logger);
  const orgs = Array.isArray(orgsBody?.organizations) ? orgsBody.organizations : [];
  const out = [];
  for (const org of orgs) {
    let page = 1;
    while (out.length < limit) {
      const params = new URLSearchParams({
        expand: 'venue,logo', status: 'live,started,ended,completed', order_by: 'start_asc', page: String(page),
      });
      if (since) params.set('start_date.range_start', new Date(since).toISOString().slice(0, 19) + 'Z');
      const body = await ebGet(`${EB}/organizations/${org.id}/events/?${params}`, token, logger);
      out.push(...parseEventbrite(body));
      if (!body?.pagination || page >= body.pagination.page_count) break;
      page++;
    }
  }
  return out.slice(0, limit);
}
