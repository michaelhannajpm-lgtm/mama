import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { C } from '../theme';

// Admin editor for app_config values. Currently the top-places default radius.
// Reads/writes via /api/admin/config (admin-gated).
const RADIUS_OPTS = [10, 20, 30, 50, 100, 150];

export const ConfigManager = ({ adminFetch }) => {
  const [radius, setRadius] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/config');
      const body = await res.json();
      const row = (body.rows || []).find(r => r.key === 'default_places_radius_miles');
      const val = row ? Number(row.value) : 50;
      setRadius(val); setSaved(val);
    } catch { setMsg('Could not load config'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_places_radius_miles', value: radius }),
      });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error || 'Save failed'); return; }
      setSaved(Number(body.row?.value ?? radius));
      setMsg('Saved ✓');
    } catch { setMsg('Save failed'); }
    finally { setBusy(false); }
  };

  const dirty = radius !== saved;

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: C.ink, margin: 0 }}>
          App configuration
        </h2>
        <button onClick={load} title="Reload" style={iconBtn}><RefreshCw size={14} /></button>
      </div>
      <p style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted, marginTop: 4 }}>
        Application-wide settings. Changes take effect on the next app load (no deploy needed).
      </p>

      <div style={card}>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700, color: C.ink }}>
          Default top-places radius
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted, marginTop: 2 }}>
          The fallback radius for the “Top places” section when a user hasn’t set their own.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {RADIUS_OPTS.map(r => {
            const active = radius === r;
            return (
              <button key={r} onClick={() => setRadius(r)} disabled={loading} style={{
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                background: active ? C.terracotta : C.paper,
                color: active ? '#fff' : C.ink,
                border: `1px solid ${active ? C.terracotta : C.divider}`,
                fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
              }}>{r} mi</button>
            );
          })}
          <input
            type="number" min={1} max={500} value={radius ?? ''} disabled={loading}
            onChange={e => setRadius(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
            style={{ ...field, width: 90 }} placeholder="custom"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={save} disabled={busy || loading || !dirty || radius == null} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: dirty ? C.terracotta : C.divider, color: '#fff', border: 'none',
            borderRadius: 10, padding: '9px 16px', fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
            cursor: dirty && !busy ? 'pointer' : 'default',
          }}>
            <Save size={14} /> {busy ? 'Saving…' : 'Save'}
          </button>
          {msg && <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
};

const card = { marginTop: 18, background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 14, padding: 18 };
const iconBtn = { background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 8, padding: 5, cursor: 'pointer', color: C.inkSoft, display: 'inline-flex' };
const field = { border: `1px solid ${C.divider}`, borderRadius: 8, padding: '7px 9px', fontFamily: 'Albert Sans', fontSize: 13, background: C.paper, color: C.ink };
