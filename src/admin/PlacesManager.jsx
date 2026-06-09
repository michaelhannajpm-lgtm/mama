import { useState, useMemo } from 'react';
import { C } from '../theme';
import { Check, EyeOff, X, Pencil, MapPin, Search } from 'lucide-react';
import { PlaceEditModal } from './PlaceEditModal';

const STATUSES = ['needs_review', 'approved', 'rejected', 'archived'];
const CATS = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];

export const PlacesManager = ({ rows, adminFetch, onReload }) => {
  const [status, setStatus] = useState('needs_review');
  const [cat, setCat] = useState('all');
  const [origin, setOrigin] = useState('all');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (rows || []).filter(r => {
    if (status !== 'all' && r.review_status !== status) return false;
    if (cat !== 'all' && r.category !== cat) return false;
    if (origin !== 'all' && (r.origin || 'curated') !== origin) return false;
    if (hasPhoto && !(r.place_photos?.length || r.hero_photo)) return false;
    if (minRating && !(r.rating >= minRating)) return false;
    if (q && !(`${r.name} ${r.area || ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, status, cat, origin, hasPhoto, minRating, q]);

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/places/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      setSelected(new Set());
      await onReload();
    } catch (e) { alert(`Update failed: ${e.message}`); }
    finally { setBusy(false); }
  };

  const setRow = (id, patch) => post({ id, patch });
  const bulk = (patch) => post({ ids: [...selected], patch });

  const chip = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      background: active ? C.terracotta : 'transparent', color: active ? '#fff' : C.inkSoft,
      border: `1px solid ${active ? C.terracotta : C.divider}`, borderRadius: 999,
      padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {chip(status === 'all', () => setStatus('all'), 'All')}
        {STATUSES.map(s => chip(status === s, () => setStatus(s), s))}
        <span style={{ width: 1, height: 18, background: C.divider }} />
        <select value={cat} onChange={e => setCat(e.target.value)}
          style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 8px', fontFamily: 'Albert Sans', fontSize: 12.5 }}>
          <option value="all">All categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {['all','curated','google','event'].map(o => chip(origin === o, () => setOrigin(o), o))}
        <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
          <input type="checkbox" checked={hasPhoto} onChange={e => setHasPhoto(e.target.checked)} /> has photo
        </label>
        <select value={minRating} onChange={e => setMinRating(+e.target.value)}
          style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 8px', fontFamily: 'Albert Sans', fontSize: 12.5 }}>
          <option value={0}>any rating</option><option value={4}>4.0+</option><option value={4.5}>4.5+</option>
        </select>
        <div className="flex items-center gap-1" style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '2px 8px' }}>
          <Search size={13} style={{ color: C.inkMuted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search name/area"
            style={{ border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, width: 150 }} />
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted }}>{filtered.length} places</span>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: `${C.sage}`, border: `1px solid ${C.sageDark}33` }}>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.ink }}>{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk({ review_status: 'approved', visible: true })}
            style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <Check size={12} className="inline mr-1" />Approve + Publish
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'rejected', visible: false })}
            style={{ background: C.paper, color: C.terracotta, border: `1px solid ${C.terracotta}`, borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Reject
          </button>
          {selected.size === 2 && (
            <button disabled={busy} onClick={() => {
              const [a, b] = [...selected];
              const ra = rows.find(r => r.id === a), rb = rows.find(r => r.id === b);
              if (!ra || !rb) { setSelected(new Set()); return; } // rows reloaded out from under the selection
              const keep = (ra.review_status === 'approved' || (ra.source_confidence || 0) >= (rb.source_confidence || 0)) ? a : b;
              const drop = keep === a ? b : a;
              if (confirm(`Merge: keep "${rows.find(r=>r.id===keep).name}", drop the other?`)) post({ merge: { keepId: keep, dropId: drop } });
            }} style={{ background: C.saffron, color: C.ink, border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              Merge duplicates
            </button>
          )}
        </div>
      )}

      {/* Rows */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
        {filtered.map(r => {
          const heroPhotoRow = r.place_photos?.find(p => p.is_hero) || r.place_photos?.[0];
          const hero = r.hero_photo || heroPhotoRow?.blob_url || heroPhotoRow?.url;
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
              <div style={{ width: 44, height: 44, borderRadius: 8, background: hero ? `center/cover url(${hero})` : C.lilac, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
                  {r.category} · {r.area || '—'} {r.rating ? `· ★${r.rating}` : ''} · <span style={{ color: r.visible ? C.sageDark : C.inkMuted }}>{r.review_status}</span>
                  {r.origin === 'event' && <span style={{ marginLeft: 6, background: `${C.saffron}33`, color: C.saffron, borderRadius: 999, padding: '1px 6px', fontSize: 10.5, fontWeight: 700 }}>From event</span>}
                </div>
              </div>
              <button title="Approve" disabled={busy} onClick={() => setRow(r.id, { review_status: 'approved', visible: true })}
                style={{ color: C.sageDark, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Check size={16} /></button>
              <button title="Hide" disabled={busy} onClick={() => setRow(r.id, { visible: false })}
                style={{ color: C.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><EyeOff size={16} /></button>
              <button title="Reject" disabled={busy} onClick={() => setRow(r.id, { review_status: 'rejected', visible: false })}
                style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
              <button title="Edit" onClick={() => setEditing(r)}
                style={{ color: C.ink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Pencil size={15} /></button>
              {r.lat != null && (
                <a title="Map" href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer"
                  style={{ color: C.inkMuted, padding: 4 }}><MapPin size={15} /></a>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No places match these filters.</div>
        )}
      </div>

      {editing && (
        <PlaceEditModal place={editing} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
