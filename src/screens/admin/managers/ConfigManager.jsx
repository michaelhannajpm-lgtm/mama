import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { AC } from '../admin-theme';
import { BusyOverlay } from '../components/primitives';

// Admin editor for app_config values, grouped into categories across two
// columns. Reads/writes via /api/admin/config (admin-gated); the public
// /api/config mirror exposes the same keys (camelCased) to the app.
const RADIUS_MIN = 1;
const RADIUS_MAX = 200;

export const ConfigManager = ({ adminFetch }) => {
  // Discovery & matching
  const [radius, setRadius] = useState(null);
  const [savedRadius, setSavedRadius] = useState(null);
  const [vod, setVod] = useState(true);           // default verified-only discovery
  const [savedVod, setSavedVod] = useState(true);
  // Presence
  const [onlineS, setOnlineS] = useState(null);
  const [awayS, setAwayS] = useState(null);
  const [savedOnlineS, setSavedOnlineS] = useState(null);
  const [savedAwayS, setSavedAwayS] = useState(null);
  // Trust & safety
  const [reqSocial, setReqSocial] = useState(true);
  const [savedReqSocial, setSavedReqSocial] = useState(true);
  // Monetization
  const [dmLimit, setDmLimit] = useState(null);
  const [savedDmLimit, setSavedDmLimit] = useState(null);
  const [price, setPrice] = useState(null);
  const [savedPrice, setSavedPrice] = useState(null);
  const [trialDays, setTrialDays] = useState(null);
  const [savedTrialDays, setSavedTrialDays] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [presenceMsg, setPresenceMsg] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState(null);
  const [vodMsg, setVodMsg] = useState(null);
  const [dmMsg, setDmMsg] = useState(null);
  const [plusMsg, setPlusMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/config');
      const body = await res.json();
      const rows = body.rows || [];
      const num = (key, dflt) => { const r = rows.find(x => x.key === key); return r ? Number(r.value) : dflt; };
      const bool = (key, dflt) => { const r = rows.find(x => x.key === key); return r ? (r.value === true || r.value === 'true') : dflt; };
      const rad = num('default_places_radius_miles', 50);
      setRadius(rad); setSavedRadius(rad);
      const v = bool('default_verified_only_discovery', true);
      setVod(v); setSavedVod(v);
      const on = num('presence_online_max_seconds', 300);
      const aw = num('presence_away_max_seconds', 1800);
      setOnlineS(on); setSavedOnlineS(on);
      setAwayS(aw);  setSavedAwayS(aw);
      const rs = bool('verified_requires_social', true);
      setReqSocial(rs); setSavedReqSocial(rs);
      const dl = num('dm_free_message_limit', 3);
      setDmLimit(dl); setSavedDmLimit(dl);
      const pr = num('plus_price_monthly', 7.99);
      setPrice(pr); setSavedPrice(pr);
      const td = num('plus_trial_days', 7);
      setTrialDays(td); setSavedTrialDays(td);
    } catch { setMsg('Could not load config'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Returns the saved value coerced (Number for numeric keys, raw otherwise).
  const saveKey = async (key, value) => {
    const res = await adminFetch('/api/admin/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Save failed');
    return body.row?.value ?? value;
  };

  const saveRadius = async () => {
    setBusy(true); setMsg(null);
    try { setSavedRadius(Number(await saveKey('default_places_radius_miles', radius))); setMsg('Saved ✓'); }
    catch (e) { setMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const saveVod = async (val) => {
    setBusy(true); setVodMsg(null);
    try {
      const saved = await saveKey('default_verified_only_discovery', val);
      const b = saved === true || saved === 'true';
      setVod(b); setSavedVod(b); setVodMsg('Saved ✓');
    } catch (e) { setVod(savedVod); setVodMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const savePresence = async () => {
    if (!(onlineS < awayS)) { setPresenceMsg('Online window must be shorter than Away'); return; }
    setBusy(true); setPresenceMsg(null);
    try {
      setSavedOnlineS(Number(await saveKey('presence_online_max_seconds', onlineS)));
      setSavedAwayS(Number(await saveKey('presence_away_max_seconds', awayS)));
      setPresenceMsg('Saved ✓');
    } catch (e) { setPresenceMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const saveReqSocial = async (val) => {
    setBusy(true); setVerifyMsg(null);
    try {
      const saved = await saveKey('verified_requires_social', val);
      const b = saved === true || saved === 'true';
      setReqSocial(b); setSavedReqSocial(b); setVerifyMsg('Saved ✓');
    } catch (e) { setReqSocial(savedReqSocial); setVerifyMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const saveDmLimit = async () => {
    setBusy(true); setDmMsg(null);
    try { setSavedDmLimit(Number(await saveKey('dm_free_message_limit', dmLimit))); setDmMsg('Saved ✓'); }
    catch (e) { setDmMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const savePlus = async () => {
    setBusy(true); setPlusMsg(null);
    try {
      setSavedPrice(Number(await saveKey('plus_price_monthly', price)));
      setSavedTrialDays(Number(await saveKey('plus_trial_days', trialDays)));
      setPlusMsg('Saved ✓');
    } catch (e) { setPlusMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const radiusDirty = radius !== savedRadius;
  const presenceDirty = onlineS !== savedOnlineS || awayS !== savedAwayS;
  const dmDirty = dmLimit !== savedDmLimit;
  const plusDirty = price !== savedPrice || trialDays !== savedTrialDays;

  return (
    <div style={{ position: 'relative', padding: 24, maxWidth: 1000 }}>
      <BusyOverlay show={busy} label="Saving…" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: AC.text, margin: 0 }}>
          App configuration
        </h2>
        <button onClick={load} title="Reload" style={iconBtn}><RefreshCw size={14} /></button>
      </div>
      <p style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted, marginTop: 4 }}>
        Application-wide settings. Changes take effect on the next app load (no deploy needed).
      </p>

      {/* Paired 2-col grid — each row has two cards aligned at equal height
          via align-items: stretch + flex content fill. The category headers
          live inside cards so they don't drift columns out of sync. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
        gap: 16,
        marginTop: 12,
        alignItems: 'stretch',
      }}>
        <Card title="Default Top Spots radius" category="Discovery & matching"
          desc="The fallback radius for the “Top Spots” section when a user hasn’t set their own.">
          <RadiusSlider value={radius} onChange={setRadius} disabled={loading || busy} />
          <SaveRow onSave={saveRadius} dirty={radiusDirty} disabled={busy || loading || radius == null} busy={busy} msg={msg} />
        </Card>

        <Card title="Verified badge policy" category="Trust & safety"
          desc={<>When <strong>on</strong>, a mom must link a social account (Instagram or Facebook) <em>and</em> complete
            her profile to earn the Verified badge — the verified-only moat. When <strong>off</strong>, completing
            every profile step alone verifies her.</>}>
          <Toggle on={reqSocial} disabled={busy || loading} onToggle={() => saveReqSocial(!reqSocial)}
            label={reqSocial ? 'Require a linked social account' : 'Social account not required'} msg={verifyMsg} />
        </Card>

        <Card title="Default verified-only discovery" category="Discovery & matching"
          desc="When on, new users see only verified moms in the nearby discovery feed until they change the filter themselves.">
          <Toggle on={vod} disabled={busy || loading} onToggle={() => saveVod(!vod)}
            label={vod ? 'Show verified moms only by default' : 'Show all moms by default'} msg={vodMsg} />
        </Card>

        <Card title="Free DM message limit" category="Monetization"
          desc={<>Messages a free mom can send each match before Plus is required.
            <span style={{ color: AC.accent, fontWeight: 700 }}> Protected lever — default 3.</span> Raising it weakens Plus conversion.</>}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {[3, 5, 10, 25].map(n => {
              const active = dmLimit === n;
              return (
                <button key={n} onClick={() => setDmLimit(n)} disabled={loading} style={{
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                  background: active ? AC.accent : AC.surface,
                  color: active ? '#fff' : AC.text,
                  border: `1px solid ${active ? AC.accent : AC.border}`,
                  fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
                }}>{n}</button>
              );
            })}
            <input type="number" min={1} max={50} value={dmLimit ?? ''} disabled={loading}
              onChange={e => setDmLimit(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
              style={{ ...field, width: 90 }} placeholder="custom"/>
          </div>
          <SaveRow onSave={saveDmLimit} dirty={dmDirty} disabled={busy || loading || dmLimit == null} busy={busy} msg={dmMsg} />
        </Card>

        <Card title="Presence thresholds" category="Presence"
          desc="How recent a mom’s last activity must be to show as online vs. away. Older than the away window shows as offline.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
            <label style={lbl}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Online within (seconds)</div>
              <input type="number" min={30} max={3600} value={onlineS ?? ''} disabled={loading}
                onChange={e => setOnlineS(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
                style={{ ...field, width: 120 }}/>
              <div style={{ color: AC.textMuted, marginTop: 3 }}>{onlineS ? `≈ ${(onlineS / 60).toFixed(onlineS % 60 ? 1 : 0)} min` : ''}</div>
            </label>
            <label style={lbl}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Away within (seconds)</div>
              <input type="number" min={60} max={86400} value={awayS ?? ''} disabled={loading}
                onChange={e => setAwayS(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
                style={{ ...field, width: 120 }}/>
              <div style={{ color: AC.textMuted, marginTop: 3 }}>{awayS ? `≈ ${(awayS / 60).toFixed(awayS % 60 ? 1 : 0)} min` : ''}</div>
            </label>
          </div>
          <SaveRow onSave={savePresence} dirty={presenceDirty} disabled={busy || loading || onlineS == null || awayS == null} busy={busy} msg={presenceMsg} />
        </Card>

        <Card title="Plus pricing" category="Monetization"
          desc="The monthly price and free-trial length shown on the Plus upsell screens. Display only — no real billing yet.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
            <label style={lbl}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Monthly price (USD)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: AC.textMuted }}>$</span>
                <input type="number" min={0} max={999} step="0.01" value={price ?? ''} disabled={loading}
                  onChange={e => setPrice(e.target.value === '' ? null : Number(e.target.value))}
                  style={{ ...field, width: 100 }}/>
              </div>
            </label>
            <label style={lbl}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Free trial (days)</div>
              <input type="number" min={0} max={90} value={trialDays ?? ''} disabled={loading}
                onChange={e => setTrialDays(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
                style={{ ...field, width: 100 }}/>
            </label>
          </div>
          <SaveRow onSave={savePlus} dirty={plusDirty} disabled={busy || loading || price == null || trialDays == null} busy={busy} msg={plusMsg} />
        </Card>
      </div>
    </div>
  );
};

// ── Small building blocks ──────────────────────────────────────────────────

const Card = ({ title, category, desc, children }) => (
  <div style={card}>
    {category && (
      <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800, letterSpacing: '.10em',
        textTransform: 'uppercase', color: AC.textMuted, marginBottom: 6 }}>
        {category}
      </div>
    )}
    <div style={{ fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700, color: AC.text }}>{title}</div>
    <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {children}
    </div>
  </div>
);

// Range-slider control for the Top-Spots radius. Replaces 6 preset buttons +
// a custom number input to recover vertical space on the Config card.
const RadiusSlider = ({ value, onChange, disabled }) => {
  const v = value ?? 50;
  const fillPct = Math.max(0, Math.min(100, ((v - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100));
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 500, color: AC.text, letterSpacing: '-.02em', lineHeight: 1 }}>
          {value ?? '—'}
          <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 600, color: AC.textMuted, marginLeft: 6 }}>mi</span>
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted, letterSpacing: '.04em' }}>
          {RADIUS_MIN}–{RADIUS_MAX} mi
        </div>
      </div>
      <input
        type="range"
        min={RADIUS_MIN}
        max={RADIUS_MAX}
        step={1}
        value={v}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          appearance: 'none',
          height: 6,
          borderRadius: 999,
          background: `linear-gradient(to right, ${AC.accent} 0%, ${AC.accent} ${fillPct}%, ${AC.border} ${fillPct}%, ${AC.border} 100%)`,
          outline: 'none',
          cursor: disabled ? 'default' : 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {[10, 25, 50, 100, 150].map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            disabled={disabled}
            style={{
              background: 'transparent', border: 'none', padding: '2px 6px',
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600,
              color: value === p ? AC.accent : AC.textMuted, cursor: disabled ? 'default' : 'pointer',
              letterSpacing: '.02em',
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};

const SaveRow = ({ onSave, dirty, disabled, busy, msg }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
    <button onClick={onSave} disabled={disabled || !dirty} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: dirty ? AC.accent : AC.border, color: '#fff', border: 'none',
      borderRadius: 10, padding: '9px 16px', fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
      cursor: dirty && !disabled ? 'pointer' : 'default',
    }}>
      <Save size={14} /> {busy ? 'Saving…' : 'Save'}
    </button>
    {msg && <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted }}>{msg}</span>}
  </div>
);

const Toggle = ({ on, disabled, onToggle, label, msg }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
    <button onClick={onToggle} disabled={disabled} aria-pressed={on} style={{
      width: 52, height: 30, borderRadius: 999, border: 'none', padding: 3,
      cursor: disabled ? 'default' : 'pointer',
      background: on ? AC.accent : AC.border,
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .2s', flexShrink: 0,
    }}>
      <span style={{ width: 24, height: 24, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }}/>
    </button>
    <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: AC.text }}>{label}</span>
    {msg && <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted }}>{msg}</span>}
  </div>
);

const card = { background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: 14, padding: 18,
  display: 'flex', flexDirection: 'column', height: '100%' };
const iconBtn = { background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: 8, padding: 5, cursor: 'pointer', color: AC.textSoft, display: 'inline-flex' };
const field = { border: `1px solid ${AC.border}`, borderRadius: 8, padding: '7px 9px', fontFamily: 'Albert Sans', fontSize: 13, background: AC.surface, color: AC.text };
const lbl = { fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.text };
