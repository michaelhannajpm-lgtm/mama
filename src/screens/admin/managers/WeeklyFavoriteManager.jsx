// ============================================================================
// Featured / Weekly Favorite manager.
//
// Lets a curator pin either a Place OR an Event as the city's "Feature this
// week" — the same surface the phone-app HomeTab calls /api/local-favorite to
// render. Polymorphism (place vs event) is gated by the schema-level XOR
// constraint; the picker forces an explicit type toggle so the admin always
// knows which "kind" they're saving.
//
// The current pick card shows the full hero image and an "Open detail" link
// that navigates the admin to the place / event detail screen.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { Star, Search, ExternalLink, Calendar, MapPin, ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import { AC } from '../admin-theme';
import { BusyOverlay } from '../components/primitives';
import { navigateSection } from '../lib/adminRouter';

// Deep-link helpers — mirror the sessionStorage handshake used elsewhere in
// the console (see UsersSection.jsx). The relevant manager listens for the
// event on mount and auto-opens its edit modal.
const openPlaceInAdmin = (placeId) => {
  try { sessionStorage.setItem('gm-admin-open-place', placeId); } catch { /* ignore */ }
  navigateSection('places');
  window.dispatchEvent(new CustomEvent('gm-admin-open-place', { detail: { id: placeId } }));
};
const openEventInAdmin = (eventId) => {
  try { sessionStorage.setItem('gm-admin-open-event', eventId); } catch { /* ignore */ }
  navigateSection('events');
  window.dispatchEvent(new CustomEvent('gm-admin-open-event', { detail: { id: eventId } }));
};

export const WeeklyFavoriteManager = ({ adminFetch, places = [], events = [], onReload }) => {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [kind, setKind] = useState('place');     // 'place' | 'event'
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [featQuery, setFeatQuery] = useState('');   // search box for featuring a new place

  const load = () => {
    adminFetch('/api/admin/weekly-favorite?city=Tampa')
      .then((r) => r.json())
      .then((d) => { setCurrent(d.current || null); setHistory(d.history || []); })
      .catch(() => setMsg('Could not load weekly favorite'));
  };
  useEffect(load, [adminFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFavorite = async (idKey, idValue) => {
    setBusy(true); setMsg('');
    try {
      const r = await adminFetch('/api/admin/weekly-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [idKey]: idValue, city: 'Tampa' }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || `HTTP ${r.status}`);
      setMsg("Saved this week’s favorite ✓");
      setQuery('');
      load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const flatPlaces = Array.isArray(places) ? places : Object.values(places || {}).flat();
  const flatEvents = Array.isArray(events) ? events : Object.values(events || {}).flat();

  // ── Featured places (is_featured), auto-grouped by neighborhood (area) ──────
  // The app's "Top places" pin every is_featured place (ordered by top_rank);
  // here we surface and curate that set, grouped by the place's own area so a
  // curator can keep several featured per neighborhood.
  const byRank = (a, b) => (a.top_rank ?? 1e9) - (b.top_rank ?? 1e9) || (b.rating || 0) - (a.rating || 0);
  const featuredGroups = useMemo(() => {
    const groups = new Map();
    for (const p of flatPlaces.filter((p) => p.is_featured)) {
      const area = (p.area || '').trim() || 'Unassigned';
      if (!groups.has(area)) groups.set(area, []);
      groups.get(area).push(p);
    }
    for (const list of groups.values()) list.sort(byRank);
    // Real neighborhoods first (alpha), "Unassigned" last.
    return [...groups.entries()].sort(([a], [b]) =>
      a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b));
  }, [flatPlaces]);
  const featuredCount = featuredGroups.reduce((n, [, list]) => n + list.length, 0);

  // Search results for featuring a NEW place (visible, not already featured).
  const featMatches = useMemo(() => {
    const q = featQuery.trim().toLowerCase();
    if (!q) return [];
    return flatPlaces
      .filter((p) => p.visible !== false && !p.is_featured && (p.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [featQuery, flatPlaces]);

  const patchPlace = async (id, patch, note) => {
    setBusy(true); setMsg('');
    try {
      const r = await adminFetch('/api/admin/places/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || `HTTP ${r.status}`);
      setMsg(note || 'Updated featured places ✓');
      if (onReload) await onReload();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  // Feature a place — assign it the next rank within its own neighborhood.
  const featurePlace = (p) => {
    const area = (p.area || '').trim() || 'Unassigned';
    const peers = featuredGroups.find(([a]) => a === area)?.[1] || [];
    const nextRank = peers.reduce((m, r) => Math.max(m, r.top_rank || 0), 0) + 1;
    setFeatQuery('');
    return patchPlace(p.id, { is_featured: true, top_rank: nextRank }, `Featured “${p.name}” ✓`);
  };

  const unfeature = (p) =>
    patchPlace(p.id, { is_featured: false, top_rank: null }, `Removed “${p.name}” from featured ✓`);

  // Swap top_rank with the adjacent place in the same neighborhood group.
  const reorder = async (list, idx, dir) => {
    const a = list[idx];
    const b = list[idx + dir];
    if (!a || !b) return;
    const ra = a.top_rank ?? idx + 1;
    const rb = b.top_rank ?? idx + 1 + dir;
    await patchPlace(a.id, { top_rank: rb }, 'Reordered ✓');
    await patchPlace(b.id, { top_rank: ra }, 'Reordered ✓');
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    if (kind === 'place') {
      return flatPlaces
        .filter((p) => p.visible !== false && (p.name || '').toLowerCase().includes(q))
        .slice(0, 8);
    }
    return flatEvents
      .filter((e) => e.visible !== false && (e.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, kind, flatPlaces, flatEvents]);

  const titleStyle = { fontFamily: 'Albert Sans', fontSize: 16, fontWeight: 700, color: AC.text, letterSpacing: '-.01em' };
  const cardStyle = { background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: 14, padding: 16 };

  // Derive a unified "card" view of the current pick — works for both kinds.
  const currentCard = (() => {
    if (!current) return null;
    if (current.places) {
      const p = current.places;
      return {
        kind: 'place', id: p.id,
        name: p.name, hero_photo: p.hero_photo,
        meta: `${p.area || p.city || ''}${p.rating ? ` · ★ ${p.rating}` : ''}`,
        open: () => openPlaceInAdmin(p.id),
      };
    }
    if (current.events) {
      const e = current.events;
      return {
        kind: 'event', id: e.id,
        name: e.name, hero_photo: e.hero_photo,
        meta: `${e.event_type} · ${e.day_of_week || ''} ${e.time_label || ''} ${e.place_name ? `· ${e.place_name}` : ''}`,
        open: () => openEventInAdmin(e.id),
      };
    }
    return null;
  })();

  const KindToggle = () => (
    <div style={{ display: 'inline-flex', borderRadius: 999, border: `1px solid ${AC.border}`, background: AC.bg, padding: 3 }}>
      {['place', 'event'].map((k) => {
        const on = kind === k;
        return (
          <button key={k} onClick={() => setKind(k)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: on ? AC.accent : 'transparent',
            color: on ? '#fff' : AC.textSoft,
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
            textTransform: 'capitalize',
          }}>{k}</button>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 16, maxWidth: 720 }}>
      <BusyOverlay show={busy} label="Saving…" />
      {/* Current pick */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Star size={16} style={{ color: AC.warn }} />
          <span style={titleStyle}>Feature This Week</span>
          {currentCard && (
            <span style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              background: currentCard.kind === 'event' ? `color-mix(in srgb, ${AC.success} 13%, transparent)` : `color-mix(in srgb, ${AC.accent} 13%, transparent)`,
              color: currentCard.kind === 'event' ? AC.success : AC.accent,
            }}>{currentCard.kind}</span>
          )}
        </div>
        {currentCard ? (
          <div>
            {currentCard.hero_photo && (
              <img
                src={currentCard.hero_photo}
                alt=""
                style={{ width: '100%', maxHeight: 220, borderRadius: 10, objectFit: 'cover', border: `1px solid ${AC.border}` }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: AC.text, fontSize: 15 }}>
                  {currentCard.name}
                </div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textSoft, marginTop: 2 }}>
                  {currentCard.meta}
                </div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted, marginTop: 4 }}>
                  Week of {current.week_start} ·{' '}
                  <span style={{ color: current.source === 'admin' ? AC.success : AC.textMuted, fontWeight: 700 }}>
                    {current.source === 'admin' ? 'Admin pick' : 'Auto'}
                  </span>
                </div>
              </div>
              <button
                onClick={currentCard.open}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: AC.accent, color: AC.accentText, border: 'none', borderRadius: 8,
                  padding: '6px 12px', fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Open {currentCard.kind} details <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted }}>
            No feature set for this week yet.
          </div>
        )}
      </div>

      {/* Set this week's favorite */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: AC.text }}>
            Set this week&apos;s feature
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <KindToggle />
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${AC.border}`, borderRadius: 10, padding: '8px 10px',
        }}>
          <Search size={15} style={{ color: AC.textMuted }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === 'place' ? 'Search Tampa places…' : 'Search Tampa events…'}
            style={{
              border: 'none', outline: 'none', flex: 1,
              fontFamily: 'Albert Sans', fontSize: 14,
              background: 'transparent', color: AC.text,
            }}
          />
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {matches.map((row) => {
            const isEvent = kind === 'event';
            const Icon = isEvent ? Calendar : MapPin;
            return (
              <button
                key={row.id}
                disabled={busy}
                onClick={() => setFavorite(isEvent ? 'event_id' : 'place_id', row.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: AC.bg, border: `1px solid ${AC.border}`, borderRadius: 10,
                  padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {row.hero_photo ? (
                  <img src={row.hero_photo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: row.hue || AC.neutralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} style={{ color: isEvent ? '#fff' : AC.textMuted }} />
                  </div>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: AC.text, display: 'block' }}>
                    {row.name}
                  </span>
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted, display: 'block' }}>
                    {isEvent
                      ? `${row.event_type} · ${row.day_of_week || ''} ${row.time_label || ''}`
                      : `${row.area || row.city || ''}${row.rating ? ` · ★ ${row.rating}` : ''}`}
                  </span>
                </span>
              </button>
            );
          })}
          {query.trim() && matches.length === 0 && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textMuted, padding: 8 }}>
              No matching {kind === 'place' ? 'places' : 'events'}.
            </div>
          )}
        </div>
        {msg && (
          <div style={{ marginTop: 10, fontFamily: 'Albert Sans', fontSize: 12, color: msg.includes('✓') ? AC.success : AC.accentHover }}>
            {msg}
          </div>
        )}
      </div>

      {/* Featured places — many per neighborhood, backed by is_featured/top_rank */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Star size={16} style={{ color: AC.warn }} />
          <span style={titleStyle}>Featured places</span>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
            background: `color-mix(in srgb, ${AC.accent} 9%, transparent)`, color: AC.accent, borderRadius: 999, padding: '2px 8px',
          }}>{featuredCount}</span>
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted, marginBottom: 12 }}>
          Grouped by neighborhood. These pin to the top of the app’s “Top places”. Set the same toggle from any place’s detail editor.
        </div>

        {/* Add a place to featured */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${AC.border}`, borderRadius: 10, padding: '8px 10px',
        }}>
          <Search size={15} style={{ color: AC.textMuted }} />
          <input
            value={featQuery}
            onChange={(e) => setFeatQuery(e.target.value)}
            placeholder="Search places to feature…"
            style={{
              border: 'none', outline: 'none', flex: 1,
              fontFamily: 'Albert Sans', fontSize: 14, background: 'transparent', color: AC.text,
            }}
          />
        </div>
        {featMatches.length > 0 && (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {featMatches.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => featurePlace(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: AC.bg, border: `1px solid ${AC.border}`, borderRadius: 10,
                  padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {p.hero_photo
                  ? <img src={p.hero_photo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 32, height: 32, borderRadius: 8, background: AC.neutralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MapPin size={14} style={{ color: AC.textMuted }} /></div>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: AC.text, display: 'block' }}>{p.name}</span>
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted, display: 'block' }}>
                    {p.area || p.city || 'Unassigned'}{p.rating ? ` · ★ ${p.rating}` : ''}
                  </span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: AC.accent, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700 }}>
                  <Plus size={13} /> Feature
                </span>
              </button>
            ))}
          </div>
        )}
        {featQuery.trim() && featMatches.length === 0 && (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textMuted, padding: '8px 2px' }}>
            No matching unfeatured places.
          </div>
        )}

        {/* Grouped list */}
        <div style={{ marginTop: 14, display: 'grid', gap: 16 }}>
          {featuredGroups.map(([area, list]) => (
            <div key={area}>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
                textTransform: 'uppercase', color: AC.textMuted, marginBottom: 6,
              }}>
                {area} · {list.length}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {list.map((p, idx) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: AC.bg, border: `1px solid ${AC.border}`, borderRadius: 10, padding: '8px 10px',
                  }}>
                    <span style={{
                      width: 22, height: 22, flexShrink: 0, borderRadius: 6, background: `color-mix(in srgb, ${AC.accent} 9%, transparent)`,
                      color: AC.accent, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{p.top_rank ?? idx + 1}</span>
                    {p.hero_photo
                      ? <img src={p.hero_photo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 32, height: 32, borderRadius: 8, background: AC.neutralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MapPin size={14} style={{ color: AC.textMuted }} /></div>}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: AC.text, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <span style={{ fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted, display: 'block' }}>
                        {p.category || 'place'}{p.rating ? ` · ★ ${p.rating}` : ''}
                      </span>
                    </span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button title="Move up" disabled={busy || idx === 0} onClick={() => reorder(list, idx, -1)}
                        style={{ background: 'transparent', border: 'none', padding: 4, cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? AC.border : AC.textMuted }}>
                        <ChevronUp size={16} />
                      </button>
                      <button title="Move down" disabled={busy || idx === list.length - 1} onClick={() => reorder(list, idx, 1)}
                        style={{ background: 'transparent', border: 'none', padding: 4, cursor: idx === list.length - 1 ? 'default' : 'pointer', color: idx === list.length - 1 ? AC.border : AC.textMuted }}>
                        <ChevronDown size={16} />
                      </button>
                      <button title="Open details" disabled={busy} onClick={() => openPlaceInAdmin(p.id)}
                        style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: AC.text }}>
                        <ExternalLink size={15} />
                      </button>
                      <button title="Remove from featured" disabled={busy} onClick={() => unfeature(p)}
                        style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: AC.accent }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {featuredCount === 0 && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted }}>
              No featured places yet. Search above, or open any place and toggle “Feature as top place”.
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: AC.text, marginBottom: 10 }}>
          History
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {history.slice(0, 12).map((h) => {
            const target = h.events
              ? { kind: 'event', name: h.events.name }
              : h.places
                ? { kind: 'place', name: h.places.name }
                : null;
            return (
              <div
                key={h.id}
                style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 70px 90px',
                  gap: 8, alignItems: 'center',
                  fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textSoft,
                  borderBottom: `1px solid ${AC.border}`, paddingBottom: 6,
                }}
              >
                <span>{h.week_start}</span>
                <span style={{ color: AC.text, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target?.name || '—'}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                  color: target?.kind === 'event' ? AC.success : AC.accent,
                }}>{target?.kind || '—'}</span>
                <span style={{ color: h.source === 'admin' ? AC.success : AC.textMuted, textAlign: 'right' }}>{h.source}</span>
              </div>
            );
          })}
          {!history.length && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textMuted }}>
              No history yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
