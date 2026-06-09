// Per-place website event discovery. Fans out over DB places (Section 10).
// Pure: discoverEventPage + extractPlaceEvents (fixture-tested). Network in fetchRaw.
import * as cheerio from 'cheerio';
import { parseJsonLd } from './json-ld.js';
import { parseIcs } from './ics.js';

const EVENT_HINT = /event|calendar|programs|classes|camps|schedule|things-to-do|whats-on|what's-on/i;

export const discoverEventPage = (html, baseUrl) => {
  if (!html) return null;
  let $;
  try { $ = cheerio.load(html); } catch { return null; }
  let hit = null;
  $('a[href]').each((_, el) => {
    if (hit) return;
    const href = $(el).attr('href') || '';
    const text = $(el).text() || '';
    if (EVENT_HINT.test(href) || EVENT_HINT.test(text)) {
      try { hit = new URL(href, baseUrl).href; } catch { /* skip */ }
    }
  });
  return hit;
};

// Extract events from already-fetched content, tagged with the place. Structured
// data first: JSON-LD, then ICS. `place` provides id/city/area binding.
export const extractPlaceEvents = ({ html = null, ics = null, place }) => {
  const tag = (arr) => arr.map(e => ({
    ...e,
    placeId: place?.id || null,
    placeName: e.placeName || place?.name || null,
    city: place?.city || e.city || 'Tampa, FL',
    area: place?.area || null,
    sourceCategory: 'place_website',
  }));
  if (html) {
    const jl = parseJsonLd(html, { sourceCategory: 'place_website' });
    if (jl.length) return tag(jl);
  }
  if (ics) {
    const ev = parseIcs(ics, { defaultCity: place?.city || 'Tampa, FL', sourceCategory: 'place_website' });
    if (ev.length) return tag(ev);
  }
  return [];
};

const UA = 'GoMamaBot/1.0 (+family events discovery; contact admin)';
const getText = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};

// fetchRaw runs discovery for ONE place. Returns intermediate[] tagged w/ placeId.
export async function fetchRaw({ place, logger = console }) {
  if (!place?.website) return [];
  let home;
  try { home = await getText(place.website); } catch (e) { logger.warn?.(`place-website home ${place.website}: ${e.message}`); return []; }

  // Try JSON-LD on the homepage first.
  const direct = extractPlaceEvents({ html: home, place });
  if (direct.length) return direct;

  // Otherwise discover an events page and extract from it.
  const page = discoverEventPage(home, place.website);
  if (!page) return [];
  try {
    if (/\.ics($|\?)/i.test(page)) {
      const ics = await getText(page);
      return extractPlaceEvents({ ics, place });
    }
    const html = await getText(page);
    return extractPlaceEvents({ html, place });
  } catch (e) { logger.warn?.(`place-website page ${page}: ${e.message}`); return []; }
}
