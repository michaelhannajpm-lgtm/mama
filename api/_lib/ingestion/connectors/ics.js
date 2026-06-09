// ICS calendar connector via node-ical. parseIcs is pure (fixture-tested);
// fetchRaw GETs the feed honoring ETag/Last-Modified when given.
import ical from 'node-ical';

export const parseIcs = (text, { defaultCity = 'Tampa, FL', sourceCategory = 'official_calendar' } = {}) => {
  if (!text || typeof text !== 'string') return [];
  let data;
  try { data = ical.sync.parseICS(text); } catch { return []; }
  const out = [];
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (!v || v.type !== 'VEVENT' || !v.start) continue;
    out.push({
      name: v.summary || 'Untitled',
      description: v.description || null,
      startsAt: new Date(v.start).toISOString(),
      endsAt: v.end ? new Date(v.end).toISOString() : null,
      placeName: v.location || null,
      city: defaultCity,
      website: v.url || null,
      sourceUrl: v.url || null,
      externalId: v.uid || null,
      sourceCategory,
      recurringText: v.rrule ? 'Recurring' : null,
    });
  }
  return out;
};

export async function fetchRaw({ url, defaultCity = 'Tampa, FL', sourceCategory = 'official_calendar', etag, lastModified, logger = console }) {
  const headers = {};
  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;
  const r = await fetch(url, { headers });
  if (r.status === 304) { logger.info?.(`ics ${url} unchanged (304)`); return []; }
  if (!r.ok) throw new Error(`ics ${r.status}: ${url}`);
  return parseIcs(await r.text(), { defaultCity, sourceCategory });
}
