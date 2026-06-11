import { useEffect, useState } from 'react';
import { Star, Search, Check } from 'lucide-react';
import { C } from '../../../theme';

export const WeeklyFavoriteManager = ({ adminFetch, places = [] }) => {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
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

  const setFavorite = async (placeId) => {
    setBusy(true); setMsg('');
    try {
      const r = await adminFetch('/api/admin/weekly-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId, city: 'Tampa' }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || `HTTP ${r.status}`);
      setMsg("Saved this week’s favorite ✓");
      load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const flat = Array.isArray(places) ? places : Object.values(places || {}).flat();
  const matches = query.trim()
    ? flat.filter((p) => (p.name || '').toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const titleStyle = { fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: C.navy };
  const cardStyle = { background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 14, padding: 16 };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      {/* Current pick */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Star size={16} color={C.saffron} />
          <span style={titleStyle}>Local Favorite This Week</span>
        </div>
        {current ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {current.places?.hero_photo && (
              <img
                src={current.places.hero_photo}
                alt=""
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }}
              />
            )}
            <div>
              <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy }}>
                {current.places?.name || `Place ${current.place_id}`}
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft }}>
                Week of {current.week_start} &middot;{' '}
                <span style={{ color: current.source === 'admin' ? C.sageDark : C.muted, fontWeight: 700 }}>
                  {current.source === 'admin' ? 'Admin pick' : 'Auto'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.muted }}>
            No favorite set for this week yet.
          </div>
        )}
      </div>

      {/* Set this week's favorite */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy, marginBottom: 10 }}>
          Set this week&apos;s favorite
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${C.divider}`, borderRadius: 10, padding: '8px 10px',
        }}>
          <Search size={15} color={C.muted} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tampa places…"
            style={{
              border: 'none', outline: 'none', flex: 1,
              fontFamily: 'Albert Sans', fontSize: 14,
              background: 'transparent', color: C.navy,
            }}
          />
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {matches.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => setFavorite(p.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 10,
                padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>
                {p.name}
                {p.area ? (
                  <span style={{ color: C.muted, fontWeight: 500 }}> &middot; {p.area}</span>
                ) : null}
              </span>
              <Check size={15} color={C.sageDark} />
            </button>
          ))}
        </div>
        {msg && (
          <div style={{ marginTop: 10, fontFamily: 'Albert Sans', fontSize: 12, color: C.coralDeep }}>
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
          {history.slice(0, 12).map((h) => (
            <div
              key={h.id}
              style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft,
                borderBottom: `1px solid ${C.divider}`, paddingBottom: 6,
              }}
            >
              <span>{h.week_start}</span>
              <span style={{ color: C.navy, fontWeight: 700 }}>{h.places?.name || '—'}</span>
              <span style={{ color: h.source === 'admin' ? C.sageDark : C.muted }}>{h.source}</span>
            </div>
          ))}
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
