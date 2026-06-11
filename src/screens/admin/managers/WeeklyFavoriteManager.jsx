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
import { Star, Search, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { C } from '../../../theme';
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

export const WeeklyFavoriteManager = ({ adminFetch, places = [], events = [] }) => {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [kind, setKind] = useState('place');     // 'place' | 'event'
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

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

  const titleStyle = { fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: C.navy };
  const cardStyle = { background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 14, padding: 16 };

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
    <div style={{ display: 'inline-flex', borderRadius: 999, border: `1px solid ${C.divider}`, background: C.cream, padding: 3 }}>
      {['place', 'event'].map((k) => {
        const on = kind === k;
        return (
          <button key={k} onClick={() => setKind(k)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: on ? C.terracotta : 'transparent',
            color: on ? '#fff' : C.inkSoft,
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
            textTransform: 'capitalize',
          }}>{k}</button>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      {/* Current pick */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Star size={16} color={C.saffron} />
          <span style={titleStyle}>Feature This Week</span>
          {currentCard && (
            <span style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              background: currentCard.kind === 'event' ? `${C.sageDark}20` : `${C.terracotta}20`,
              color: currentCard.kind === 'event' ? C.sageDark : C.terracotta,
            }}>{currentCard.kind}</span>
          )}
        </div>
        {currentCard ? (
          <div>
            {currentCard.hero_photo && (
              <img
                src={currentCard.hero_photo}
                alt=""
                style={{ width: '100%', maxHeight: 220, borderRadius: 10, objectFit: 'cover', border: `1px solid ${C.divider}` }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy, fontSize: 15 }}>
                  {currentCard.name}
                </div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                  {currentCard.meta}
                </div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted, marginTop: 4 }}>
                  Week of {current.week_start} ·{' '}
                  <span style={{ color: current.source === 'admin' ? C.sageDark : C.muted, fontWeight: 700 }}>
                    {current.source === 'admin' ? 'Admin pick' : 'Auto'}
                  </span>
                </div>
              </div>
              <button
                onClick={currentCard.open}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 12px', fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Open {currentCard.kind} details <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.muted }}>
            No feature set for this week yet.
          </div>
        )}
      </div>

      {/* Set this week's favorite */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy }}>
            Set this week&apos;s feature
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <KindToggle />
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${C.divider}`, borderRadius: 10, padding: '8px 10px',
        }}>
          <Search size={15} color={C.muted} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === 'place' ? 'Search Tampa places…' : 'Search Tampa events…'}
            style={{
              border: 'none', outline: 'none', flex: 1,
              fontFamily: 'Albert Sans', fontSize: 14,
              background: 'transparent', color: C.navy,
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
                  background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 10,
                  padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {row.hero_photo ? (
                  <img src={row.hero_photo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: row.hue || C.lilac, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color={isEvent ? '#fff' : C.muted} />
                  </div>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy, display: 'block' }}>
                    {row.name}
                  </span>
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, display: 'block' }}>
                    {isEvent
                      ? `${row.event_type} · ${row.day_of_week || ''} ${row.time_label || ''}`
                      : `${row.area || row.city || ''}${row.rating ? ` · ★ ${row.rating}` : ''}`}
                  </span>
                </span>
              </button>
            );
          })}
          {query.trim() && matches.length === 0 && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, padding: 8 }}>
              No matching {kind === 'place' ? 'places' : 'events'}.
            </div>
          )}
        </div>
        {msg && (
          <div style={{ marginTop: 10, fontFamily: 'Albert Sans', fontSize: 12, color: msg.includes('✓') ? C.sageDark : C.coralDeep }}>
            {msg}
          </div>
        )}
      </div>

      {/* History */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy, marginBottom: 10 }}>
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
                  fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft,
                  borderBottom: `1px solid ${C.divider}`, paddingBottom: 6,
                }}
              >
                <span>{h.week_start}</span>
                <span style={{ color: C.navy, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target?.name || '—'}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                  color: target?.kind === 'event' ? C.sageDark : C.terracotta,
                }}>{target?.kind || '—'}</span>
                <span style={{ color: h.source === 'admin' ? C.sageDark : C.muted, textAlign: 'right' }}>{h.source}</span>
              </div>
            );
          })}
          {!history.length && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted }}>
              No history yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
