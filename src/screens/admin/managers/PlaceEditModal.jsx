import { useState } from 'react';
import { C } from '../../../theme';
import { X, Star, ExternalLink } from 'lucide-react';
import { StatusBadge, VisibilityBadge } from './AdminFilters';
import { MOM_TYPES, KID_AGES } from '../../../data/taxonomy';
import { VALUE_LABELS, ACTIVITY_LABELS } from '../../../data/matching-vocab';

const CATS = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];
const REVIEW_STATUSES = ['needs_review','approved','rejected','archived'];
const PRICE_LEVELS = [
  ['', '—'], ['0', '0 · Free'], ['1', '1 · $'], ['2', '2 · $$'], ['3', '3 · $$$'], ['4', '4 · $$$$'],
];
const AMENITY_KEYS = ['parking','restrooms','stroller_friendly','nursing_room','food','indoor','outdoor'];
const AMENITY_LABELS = {
  parking: 'Parking', restrooms: 'Restrooms', stroller_friendly: 'Stroller friendly',
  nursing_room: 'Nursing room', food: 'Food', indoor: 'Indoor', outdoor: 'Outdoor',
};

// Chip multi-select. Used for the matching-metadata fields (kid age ranges,
// values, interests, mom-type fit, neighborhoods). Visual matches the phone
// app's selection language (rounded pills) but stays in console palette.
const ChipPicker = ({ options, selected, onChange }) => {
  const set = new Set(selected || []);
  const toggle = (v) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); onChange([...n]); };
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const on = set.has(id);
        return (
          <button key={id} type="button" onClick={() => toggle(id)}
            style={{
              padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
              background: on ? C.terracotta : C.paper,
              color: on ? '#fff' : C.ink,
              border: `1px solid ${on ? C.terracotta : C.divider}`,
              fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
            }}>{label}</button>
        );
      })}
    </div>
  );
};

// ── style helpers ──────────────────────────────────────────────────────────
const sectionHeader = { fontFamily: 'Fraunces', fontSize: 14, color: C.ink, margin: '18px 0 8px' };
const labelStyle = { fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft };
const inputStyle = { width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: 'Albert Sans', boxSizing: 'border-box' };
const roLabel = { fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted };
const roValue = { fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft, wordBreak: 'break-word' };

const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleString(); } catch { return String(v); } };
const pretty = (v) => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } };

export const PlaceEditModal = ({ place, adminFetch, onClose, onSaved }) => {
  // `place.__new` is the manager's signal to open this modal in "create new"
  // mode — everything starts blank, save POSTs `{ create: { … } }`, and the
  // events / provenance panels at the bottom are hidden.
  const isNew = !!place.__new;

  const initAmenities = () => {
    const src = (place.amenities && typeof place.amenities === 'object') ? place.amenities : {};
    const out = {};
    for (const k of AMENITY_KEYS) out[k] = !!src[k];
    return out;
  };

  const [form, setForm] = useState({
    name: place.name || '',
    slug: place.slug || '',
    category: place.category || 'fun',
    badge: place.badge || '',
    description: place.description || '',
    tags: (place.tags || []).join(', '),
    good_for: (place.good_for || []).join(', '),
    age_min: place.age_min ?? '',
    age_max: place.age_max ?? '',
    address: place.address || '',
    area: place.area || '',
    city: place.city || 'Tampa',
    lat: place.lat ?? '',
    lng: place.lng ?? '',
    phone: place.phone || '',
    website: place.website || '',
    reference_url: place.reference_url || '',
    rating: place.rating ?? '',
    price_level: place.price_level == null ? '' : String(place.price_level),
    business_status: place.business_status || '',
    review_status: place.review_status || 'needs_review',
    visible: !!place.visible,
    is_featured: !!place.is_featured,
    top_rank: place.top_rank == null ? '' : String(place.top_rank),
    amenities: initAmenities(),
    // Matching-algorithm metadata
    kid_age_ranges: place.kid_age_ranges || [],
    value_tags: place.value_tags || [],
    interest_tags: place.interest_tags || [],
    mom_type_fit: place.mom_type_fit || [],
    neighborhoods: (place.neighborhoods || []).join(', '),
  });
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [placeEvents, setPlaceEvents] = useState(null);
  const [scraping, setScraping] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAmenity = (k, v) => setForm(f => ({ ...f, amenities: { ...f.amenities, [k]: v } }));

  // ── events panel (preserved verbatim) ─────────────────────────────────────
  const loadPlaceEvents = async () => {
    try {
      const r = await adminFetch('/api/admin/events');
      const body = await r.json().catch(() => ({}));
      setPlaceEvents((body.rows || []).filter(e => e.place_id === place.id));
    } catch { setPlaceEvents([]); }
  };

  const scrapeEvents = async () => {
    setScraping(true);
    try {
      const r = await adminFetch('/api/admin/places/ingest-events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: place.id }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || r.status);
      alert(`Scrape done: created=${body.counts?.created ?? 0}, updated=${body.counts?.updated ?? 0}, errors=${body.counts?.errors ?? 0}`);
      await loadPlaceEvents();
    } catch (e) { alert(`Scrape failed: ${e.message}`); }
    finally { setScraping(false); }
  };

  const publishPlaceEvents = async () => {
    try {
      const r = await adminFetch('/api/admin/events/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id, patch: { review_status: 'approved', visible: true } }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      await loadPlaceEvents();
    } catch (e) { alert(`Publish failed: ${e.message}`); }
  };

  // ── save / hero (preserved behavior) ──────────────────────────────────────
  const post = async (payload, label) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/places/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      return true;
    } catch (e) { alert(`${label} failed: ${e.message}`); return false; }
    finally { setBusy(false); }
  };

  const num = (v) => { const s = String(v).trim(); if (s === '') return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
  const csv = (v) => v.split(',').map(t => t.trim()).filter(Boolean);

  const save = async () => {
    const patch = {
      name: form.name,
      category: form.category,
      badge: form.badge || null,
      description: form.description || null,
      tags: csv(form.tags),
      good_for: csv(form.good_for),
      age_min: num(form.age_min),
      age_max: num(form.age_max),
      address: form.address || null,
      area: form.area || null,
      city: form.city || null,
      lat: num(form.lat),
      lng: num(form.lng),
      phone: form.phone || null,
      website: form.website || null,
      reference_url: form.reference_url || null,
      rating: num(form.rating),
      price_level: num(form.price_level),
      business_status: form.business_status || null,
      review_status: form.review_status,
      visible: form.visible,
      is_featured: form.is_featured,
      top_rank: form.is_featured ? num(form.top_rank) : null,
      amenities: AMENITY_KEYS.reduce((o, k) => { o[k] = !!form.amenities[k]; return o; }, {}),
      kid_age_ranges: form.kid_age_ranges,
      value_tags: form.value_tags,
      interest_tags: form.interest_tags,
      mom_type_fit: form.mom_type_fit,
      neighborhoods: csv(form.neighborhoods),
    };
    if (isNew) {
      if (!patch.name) { alert('Name is required'); return; }
      if (form.slug) patch.slug = form.slug;
      if (await post({ create: patch }, 'Create')) await onSaved();
    } else {
      if (await post({ id: place.id, patch }, 'Save')) await onSaved();
    }
  };

  const setHero = async (url) => { if (await post({ id: place.id, patch: { hero_photo: url } }, 'Set hero')) await onSaved(); };

  const photos = place.place_photos || [];
  const mapsUrl = place.google_maps_url || ((place.lat != null && place.lng != null) ? `https://maps.google.com/?q=${place.lat},${place.lng}` : null);
  const isFromEvent = place.origin === 'event';

  // ── reusable field renderers ──────────────────────────────────────────────
  const Text = (k, label, type = 'text', extra = {}) => (
    <label style={labelStyle}>{label}
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} style={inputStyle} {...extra} />
    </label>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 780, maxWidth: '100%', maxHeight: '92vh', overflow: 'auto', padding: 24 }}>

        {/* 1. Header */}
        <div className="flex items-center mb-1" style={{ gap: 10 }}>
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, color: C.ink, flex: 1, margin: 0 }}>
            {isNew ? 'New place' : (place.name || 'Place')}
          </h3>
          {isFromEvent && (
            <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: C.sageDark, background: C.sage, borderRadius: 999, padding: '3px 10px' }}>From event</span>
          )}
          {isNew && (
            <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: C.terracotta, background: `${C.terracotta}15`, borderRadius: 999, padding: '3px 10px' }}>Create</span>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Status pills — reflect the live form selections below */}
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={form.review_status} />
          <VisibilityBadge visible={form.visible} />
        </div>

        {/* 2. Photo gallery (only shown for existing places) */}
        {!isNew && (
        <>
        <div style={sectionHeader}>Photos</div>
        {photos.length === 0 ? (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted }}>No photos</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {photos.map(p => {
              const stored = p.blob_url || p.url || null;
              const heroRef = stored || (p.google_ref ? `/api/places/photo?ref=${encodeURIComponent(p.google_ref)}` : null);
              const thumb = stored || (heroRef ? `${heroRef}&w=240` : null);
              const full = heroRef; // proxy without &w = full size; blob/url served as-is
              const isHero = place.hero_photo ? place.hero_photo === heroRef : p.is_hero;
              const attribution = p.attribution || p.source || p.author || null;
              return (
                <div key={p.id} style={{ width: 130 }}>
                  <div
                    onClick={() => full && setLightbox(full)}
                    title="Click to enlarge"
                    style={{ position: 'relative', width: 130, height: 96, borderRadius: 8, overflow: 'hidden', border: `2px solid ${isHero ? C.saffron : C.divider}`, background: thumb ? `center/cover url(${thumb})` : C.lilac, cursor: full ? 'zoom-in' : 'default' }}>
                    {isHero && <Star size={14} fill={C.saffron} color={C.saffron} style={{ position: 'absolute', top: 4, right: 4 }} />}
                  </div>
                  <button
                    onClick={() => heroRef && setHero(heroRef)}
                    disabled={!heroRef || isHero}
                    style={{ marginTop: 4, width: '100%', background: isHero ? C.saffron : 'transparent', color: isHero ? C.ink : C.inkSoft, border: `1px solid ${isHero ? C.saffron : C.divider}`, borderRadius: 6, padding: '3px 6px', fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, cursor: heroRef && !isHero ? 'pointer' : 'default' }}>
                    {isHero ? '★ Hero' : '★ Set hero'}
                  </button>
                  {attribution && (
                    <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, color: C.inkMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(attribution)}>{attribution}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        </>
        )}

        {/* 3. Basics */}
        <div style={sectionHeader}>Basics</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('name', 'Name')}
          <label style={labelStyle}>Category
            <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {Text('badge', 'Badge')}
          {Text('age_min', 'Age min', 'number')}
          {Text('age_max', 'Age max', 'number')}
          {isNew && Text('slug', 'Slug (auto from name if blank)')}
        </div>
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>Description
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={inputStyle} />
        </label>
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>Tags (comma-separated)
          <input value={form.tags} onChange={e => set('tags', e.target.value)} style={inputStyle} />
        </label>
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>Good for (comma-separated)
          <input value={form.good_for} onChange={e => set('good_for', e.target.value)} style={inputStyle} />
        </label>

        {/* 3b. Matching metadata — aligned with the same taxonomies the mom
            profile uses, so place ↔ mom matching can score on shared signals. */}
        <div style={sectionHeader}>Matching metadata</div>
        <div style={{ ...labelStyle, marginBottom: 4 }}>Kid age ranges that fit</div>
        <ChipPicker options={KID_AGES} selected={form.kid_age_ranges} onChange={(v) => set('kid_age_ranges', v)} />
        <div style={{ ...labelStyle, marginTop: 10, marginBottom: 4 }}>Family values it suits</div>
        <ChipPicker options={VALUE_LABELS} selected={form.value_tags} onChange={(v) => set('value_tags', v)} />
        <div style={{ ...labelStyle, marginTop: 10, marginBottom: 4 }}>Interests it satisfies</div>
        <ChipPicker options={ACTIVITY_LABELS} selected={form.interest_tags} onChange={(v) => set('interest_tags', v)} />
        <div style={{ ...labelStyle, marginTop: 10, marginBottom: 4 }}>Best for mom types</div>
        <ChipPicker
          options={MOM_TYPES.filter((t) => t.id !== 'prefer_not').map((t) => ({ id: t.id, label: t.label }))}
          selected={form.mom_type_fit}
          onChange={(v) => set('mom_type_fit', v)}
        />
        <label style={{ ...labelStyle, display: 'block', marginTop: 10 }}>Additional neighborhoods served (comma-separated)
          <input value={form.neighborhoods} onChange={e => set('neighborhoods', e.target.value)} style={inputStyle} />
        </label>

        {/* 4. Location */}
        <div style={sectionHeader}>Location</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('address', 'Address')}
          {Text('area', 'Area')}
          {Text('city', 'City')}
          {Text('lat', 'Latitude', 'number', { step: 'any' })}
          {Text('lng', 'Longitude', 'number', { step: 'any' })}
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.terracotta, textDecoration: 'none' }}>
            View on Google Maps <ExternalLink size={12} />
          </a>
        )}

        {/* 5. Contact */}
        <div style={sectionHeader}>Contact</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('phone', 'Phone')}
          {Text('website', 'Website')}
          {Text('reference_url', 'Reference URL')}
        </div>
        {place.social_links != null && (
          <div style={{ marginTop: 8 }}>
            <div style={roLabel}>social_links</div>
            <pre style={{ ...roValue, background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 8, padding: 8, margin: '2px 0 0', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>{pretty(place.social_links)}</pre>
          </div>
        )}

        {/* 6. Ratings & status */}
        <div style={sectionHeader}>Ratings &amp; status</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('rating', 'Rating', 'number', { step: '0.1' })}
          <div>
            <div style={roLabel}>Review count</div>
            <div style={{ ...roValue, paddingTop: 6 }}>{place.review_count ?? '—'}</div>
          </div>
          <label style={labelStyle}>Price level
            <select value={form.price_level} onChange={e => set('price_level', e.target.value)} style={inputStyle}>
              {PRICE_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {Text('business_status', 'Business status')}
          <label style={labelStyle}>Review status
            <select value={form.review_status} onChange={e => set('review_status', e.target.value)} style={inputStyle}>
              {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 18 }}>
            <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)} /> visible in app
          </label>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 18 }}>
            <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} /> ⭐ Feature as top place
          </label>
          {form.is_featured && (
            <label style={labelStyle}>Top rank (lower = higher)
              <input type="number" min={1} value={form.top_rank} onChange={e => set('top_rank', e.target.value)} placeholder="e.g. 1" style={inputStyle} />
            </label>
          )}
        </div>

        {/* 7. Amenities */}
        <div style={sectionHeader}>Amenities</div>
        <div className="grid grid-cols-4 gap-2">
          {AMENITY_KEYS.map(k => (
            <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={!!form.amenities[k]} onChange={e => setAmenity(k, e.target.checked)} /> {AMENITY_LABELS[k]}
            </label>
          ))}
        </div>

        {/* 8. Hours (read-only) */}
        {place.hours != null && (
          <>
            <div style={sectionHeader}>Hours</div>
            <pre style={{ ...roValue, background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 8, padding: 8, margin: 0, whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{pretty(place.hours)}</pre>
          </>
        )}

        {/* 9. Provenance (read-only — hidden in create mode, no row to read) */}
        {!isNew && (
        <>
        <div style={sectionHeader}>Provenance</div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          {[
            ['Origin', place.origin],
            ['Source confidence', place.source_confidence],
            ['Slug', place.slug],
            ['Google place id', place.google_place_id],
            ['Generated from event', place.generated_from_event_id],
            ['Created', fmtDate(place.created_at)],
            ['Updated', fmtDate(place.updated_at)],
            ['Last seen', fmtDate(place.last_seen_at)],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={roLabel}>{l}</div>
              <div style={roValue}>{v == null || v === '' ? '—' : String(v)}</div>
            </div>
          ))}
          {place.google_maps_url && (
            <div>
              <div style={roLabel}>Google maps url</div>
              <a href={place.google_maps_url} target="_blank" rel="noreferrer" style={{ ...roValue, color: C.terracotta, textDecoration: 'underline' }}>link</a>
            </div>
          )}
        </div>
        </>
        )}

        {/* 10. Save */}
        <div className="flex mt-4">
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.terracotta, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? (isNew ? 'Creating…' : 'Saving…') : (isNew ? 'Create place' : 'Save')}
          </button>
        </div>

        {/* 11. Events at this place (preserved, hidden in create mode) */}
        {!isNew && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${C.divider}`, paddingTop: 14 }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontFamily: 'Fraunces', fontSize: 15, color: C.ink, flex: 1 }}>Events at this place</span>
            {placeEvents === null
              ? <button onClick={loadPlaceEvents} style={{ background: 'transparent', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 12, cursor: 'pointer', color: C.inkSoft }}>Load events</button>
              : <button onClick={publishPlaceEvents} style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Publish all approved</button>}
            <button disabled={scraping || !place.website} title={place.website ? 'Scrape this place\'s website for events' : 'No website set'}
              onClick={scrapeEvents}
              style={{ background: place.website ? C.saffron : C.divider, color: C.ink, border: 'none', borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: place.website ? 'pointer' : 'not-allowed' }}>
              {scraping ? 'Scraping…' : 'Scrape events'}
            </button>
          </div>
          {placeEvents && placeEvents.length === 0 && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted }}>No events linked to this place yet.</div>
          )}
          {placeEvents && placeEvents.map(e => (
            <div key={e.id} className="flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${C.divider}` }}>
              <div className="flex-1 min-w-0" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.name} <span style={{ color: C.inkMuted }}>· {e.event_type} · {e.day_of_week || ''} {e.time_label || ''} · {e.review_status}</span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
          style={{ position: 'fixed', inset: 0, background: '#000d', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24 }}>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: '#fff2', borderRadius: 999, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <X size={22} />
          </button>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 10, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
};
