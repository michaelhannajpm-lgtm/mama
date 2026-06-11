import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { C } from '../theme';

// Admin editor for app_config values. Currently the top-places default radius.
// Reads/writes via /api/admin/config (admin-gated).
const RADIUS_OPTS = [10, 20, 30, 50, 100, 150];

export const ConfigManager = ({ adminFetch }) => {
  const [radius, setRadius] = useState(null);
  const [saved, setSaved] = useState(null);
  const [onlineS, setOnlineS] = useState(null);
  const [awayS, setAwayS] = useState(null);
  const [savedOnlineS, setSavedOnlineS] = useState(null);
  const [savedAwayS, setSavedAwayS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [presenceMsg, setPresenceMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/config');
      const body = await res.json();
      const rows = body.rows || [];
      const num = (key, dflt) => { const r = rows.find(x => x.key === key); return r ? Number(r.value) : dflt; };
      const rad = num('default_places_radius_miles', 50);
      setRadius(rad); setSaved(rad);
      const on = num('presence_online_max_seconds', 300);
      const aw = num('presence_away_max_seconds', 1800);
      setOnlineS(on); setSavedOnlineS(on);
      setAwayS(aw);  setSavedAwayS(aw);
    } catch { setMsg('Could not load config'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveKey = async (key, value) => {
    const res = await adminFetch('/api/admin/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Save failed');
    return Number(body.row?.value ?? value);
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try { setSaved(await saveKey('default_places_radius_miles', radius)); setMsg('Saved ✓'); }
    catch (e) { setMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const savePresence = async () => {
    if (!(onlineS < awayS)) { setPresenceMsg('Online window must be shorter than Away'); return; }
    setBusy(true); setPresenceMsg(null);
    try {
      setSavedOnlineS(await saveKey('presence_online_max_seconds', onlineS));
      setSavedAwayS(await saveKey('presence_away_max_seconds', awayS));
      setPresenceMsg('Saved ✓');
    } catch (e) { setPresenceMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const dirty = radius !== saved;
  const presenceDirty = onlineS !== savedOnlineS || awayS !== savedAwayS;

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
          Default Top Spots radius
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted, marginTop: 2 }}>
          The fallback radius for the “Top Spots” section when a user hasn’t set their own.
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

      {/* Presence (online / away / offline) thresholds */}
      <div style={card}>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700, color: C.ink }}>
          Presence thresholds
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted, marginTop: 2 }}>
          How recent a mom’s last activity must be to show as online vs. away. Older than the away
          window shows as offline.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
          <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Online within (seconds)</div>
            <input type="number" min={30} max={3600} value={onlineS ?? ''} disabled={loading}
              onChange={e => setOnlineS(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
              style={{ ...field, width: 120 }}/>
            <div style={{ color: C.inkMuted, marginTop: 3 }}>{onlineS ? `≈ ${(onlineS / 60).toFixed(onlineS % 60 ? 1 : 0)} min` : ''}</div>
          </label>
          <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Away within (seconds)</div>
            <input type="number" min={60} max={86400} value={awayS ?? ''} disabled={loading}
              onChange={e => setAwayS(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
              style={{ ...field, width: 120 }}/>
            <div style={{ color: C.inkMuted, marginTop: 3 }}>{awayS ? `≈ ${(awayS / 60).toFixed(awayS % 60 ? 1 : 0)} min` : ''}</div>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={savePresence} disabled={busy || loading || !presenceDirty || onlineS == null || awayS == null} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: presenceDirty ? C.terracotta : C.divider, color: '#fff', border: 'none',
            borderRadius: 10, padding: '9px 16px', fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
            cursor: presenceDirty && !busy ? 'pointer' : 'default',
          }}>
            <Save size={14} /> {busy ? 'Saving…' : 'Save'}
          </button>
          {presenceMsg && <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted }}>{presenceMsg}</span>}
        </div>
      </div>
    </div>
  );
};

const card = { marginTop: 18, background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 14, padding: 18 };
const iconBtn = { background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 8, padding: 5, cursor: 'pointer', color: C.inkSoft, display: 'inline-flex' };
const field = { border: `1px solid ${C.divider}`, borderRadius: 8, padding: '7px 9px', fontFamily: 'Albert Sans', fontSize: 13, background: C.paper, color: C.ink };
