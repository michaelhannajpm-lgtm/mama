import { useEffect, useState } from 'react';
import { Save, RefreshCw, Code2, ChevronDown, ChevronRight } from 'lucide-react';
import { AC } from '../admin-theme';
import { BusyOverlay } from '../components/primitives';
import { ConfigJsonEditorModal } from '../components/ConfigJsonEditorModal';

// Admin editor for app_config, grouped into category sections on a responsive
// 3 / 2 / 1 grid. Reads/writes via /api/admin/config (admin-gated); the public
// /api/config mirror exposes the same values to the app, where a runtime cache
// re-syncs them on an interval. Scalar knobs use tailored controls; migrated
// JSON lookups get a collapsible preview + a code-editor modal.
const RADIUS_MIN = 1;
const RADIUS_MAX = 200;

const pretty = (v) => JSON.stringify(v, null, 2);
const humanize = (key) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Order sections by descending card count (stable — ties keep their declared
// order), so the densest categories lead and the single-card ones cluster below.
const orderByCount = (sections) =>
  sections.map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.count - a.s.count) || (a.i - b.i))
    .map(({ s }) => s);

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
  // Runtime cache
  const [cacheTtl, setCacheTtl] = useState(null);
  const [savedCacheTtl, setSavedCacheTtl] = useState(null);
  const [cacheExpires, setCacheExpires] = useState(true);
  const [savedCacheExpires, setSavedCacheExpires] = useState(true);
  // Taxonomy & vocabulary (JSON lookups) — [{ key, value, description }]
  const [lookups, setLookups] = useState([]);
  const [editing, setEditing] = useState(null); // the lookup row being edited

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [presenceMsg, setPresenceMsg] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState(null);
  const [vodMsg, setVodMsg] = useState(null);
  const [dmMsg, setDmMsg] = useState(null);
  const [plusMsg, setPlusMsg] = useState(null);
  const [cacheMsg, setCacheMsg] = useState(null);

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
      const ttl = num('runtime_cache_ttl_seconds', 300);
      setCacheTtl(ttl); setSavedCacheTtl(ttl);
      const exp = bool('runtime_cache_expires', true);
      setCacheExpires(exp); setSavedCacheExpires(exp);
      // JSON lookups — keep DB order (already category,key sorted server-side).
      setLookups(rows.filter(r => r.value_type === 'json')
        .map(r => ({ key: r.key, value: r.value, description: r.description })));
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

  const saveCache = async () => {
    setBusy(true); setCacheMsg(null);
    try {
      if (cacheTtl !== savedCacheTtl) setSavedCacheTtl(Number(await saveKey('runtime_cache_ttl_seconds', cacheTtl)));
      if (cacheExpires !== savedCacheExpires) {
        const saved = await saveKey('runtime_cache_expires', cacheExpires);
        setSavedCacheExpires(saved === true || saved === 'true');
      }
      setCacheMsg('Saved ✓');
    } catch (e) { setCacheMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  // Persist an edited JSON lookup back into local state (modal did the POST).
  const onLookupSaved = (key, value) => {
    setLookups(prev => prev.map(l => (l.key === key ? { ...l, value } : l)));
  };

  const radiusDirty = radius !== savedRadius;
  const presenceDirty = onlineS !== savedOnlineS || awayS !== savedAwayS;
  const dmDirty = dmLimit !== savedDmLimit;
  const plusDirty = price !== savedPrice || trialDays !== savedTrialDays;
  const cacheDirty = cacheTtl !== savedCacheTtl || cacheExpires !== savedCacheExpires;

  return (
    <div style={{ position: 'relative', padding: 24, maxWidth: AC.maxContent }}>
      {/* Responsive config grid: 3 desktop / 2 tablet / 1 mobile. */}
      <style>{`
        .ac-config-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; align-items:stretch; }
        @media (max-width:1100px){ .ac-config-grid{ grid-template-columns:repeat(2,1fr); } }
        @media (max-width:680px){ .ac-config-grid{ grid-template-columns:1fr; } }
      `}</style>
      <BusyOverlay show={busy} label="Saving…" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700, color: AC.text, margin: 0 }}>
          App configuration
        </h2>
        <button onClick={load} title="Reload" style={iconBtn}><RefreshCw size={14} /></button>
      </div>
      <p style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted, marginTop: 4 }}>
        Application-wide settings. Changes sync to the app on the next runtime-cache refresh — no deploy needed.
      </p>

      {orderByCount([
        { key: 'taxonomy', title: 'Taxonomy & vocabulary', unit: 'list',
          // Show the eventual count (6) during the initial load so this section
          // doesn't jump from last to first once the lookups resolve.
          count: loading && lookups.length === 0 ? 6 : lookups.length,
          subtitle: 'Lookup lists migrated from code. Edited as JSON; the app falls back to its built-in defaults if a list is unavailable.',
          node: (loading && lookups.length === 0
            ? <Card title="Loading…" desc="Fetching configuration." />
            : lookups.map(row => (
                <LookupCard key={row.key} row={row} disabled={busy || loading} onEdit={() => setEditing(row)} />
              ))) },

        { key: 'discovery', title: 'Discovery & matching', count: 2, node: (<>
          <Card title="Default Top Spots radius"
            desc="The fallback radius for the “Top Spots” section when a user hasn’t set their own.">
            <RadiusSlider value={radius} onChange={setRadius} disabled={loading || busy} />
            <SaveRow onSave={saveRadius} dirty={radiusDirty} disabled={busy || loading || radius == null} busy={busy} msg={msg} />
          </Card>
          <Card title="Default verified-only discovery"
            desc="When on, new users see only verified moms in the nearby discovery feed until they change the filter themselves.">
            <Toggle on={vod} disabled={busy || loading} onToggle={() => saveVod(!vod)}
              label={vod ? 'Show verified moms only by default' : 'Show all moms by default'} msg={vodMsg} />
          </Card>
        </>) },

        { key: 'monetization', title: 'Monetization', count: 2, node: (<>
          <Card title="Free DM message limit"
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
          <Card title="Plus pricing"
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
        </>) },

        { key: 'trust', title: 'Trust & safety', count: 1, node: (
          <Card title="Verified badge policy"
            desc={<>When <strong>on</strong>, a mom must link a social account (Instagram or Facebook) <em>and</em> complete
              her profile to earn the Verified badge — the verified-only moat. When <strong>off</strong>, completing
              every profile step alone verifies her.</>}>
            <Toggle on={reqSocial} disabled={busy || loading} onToggle={() => saveReqSocial(!reqSocial)}
              label={reqSocial ? 'Require a linked social account' : 'Social account not required'} msg={verifyMsg} />
          </Card>
        ) },

        { key: 'presence', title: 'Presence', count: 1, node: (
          <Card title="Presence thresholds"
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
        ) },

        { key: 'cache', title: 'Runtime cache', count: 1,
          subtitle: 'Controls how the app caches configuration on each device and how quickly edits here reach live users.',
          node: (
          <Card title="Client config sync"
            desc="The app re-syncs configuration from the database on this interval. Turn “cache expires” off to make each device hold its config until manually refreshed.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14, alignItems: 'flex-start' }}>
              <label style={lbl}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Re-sync every (seconds)</div>
                <input type="number" min={10} max={86400} value={cacheTtl ?? ''} disabled={loading || !cacheExpires}
                  onChange={e => setCacheTtl(e.target.value === '' ? null : Math.round(Number(e.target.value)))}
                  style={{ ...field, width: 120, opacity: cacheExpires ? 1 : 0.5 }}/>
                <div style={{ color: AC.textMuted, marginTop: 3 }}>
                  {cacheExpires ? (cacheTtl ? `≈ ${(cacheTtl / 60).toFixed(cacheTtl % 60 ? 1 : 0)} min` : '') : 'Sync disabled'}
                </div>
              </label>
              <div style={{ ...lbl, paddingTop: 2 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Cache expires</div>
                <Toggle on={cacheExpires} disabled={busy || loading} onToggle={() => setCacheExpires(v => !v)} inline
                  label={cacheExpires ? 'On — re-syncs on the interval' : 'Off — sticky until refresh'} />
              </div>
            </div>
            <SaveRow onSave={saveCache} dirty={cacheDirty} disabled={busy || loading || cacheTtl == null} busy={busy} msg={cacheMsg} />
          </Card>
        ) },
      ]).map((s, idx) => (
        <Section key={s.key} title={s.title} subtitle={s.subtitle} count={s.count} unit={s.unit || 'setting'} first={idx === 0}>
          {s.node}
        </Section>
      ))}

      {editing && (
        <ConfigJsonEditorModal
          configKey={editing.key}
          label={humanize(editing.key)}
          description={editing.description}
          value={editing.value}
          adminFetch={adminFetch}
          onSaved={(value) => onLookupSaved(editing.key, value)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

// ── Layout ──────────────────────────────────────────────────────────────────

// A config category. Bigger title + a count chip + a hairline separator above
// every section after the first, so the densest categories read as deliberate
// blocks rather than a ragged grid. `first` suppresses the top divider.
const Section = ({ title, subtitle, count, unit = 'setting', first, children }) => (
  <section style={{
    marginTop: first ? 20 : 0,
    paddingTop: first ? 0 : 30,
    borderTop: first ? 'none' : `1px solid ${AC.divider}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <h3 style={{ fontFamily: 'Albert Sans', fontSize: 17, fontWeight: 700, color: AC.text, margin: 0, letterSpacing: '-.01em' }}>
        {title}
      </h3>
      {count != null && (
        <span style={{ fontFamily: AC.mono, fontSize: 11, fontWeight: 600, color: AC.textMuted,
          background: AC.surfaceAlt, border: `1px solid ${AC.border}`, borderRadius: 999, padding: '2px 9px' }}>
          {count} {count === 1 ? unit : `${unit}s`}
        </span>
      )}
    </div>
    {subtitle && (
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted, marginTop: 4, maxWidth: 720, lineHeight: 1.45 }}>
        {subtitle}
      </div>
    )}
    <div className="ac-config-grid" style={{ marginTop: 14 }}>
      {children}
    </div>
  </section>
);

// ── Small building blocks ──────────────────────────────────────────────────

const Card = ({ title, desc, children }) => (
  <div style={card}>
    <div style={{ fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700, color: AC.text }}>{title}</div>
    {desc && <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {children}
    </div>
  </div>
);

// A JSON lookup with a count chip, a collapsible pretty-printed preview, and an
// Edit button that opens the code-editor modal.
const LookupCard = ({ row, disabled, onEdit }) => {
  const [open, setOpen] = useState(false);
  const count = Array.isArray(row.value) ? row.value.length
    : (row.value && typeof row.value === 'object' ? Object.keys(row.value).length : null);
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700, color: AC.text }}>{humanize(row.key)}</div>
        {count != null && (
          <span style={{ fontFamily: AC.mono, fontSize: 10.5, color: AC.textMuted, background: AC.surfaceAlt,
            border: `1px solid ${AC.border}`, borderRadius: 999, padding: '1px 7px' }}>
            {count} {Array.isArray(row.value) ? 'items' : 'keys'}
          </span>
        )}
      </div>
      <div style={{ fontFamily: AC.mono, fontSize: 11, color: AC.textMuted, marginTop: 1 }}>{row.key}</div>
      {row.description && (
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: AC.textMuted, marginTop: 6, lineHeight: 1.45 }}>{row.description}</div>
      )}

      <button onClick={() => setOpen(o => !o)} style={previewToggle}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {open ? 'Hide' : 'Preview'} JSON
      </button>
      {open && (
        <pre style={preBox}>{pretty(row.value)}</pre>
      )}

      <div style={{ flex: 1 }} />
      <div style={{ marginTop: 14 }}>
        <button onClick={onEdit} disabled={disabled} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: AC.surface, color: AC.text, border: `1px solid ${AC.borderStrong}`,
          borderRadius: 10, padding: '9px 16px', fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
          cursor: disabled ? 'default' : 'pointer',
        }}>
          <Code2 size={14} /> Edit JSON
        </button>
      </div>
    </div>
  );
};

// Range-slider control for the Top-Spots radius.
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

const Toggle = ({ on, disabled, onToggle, label, msg, inline }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: inline ? 0 : 14 }}>
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
const previewToggle = { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12,
  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
  fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, color: AC.accent, alignSelf: 'flex-start' };
const preBox = { marginTop: 10, maxHeight: 220, overflow: 'auto', background: AC.surfaceAlt,
  border: `1px solid ${AC.border}`, borderRadius: 8, padding: '10px 12px',
  fontFamily: AC.mono, fontSize: 11.5, lineHeight: 1.5, color: AC.text, whiteSpace: 'pre' };
