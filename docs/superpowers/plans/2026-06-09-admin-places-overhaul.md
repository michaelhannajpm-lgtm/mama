# Admin Places Page Overhaul — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Rebuild the admin Places page: (1) a rich detail/edit modal showing **all** fields + full photo gallery (open on thumbnail/name click); (2) a nicer multi-line filter bar — status chips with per-status counts, plus category / origin(ingestion source) / city / area filters; (3) all-field search; (4) client-side pagination with page-size + go-to-page; (5) a **Google Maps** view with clickable markers to edit.

**Decisions:** Google Maps JS API (needs `VITE_GOOGLE_MAPS_API_KEY` — a browser key with Maps JavaScript API enabled). Large rich modal (overlay).

**Data:** `/api/admin/places` returns `*` + `place_photos(...)` + `place_categories(...)`. Place fields incl. name, slug, area, city, category, description, tags[], hero_photo, badge, rating, review_count, lat, lng, visible, aka[], address, website, reference_url, phone, social_links, google_place_id, google_maps_url, hours, business_status, price_level, age_min/max, amenities, good_for[], review_status, source_confidence, origin, generated_from_event_id, timestamps.

---

### Task 1 — Backend: widen editable place fields

`api/admin/places/update.js` — add to the `EDITABLE` set: `city, badge, lat, lng, business_status, price_level`. (`slug` stays read-only — it's the upsert key.) `node --check`; commit.

### Task 2 — Google Maps loader util

Create `src/admin/googleMaps.js`: `loadGoogleMaps()` → returns a promise that injects the Maps JS `<script src=...key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>` once and resolves with `window.google.maps` (caches the promise; rejects with a clear error when the key is missing). `mapsKeyPresent()` helper.

### Task 3 — `PlacesMap.jsx`

Props `{ places, onSelect }`. If no key → a friendly "Set `VITE_GOOGLE_MAPS_API_KEY`" panel. Else: load Maps, render a map div, drop a marker per place with numeric lat/lng, fit bounds to markers, marker click → `onSelect(place)`. Recompute markers when `places` changes. Default center Tampa if no markers.

### Task 4 — Rich `PlaceEditModal` (rewrite, same props `{ place, adminFetch, onClose, onSaved }`)

Wider (~780px), scrollable, sectioned. Keep the existing save (`/api/admin/places/update`) + events panel + hero picker.
- **Photo gallery:** all `place_photos` as thumbnails; click → lightbox (full-size overlay). Each has a "set hero" star. Show source/attribution.
- **Sections (editable where in EDITABLE; else read-only):**
  - *Basics:* name, category(select), badge, description(textarea), tags(csv), good_for(csv), age_min/age_max(number).
  - *Status & provenance:* review_status(select), visible(checkbox), origin(read-only), source_confidence(read-only), google_place_id(read-only), created_at/updated_at/last_seen_at(read-only). "From event" link when origin='event'.
  - *Location:* address, area, city, lat, lng (editable numbers), google_maps_url(link). A small static map thumbnail or "open in Google Maps" link.
  - *Contact:* phone, website, reference_url, social_links(read-only json).
  - *Ratings & status:* rating(number), review_count(read-only), price_level(select 0–4), business_status(text).
  - *Hours & amenities:* hours(read-only formatted json), amenities(checkbox grid for known keys: parking, restrooms, stroller_friendly, nursing_room, food, indoor, outdoor).
- Build the patch from editable fields only; numbers coerced; tags/good_for split CSV. `C` tokens; coral Save.

### Task 5 — `PlacesManager.jsx` rewrite

- **View toggle:** Grid | Map (lucide `List`/`Map`).
- **Filter bar (multi-line):**
  - Row 1 — status chips with counts: `All (n)`, `needs_review (n)`, `approved (n)`, `rejected (n)`, `archived (n)`. Counts computed over rows matching all OTHER active filters.
  - Row 2 — category(select), origin chips (all/curated/google/event — labelled "Source"), city(select, distinct), area(select, distinct), has-photo(checkbox), min-rating(select), and an all-field search box.
- **All-field search:** match the query (lowercased, includes) against a built string of name, slug, area, city, address, phone, description, category, badge, website, tags, good_for, aka.
- **Bulk bar:** keep approve/reject/merge.
- **Grid view:** rows; clicking the **thumbnail or the name** opens the rich modal (keep the row action buttons). Add the per-row quick actions as today.
- **Pagination (grid only):** page-size select [10,25,50,100] (default 25), prev/next/first/last, current page indicator, go-to-page number input. Reset to page 1 when filters change.
- **Map view:** `<PlacesMap places={filtered} onSelect={setEditing} />` (all filtered places, no pagination).
- `npm run build`; commit.

### Task 6 — Verify

`npm run build` + `npm test` green. Confirm: filters narrow + counts update; search hits address/phone/tags; pagination + page-size + go-to-page work; clicking name/thumbnail opens the rich modal with all fields + gallery lightbox; map shows the key-missing panel (until `VITE_GOOGLE_MAPS_API_KEY` set), then markers + click-to-edit once set.

## Note
- `VITE_GOOGLE_MAPS_API_KEY` must be a browser key with the **Maps JavaScript API** enabled (ideally HTTP-referrer-restricted). The map view shows a setup prompt until it's set; everything else works without it.
- "Ingestion source" filter = `origin` (curated / google / event), the per-place provenance marker.
