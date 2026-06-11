import { useState } from 'react';
import { C } from '../../../theme';
import { X, Plus } from 'lucide-react';

const SOURCE_TYPES = ['google_places', 'eventbrite', 'ics', 'json_ld', 'facebook_graph', 'place_website'];
const PLACE_CATEGORIES = ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];
const EVENT_TYPES = [
  'storytime', 'class', 'workshop', 'stem', 'art-class', 'music-class', 'dance-class', 'cooking-class',
  'language-class', 'tutoring', 'sports-event', 'swim', 'gymnastics', 'martial-arts', 'kids-fitness',
  'family-yoga', 'camp', 'break-camp', 'playgroup', 'open-play', 'parent-meetup', 'support-group',
  'performance', 'movie', 'concert', 'museum-program', 'library-program', 'animal-encounter', 'festival',
  'fair', 'seasonal', 'farmers-market', 'community-event', 'outdoor-adventure', 'prenatal-class',
  'new-parent', 'parenting-class', 'breastfeeding', 'sensory-friendly', 'special-needs', 'fundraiser',
  'religious', 'other',
];

export const SourceEditModal = ({ source, isNew, adminFetch, onClose, onSaved }) => {
  const s = source || {};
  const [form, setForm] = useState({
    id: s.id || '',
    name: s.name || '',
    kind: s.kind || 'events',
    source_type: s.type || 'place_website',
    city: s.city || 'Tampa, FL',
    county: s.county || '',
    cadence_hours: s.cadenceHours != null ? s.cadenceHours : 24,
    notes: s.notes || '',
    enabled: isNew ? true : !!s.enabled,
    bias: {
      lat: s.bias?.lat ?? '',
      lng: s.bias?.lng ?? '',
      radiusM: s.bias?.radiusM ?? '',
    },
    queries: Array.isArray(s.queries) ? s.queries.map(q => ({ q: q.q || '', category: q.category || 'fun' })) : [],
    url: s.url || '',
    defaultType: s.defaultType || 'other',
    pageId: s.pageId || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBias = (k, v) => setForm(f => ({ ...f, bias: { ...f.bias, [k]: v } }));

  const setQuery = (i, k, v) => setForm(f => ({
    ...f, queries: f.queries.map((q, idx) => idx === i ? { ...q, [k]: v } : q),
  }));
  const addQuery = () => setForm(f => ({ ...f, queries: [...f.queries, { q: '', category: 'fun' }] }));
  const removeQuery = (i) => setForm(f => ({ ...f, queries: f.queries.filter((_, idx) => idx !== i) }));

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/sources/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      return true;
    } catch (e) { alert(`Save failed: ${e.message}`); return false; }
    finally { setBusy(false); }
  };

  const save = async () => {
    const type = form.source_type;
    const lifted = {
      id: form.id,
      name: form.name,
      type,
      kind: form.kind,
      city: form.city,
      county: form.county,
      cadenceHours: Number(form.cadence_hours),
      notes: form.notes,
      enabled: form.enabled,
    };
    if (type === 'google_places') {
      lifted.bias = { lat: Number(form.bias.lat), lng: Number(form.bias.lng), radiusM: Number(form.bias.radiusM) };
      lifted.queries = form.queries.filter(q => q.q && q.q.trim());
    } else if (type === 'ics' || type === 'json_ld') {
      lifted.url = form.url;
      lifted.defaultType = form.defaultType;
    } else if (type === 'facebook_graph') {
      lifted.pageId = form.pageId;
    }
    const payload = isNew ? { create: lifted } : { id: source.id, patch: lifted };
    if (await post(payload)) await onSaved();
  };

  const labelStyle = { fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft };
  const inputStyle = { width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 };

  const field = (k, label, type = 'text', disabled = false) => (
    <label key={k} style={labelStyle}>{label}
      <input type={type} value={form[k]} disabled={disabled} onChange={e => set(k, e.target.value)}
        style={{ ...inputStyle, opacity: disabled ? 0.6 : 1, background: disabled ? C.creamSoft : '#fff' }} />
    </label>
  );

  const type = form.source_type;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
        <div className="flex items-center mb-3">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, color: C.ink, flex: 1 }}>{isNew ? 'New source' : 'Edit source'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Common fields */}
        <div className="grid grid-cols-2 gap-2">
          {field('id', 'ID', 'text', !isNew)}
          {field('name', 'Name')}
          <label style={labelStyle}>Kind
            <select value={form.kind} onChange={e => set('kind', e.target.value)} style={inputStyle}>
              <option value="places">places</option><option value="events">events</option>
            </select>
          </label>
          <label style={labelStyle}>Source type
            <select value={form.source_type} onChange={e => set('source_type', e.target.value)} style={inputStyle}>
              {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {field('city', 'City')}
          {field('county', 'County')}
          {field('cadence_hours', 'Cadence (hours)', 'number')}
        </div>

        <label style={{ display: 'block', marginTop: 8, ...labelStyle }}>Notes
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
          <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} /> enabled
        </label>

        {/* Per-type sections */}
        {type === 'google_places' && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.divider}`, paddingTop: 12 }}>
            <div className="grid grid-cols-3 gap-2">
              <label style={labelStyle}>bias.lat
                <input type="number" value={form.bias.lat} onChange={e => setBias('lat', e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>bias.lng
                <input type="number" value={form.bias.lng} onChange={e => setBias('lng', e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>bias.radiusM
                <input type="number" value={form.bias.radiusM} onChange={e => setBias('radiusM', e.target.value)} style={inputStyle} />
              </label>
            </div>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted, marginTop: 10, marginBottom: 6 }}>
              Each query runs once against Google Places.
            </div>
            <div style={{ maxHeight: 260, overflow: 'auto', border: `1px solid ${C.divider}`, borderRadius: 8, padding: 6 }}>
              {form.queries.map((q, i) => (
                <div key={i} className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <input value={q.q} onChange={e => setQuery(i, 'q', e.target.value)} placeholder="query"
                    style={{ ...inputStyle, flex: 1 }} />
                  <select value={q.category} onChange={e => setQuery(i, 'category', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                    {PLACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => removeQuery(i)} title="Remove"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.terracotta, padding: 4 }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              {form.queries.length === 0 && (
                <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted, padding: 4 }}>No queries yet.</div>
              )}
            </div>
            <button onClick={addQuery}
              style={{ marginTop: 8, background: 'transparent', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: C.ink, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> Add query
            </button>
          </div>
        )}

        {type === 'eventbrite' && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.divider}`, paddingTop: 12, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
            Pulls events from your personal Eventbrite account (organized events). No query config.
          </div>
        )}

        {(type === 'ics' || type === 'json_ld') && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.divider}`, paddingTop: 12 }} className="grid grid-cols-2 gap-2">
            <label style={labelStyle}>URL
              <input type="text" value={form.url} onChange={e => set('url', e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>Default type
              <select value={form.defaultType} onChange={e => set('defaultType', e.target.value)} style={inputStyle}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
        )}

        {type === 'facebook_graph' && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.divider}`, paddingTop: 12 }}>
            <label style={labelStyle}>Page ID
              <input type="text" value={form.pageId} onChange={e => set('pageId', e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}

        {type === 'place_website' && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.divider}`, paddingTop: 12, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
            Crawls each approved place's website for events. No extra config.
          </div>
        )}

        <div className="flex items-center mt-4">
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
