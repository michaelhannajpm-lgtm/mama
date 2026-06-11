# Source Strategy

Use this reference when choosing source connectors or building the source registry.

## Priority Order

1. Official APIs with stable ids.
2. Official RSS, ICS, JSON, JSON-LD, or sitemap-backed calendars.
3. Public HTML pages from official organizations, parsed politely and cached.
4. Search/discovery APIs that point back to official source URLs.
5. Manual curated source configs for high-value local pages.

Skip sources that require login scraping, browser session replay, private group access, or content copying that violates published terms.

## Source Types

- `google_places`: place discovery, address, geo, phone, website, rating, review count.
- `eventbrite`: public family/kids events, camps, ticket links, organizer metadata.
- `facebook_graph`: public page events through Graph API access only.
- `instagram_graph`: public business/creator media metadata through Graph API access only; use for discovery hints, not event truth.
- `official_calendar`: city, county, school, library, museum, attraction, YMCA, parks, and venue calendars.
- `rss`: local news/event calendars with feeds.
- `ics`: libraries, parks departments, schools, museums, and community calendars.
- `json_ld`: public event pages with schema.org `Event` or `Place`.
- `html_calendar`: last resort for official public pages when no structured feed exists.

## Tampa-Area Starter Sources

Treat this as a starter list, not hardcoded truth. Verify live URLs, terms, feeds, and APIs during implementation.

Official and civic:

- City of Tampa events, parks, recreation, and neighborhood calendars.
- Hillsborough County events, parks, recreation, and family services.
- Tampa-Hillsborough County Public Library events and story times.
- Tampa Downtown Partnership and district event calendars.
- Visit Tampa Bay family and event listings.

Family attractions and museums:

- Glazer Children's Museum events, camps, and daily programs.
- The Florida Aquarium events and camps.
- ZooTampa at Lowry Park events and camps.
- MOSI events and STEM camps.
- Busch Gardens Tampa Bay family events and seasonal programs.
- Tampa Theatre family programming where relevant.

Parks, recreation, sports, and gyms:

- Tampa Parks & Recreation facilities and classes.
- Hillsborough County parks and recreation programs.
- Tampa Metropolitan Area YMCA branches, camps, swim, and youth sports.
- Kids gyms, gymnastics centers, swim schools, trampoline parks, martial arts studios, dance studios, and soccer programs.

Discovery platforms:

- Google Places text/nearby searches for kids activities, children's museums, libraries, playgrounds, indoor play, swim schools, gymnastics, camps, pediatric care, and family-friendly cafes.
- Eventbrite searches for Tampa family, kids, toddler, preschool, parenting, camp, storytime, and museum events.
- Facebook public page events through Graph API for official venue and organization pages.
- Instagram Graph API for official public business pages as a discovery hint only.

Local media and community calendars:

- County/city newspaper calendars.
- Local parenting publications and family event calendars.
- Local business district calendars.
- University, church, and nonprofit calendars only when events are broadly public and family-relevant.

## Source Config Shape

Use config so adding a source does not require changing ingestion control flow:

```js
export const SOURCES = [
  {
    id: 'google-places-tampa-family-fun',
    name: 'Google Places Tampa family fun',
    type: 'google_places',
    city: 'Tampa',
    county: 'Hillsborough',
    enabled: true,
    cadenceHours: 168,
    query: 'kid friendly activities in Tampa FL',
    categories: ['fun'],
    limit: 50,
    parserVersion: 'v1',
  },
  {
    id: 'eventbrite-tampa-family',
    name: 'Eventbrite Tampa family events',
    type: 'eventbrite',
    city: 'Tampa',
    county: 'Hillsborough',
    enabled: true,
    cadenceHours: 24,
    query: 'family kids toddler parenting',
    categories: ['fun', 'camps', 'extracurricular'],
    parserVersion: 'v1',
  },
];
```

## Connector Notes

Google Places:

- Use Places API for discovery/details; do not scrape Google Maps pages.
- Store `place_id` as the source external id.
- Use rating/review count as metadata, not as an endorsement.
- Do not ingest photos unless licensing and API terms are handled.

Eventbrite:

- Use the API when possible.
- Store Eventbrite event id as the source external id.
- Preserve ticket URL in `source_url`.
- If venue is present, try to match/create a place candidate.

Facebook and Instagram:

- Use Graph API only.
- Import public page events from official organization pages when permitted.
- Do not import private group posts, personal posts, comments, attendees, likes, or personal profile data.
- If API access is unavailable, create a disabled source config with notes instead of scraping.

Official calendars:

- Prefer ICS, RSS, JSON-LD, or embedded structured data.
- For HTML calendars, keep parser fixtures because page markup will change.
- Capture canonical URLs and event ids from page links.

Local news:

- Prefer RSS or officially published event feeds.
- Store canonical article/event URL.
- Keep summaries short and factual; avoid copying long descriptions.

## Relevance Heuristics

Include records that match one or more:

- Babies, toddlers, preschool, kids, children, teens, family, parent, mom, caregiver.
- Story time, playgroup, camp, swim lesson, gymnastics, music class, art class, STEM, museum program.
- Playground, splash pad, stroller-friendly, indoor play, child-friendly cafe, children's attraction.

Exclude by default:

- Adult-only nightlife.
- Events without a clear public location or public registration path.
- School events intended only for enrolled families unless user asks for school-specific ingestion.
- Sources that cannot be attributed.

## Scheduling Cadence

- Google Places: weekly or monthly, because places change slowly.
- Eventbrite and official calendars: daily.
- Library events and camps: daily during registration seasons, otherwise every 1-3 days.
- Local news/community calendars: daily if feeds exist; otherwise every 2-3 days.

Use per-source cadence to avoid hammering small local sites.
