import { useState, useMemo } from 'react';
import { C } from '../theme';
import { X } from 'lucide-react';

const TYPES = [
  'storytime','class','workshop','stem','art-class','music-class','dance-class','cooking-class',
  'language-class','tutoring','sports-event','swim','gymnastics','martial-arts','kids-fitness',
  'family-yoga','camp','break-camp','playgroup','open-play','parent-meetup','support-group',
  'performance','movie','concert','museum-program','library-program','animal-encounter','festival',
  'fair','seasonal','farmers-market','community-event','outdoor-adventure','prenatal-class',
  'new-parent','parenting-class','breastfeeding','sensory-friendly','special-needs','fundraiser',
  'religious','other',
];

export const EventEditModal = ({ event, places = [], adminFetch, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: event.name || '', event_type: event.event_type || 'other', kind: event.kind || 'dated',
    description: event.description || '', place_id: event.place_id || '', place_name: event.place_name || '',
    starts_at: event.starts_at ? event.starts_at.slice(0, 16) : '', website: event.website || '',
    source_url: event.source_url || '', tags: (event.tags || []).join(', '),
    visible: !!event.visible, review_status: event.review_status || 'needs_review',
  });
  const [placeQuery, setPlaceQuery] = useState('');
  const [busy, setBusy] = useState(false);
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

  const save = async () => {
    const patch = {
      name: form.name, event_type: form.event_type, kind: form.kind,
      description: form.description || null, place_id: form.place_id || null, place_name: form.place_name || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      website: form.website || null, source_url: form.source_url || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      visible: form.visible, review_status: form.review_status,
    };
    if (await post({ id: event.id, patch }, 'Save')) await onSaved();
  };

  const field = (k, label, type = 'text') => (
    <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>{label}
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
    </label>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
        <div className="flex items-center mb-3">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, color: C.ink, flex: 1 }}>Edit event</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {field('name', 'Name')}
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Type
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)}
              style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {field('starts_at', 'Starts at', 'datetime-local')}
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Kind
            <select value={form.kind} onChange={e => set('kind', e.target.value)}
              style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
              <option value="dated">dated</option><option value="recurring">recurring</option>
            </select>
          </label>
          {field('website', 'Website')}
          {field('source_url', 'Source URL')}
        </div>

        {/* Place picker */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>
            Linked place: <strong>{form.place_name || '—'}</strong> {form.place_id ? `(${form.place_id.slice(0, 8)})` : '(unlinked)'}
          </div>
          <input value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} placeholder="search places to link…"
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, marginTop: 4 }} />
          {placeMatches.map(p => (
            <button key={p.id} onClick={() => { set('place_id', p.id); set('place_name', p.name); setPlaceQuery(''); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontFamily: 'Albert Sans', fontSize: 12.5, marginTop: 4, cursor: 'pointer' }}>
              {p.name} · {p.area || '—'}
            </button>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Description
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Tags (comma-separated)
          <input value={form.tags} onChange={e => set('tags', e.target.value)}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>

        <div className="flex items-center gap-3 mt-3">
          <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
            <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)} /> visible in app
          </label>
          <select value={form.review_status} onChange={e => set('review_status', e.target.value)}
            style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontSize: 12.5 }}>
            {['needs_review','approved','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
