import { useState, useMemo } from 'react';
import { AC } from '../admin-theme';
import { X, ExternalLink } from 'lucide-react';
import { BusyOverlay } from '../components/primitives';
import { StatusBadge, VisibilityBadge } from './AdminFilters';
import { AiWriteButton } from '../components/AiWriteButton.jsx';
import { AiImageControl } from '../components/AiImageControl.jsx';
import { AiReviewButton } from '../components/AiReviewButton.jsx';
import { CopyLinkButton } from '../components/CopyLinkButton';
import { MOM_TYPES, KID_AGES } from '../../../data/taxonomy';
import { VALUE_LABELS, ACTIVITY_LABELS } from '../../../data/matching-vocab';

// Same chip multi-select used in PlaceEditModal — kept inline so the two
// modals stay independently editable. If a third surface needs it, lift to
// AdminFilters.
const ChipPicker = ({ options, selected, onChange, accent = AC.success }) => {
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
              background: on ? accent : AC.surface,
              color: on ? '#fff' : AC.text,
              border: `1px solid ${on ? accent : AC.border}`,
              fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
            }}>{label}</button>
        );
      })}
    </div>
  );
};

const TYPES = [
  'storytime','class','workshop','stem','art-class','music-class','dance-class','cooking-class',
  'language-class','tutoring','sports-event','swim','gymnastics','martial-arts','kids-fitness',
  'family-yoga','camp','break-camp','playgroup','open-play','parent-meetup','support-group',
  'performance','movie','concert','museum-program','library-program','animal-encounter','festival',
  'fair','seasonal','farmers-market','community-event','outdoor-adventure','prenatal-class',
  'new-parent','parenting-class','breastfeeding','sensory-friendly','special-needs','fundraiser',
  'religious','other',
];
const KINDS = ['dated', 'recurring'];
const REVIEW_STATUSES = ['needs_review', 'approved', 'rejected', 'archived'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BUCKETS = ['morning', 'noon', 'afternoon', 'night-owl'];
const INDOOR_OPTS = [['', '—'], ['true', 'Indoor'], ['false', 'Outdoor']];

// ── style helpers (mirrors PlaceEditModal) ───────────────────────────────────
const sectionHeader = { fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: AC.text, margin: '18px 0 8px' };
const labelStyle = { fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft };
const inputStyle = { width: '100%', border: `1px solid ${AC.border}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: 'Albert Sans', boxSizing: 'border-box' };
const roLabel = { fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted };
const roValue = { fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textSoft, wordBreak: 'break-word' };

const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleString(); } catch { return String(v); } };
const dtLocal = (v) => { if (!v) return ''; try { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; const off = d.getTimezoneOffset(); return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16); } catch { return ''; } };

export const EventEditModal = ({ event, places = [], adminFetch, onClose, onSaved }) => {
  // `event.__new` → modal opens in create mode (blank form, POST `{ create }`,
  // no provenance/audit panels). Mirrors PlaceEditModal's pattern.
  const isNew = !!event.__new;

  const [form, setForm] = useState({
    name: event.name || '',
    event_type: event.event_type || 'class',
    kind: event.kind || 'dated',
    description: event.description || '',
    place_id: event.place_id || '',
    place_name: event.place_name || '',
    area: event.area || '',
    city: event.city || 'Tampa',
    lat: event.lat ?? '',
    lng: event.lng ?? '',
    address: event.address || '',
    starts_at: dtLocal(event.starts_at),
    ends_at: dtLocal(event.ends_at),
    day_of_week: event.day_of_week || '',
    bucket: event.bucket || '',
    time_label: event.time_label || '',
    recurring: event.recurring || '',
    website: event.website || '',
    source_url: event.source_url || '',
    tags: (event.tags || []).join(', '),
    kid_ages: (event.kid_ages || []).join(', '),
    indoor: event.indoor == null ? '' : String(!!event.indoor),
    age_min: event.age_min ?? '',
    age_max: event.age_max ?? '',
    price_summary: event.price_summary || '',
    hue: event.hue || '',
    going_count: event.going_count ?? '',
    review_status: event.review_status || 'needs_review',
    visible: !!event.visible,
    // Matching metadata (parallel to PlaceEditModal)
    kid_age_ranges: event.kid_age_ranges || [],
    value_tags: event.value_tags || [],
    interest_tags: event.interest_tags || [],
    mom_type_fit: event.mom_type_fit || [],
    neighborhoods: (event.neighborhoods || []).join(', '),
    hero_photo: event.hero_photo || '',
  });
  const [placeQuery, setPlaceQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Google Places lookup → populates the event's lat / lng / address.
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoConfigured, setGeoConfigured] = useState(true);

  const searchGooglePlaces = async () => {
    const q = geoQuery.trim();
    if (!q) return;
    setGeoSearching(true); setGeoResults([]);
    try {
      const r = await adminFetch('/api/admin/places/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, city: form.city || 'Tampa, FL' }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || r.status);
      setGeoConfigured(j.configured !== false);
      setGeoResults(j.results || []);
    } catch (e) { alert(`Place search failed: ${e.message}`); }
    finally { setGeoSearching(false); }
  };

  // Apply a Google result: always set coordinates + address; fill place_name /
  // city only when blank so we don't clobber an admin's existing values.
  const applyGeo = (p) => {
    setForm(f => ({
      ...f,
      lat: p.lat ?? '',
      lng: p.lng ?? '',
      address: p.address || '',
      place_name: f.place_name || p.name || '',
    }));
    setGeoResults([]); setGeoQuery('');
  };

  const clearGeo = () => setForm(f => ({ ...f, lat: '', lng: '', address: '' }));

  const placeMatches = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();
    if (!q) return [];
    return (places || []).filter(p => `${p.name} ${p.area || ''}`.toLowerCase().includes(q)).slice(0, 6);
  }, [placeQuery, places]);

  const post = async (payload, label) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/events/update', {
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
      event_type: form.event_type,
      kind: form.kind,
      description: form.description || null,
      place_id: form.place_id || null,
      place_name: form.place_name || null,
      area: form.area || null,
      city: form.city || null,
      lat: num(form.lat),
      lng: num(form.lng),
      address: form.address || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      day_of_week: form.day_of_week || null,
      bucket: form.bucket || null,
      time_label: form.time_label || null,
      recurring: form.recurring || null,
      website: form.website || null,
      source_url: form.source_url || null,
      tags: csv(form.tags),
      kid_ages: csv(form.kid_ages),
      indoor: form.indoor === '' ? null : form.indoor === 'true',
      age_min: num(form.age_min),
      age_max: num(form.age_max),
      price_summary: form.price_summary || null,
      hue: form.hue || null,
      going_count: num(form.going_count),
      review_status: form.review_status,
      visible: form.visible,
      kid_age_ranges: form.kid_age_ranges,
      value_tags: form.value_tags,
      interest_tags: form.interest_tags,
      mom_type_fit: form.mom_type_fit,
      neighborhoods: csv(form.neighborhoods),
      hero_photo: form.hero_photo || null,
    };
    if (isNew) {
      if (!patch.name) { alert('Name is required'); return; }
      if (await post({ create: patch }, 'Create')) await onSaved();
    } else {
      if (await post({ id: event.id, patch }, 'Save')) await onSaved();
    }
  };

  // ── reusable field renderer ────────────────────────────────────────────────
  const Text = (k, label, type = 'text', extra = {}) => (
    <label style={labelStyle}>{label}
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} style={inputStyle} {...extra} />
    </label>
  );

  const place = event.places || null;
  const mapsUrl = (place && place.lat != null && place.lng != null) ? `https://maps.google.com/?q=${place.lat},${place.lng}` : null;
  const categoryIds = (event.event_categories || []).map(c => c.category_id ?? c).filter(Boolean);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: AC.surface, borderRadius: 16, width: 780, maxWidth: '100%', maxHeight: '92vh', overflow: 'auto', padding: 24 }}>
        <BusyOverlay show={busy} label="Saving…" radius={16} />

        {/* 1. Header */}
        <div className="flex items-center mb-1" style={{ gap: 10 }}>
          <h3 style={{ fontFamily: 'Albert Sans', fontSize: 18, fontWeight: 700, color: AC.text, flex: 1, margin: 0, letterSpacing: '-.01em' }}>
            {isNew ? 'New event' : (event.name || 'Event')}
          </h3>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: AC.success, background: AC.successSoft, borderRadius: 999, padding: '3px 10px' }}>{form.kind}</span>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: AC.textSoft, background: AC.neutralSoft, borderRadius: 999, padding: '3px 10px' }}>{form.event_type}</span>
          {isNew && (
            <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: AC.accent, background: `color-mix(in srgb, ${AC.accent} 8%, transparent)`, borderRadius: 999, padding: '3px 10px' }}>Create</span>
          )}
          {!event.__new && event.id && <CopyLinkButton section="events" id={event.id} />}
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Status pills — reflect the live form selections below */}
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={form.review_status} />
          <VisibilityBadge visible={form.visible} />
        </div>

        {/* Status — placed above the image so review state is set first */}
        <div style={sectionHeader}>Status</div>
        <div className="grid grid-cols-3 gap-2">
          <label style={labelStyle}>Review status
            <select value={form.review_status} onChange={e => set('review_status', e.target.value)} style={inputStyle}>
              {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 18 }}>
            <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)} /> visible in app
          </label>
        </div>

        {/* 2. Image */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...sectionHeader }}>
          Image
          <AiImageControl kind="event" record={form} onImage={(url) => setForm(f => ({ ...f, hero_photo: url }))} />
        </div>
        {form.hero_photo ? (
          <div>
            <div
              onClick={() => setLightbox(form.hero_photo)}
              title="Click to enlarge"
              style={{ width: 220, height: 150, borderRadius: 8, overflow: 'hidden', border: `2px solid ${AC.border}`, background: `center/cover url(${form.hero_photo})`, cursor: 'zoom-in' }}
            />
            {event.image_source_url && (
              <a href={event.image_source_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted, textDecoration: 'none' }}>
                source <ExternalLink size={11} />
              </a>
            )}
          </div>
        ) : (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted }}>No image</div>
        )}

        {/* AI assist — record-level review across all fields */}
        <div style={{ marginBottom: 12, marginTop: 12 }}>
          <AiReviewButton kind="event" record={form} onApply={(field, value) => setForm(f => ({ ...f, [field]: value }))} />
        </div>

        {/* 3. Basics */}
        <div style={sectionHeader}>Basics</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('name', 'Name')}
          <label style={labelStyle}>Event type
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)} style={inputStyle}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Kind
            <select value={form.kind} onChange={e => set('kind', e.target.value)} style={inputStyle}>
              {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          {Text('age_min', 'Age min', 'number')}
          {Text('age_max', 'Age max', 'number')}
        </div>
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Description
            <AiWriteButton kind="event" record={form} onWrite={(text) => setForm(f => ({ ...f, description: text }))} />
          </span>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={inputStyle} />
        </label>
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>Tags (comma-separated)
          <input value={form.tags} onChange={e => set('tags', e.target.value)} style={inputStyle} />
        </label>
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>Kid ages (comma-separated)
          <input value={form.kid_ages} onChange={e => set('kid_ages', e.target.value)} style={inputStyle} />
        </label>

        {/* 4. Schedule */}
        <div style={sectionHeader}>Schedule</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('starts_at', 'Starts at', 'datetime-local')}
          {Text('ends_at', 'Ends at', 'datetime-local')}
          <label style={labelStyle}>Day of week
            <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {DOW.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Bucket
            <select value={form.bucket} onChange={e => set('bucket', e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          {Text('time_label', 'Time label')}
          {Text('recurring', 'Recurring')}
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={roLabel}>Timezone</span>{' '}
          <span style={roValue}>{event.timezone || '—'}</span>
        </div>

        {/* 5. Place */}
        <div style={sectionHeader}>Place</div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textSoft }}>
          Linked place: <strong>{form.place_name || '—'}</strong> {form.place_id ? `(${form.place_id.slice(0, 8)})` : '(unlinked)'}
          {place && (
            <span style={{ color: AC.textMuted }}> · {place.area || '—'} · {place.visible ? 'visible' : 'hidden'}</span>
          )}
        </div>
        <input value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} placeholder="search places to link…"
          style={{ ...inputStyle, marginTop: 4 }} />
        {placeMatches.map(p => (
          <button key={p.id} onClick={() => { set('place_id', p.id); set('place_name', p.name); setPlaceQuery(''); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: AC.bg, border: `1px solid ${AC.border}`, borderRadius: 8, padding: '5px 8px', fontFamily: 'Albert Sans', fontSize: 12.5, marginTop: 4, cursor: 'pointer' }}>
            {p.name} · {p.area || '—'}
          </button>
        ))}
        {form.place_id && (
          <button onClick={() => { set('place_id', ''); set('place_name', ''); }}
            style={{ marginTop: 6, background: 'transparent', border: `1px solid ${AC.border}`, borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft, cursor: 'pointer' }}>
            Unlink place
          </button>
        )}
        <div className="grid grid-cols-3 gap-2" style={{ marginTop: 8 }}>
          {Text('place_name', 'Place name')}
          {Text('area', 'Area')}
          {Text('city', 'City')}
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.accent, textDecoration: 'none' }}>
            Linked place on Google Maps <ExternalLink size={12} />
          </a>
        )}

        {/* 5b. Location & coordinates — the event's OWN point/address (falls
            back to the linked place at read time, but can be set directly here).
            Search Google Places to fill lat/lng/address in one tap. */}
        <div style={sectionHeader}>Location &amp; coordinates</div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textSoft, marginBottom: 6 }}>
          Search a real-world place to populate the event’s coordinates &amp; address. Used for distance &amp; “Get directions” in the app.
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={geoQuery}
            onChange={e => setGeoQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchGooglePlaces(); } }}
            placeholder="e.g. Armature Works, Tampa"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={searchGooglePlaces} disabled={geoSearching || !geoQuery.trim()}
            style={{ background: AC.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, cursor: geoSearching || !geoQuery.trim() ? 'default' : 'pointer', opacity: geoSearching || !geoQuery.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {geoSearching ? 'Searching…' : 'Search Google'}
          </button>
        </div>
        {!geoConfigured && (
          <div style={{ marginTop: 6, fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.warn, background: AC.warnSoft, borderRadius: 8, padding: '6px 9px' }}>
            Google Places isn’t configured on the server (GOOGLE_PLACES_API_KEY missing) — enter coordinates manually below.
          </div>
        )}
        {geoResults.map((p) => (
          <button key={p.id || `${p.lat},${p.lng}`} type="button" onClick={() => applyGeo(p)}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: AC.bg, border: `1px solid ${AC.border}`, borderRadius: 8, padding: '6px 9px', fontFamily: 'Albert Sans', fontSize: 12.5, marginTop: 4, cursor: 'pointer' }}>
            <div style={{ fontWeight: 600, color: AC.text }}>{p.name}</div>
            <div style={{ color: AC.textMuted, fontSize: 11.5 }}>{p.address}{p.rating != null ? ` · ★ ${p.rating}` : ''}</div>
          </button>
        ))}
        <div className="grid grid-cols-3 gap-2" style={{ marginTop: 8 }}>
          {Text('lat', 'Latitude', 'number', { step: 'any' })}
          {Text('lng', 'Longitude', 'number', { step: 'any' })}
          {Text('address', 'Street address')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          {num(form.lat) != null && num(form.lng) != null && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${form.lat},${form.lng}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.accent, textDecoration: 'none' }}>
              View these coordinates <ExternalLink size={12} />
            </a>
          )}
          {(form.lat !== '' || form.lng !== '' || form.address) && (
            <button type="button" onClick={clearGeo}
              style={{ background: 'transparent', border: `1px solid ${AC.border}`, borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft, cursor: 'pointer' }}>
              Clear coordinates
            </button>
          )}
        </div>

        {/* 6. Details */}
        <div style={sectionHeader}>Details</div>
        <div className="grid grid-cols-3 gap-2">
          {Text('website', 'Website')}
          {Text('source_url', 'Source URL')}
          {Text('price_summary', 'Price summary')}
          <label style={labelStyle}>Indoor
            <select value={form.indoor} onChange={e => set('indoor', e.target.value)} style={inputStyle}>
              {INDOOR_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {Text('going_count', 'Going count', 'number')}
          {Text('hue', 'Hue')}
        </div>

        {/* 6b. Matching metadata — aligned with mom-profile signals. Drives
            mom ↔ event match scoring on shared values, interests, kid ages. */}
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

        {/* Provenance (read-only — hidden for create mode) */}
        {!isNew && (
        <>
        <div style={sectionHeader}>Provenance</div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          {[
            ['Slug', event.slug],
            ['External id', event.external_id],
            ['Source confidence', event.source_confidence],
            ['Timezone', event.timezone],
            ['Last seen', fmtDate(event.last_seen_at)],
            ['Created', fmtDate(event.created_at)],
            ['Updated', fmtDate(event.updated_at)],
            ['Categories', categoryIds.length ? categoryIds.join(', ') : null],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={roLabel}>{l}</div>
              <div style={roValue}>{v == null || v === '' ? '—' : String(v)}</div>
            </div>
          ))}
          {event.image_source_url && (
            <div>
              <div style={roLabel}>Image source url</div>
              <a href={event.image_source_url} target="_blank" rel="noreferrer" style={{ ...roValue, color: AC.accent, textDecoration: 'underline' }}>link</a>
            </div>
          )}
        </div>
        </>
        )}

        {/* 9. Save (sage) */}
        <div className="flex mt-4">
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: AC.success, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? (isNew ? 'Creating…' : 'Saving…') : (isNew ? 'Create event' : 'Save')}
          </button>
        </div>
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
