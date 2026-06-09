import { useState, useEffect, useCallback } from 'react';
import { C } from '../theme';
import { Play, RefreshCw, Server } from 'lucide-react';

const SOURCES = {
  places: [{ id: 'google-places-tampa', label: 'Google Places — Tampa' }],
  events: [
    { id: 'place-websites', label: 'Place websites (scrape approved places)' },
    { id: 'eventbrite-tampa-family', label: 'Eventbrite — personal account' },
  ],
};

const STATUS_COLOR = (s) => ({
  queued: C.inkMuted, running: C.saffron, succeeded: C.sageDark,
  partial: C.saffron, failed: C.terracotta, canceled: C.inkMuted,
}[s] || C.inkMuted);

export const IngestionManager = ({ adminFetch }) => {
  const [kind, setKind] = useState('events');
  const [sourceId, setSourceId] = useState('place-websites');
  const [limit, setLimit] = useState(10);
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);

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

  const onKind = (k) => { setKind(k); setSourceId(SOURCES[k][0].id); };

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
    <div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Server size={16} style={{ color: C.sageDark }} />
          <span style={{ fontFamily: 'Fraunces', fontSize: 16, color: C.ink }}>Run ingestion</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Type
            <select value={kind} onChange={e => onKind(e.target.value)}
              style={{ display: 'block', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
              <option value="events">Events</option><option value="places">Places</option>
            </select>
          </label>
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Source
            <select value={sourceId} onChange={e => setSourceId(e.target.value)}
              style={{ display: 'block', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, minWidth: 240 }}>
              {SOURCES[kind].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Limit
            <input type="number" value={limit} min={1} onChange={e => setLimit(e.target.value)}
              style={{ display: 'block', width: 80, border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
          </label>
          <button disabled={busy} onClick={launch}
            style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Play size={14} /> {busy ? 'Launching…' : 'Launch'}
          </button>
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted, marginTop: 8 }}>
          Runs in the background. Imported items stage as <strong>needs review</strong> (hidden) until approved. Large Google runs may need a few launches.
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted, marginLeft: 'auto' }}>auto-refreshing</span>
        <button onClick={loadJobs} style={{ background: 'transparent', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: C.inkSoft }}><RefreshCw size={13} /></button>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
        {jobs.map(j => {
          const c = j.counts || {};
          return (
            <div key={j.id} className="px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#fff', background: STATUS_COLOR(j.status), borderRadius: 999, padding: '2px 8px' }}>{j.status}</span>
                <span style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink }}>{j.kind} · {j.source_id}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted }}>{fmt(j.created_at)}</span>
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
                {('created' in c || 'updated' in c) ? `created ${c.created || 0} · updated ${c.updated || 0} · review ${c.review || 0} · errors ${c.errors || 0}` : '—'}
                {j.error ? <span style={{ color: C.terracotta }}> · {j.error}</span> : null}
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No ingestion jobs yet. Launch one above.</div>}
      </div>
    </div>
  );
};
