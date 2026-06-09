// JSON-LD (schema.org Event) connector via cheerio. parseJsonLd is pure
// (fixture-tested); fetchRaw fetches a page's HTML.
import * as cheerio from 'cheerio';

const cityState = (addr) => {
  const c = addr?.addressLocality, r = addr?.addressRegion;
  return c && r ? `${c}, ${r}` : (c || null);
};

const collectEvents = (node, acc) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, acc)); return; }
  if (Array.isArray(node['@graph'])) collectEvents(node['@graph'], acc);
  const t = node['@type'];
  const isEvent = t === 'Event' || (Array.isArray(t) && t.includes('Event')) || /Event$/.test(String(t || ''));
  if (isEvent && node.name && node.startDate) acc.push(node);
};

export const parseJsonLd = (html, { sourceCategory = 'json_ld' } = {}) => {
  if (!html || typeof html !== 'string') return [];
  let $;
  try { $ = cheerio.load(html); } catch { return []; }
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    try { collectEvents(JSON.parse(txt), nodes); } catch { /* skip malformed */ }
  });
  return nodes.map(n => {
    const loc = Array.isArray(n.location) ? n.location[0] : n.location;
    return {
      name: n.name,
      description: typeof n.description === 'string' ? n.description : null,
      startsAt: n.startDate ? new Date(n.startDate).toISOString() : null,
      endsAt: n.endDate ? new Date(n.endDate).toISOString() : null,
      placeName: loc?.name || null,
      address: loc?.address?.streetAddress || null,
      lat: loc?.geo?.latitude != null ? Number(loc.geo.latitude) : null,
      lng: loc?.geo?.longitude != null ? Number(loc.geo.longitude) : null,
      city: cityState(loc?.address) || 'Tampa, FL',
      website: typeof n.url === 'string' ? n.url : null,
      sourceUrl: typeof n.url === 'string' ? n.url : null,
      externalId: typeof n.url === 'string' ? n.url : (n.name || null),
      sourceCategory,
    };
  });
};

export async function fetchRaw({ url, sourceCategory = 'json_ld', logger = console }) {
  const r = await fetch(url, { headers: { 'User-Agent': 'GoMamaBot/1.0 (+family events; contact admin)' } });
  if (!r.ok) throw new Error(`json-ld ${r.status}: ${url}`);
  return parseJsonLd(await r.text(), { sourceCategory });
}
