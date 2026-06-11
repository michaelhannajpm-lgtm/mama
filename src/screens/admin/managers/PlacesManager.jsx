import { useState, useMemo, useEffect } from 'react';
import { C } from '../../../theme';
import { Check, EyeOff, X, Pencil, MapPin, Eye, Archive, Trash2 } from 'lucide-react';
import { PlaceEditModal } from './PlaceEditModal';
import { PlacesMap } from './PlacesMap';
import { MultiSelect, CollapsibleSearch, ViewMenu, StatusChips } from './AdminFilters';
import { hasRealPhoto, statusColor, rowActionsFor } from './adminRows';

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
        <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: C.terracotta, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
        <StatusChips status={status} setStatus={setStatus} counts={statusCounts} accent={C.terracotta} />
        <div style={{ marginLeft: 'auto' }}>
          <ViewMenu value={view} onChange={setView} options={[{ value: 'grid', label: 'Grid view' }, { value: 'map', label: 'Map view' }]} />
        </div>
      </div>

      {/* Filter bar — Row 2: multi-select source / categories / areas / city + photo + rating */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <MultiSelect label="Source" options={ORIGINS} selected={origins} onChange={setOrigins} accent={C.terracotta} />
        <MultiSelect label="Categories" options={CATS} selected={cats} onChange={setCats} accent={C.terracotta} />
        <MultiSelect label="Areas" options={areaOptions} selected={areaSel} onChange={setAreaSel} accent={C.terracotta} />
        <MultiSelect label="City" options={cityOptions} selected={citySel} onChange={setCitySel} accent={C.terracotta} />
        <select value={photo} onChange={e => setPhoto(e.target.value)} style={selectStyle}>
          <option value="any">Any photo</option>
          <option value="has">Has photo</option>
          <option value="none">No photo</option>
        </select>
        <select value={minRating} onChange={e => setMinRating(+e.target.value)} style={selectStyle}>
          <option value={0}>any rating</option><option value={4}>4.0+</option><option value={4.5}>4.5+</option>
        </select>
      </div>

      {/* Filter bar — Row 3: collapsible search */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CollapsibleSearch value={q} onChange={setQ} accent={C.terracotta} />
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
            if (confirm(`Delete ${selected.size} places? This cannot be undone.`)) post({ deleteIds: [...selected] });
          }} style={bulkBtn(C.terracotta, '#fff')}>
            <Trash2 size={12} className="inline mr-1" />Delete
          </button>
          {selected.size === 2 && (
            <button disabled={busy} onClick={() => {
              const [a, b] = [...selected];
              const ra = rows.find(r => r.id === a), rb = rows.find(r => r.id === b);
              if (!ra || !rb) { setSelected(new Set()); return; } // rows reloaded out from under the selection
              const keep = (ra.review_status === 'approved' || (ra.source_confidence || 0) >= (rb.source_confidence || 0)) ? a : b;
              const drop = keep === a ? b : a;
              if (confirm(`Merge: keep "${rows.find(r => r.id === keep).name}", drop the other?`)) post({ merge: { keepId: keep, dropId: drop } });
            }} style={bulkBtn(C.saffron, C.ink)}>
              Merge duplicates
            </button>
          )}
        </div>
      )}

      {view === 'grid' ? (
        <>
          {/* Rows */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
            {selectAllHeader}
            {pageRows.map(r => {
              const heroPhotoRow = r.place_photos?.find(p => p.is_hero) || r.place_photos?.[0];
              const hero = r.hero_photo || heroPhotoRow?.blob_url || heroPhotoRow?.url;
              const act = rowActionsFor(r);
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  <div onClick={() => setEditing(r)} style={{ width: 44, height: 44, borderRadius: 8, background: hero ? `center/cover url(${hero})` : C.lilac, flexShrink: 0, cursor: 'pointer' }} />
                  <div className="flex-1 min-w-0">
                    <div onClick={() => setEditing(r)} style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{r.name}</div>
                    <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
                      {r.category} · {r.area || '—'} {r.rating ? `· ★${r.rating}` : ''} · <span style={{ color: statusColor(r.review_status), fontWeight: 600 }}>{r.review_status}</span>
                      {r.review_status === 'approved' && !r.visible && <span style={{ color: C.inkMuted }}> · hidden</span>}
                      {r.origin === 'event' && <span style={{ marginLeft: 6, background: `${C.saffron}33`, color: C.saffron, borderRadius: 999, padding: '1px 6px', fontSize: 10.5, fontWeight: 700 }}>From event</span>}
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
                    <button title="Delete" disabled={busy} onClick={() => { if (confirm(`Delete "${r.name}"? This cannot be undone.`)) post({ delete: r.id }); }}
                      style={{ ...iconBtn, color: C.terracotta }}><Trash2 size={15} /></button>
                  )}
                  <button title="Edit" onClick={() => setEditing(r)} style={{ ...iconBtn, color: C.ink }}><Pencil size={15} /></button>
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
              <span style={{ fontWeight: 600, color: C.ink }}>Page {safePage} of {totalPages} · {filtered.length} places</span>
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
        <PlacesMap places={filtered} onSelect={setEditing} />
      )}

      {editing && (
        <PlaceEditModal place={editing} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
