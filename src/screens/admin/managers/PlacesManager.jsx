import { useState, useMemo, useEffect } from 'react';
import { AC } from '../admin-theme';
import { navigateRecord, navigateSection, currentRecordRef } from '../lib/adminRouter';
import { BusyOverlay } from '../components/primitives';
import { useConfirm } from '../components/ConfirmDialog';
import { Check, EyeOff, X, Pencil, MapPin, Eye, Archive, Trash2, Download, Plus } from 'lucide-react';
import { PlaceEditModal } from './PlaceEditModal';
import { PlacesMap } from './PlacesMap';
import { MultiSelect, CollapsibleSearch, TypeaheadSelect, ViewMenu, StatusChips } from './AdminFilters';
import { hasRealPhoto, statusColor, rowActionsFor } from './adminRows';
import { DescriptionCell } from './DescriptionCell';

const CATS = ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];
const ORIGINS = ['curated', 'google', 'event'];
const PAGE_SIZES = [10, 25, 50, 100];

// Lowercased haystack of every searchable field on a place.
const searchableOf = (r) => {
  const j = (v) => (Array.isArray(v) ? v.join(' ') : '');
  return [
    r.name, r.slug, r.area, r.city, r.address, r.phone, r.description,
    r.category, r.badge, r.website, r.reference_url,
    j(r.tags), j(r.good_for), j(r.aka),
  ].filter(Boolean).join(' ').toLowerCase();
};

// Apply every filter EXCEPT status. Shared by `filtered` and the per-status counts.
// All list filters are multi-select arrays: empty array = no constraint.
const matchesNonStatus = (r, { cats, origins, cities, areas, photo, minRating, q }) => {
  if (cats.length && !cats.includes(r.category)) return false;
  if (origins.length && !origins.includes(r.origin || 'curated')) return false;
  if (cities.length && !cities.includes(r.city || '')) return false;
  if (areas.length && !areas.includes(r.area || '')) return false;
  if (photo !== 'any') {
    const has = hasRealPhoto(r);
    if (photo === 'has' && !has) return false;
    if (photo === 'none' && has) return false;
  }
  if (minRating && !(r.rating >= minRating)) return false;
  if (q && !searchableOf(r).includes(q.toLowerCase())) return false;
  return true;
};

export const PlacesManager = ({ rows, adminFetch, onReload }) => {
  const confirm = useConfirm();
  const [view, setView] = useState('grid');
  const [status, setStatus] = useState('needs_review');
  const [cats, setCats] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [citySel, setCitySel] = useState([]);
  const [areaSel, setAreaSel] = useState([]);
  const [photo, setPhoto] = useState('any');
  const [minRating, setMinRating] = useState(0);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [deepLinkMiss, setDeepLinkMiss] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const nonStatusFilters = { cats, origins, cities: citySel, areas: areaSel, photo, minRating, q };

  const cityOptions = useMemo(
    () => [...new Set((rows || []).map(r => r.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const areaOptions = useMemo(
    () => [...new Set((rows || []).map(r => r.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filtered = useMemo(() => (rows || []).filter(r => {
    if (status !== 'all' && r.review_status !== status) return false;
    return matchesNonStatus(r, nonStatusFilters);
  }), [rows, status, cats, origins, citySel, areaSel, photo, minRating, q]);

  // Per-status counts: rows matching every active filter EXCEPT status.
  const statusCounts = useMemo(() => {
    const base = (rows || []).filter(r => matchesNonStatus(r, nonStatusFilters));
    const counts = { all: base.length };
    for (const s of ['needs_review', 'approved', 'rejected', 'archived']) counts[s] = base.filter(r => r.review_status === s).length;
    return counts;
  }, [rows, cats, origins, citySel, areaSel, photo, minRating, q]);

  // Reset pagination when filters or page size change.
  useEffect(() => { setPage(1); }, [status, cats, origins, citySel, areaSel, photo, minRating, q, pageSize]);

  // Deep-link target — the Featured manager dispatches this to open a place's
  // edit modal from outside the tab. Mirrors the Users → Mom-profiles flow.
  useEffect(() => {
    const match = (ref) => (rows || []).find(
      (r) => r.id === ref || r.slug === ref
    );
    let pendingId = null;
    try { pendingId = sessionStorage.getItem('gm-admin-open-place'); } catch { /* ignore */ }
    if (pendingId && rows?.length) {
      const target = match(pendingId);
      if (target) { setEditing(target); setDeepLinkMiss(null); }
      else setDeepLinkMiss(pendingId);
      try { sessionStorage.removeItem('gm-admin-open-place'); } catch { /* ignore */ }
    }
    const onOpen = (ev) => {
      const ref = ev?.detail?.id;
      if (!ref) return;
      const target = match(ref);
      if (target) { if (editing?.id !== target.id) setEditing(target); setDeepLinkMiss(null); }
      else if (rows?.length) setDeepLinkMiss(ref);
    };
    window.addEventListener('gm-admin-open-place', onOpen);
    return () => window.removeEventListener('gm-admin-open-place', onOpen);
  }, [rows]);

  useEffect(() => {
    if (editing && editing.id && !editing.__new) {
      navigateRecord('places', editing.id);
    } else if (!editing && currentRecordRef()) {
      navigateSection('places');
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
        <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: AC.accent, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
      'id', 'slug', 'name', 'category', 'badge', 'review_status', 'visible',
      'origin', 'area', 'city', 'address', 'phone', 'website', 'reference_url',
      'rating', 'review_count', 'price_level', 'lat', 'lng',
      'age_min', 'age_max', 'kid_age_ranges', 'value_tags', 'interest_tags',
      'mom_type_fit', 'neighborhoods', 'tags', 'good_for', 'amenities',
      'is_featured', 'top_rank', 'created_at', 'updated_at',
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
    a.download = `gomama-places-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ position: 'relative' }}>
      <BusyOverlay show={busy} label="Working…" />
      {/* Filter bar — Row 1: status chips (left) + view / export / add (right) */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <StatusChips status={status} setStatus={setStatus} counts={statusCounts} accent={AC.accent} />
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <button onClick={exportCsv} disabled={!filtered.length} style={{
            ...selectStyle, cursor: filtered.length ? 'pointer' : 'default',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            opacity: filtered.length ? 1 : 0.55, fontWeight: 600,
          }}>
            <Download size={13} /> Export ({filtered.length})
          </button>
          <button onClick={() => setEditing({ __new: true })} style={{
            background: AC.accent, color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 11px', fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <Plus size={13} /> Add place
          </button>
          <ViewMenu value={view} onChange={setView} options={[{ value: 'grid', label: 'Grid view' }, { value: 'map', label: 'Map view' }]} />
        </div>
      </div>

      {/* Filter bar — Row 2: search FIRST, then multi-select filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CollapsibleSearch value={q} onChange={setQ} accent={AC.accent} />
        <MultiSelect label="Source" options={ORIGINS} selected={origins} onChange={setOrigins} accent={AC.accent} />
        <MultiSelect label="Categories" options={CATS} selected={cats} onChange={setCats} accent={AC.accent} />
        <MultiSelect label="Areas" options={areaOptions} selected={areaSel} onChange={setAreaSel} accent={AC.accent} />
        <MultiSelect label="City" options={cityOptions} selected={citySel} onChange={setCitySel} accent={AC.accent} />
        <TypeaheadSelect label="Photo" value={photo} onChange={setPhoto} accent={AC.accent}
          options={[
            { value: 'any', label: 'Any photo' },
            { value: 'has', label: 'Has photo' },
            { value: 'none', label: 'No photo' },
          ]} />
        <TypeaheadSelect label="Rating" value={minRating} onChange={setMinRating} accent={AC.accent}
          options={[
            { value: 0, label: 'Any rating' },
            { value: 4, label: '4.0+' },
            { value: 4.5, label: '4.5+' },
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
            confirm({ title: `Delete ${selected.size} place${selected.size === 1 ? '' : 's'}?`, message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })
              .then((ok) => ok && post({ deleteIds: [...selected] }));
          }} style={bulkBtn(AC.accent, '#fff')}>
            <Trash2 size={12} className="inline mr-1" />Delete
          </button>
          {selected.size === 2 && (
            <button disabled={busy} onClick={() => {
              const [a, b] = [...selected];
              const ra = rows.find(r => r.id === a), rb = rows.find(r => r.id === b);
              if (!ra || !rb) { setSelected(new Set()); return; } // rows reloaded out from under the selection
              const keep = (ra.review_status === 'approved' || (ra.source_confidence || 0) >= (rb.source_confidence || 0)) ? a : b;
              const drop = keep === a ? b : a;
              confirm({ title: 'Merge duplicates?', message: `Keep "${rows.find(r => r.id === keep).name}" and drop the other. This cannot be undone.`, confirmLabel: 'Merge', tone: 'danger' })
                .then((ok) => ok && post({ merge: { keepId: keep, dropId: drop } }));
            }} style={bulkBtn(AC.warn, AC.text)}>
              Merge duplicates
            </button>
          )}
        </div>
      )}

      {view === 'grid' ? (
        <>
          {/* Rows */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${AC.border}`, background: AC.surface }}>
            {selectAllHeader}
            {pageRows.map(r => {
              const heroPhotoRow = r.place_photos?.find(p => p.is_hero) || r.place_photos?.[0];
              const hero = r.hero_photo || heroPhotoRow?.blob_url || heroPhotoRow?.url;
              const act = rowActionsFor(r);
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${AC.border}` }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  <div onClick={() => setEditing(r)} style={{ width: 44, height: 44, borderRadius: 8, background: hero ? `center/cover url(${hero})` : AC.neutralSoft, flexShrink: 0, cursor: 'pointer' }} />
                  <div className="flex-1 min-w-0">
                    <div onClick={() => setEditing(r)} style={{ fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 600, color: AC.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{r.name}</div>
                    <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted }}>
                      {r.category} · {r.area || '—'} {r.rating ? `· ★${r.rating}` : ''} · <span style={{ color: statusColor(r.review_status), fontWeight: 600 }}>{r.review_status}</span>
                      {r.review_status === 'approved' && !r.visible && <span style={{ color: AC.textMuted }}> · hidden</span>}
                      {r.origin === 'event' && <span style={{ marginLeft: 6, background: `color-mix(in srgb, ${AC.warn} 20%, transparent)`, color: AC.warn, borderRadius: 999, padding: '1px 6px', fontSize: 10.5, fontWeight: 700 }}>From event</span>}
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
                    <button title="Delete" disabled={busy} onClick={() => { confirm({ title: 'Delete place?', message: `Delete "${r.name}"? This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' }).then((ok) => ok && post({ delete: r.id })); }}
                      style={{ ...iconBtn, color: AC.accent }}><Trash2 size={15} /></button>
                  )}
                  <button title="Edit" onClick={() => setEditing(r)} style={{ ...iconBtn, color: AC.text }}><Pencil size={15} /></button>
                  {r.lat != null && (
                    <a title="Map" href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer"
                      style={{ color: AC.textMuted, padding: 4 }}><MapPin size={15} /></a>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted }}>No places match these filters.</div>
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
              <span style={{ fontWeight: 600, color: AC.text }}>Page {safePage} of {totalPages} · {filtered.length} places</span>
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
        <PlacesMap places={filtered} onSelect={setEditing} />
      )}

      {deepLinkMiss && (
        <div style={{
          margin: '8px 0', padding: '8px 12px', borderRadius: 8,
          background: AC.warnSoft, color: AC.text,
          fontFamily: AC.font, fontSize: 12.5,
        }}>
          Couldn't find a place for "{deepLinkMiss}". It may be deleted or renamed.
          <button onClick={() => setDeepLinkMiss(null)} style={{
            marginLeft: 8, background: 'transparent', border: 'none',
            color: AC.accent, fontWeight: 600, cursor: 'pointer',
          }}>Dismiss</button>
        </div>
      )}
      {editing && (
        <PlaceEditModal place={editing} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
