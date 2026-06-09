import { useState, useMemo } from 'react';
import { C } from '../theme';
import { Check, EyeOff, X, Pencil, Search, Calendar } from 'lucide-react';
import { EventEditModal } from './EventEditModal';

const STATUSES = ['needs_review', 'approved', 'rejected', 'archived'];

export const EventsManager = ({ rows, places = [], adminFetch, onReload }) => {
  const [status, setStatus] = useState('needs_review');
  const [kind, setKind] = useState('all');
  const [hasPlace, setHasPlace] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (rows || []).filter(r => {
    if (status !== 'all' && r.review_status !== status) return false;
    if (kind !== 'all' && r.kind !== kind) return false;
    if (hasPlace && !r.place_id) return false;
    if (q && !(`${r.name} ${r.place_name || ''} ${r.event_type || ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, status, kind, hasPlace, q]);

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/events/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      background: active ? C.sageDark : 'transparent', color: active ? '#fff' : C.inkSoft,
      border: `1px solid ${active ? C.sageDark : C.divider}`, borderRadius: 999,
      padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {chip(status === 'all', () => setStatus('all'), 'All')}
        {STATUSES.map(s => chip(status === s, () => setStatus(s), s))}
        <span style={{ width: 1, height: 18, background: C.divider }} />
        {['all','recurring','dated'].map(k => chip(kind === k, () => setKind(k), k))}
        <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
          <input type="checkbox" checked={hasPlace} onChange={e => setHasPlace(e.target.checked)} /> has place
        </label>
        <div className="flex items-center gap-1" style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '2px 8px' }}>
          <Search size={13} style={{ color: C.inkMuted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search name/place/type"
            style={{ border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, width: 170 }} />
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted }}>{filtered.length} events</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: C.sage, border: `1px solid ${C.sageDark}33` }}>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.ink }}>{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk({ review_status: 'approved', visible: true })}
            style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <Check size={12} className="inline mr-1" />Approve + Publish
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'rejected', visible: false })}
            style={{ background: C.paper, color: C.terracotta, border: `1px solid ${C.terracotta}`, borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Reject
          </button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
        {filtered.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            <div style={{ width: 36, height: 36, borderRadius: 8, background: r.hue || C.sage, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} style={{ color: '#fff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
                {r.event_type} · {r.kind} · {r.place_name || (r.place_id ? 'linked place' : 'no place')} · {r.day_of_week || ''} {r.time_label || ''} · <span style={{ color: r.visible ? C.sageDark : C.inkMuted }}>{r.review_status}</span>
              </div>
            </div>
            <button title="Approve" disabled={busy} onClick={() => setRow(r.id, { review_status: 'approved', visible: true })} style={{ color: C.sageDark, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Check size={16} /></button>
            <button title="Hide" disabled={busy} onClick={() => setRow(r.id, { visible: false })} style={{ color: C.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><EyeOff size={16} /></button>
            <button title="Reject" disabled={busy} onClick={() => setRow(r.id, { review_status: 'rejected', visible: false })} style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            <button title="Edit" onClick={() => setEditing(r)} style={{ color: C.ink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Pencil size={15} /></button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No events match these filters.</div>
        )}
      </div>

      {editing && (
        <EventEditModal event={editing} places={places} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
