import { useState, useMemo, useEffect } from 'react';
import { AC } from '../admin-theme';
import { BusyOverlay } from '../components/primitives';
import { useConfirm } from '../components/ConfirmDialog';
import { Check, EyeOff, X, Pencil, Calendar, Eye, Archive, Trash2, Download, Plus } from 'lucide-react';
import { EventEditModal } from './EventEditModal';
import { EventsMap } from './EventsMap';
import { MultiSelect, CollapsibleSearch, TypeaheadSelect, ViewMenu, StatusChips } from './AdminFilters';
import { hasRealPhoto, statusColor, rowActionsFor } from './adminRows';
import { DescriptionCell } from './DescriptionCell';
import { navigateRecord, navigateSection, currentRecordRef } from '../lib/adminRouter';

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
  const confirm = useConfirm();
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
  const [deepLinkMiss, setDeepLinkMiss] = useState(null); // ref we couldn't resolve
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

  // Deep-link target — Featured manager dispatches this to open an event's
  // edit modal from outside the tab.
  useEffect(() => {
    const match = (ref) => (rows || []).find(
      (r) => r.id === ref || r.slug === ref
    );
    let pendingId = null;
    try { pendingId = sessionStorage.getItem('gm-admin-open-event'); } catch { /* ignore */ }
    if (pendingId && rows?.length) {
      const target = match(pendingId);
      if (target) { setEditing(target); setDeepLinkMiss(null); }
      else setDeepLinkMiss(pendingId);
      try { sessionStorage.removeItem('gm-admin-open-event'); } catch { /* ignore */ }
    }
    const onOpen = (ev) => {
      const ref = ev?.detail?.id;
      if (!ref) return;
      const target = match(ref);
      if (target) { if (editing?.id !== target.id) setEditing(target); setDeepLinkMiss(null); }
      else if (rows?.length) setDeepLinkMiss(ref);
    };
    window.addEventListener('gm-admin-open-event', onOpen);
    return () => window.removeEventListener('gm-admin-open-event', onOpen);
  }, [rows]);

  // Keep the address bar in sync with the open record (canonical id form).
  useEffect(() => {
    if (editing && editing.id && !editing.__new) {
      navigateRecord('events', editing.id);
    } else if (!editing && currentRecordRef()) {
      navigateSection('events');
    }
  }, [editing]);

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

  const selectStyle = { border: `1px solid ${AC.border}`, borderRadius: 8, padding: '5px 8px', fontFamily: 'Albert Sans', fontSize: 12.5, background: AC.surface, color: AC.text };
  const bulkBtn = (bg, fg, border) => ({
    background: bg, color: fg, border: border || 'none', borderRadius: 8, padding: '5px 10px',
    fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
  });
  const iconBtn = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 };

  const selectAllHeader = (
    <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${AC.border}`, background: AC.surfaceAlt }}>
      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} title="Select all filtered" />
      <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textSoft, fontWeight: 600 }}>
        {selected.size} selected of {filtered.length} filtered
      </span>
      {!allFilteredSelected && filtered.length > 0 && (
        <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: AC.success, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Select all {filtered.length}
        </button>
      )}
      {selected.size > 0 && (
        <button onClick={clearSel} style={{ background: 'transparent', border: 'none', color: AC.textMuted, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Clear
        </button>
      )}
    </div>
  );

  const exportCsv = () => {
    if (!filtered.length) return;
    const cols = [
      'id', 'name', 'event_type', 'kind', 'review_status', 'visible',
      'place_id', 'place_name', 'area', 'city', 'description',
      'starts_at', 'ends_at', 'day_of_week', 'bucket', 'time_label', 'recurring', 'timezone',
      'age_min', 'age_max', 'kid_age_ranges', 'kid_ages', 'value_tags', 'interest_tags',
      'mom_type_fit', 'neighborhoods', 'tags', 'indoor', 'price_summary', 'going_count',
      'website', 'source_url', 'hero_photo', 'hue',
      'external_id', 'source_confidence', 'last_seen_at', 'created_at', 'updated_at',
    ];
    const esc = (v) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [cols.join(','), ...filtered.map((r) => cols.map((k) => esc(r[k])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gomama-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ position: 'relative' }}>
      <BusyOverlay show={busy} label="Working…" />
      {/* Filter bar — Row 1: status chips (left) + view / export / add event (right) */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <StatusChips status={status} setStatus={setStatus} counts={statusCounts} accent={AC.success} />
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <button onClick={exportCsv} disabled={!filtered.length} style={{
            ...selectStyle, cursor: filtered.length ? 'pointer' : 'default',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            opacity: filtered.length ? 1 : 0.55, fontWeight: 600,
          }}>
            <Download size={13} /> Export ({filtered.length})
          </button>
          <button onClick={() => setEditing({ __new: true })} style={{
            background: AC.success, color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 11px', fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <Plus size={13} /> Add event
          </button>
          <ViewMenu value={view} onChange={setView} options={[{ value: 'grid', label: 'Grid view' }, { value: 'map', label: 'Map view' }]} />
        </div>
      </div>

      {/* Filter bar — Row 2: search FIRST, then multi-select filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CollapsibleSearch value={q} onChange={setQ} accent={AC.success} />
        <MultiSelect label="Type" options={EVENT_TYPES} selected={types} onChange={setTypes} accent={AC.success} />
        <MultiSelect label="Kind" options={KINDS} selected={kinds} onChange={setKinds} accent={AC.success} />
        <MultiSelect label="City" options={cityOptions} selected={citySel} onChange={setCitySel} accent={AC.success} />
        <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textSoft, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={hasPlace} onChange={e => setHasPlace(e.target.checked)} /> has place
        </label>
        <TypeaheadSelect label="Photo" value={photo} onChange={setPhoto} accent={AC.success}
          options={[
            { value: 'any', label: 'Any photo' },
            { value: 'has', label: 'Has photo' },
            { value: 'none', label: 'No photo' },
          ]} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: AC.successSoft, border: `1px solid color-mix(in srgb, ${AC.success} 20%, transparent)` }}>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: AC.text }}>{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk({ review_status: 'approved', visible: true })} style={bulkBtn(AC.success, '#fff')}>
            <Check size={12} className="inline mr-1" />Approve + Publish
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'rejected', visible: false })} style={bulkBtn(AC.surface, AC.accent, `1px solid ${AC.accent}`)}>
            Reject
          </button>
          <button disabled={busy} onClick={() => bulk({ visible: true })} style={bulkBtn(AC.surface, AC.success, `1px solid ${AC.border}`)}>
            <Eye size={12} className="inline mr-1" />Set visible
          </button>
          <button disabled={busy} onClick={() => bulk({ visible: false })} style={bulkBtn(AC.surface, AC.textSoft, `1px solid ${AC.border}`)}>
            <EyeOff size={12} className="inline mr-1" />Set hidden
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'archived' })} style={bulkBtn(AC.surface, AC.textSoft, `1px solid ${AC.border}`)}>
            <Archive size={12} className="inline mr-1" />Archive
          </button>
          <button disabled={busy} onClick={() => {
            confirm({ title: `Delete ${selected.size} event${selected.size === 1 ? '' : 's'}?`, message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })
              .then((ok) => ok && post({ deleteIds: [...selected] }));
          }} style={bulkBtn(AC.accent, '#fff')}>
            <Trash2 size={12} className="inline mr-1" />Delete
          </button>
        </div>
      )}

      {view === 'grid' ? (
        <>
          {/* Rows */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${AC.border}`, background: AC.surface }}>
            {selectAllHeader}
            {pageRows.map(r => {
              const act = rowActionsFor(r);
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${AC.border}` }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  <div onClick={() => setEditing(r)} style={{ width: 36, height: 36, borderRadius: 8, background: r.hue || AC.successSoft, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Calendar size={15} style={{ color: '#fff' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div onClick={() => setEditing(r)} style={{ fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 600, color: AC.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{r.name}</div>
                    <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted }}>
                      {r.event_type} · {r.kind} · {r.place_name || (r.place_id ? 'linked place' : 'no place')} · {r.day_of_week || ''} {r.time_label || ''} · <span style={{ color: statusColor(r.review_status), fontWeight: 600 }}>{r.review_status}</span>
                      {r.review_status === 'approved' && !r.visible && <span style={{ color: AC.textMuted }}> · hidden</span>}
                    </div>
                  </div>
                  <DescriptionCell text={r.description} />
                  {act.approve && (
                    <button title={r.review_status === 'archived' ? 'Restore' : 'Approve'} disabled={busy} onClick={() => setRow(r.id, { review_status: 'approved', visible: true })}
                      style={{ ...iconBtn, color: AC.success }}><Check size={16} /></button>
                  )}
                  {act.toggleVisible && (r.visible
                    ? <button title="Hide" disabled={busy} onClick={() => setRow(r.id, { visible: false })} style={{ ...iconBtn, color: AC.textMuted }}><EyeOff size={16} /></button>
                    : <button title="Show" disabled={busy} onClick={() => setRow(r.id, { visible: true })} style={{ ...iconBtn, color: AC.success }}><Eye size={16} /></button>
                  )}
                  {act.reject && (
                    <button title="Reject" disabled={busy} onClick={() => setRow(r.id, { review_status: 'rejected', visible: false })}
                      style={{ ...iconBtn, color: AC.accent }}><X size={16} /></button>
                  )}
                  {act.archive && (
                    <button title="Archive" disabled={busy} onClick={() => setRow(r.id, { review_status: 'archived', visible: false })}
                      style={{ ...iconBtn, color: AC.textMuted }}><Archive size={15} /></button>
                  )}
                  {act.del && (
                    <button title="Delete" disabled={busy} onClick={() => { confirm({ title: 'Delete event?', message: `Delete "${r.name}"? This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' }).then((ok) => ok && post({ deleteIds: [r.id] })); }}
                      style={{ ...iconBtn, color: AC.accent }}><Trash2 size={15} /></button>
                  )}
                  <button title="Edit" onClick={() => setEditing(r)} style={{ ...iconBtn, color: AC.text }}><Pencil size={15} /></button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted }}>No events match these filters.</div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textSoft }}>
              <label className="flex items-center gap-1">
                Per page
                <select value={pageSize} onChange={e => setPageSize(+e.target.value)} style={selectStyle}>
                  {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <span style={{ width: 1, height: 18, background: AC.border }} />
              <button disabled={safePage <= 1} onClick={() => setPage(1)} style={bulkBtn(AC.surface, AC.textSoft, `1px solid ${AC.border}`)}>First</button>
              <button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={bulkBtn(AC.surface, AC.textSoft, `1px solid ${AC.border}`)}>Prev</button>
              <span style={{ fontWeight: 600, color: AC.text }}>Page {safePage} of {totalPages} · {filtered.length} events</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={bulkBtn(AC.surface, AC.textSoft, `1px solid ${AC.border}`)}>Next</button>
              <button disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} style={bulkBtn(AC.surface, AC.textSoft, `1px solid ${AC.border}`)}>Last</button>
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

      {deepLinkMiss && (
        <div style={{
          margin: '8px 0', padding: '8px 12px', borderRadius: 8,
          background: AC.warnSoft, color: AC.text,
          fontFamily: AC.font, fontSize: 12.5,
        }}>
          Couldn't find an event for "{deepLinkMiss}". It may be deleted or renamed.
          <button onClick={() => setDeepLinkMiss(null)} style={{
            marginLeft: 8, background: 'transparent', border: 'none',
            color: AC.accent, fontWeight: 600, cursor: 'pointer',
          }}>Dismiss</button>
        </div>
      )}
      {editing && (
        <EventEditModal event={editing} places={places} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
