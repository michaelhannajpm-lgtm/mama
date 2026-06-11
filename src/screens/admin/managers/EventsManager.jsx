import { useState, useMemo, useEffect } from 'react';
import { C } from '../../../theme';
import { Check, EyeOff, X, Pencil, Calendar, Eye, Archive, Trash2 } from 'lucide-react';
import { EventEditModal } from './EventEditModal';
import { EventsMap } from './EventsMap';
import { MultiSelect, CollapsibleSearch, ViewMenu, StatusChips } from './AdminFilters';
import { hasRealPhoto, statusColor, rowActionsFor } from './adminRows';

const EVENT_TYPES = [
  'storytime', 'class', 'workshop', 'stem', 'art-class', 'music-class', 'dance-class',
  'cooking-class', 'language-class', 'tutoring', 'sports-event', 'swim', 'gymnastics',
  'martial-arts', 'kids-fitness', 'family-yoga', 'camp', 'break-camp', 'playgroup',
  'open-play', 'parent-meetup', 'support-group', 'performance', 'movie', 'concert',
  'museum-program', 'library-program', 'animal-encounter', 'festival', 'fair', 'seasonal',
  'farmers-market', 'community-event', 'outdoor-adventure', 'prenatal-class', 'new-parent',
  'parenting-class', 'breastfeeding', 'sensory-friendly', 'special-needs', 'fundraiser',
  'religious', 'other',
];
const KINDS = ['recurring', 'dated'];
const PAGE_SIZES = [10, 25, 50, 100];

// Lowercased haystack of every searchable field on an event.
const searchableOf = (r) => {
  const j = (v) => (Array.isArray(v) ? v.join(' ') : '');
  return [
    r.name, r.slug, r.place_name, r.event_type, r.kind, r.city, r.area,
    r.description, r.recurring, r.day_of_week, r.time_label, r.source_url, r.website,
    j(r.tags), j(r.kid_ages),
  ].filter(Boolean).join(' ').toLowerCase();
};

// Apply every filter EXCEPT status. Shared by `filtered` and the per-status counts.
const matchesNonStatus = (r, { types, kinds, cities, hasPlace, photo, q }) => {
  if (types.length && !types.includes(r.event_type)) return false;
  if (kinds.length && !kinds.includes(r.kind)) return false;
  if (cities.length && !cities.includes(r.city || '')) return false;
  if (hasPlace && !r.place_id) return false;
  if (photo !== 'any') {
    const has = hasRealPhoto(r);
    if (photo === 'has' && !has) return false;
    if (photo === 'none' && has) return false;
  }
  if (q && !searchableOf(r).includes(q.toLowerCase())) return false;
  return true;
};

export const EventsManager = ({ rows, places = [], adminFetch, onReload }) => {
  const [view, setView] = useState('grid');
  const [status, setStatus] = useState('needs_review');
  const [types, setTypes] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [citySel, setCitySel] = useState([]);
  const [hasPlace, setHasPlace] = useState(false);
  const [photo, setPhoto] = useState('any');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const nonStatusFilters = { types, kinds, cities: citySel, hasPlace, photo, q };

  const cityOptions = useMemo(
    () => [...new Set((rows || []).map(r => r.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filtered = useMemo(() => (rows || []).filter(r => {
    if (status !== 'all' && r.review_status !== status) return false;
    return matchesNonStatus(r, nonStatusFilters);
  }), [rows, status, types, kinds, citySel, hasPlace, photo, q]);

  // Per-status counts: rows matching every active filter EXCEPT status.
  const statusCounts = useMemo(() => {
    const base = (rows || []).filter(r => matchesNonStatus(r, nonStatusFilters));
    const counts = { all: base.length };
    for (const s of ['needs_review', 'approved', 'rejected', 'archived']) counts[s] = base.filter(r => r.review_status === s).length;
    return counts;
  }, [rows, types, kinds, citySel, hasPlace, photo, q]);

  // Reset pagination when filters or page size change.
  useEffect(() => { setPage(1); }, [status, types, kinds, citySel, hasPlace, photo, q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const selectAll = () => setSelected(new Set(filtered.map(r => r.id)));
  const clearSel = () => setSelected(new Set());
  const toggleAll = () => { allFilteredSelected ? clearSel() : selectAll(); };

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/events/update', {
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

  const selectStyle = { border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontFamily: 'Albert Sans', fontSize: 12.5, background: C.paper, color: C.ink };
  const bulkBtn = (bg, fg, border) => ({
    background: bg, color: fg, border: border || 'none', borderRadius: 8, padding: '5px 10px',
    fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
  });
  const iconBtn = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 };

  const selectAllHeader = (
    <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}`, background: C.creamSoft }}>
      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} title="Select all filtered" />
      <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>
        {selected.size} selected of {filtered.length} filtered
      </span>
      {!allFilteredSelected && filtered.length > 0 && (
        <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: C.sageDark, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Select all {filtered.length}
        </button>
      )}
      {selected.size > 0 && (
        <button onClick={clearSel} style={{ background: 'transparent', border: 'none', color: C.inkMuted, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Clear
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Filter bar — Row 1: status chips (left) + view dropdown (right) */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <StatusChips status={status} setStatus={setStatus} counts={statusCounts} accent={C.sageDark} />
        <div style={{ marginLeft: 'auto' }}>
          <ViewMenu value={view} onChange={setView} options={[{ value: 'grid', label: 'Grid view' }, { value: 'map', label: 'Map view' }]} />
        </div>
      </div>

      {/* Filter bar — Row 2: multi-select type / kind / city + has place + photo */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <MultiSelect label="Type" options={EVENT_TYPES} selected={types} onChange={setTypes} accent={C.sageDark} />
        <MultiSelect label="Kind" options={KINDS} selected={kinds} onChange={setKinds} accent={C.sageDark} />
        <MultiSelect label="City" options={cityOptions} selected={citySel} onChange={setCitySel} accent={C.sageDark} />
        <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={hasPlace} onChange={e => setHasPlace(e.target.checked)} /> has place
        </label>
        <select value={photo} onChange={e => setPhoto(e.target.value)} style={selectStyle}>
          <option value="any">Any photo</option>
          <option value="has">Has photo</option>
          <option value="none">No photo</option>
        </select>
      </div>

      {/* Filter bar — Row 3: collapsible search */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CollapsibleSearch value={q} onChange={setQ} accent={C.sageDark} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: C.sage, border: `1px solid ${C.sageDark}33` }}>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.ink }}>{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk({ review_status: 'approved', visible: true })} style={bulkBtn(C.sageDark, '#fff')}>
            <Check size={12} className="inline mr-1" />Approve + Publish
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'rejected', visible: false })} style={bulkBtn(C.paper, C.terracotta, `1px solid ${C.terracotta}`)}>
            Reject
          </button>
          <button disabled={busy} onClick={() => bulk({ visible: true })} style={bulkBtn(C.paper, C.sageDark, `1px solid ${C.divider}`)}>
            <Eye size={12} className="inline mr-1" />Set visible
          </button>
          <button disabled={busy} onClick={() => bulk({ visible: false })} style={bulkBtn(C.paper, C.inkSoft, `1px solid ${C.divider}`)}>
            <EyeOff size={12} className="inline mr-1" />Set hidden
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'archived' })} style={bulkBtn(C.paper, C.inkSoft, `1px solid ${C.divider}`)}>
            <Archive size={12} className="inline mr-1" />Archive
          </button>
          <button disabled={busy} onClick={() => {
            if (confirm(`Delete ${selected.size} events? This cannot be undone.`)) post({ deleteIds: [...selected] });
          }} style={bulkBtn(C.terracotta, '#fff')}>
            <Trash2 size={12} className="inline mr-1" />Delete
          </button>
        </div>
      )}

      {view === 'grid' ? (
        <>
          {/* Rows */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
            {selectAllHeader}
            {pageRows.map(r => {
              const act = rowActionsFor(r);
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  <div onClick={() => setEditing(r)} style={{ width: 36, height: 36, borderRadius: 8, background: r.hue || C.sage, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Calendar size={15} style={{ color: '#fff' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div onClick={() => setEditing(r)} style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{r.name}</div>
                    <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
                      {r.event_type} · {r.kind} · {r.place_name || (r.place_id ? 'linked place' : 'no place')} · {r.day_of_week || ''} {r.time_label || ''} · <span style={{ color: statusColor(r.review_status), fontWeight: 600 }}>{r.review_status}</span>
                      {r.review_status === 'approved' && !r.visible && <span style={{ color: C.inkMuted }}> · hidden</span>}
                    </div>
                  </div>
                  {act.approve && (
                    <button title={r.review_status === 'archived' ? 'Restore' : 'Approve'} disabled={busy} onClick={() => setRow(r.id, { review_status: 'approved', visible: true })}
                      style={{ ...iconBtn, color: C.sageDark }}><Check size={16} /></button>
                  )}
                  {act.toggleVisible && (r.visible
                    ? <button title="Hide" disabled={busy} onClick={() => setRow(r.id, { visible: false })} style={{ ...iconBtn, color: C.inkMuted }}><EyeOff size={16} /></button>
                    : <button title="Show" disabled={busy} onClick={() => setRow(r.id, { visible: true })} style={{ ...iconBtn, color: C.sageDark }}><Eye size={16} /></button>
                  )}
                  {act.reject && (
                    <button title="Reject" disabled={busy} onClick={() => setRow(r.id, { review_status: 'rejected', visible: false })}
                      style={{ ...iconBtn, color: C.terracotta }}><X size={16} /></button>
                  )}
                  {act.archive && (
                    <button title="Archive" disabled={busy} onClick={() => setRow(r.id, { review_status: 'archived', visible: false })}
                      style={{ ...iconBtn, color: C.inkMuted }}><Archive size={15} /></button>
                  )}
                  {act.del && (
                    <button title="Delete" disabled={busy} onClick={() => { if (confirm(`Delete "${r.name}"? This cannot be undone.`)) post({ deleteIds: [r.id] }); }}
                      style={{ ...iconBtn, color: C.terracotta }}><Trash2 size={15} /></button>
                  )}
                  <button title="Edit" onClick={() => setEditing(r)} style={{ ...iconBtn, color: C.ink }}><Pencil size={15} /></button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No events match these filters.</div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
              <label className="flex items-center gap-1">
                Per page
                <select value={pageSize} onChange={e => setPageSize(+e.target.value)} style={selectStyle}>
                  {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <span style={{ width: 1, height: 18, background: C.divider }} />
              <button disabled={safePage <= 1} onClick={() => setPage(1)} style={bulkBtn(C.paper, C.inkSoft, `1px solid ${C.divider}`)}>First</button>
              <button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={bulkBtn(C.paper, C.inkSoft, `1px solid ${C.divider}`)}>Prev</button>
              <span style={{ fontWeight: 600, color: C.ink }}>Page {safePage} of {totalPages} · {filtered.length} events</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={bulkBtn(C.paper, C.inkSoft, `1px solid ${C.divider}`)}>Next</button>
              <button disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} style={bulkBtn(C.paper, C.inkSoft, `1px solid ${C.divider}`)}>Last</button>
              <label className="flex items-center gap-1">
                Go to
                <input type="number" min={1} max={totalPages} value={safePage}
                  onChange={e => { const n = Number(e.target.value); if (n >= 1 && n <= totalPages) setPage(n); }}
                  style={{ ...selectStyle, width: 56 }} />
              </label>
            </div>
          )}
        </>
      ) : (
        <EventsMap events={filtered} onSelect={setEditing} />
      )}

      {editing && (
        <EventEditModal event={editing} places={places} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
