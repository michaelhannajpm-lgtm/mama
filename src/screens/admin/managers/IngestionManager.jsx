import { useState, useEffect, useCallback } from 'react';
import { AC } from '../admin-theme';
import { BusyOverlay } from '../components/primitives';
import { Play, RefreshCw, Server } from 'lucide-react';

const STATUS_COLOR = (s) => ({
  queued: AC.textMuted, running: AC.warn, succeeded: AC.success,
  partial: AC.warn, failed: AC.accent, canceled: AC.textMuted,
}[s] || AC.textMuted);

export const IngestionManager = ({ adminFetch }) => {
  const [kind, setKind] = useState('events');
  const [sourceId, setSourceId] = useState('');
  const [limit, setLimit] = useState(10);
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [sourceList, setSourceList] = useState({ places: [], events: [] });

  // Load the enabled sources from the DB once, grouped by kind. The Type/Source
  // selects below read from this; defaults to the first events source available.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await adminFetch('/api/admin/sources');
        const b = await r.json().catch(() => ({}));
        if (!r.ok || cancelled) return;
        const grouped = { places: [], events: [] };
        (b.rows || []).filter(s => s.enabled).forEach(s => {
          if (grouped[s.kind]) grouped[s.kind].push({ id: s.id, label: s.name });
        });
        setSourceList(grouped);
        const first = grouped.events[0] || grouped.places[0];
        if (first) {
          setKind(grouped.events.length ? 'events' : 'places');
          setSourceId(first.id);
        }
      } catch { /* ignore load errors */ }
    })();
    return () => { cancelled = true; };
  }, [adminFetch]);

  const loadJobs = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/ingestion/jobs');
      const b = await r.json().catch(() => ({}));
      if (r.ok) setJobs(b.rows || []);
    } catch { /* ignore poll errors */ }
  }, [adminFetch]);

  useEffect(() => {
    loadJobs();
    const t = setInterval(loadJobs, 4000);
    return () => clearInterval(t);
  }, [loadJobs]);

  const onKind = (k) => { setKind(k); setSourceId(sourceList[k][0]?.id || ''); };

  const launch = async () => {
    setBusy(true);
    try {
      const params = { limit: Number(limit) || 10 };
      const r = await adminFetch('/api/admin/ingestion/enqueue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, sourceId, params }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || r.status);
      await loadJobs();
    } catch (e) { alert(`Launch failed: ${e.message}`); }
    finally { setBusy(false); }
  };

  const fmt = (t) => t ? new Date(t).toLocaleString() : '—';

  return (
    <div style={{ position: 'relative' }}>
      <BusyOverlay show={busy} label="Working…" />
      <div className="rounded-2xl p-4 mb-4" style={{ background: AC.surface, border: `1px solid ${AC.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Server size={16} style={{ color: AC.success }} />
          <span style={{ fontFamily: 'Fraunces', fontSize: 16, color: AC.text }}>Run ingestion</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft }}>Type
            <select value={kind} onChange={e => onKind(e.target.value)}
              style={{ display: 'block', border: `1px solid ${AC.border}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
              <option value="events">Events</option><option value="places">Places</option>
            </select>
          </label>
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft }}>Source
            <select value={sourceId} onChange={e => setSourceId(e.target.value)} disabled={!sourceList[kind].length}
              style={{ display: 'block', border: `1px solid ${AC.border}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, minWidth: 240 }}>
              {sourceList[kind].length === 0
                ? <option value="">no sources</option>
                : sourceList[kind].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft }}>Limit
            <input type="number" value={limit} min={1} onChange={e => setLimit(e.target.value)}
              style={{ display: 'block', width: 80, border: `1px solid ${AC.border}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
          </label>
          <button disabled={busy || !sourceId} onClick={launch}
            style={{ background: AC.success, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: (busy || !sourceId) ? 0.6 : 1 }}>
            <Play size={14} /> {busy ? 'Launching…' : 'Launch'}
          </button>
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted, marginTop: 8 }}>
          Runs in the background. Imported items stage as <strong>needs review</strong> (hidden) until approved. Large Google runs may need a few launches.
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textMuted, marginLeft: 'auto' }}>auto-refreshing</span>
        <button onClick={loadJobs} style={{ background: 'transparent', border: `1px solid ${AC.border}`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: AC.textSoft }}><RefreshCw size={13} /></button>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${AC.border}`, background: AC.surface }}>
        {jobs.map(j => {
          const c = j.counts || {};
          return (
            <div key={j.id} className="px-3 py-2" style={{ borderBottom: `1px solid ${AC.border}` }}>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#fff', background: STATUS_COLOR(j.status), borderRadius: 999, padding: '2px 8px' }}>{j.status}</span>
                <span style={{ fontFamily: 'Fraunces', fontSize: 14, color: AC.text }}>{j.kind} · {j.source_id}</span>
                {j.total ? <span style={{ fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted }}>{j.cursor || 0}/{j.total}</span> : null}
                <span style={{ marginLeft: 'auto', fontFamily: 'Albert Sans', fontSize: 11, color: AC.textMuted }}>{fmt(j.created_at)}</span>
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textSoft, marginTop: 2 }}>
                {('created' in c || 'updated' in c) ? `created ${c.created || 0} · updated ${c.updated || 0} · review ${c.review || 0} · errors ${c.errors || 0}` : '—'}
                {j.error ? <span style={{ color: AC.accent }}> · {j.error}</span> : null}
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted }}>No ingestion jobs yet. Launch one above.</div>}
      </div>
    </div>
  );
};
