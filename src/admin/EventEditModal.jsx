import { useState, useMemo } from 'react';
import { C } from '../theme';
import { X, ExternalLink } from 'lucide-react';
import { StatusBadge, VisibilityBadge } from './AdminFilters';

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
const sectionHeader = { fontFamily: 'Fraunces', fontSize: 14, color: C.ink, margin: '18px 0 8px' };
const labelStyle = { fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft };
const inputStyle = { width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: 'Albert Sans', boxSizing: 'border-box' };
const roLabel = { fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted };
const roValue = { fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft, wordBreak: 'break-word' };

const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleString(); } catch { return String(v); } };
const dtLocal = (v) => { if (!v) return ''; try { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; const off = d.getTimezoneOffset(); return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16); } catch { return ''; } };

export const EventEditModal = ({ event, places = [], adminFetch, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: event.name || '',
    event_type: event.event_type || 'other',
    kind: event.kind || 'dated',
    description: event.description || '',
    place_id: event.place_id || '',
    place_name: event.place_name || '',
    area: event.area || '',
    city: event.city || '',
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
  });
  const [placeQuery, setPlaceQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
    };
    if (await post({ id: event.id, patch }, 'Save')) await onSaved();
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 780, maxWidth: '100%', maxHeight: '92vh', overflow: 'auto', padding: 24 }}>

        {/* 1. Header */}
        <div className="flex items-center mb-1" style={{ gap: 10 }}>
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, color: C.ink, flex: 1, margin: 0 }}>{event.name || 'Event'}</h3>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: C.sageDark, background: C.sage, borderRadius: 999, padding: '3px 10px' }}>{form.kind}</span>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600, color: C.inkSoft, background: C.lilac, borderRadius: 999, padding: '3px 10px' }}>{form.event_type}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Status pills — reflect the live form selections below */}
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={form.review_status} />
          <VisibilityBadge visible={form.visible} />
        </div>

        {/* 2. Image */}
        <div style={sectionHeader}>Image</div>
        {event.hero_photo ? (
          <div>
            <div
              onClick={() => setLightbox(event.hero_photo)}
              title="Click to enlarge"
              style={{ width: 220, height: 150, borderRadius: 8, overflow: 'hidden', border: `2px solid ${C.divider}`, background: `center/cover url(${event.hero_photo})`, cursor: 'zoom-in' }}
            />
            {event.image_source_url && (
              <a href={event.image_source_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted, textDecoration: 'none' }}>
                source <ExternalLink size={11} />
              </a>
            )}
          </div>
        ) : (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted }}>No image</div>
        )}

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
        <label style={{ ...labelStyle, display: 'block', marginTop: 8 }}>Description
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
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft }}>
          Linked place: <strong>{form.place_name || '—'}</strong> {form.place_id ? `(${form.place_id.slice(0, 8)})` : '(unlinked)'}
          {place && (
            <span style={{ color: C.inkMuted }}> · {place.area || '—'} · {place.visible ? 'visible' : 'hidden'}</span>
          )}
        </div>
        <input value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} placeholder="search places to link…"
          style={{ ...inputStyle, marginTop: 4 }} />
        {placeMatches.map(p => (
          <button key={p.id} onClick={() => { set('place_id', p.id); set('place_name', p.name); setPlaceQuery(''); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontFamily: 'Albert Sans', fontSize: 12.5, marginTop: 4, cursor: 'pointer' }}>
            {p.name} · {p.area || '—'}
          </button>
        ))}
        {form.place_id && (
          <button onClick={() => { set('place_id', ''); set('place_name', ''); }}
            style={{ marginTop: 6, background: 'transparent', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft, cursor: 'pointer' }}>
            Unlink place
          </button>
        )}
        <div className="grid grid-cols-3 gap-2" style={{ marginTop: 8 }}>
          {Text('place_name', 'Place name')}
          {Text('area', 'Area')}
          {Text('city', 'City')}
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.terracotta, textDecoration: 'none' }}>
            View on Google Maps <ExternalLink size={12} />
          </a>
        )}

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

        {/* 7. Status */}
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

        {/* 8. Provenance (read-only) */}
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
              <a href={event.image_source_url} target="_blank" rel="noreferrer" style={{ ...roValue, color: C.terracotta, textDecoration: 'underline' }}>link</a>
            </div>
          )}
        </div>

        {/* 9. Save (sage) */}
        <div className="flex mt-4">
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save'}
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
