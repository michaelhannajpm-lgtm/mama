import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, Sprout, X,
} from 'lucide-react';
import { C } from './theme';

// ============================================================================
// Go Mama · Admin dashboard at /#admin (or /admin via Vercel rewrite).
// SECURITY: this dashboard has NO authentication. Anyone with the URL can read
// PII. Add auth before publishing the URL anywhere.
// ============================================================================

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '0%');
const rel = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

// Small helpers --------------------------------------------------------------

const Card = ({ children, padding = 18 }) => (
  <div className="rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.divider}`, padding }}>
    {children}
  </div>
);

const Stat = ({ label, value, hint }) => (
  <Card>
    <div className="text-[10.5px] tracking-[.16em] uppercase" style={{ color: C.inkSoft, fontFamily: 'Albert Sans', fontWeight: 600 }}>
      {label}
    </div>
    <div className="mt-1" style={{ fontFamily: 'Fraunces', fontSize: 32, fontWeight: 500, color: C.ink, letterSpacing: '-.02em', lineHeight: 1 }}>
      {value}
    </div>
    {hint && (
      <div className="mt-1 text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
        {hint}
      </div>
    )}
  </Card>
);

const SectionTitle = ({ children, hint }) => (
  <div className="flex items-baseline justify-between mb-2 mt-6">
    <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: C.ink, letterSpacing: '-.01em' }}>
      {children}
    </h3>
    {hint && <div className="text-[11px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>{hint}</div>}
  </div>
);

// Horizontal bar chart for a frequency map ----------------------------------
const BarList = ({ items, total, color = C.terracotta }) => {
  if (!items.length) return <div className="text-[12px]" style={{ color: C.inkMuted }}>No data yet.</div>;
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <div className="space-y-1.5">
      {items.map(([label, n]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="text-[12px] truncate" style={{ width: 150, fontFamily: 'Albert Sans', color: C.ink }}>{label}</div>
          <div className="flex-1 rounded-full overflow-hidden" style={{ background: C.creamSoft, height: 18 }}>
            <div style={{
              width: `${(n / max) * 100}%`, height: '100%',
              background: color, transition: 'width .25s ease',
            }}/>
          </div>
          <div className="text-[12px] tabular-nums" style={{ width: 80, textAlign: 'right', fontFamily: 'Albert Sans', color: C.inkSoft }}>
            {fmt(n)} <span style={{ color: C.inkMuted }}>· {pct(n, total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Daily trend sparkline-bar chart ------------------------------------------
const DailyTrend = ({ rows, days = 30, color = C.terracotta }) => {
  const buckets = useMemo(() => {
    const out = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      out.push({ date: d, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
    }
    rows.forEach(r => {
      if (!r.created_at) return;
      const t = new Date(r.created_at);
      t.setHours(0, 0, 0, 0);
      const idx = days - 1 - Math.floor((Date.now() - t.getTime()) / 86400000);
      if (idx >= 0 && idx < days) out[idx].count++;
    });
    return out;
  }, [rows, days]);
  const max = Math.max(1, ...buckets.map(b => b.count));
  return (
    <Card>
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {buckets.map((b, i) => (
          <div key={i} title={`${b.label}: ${b.count}`}
            className="flex-1 rounded-t" style={{
              height: `${(b.count / max) * 100}%`,
              background: color, minHeight: b.count ? 2 : 0, opacity: b.count ? 1 : 0.15,
            }}/>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>
        <span>{buckets[0]?.label}</span>
        <span>last {days} days</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
    </Card>
  );
};

// Aggregation utilities -----------------------------------------------------

const tally = (rows, picker) => {
  const m = new Map();
  rows.forEach(r => {
    const v = picker(r);
    const arr = Array.isArray(v) ? v : (v == null ? [] : [v]);
    arr.forEach(x => {
      if (x == null || x === '') return;
      m.set(x, (m.get(x) || 0) + 1);
    });
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const csvEscape = (v) => {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join('|') : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ============================================================================
// Overview tab
// ============================================================================
const Overview = ({ moms, waitlist }) => {
  const completed = moms.filter(m => !!m.completed_at);
  const completionRate = pct(completed.length, moms.length);
  const avgMs = (() => {
    const deltas = completed
      .filter(m => m.created_at && m.completed_at)
      .map(m => new Date(m.completed_at).getTime() - new Date(m.created_at).getTime())
      .filter(d => d >= 0);
    if (!deltas.length) return null;
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  })();
  const avgMin = avgMs == null ? '—' : `${Math.round(avgMs / 60000)} min`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Waitlist signups" value={fmt(waitlist.length)}/>
        <Stat label="Mom profiles" value={fmt(moms.length)} hint="started onboarding"/>
        <Stat label="Completed signups" value={fmt(completed.length)} hint={`${completionRate} completion`}/>
        <Stat label="Avg. time to complete" value={avgMin} hint="created → finished"/>
      </div>

      <SectionTitle hint="last 30 days">Daily signups — waitlist</SectionTitle>
      <DailyTrend rows={waitlist} color={C.terracotta}/>

      <SectionTitle hint="last 30 days">Daily signups — mom onboarding</SectionTitle>
      <DailyTrend rows={moms} color={C.sageDark}/>
    </div>
  );
};

// ============================================================================
// Waitlist tab
// ============================================================================
const WaitlistTable = ({ rows }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.first_name, r.email, r.city, r.audience].some(v => (v || '').toLowerCase().includes(q)));
  }, [rows, query]);

  const cityList = tally(rows, r => r.city).slice(0, 10);
  const audList  = tally(rows, r => r.audience).slice(0, 10);
  const srcList  = tally(rows, r => r.source).slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total signups" value={fmt(rows.length)}/>
        <Stat label="Cities" value={fmt(new Set(rows.map(r => r.city).filter(Boolean)).size)}/>
        <Stat label="Sources" value={fmt(new Set(rows.map(r => r.source).filter(Boolean)).size)}/>
        <Stat label="Newest" value={rows[0] ? rel(rows[0].created_at) : '—'}/>
      </div>

      <SectionTitle hint="last 30 days">Daily trend</SectionTitle>
      <DailyTrend rows={rows}/>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
        <Card><SectionTitle hint="top 10">By city</SectionTitle><BarList items={cityList} total={rows.length}/></Card>
        <Card><SectionTitle hint="top 10">By audience</SectionTitle><BarList items={audList} total={rows.length} color={C.sageDark}/></Card>
        <Card><SectionTitle hint="all">By source</SectionTitle><BarList items={srcList} total={rows.length} color={C.saffron}/></Card>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / email / city / audience…"
          className="flex-1 rounded-xl px-3 py-2 outline-none text-[13px]"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans' }}/>
        <button onClick={() => downloadCsv(`waitlist-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export CSV ({filtered.length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
        <table className="w-full" style={{ fontFamily: 'Albert Sans', fontSize: 12.5 }}>
          <thead style={{ background: C.creamSoft }}>
            <tr>
              {['Name', 'Email', 'City', 'Audience', 'Source', 'Joined'].map(h => (
                <th key={h} className="text-left px-3 py-2" style={{ color: C.inkSoft, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 10.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map(r => (
              <tr key={r.id} style={{ borderTop: `1px solid ${C.divider}` }}>
                <td className="px-3 py-2" style={{ color: C.ink }}>{r.first_name || '—'}</td>
                <td className="px-3 py-2" style={{ color: C.ink }}>{r.email}</td>
                <td className="px-3 py-2" style={{ color: C.inkSoft }}>{r.city || '—'}</td>
                <td className="px-3 py-2" style={{ color: C.inkSoft }}>{r.audience || '—'}</td>
                <td className="px-3 py-2" style={{ color: C.inkMuted }}>{r.source || '—'}</td>
                <td className="px-3 py-2" style={{ color: C.inkMuted }}>{rel(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div className="px-3 py-2 text-[11.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>
            Showing 500 of {fmt(filtered.length)}. Export CSV for full data.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Moms report tab
// ============================================================================
const MomsReport = ({ rows, momProfiles }) => {
  const completed = rows.filter(r => !!r.completed_at);
  const completionRate = pct(completed.length, rows.length);

  // Funnel by current_step (0..7)
  const stepLabels = ['Splash', 'Welcome', 'Location', 'Profile', 'When', 'Where', 'Summary', 'Account', 'Done'];
  const stepCounts = stepLabels.map((_, i) => rows.filter(r => (r.current_step || 0) >= i).length);

  // Breakdowns
  const momTypes  = tally(rows, r => r.mom_types  || []);
  const values    = tally(rows, r => r.values     || []);
  const interests = tally(rows, r => r.interests  || []);
  const places    = tally(rows, r => r.places     || []);
  const locations = tally(rows, r => r.location);
  const auths     = tally(rows, r => r.contact_method);
  const slotDays  = tally(rows, r => (r.slots || []).map(s => s.split('-')[0]));
  const slotWins  = tally(rows, r => (r.slots || []).map(s => s.split('-').slice(1).join('-')));

  // Kid age tally — kids_ages is jsonb { "0–1": 1, "3–5": 2, ... }
  const kidAges = (() => {
    const m = new Map();
    rows.forEach(r => {
      if (!r.kids_ages || typeof r.kids_ages !== 'object') return;
      Object.entries(r.kids_ages).forEach(([age, count]) => {
        m.set(age, (m.get(age) || 0) + (Number(count) || 0));
      });
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();

  // Distance distribution
  const distBuckets = [
    { label: '≤ 5 mi',   test: d => d != null && d <= 5 },
    { label: '6–10 mi',  test: d => d > 5 && d <= 10 },
    { label: '11–20 mi', test: d => d > 10 && d <= 20 },
    { label: '21–30 mi', test: d => d > 20 && d <= 30 },
    { label: '31–50 mi', test: d => d > 30 && d <= 50 },
    { label: '51–100 mi',test: d => d > 50 && d <= 100 },
    { label: '100+ mi',  test: d => d > 100 },
  ].map(b => [b.label, rows.filter(r => b.test(r.distance_miles)).length]).filter(([, n]) => n > 0);

  const avgMs = (() => {
    const deltas = completed
      .filter(r => r.created_at && r.completed_at)
      .map(r => new Date(r.completed_at).getTime() - new Date(r.created_at).getTime())
      .filter(d => d >= 0);
    if (!deltas.length) return null;
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  })();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total profiles" value={fmt(rows.length)} hint="any onboarding step"/>
        <Stat label="Completed" value={fmt(completed.length)} hint={completionRate}/>
        <Stat label="Avg. time to complete" value={avgMs == null ? '—' : `${Math.round(avgMs / 60000)} min`}/>
        <Stat label="Verified contact" value={fmt(rows.filter(r => r.email || r.phone).length)} hint="email or phone"/>
      </div>

      <SectionTitle hint="last 30 days">Daily onboarding starts</SectionTitle>
      <DailyTrend rows={rows} color={C.sageDark}/>

      <SectionTitle hint="reach at each step">Funnel</SectionTitle>
      <Card>
        <div className="space-y-1.5">
          {stepLabels.map((label, i) => {
            const n = stepCounts[i];
            const max = stepCounts[0] || 1;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="text-[11.5px]" style={{ width: 84, fontFamily: 'Albert Sans', color: C.ink }}>
                  {i}. {label}
                </div>
                <div className="flex-1 rounded-full overflow-hidden" style={{ background: C.creamSoft, height: 18 }}>
                  <div style={{ width: `${(n / max) * 100}%`, height: '100%', background: i === stepLabels.length - 1 ? C.sageDark : C.terracotta }}/>
                </div>
                <div className="text-[12px] tabular-nums" style={{ width: 90, textAlign: 'right', fontFamily: 'Albert Sans', color: C.inkSoft }}>
                  {fmt(n)} <span style={{ color: C.inkMuted }}>· {pct(n, max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Card>
          <SectionTitle hint="self-described">Mom types</SectionTitle>
          <BarList items={momTypes} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="picked at signup">Top values</SectionTitle>
          <BarList items={values} total={rows.length} color={C.saffron}/>
        </Card>
        <Card>
          <SectionTitle hint="picked at signup">Top interests</SectionTitle>
          <BarList items={interests.slice(0, 12)} total={rows.length} color={C.sageDark}/>
        </Card>
        <Card>
          <SectionTitle hint="kids per age range">Kid ages</SectionTitle>
          <BarList items={kidAges} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="top 10 cities">Locations</SectionTitle>
          <BarList items={locations.slice(0, 10)} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="how far they'll travel">Distance preference</SectionTitle>
          <BarList items={distBuckets} total={rows.length} color={C.saffron}/>
        </Card>
        <Card>
          <SectionTitle hint="day of week (slots)">Time preference · day</SectionTitle>
          <BarList items={slotDays} total={rows.length} color={C.sageDark}/>
        </Card>
        <Card>
          <SectionTitle hint="time window">Time preference · window</SectionTitle>
          <BarList items={slotWins} total={rows.length} color={C.sageDark}/>
        </Card>
        <Card>
          <SectionTitle hint="top 10 picked">Place preferences</SectionTitle>
          <BarList items={places.slice(0, 10)} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="signup method">Auth provider</SectionTitle>
          <BarList items={auths} total={rows.length} color={C.saffron}/>
        </Card>
      </div>

      {/* Aggregated stats CSV — one row per (metric, key, count) entry,
          handy for plugging into Sheets / Numbers for market-study analysis. */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <button onClick={() => {
          const statsRows = [
            ...momTypes.map(([k, n])  => ({ metric: 'mom_type',  key: k, count: n })),
            ...values.map(([k, n])    => ({ metric: 'value',     key: k, count: n })),
            ...interests.map(([k, n]) => ({ metric: 'interest',  key: k, count: n })),
            ...kidAges.map(([k, n])   => ({ metric: 'kid_age',   key: k, count: n })),
            ...locations.map(([k, n]) => ({ metric: 'location',  key: k, count: n })),
            ...distBuckets.map(([k, n]) => ({ metric: 'distance', key: k, count: n })),
            ...slotDays.map(([k, n])  => ({ metric: 'slot_day',  key: k, count: n })),
            ...slotWins.map(([k, n])  => ({ metric: 'slot_window', key: k, count: n })),
            ...places.map(([k, n])    => ({ metric: 'place',     key: k, count: n })),
            ...auths.map(([k, n])     => ({ metric: 'auth_provider', key: k, count: n })),
          ];
          downloadCsv(`gomama-moms-stats-${new Date().toISOString().slice(0, 10)}.csv`, statsRows);
        }}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export stats
        </button>
        <button onClick={() => downloadCsv(`gomama-moms-list-${new Date().toISOString().slice(0, 10)}.csv`, rows)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export moms list ({fmt(rows.length)})
        </button>
      </div>

      <SectionTitle hint="all onboardings · main info">Onboarding grid</SectionTitle>
      <MomsTable rows={rows} momProfiles={momProfiles}/>
    </div>
  );
};

// Compact moms grid shown at the bottom of the moms report.
const MomsTable = ({ rows, momProfiles }) => {
  const promotedIds = new Set((momProfiles || []).map(m => m.auth_user_id).filter(Boolean));
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [
      r.first_name, r.username, r.email, r.phone, r.location,
      ...(r.mom_types || []),
      ...(r.values || []),
      ...(r.interests || []),
    ].some(v => (v || '').toString().toLowerCase().includes(q)));
  }, [rows, query]);

  const fmtKids = (jsonb) => {
    if (!jsonb || typeof jsonb !== 'object') return '—';
    const parts = Object.entries(jsonb).map(([age, n]) => `${n}×${age}`);
    return parts.length ? parts.join(', ') : '—';
  };

  const fmtList = (arr, max = 3) => {
    const a = arr || [];
    if (!a.length) return '—';
    if (a.length <= max) return a.join(', ');
    return `${a.slice(0, max).join(', ')} +${a.length - max}`;
  };

  return (
    <Card padding={0}>
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: C.divider }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search name / email / city / values / interests…"
          className="flex-1 rounded-xl px-3 py-2 outline-none text-[12.5px]"
          style={{ background: C.cream, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans' }}/>
        <div className="text-[11.5px] tabular-nums" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
          {fmt(filtered.length)} / {fmt(rows.length)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ background: C.creamSoft }}>
            <tr>
              {['Name', 'Email · Phone', 'City', 'Kids', 'Mom types', 'Values', 'Interests', 'Profile', 'Step', 'Joined'].map(h => (
                <th key={h} className="text-left px-3 py-2" style={{
                  color: C.inkSoft, fontWeight: 700, letterSpacing: '.04em',
                  textTransform: 'uppercase', fontSize: 10.5, whiteSpace: 'nowrap',
                  position: 'sticky', top: 0, background: C.creamSoft,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map(r => (
              <tr key={r.id} style={{ borderTop: `1px solid ${C.divider}` }}>
                <td className="px-3 py-2" style={{ color: C.ink, whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600 }}>{r.first_name || '—'}</div>
                  {r.username && <div style={{ color: C.inkMuted, fontSize: 11 }}>@{r.username}</div>}
                </td>
                <td className="px-3 py-2" style={{ color: C.ink }}>
                  <div>{r.email || '—'}</div>
                  {r.phone && <div style={{ color: C.inkMuted, fontSize: 11 }}>{r.phone}</div>}
                </td>
                <td className="px-3 py-2" style={{ color: C.inkSoft, whiteSpace: 'nowrap' }}>
                  {r.location || '—'}
                  {r.distance_miles != null && (
                    <div style={{ color: C.inkMuted, fontSize: 11 }}>{r.distance_miles} mi</div>
                  )}
                </td>
                <td className="px-3 py-2" style={{ color: C.ink, whiteSpace: 'nowrap' }}>{fmtKids(r.kids_ages)}</td>
                <td className="px-3 py-2" style={{ color: C.ink }}>{fmtList(r.mom_types, 2)}</td>
                <td className="px-3 py-2" style={{ color: C.ink }}>{fmtList(r.values, 3)}</td>
                <td className="px-3 py-2" style={{ color: C.ink }}>{fmtList(r.interests, 3)}</td>
                <td className="px-3 py-2" style={{ whiteSpace: 'nowrap' }}>
                  {r.auth_user_id && promotedIds.has(r.auth_user_id) ? (
                    <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{
                      background: `${C.sageDark}20`, color: C.sageDark,
                      fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                    }}>Profile</span>
                  ) : (
                    <span style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>—</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums" style={{ color: r.completed_at ? C.sageDark : C.inkSoft, whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {r.completed_at ? '✓ done' : (r.current_step ?? 0)}
                </td>
                <td className="px-3 py-2" style={{ color: C.inkMuted, whiteSpace: 'nowrap' }}>{rel(r.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>
                No moms match that search.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <div className="px-3 py-2 border-t text-[11.5px]" style={{ borderColor: C.divider, color: C.inkMuted, fontFamily: 'Albert Sans' }}>
          Showing 500 of {fmt(filtered.length)}. Use "Export moms list" above for the full set.
        </div>
      )}
    </Card>
  );
};

// ============================================================================
// Detail modal for a single mom_profiles row. Read-only view of every field
// plus three flag toggles in the footer (Tasks 5–6).
// ============================================================================
const MomProfileDetailModal = ({ mom, placesById, onClose, onPatched }) => {
  // Esc closes the modal. Scoped via useEffect so we don't leak listeners.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const photo0 = Array.isArray(mom.photos) && mom.photos[0];
  const initial = ((mom.display_name || '').trim() || (mom.username || '').trim() || '?').charAt(0).toUpperCase();
  const sourcePill = (() => {
    const isSeed = mom.source === 'seed';
    return {
      bg: isSeed ? `${C.saffron}25` : `${C.sageDark}20`,
      color: isSeed ? C.ink : C.sageDark,
      label: mom.source || 'unknown',
    };
  })();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: `${C.ink}8C`, animation: 'fadeIn 0.15s ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Profile detail for ${mom.display_name || 'mom'}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: C.paper,
          border: `1px solid ${C.divider}`,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Sticky header */}
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: `1px solid ${C.divider}`, background: C.cream }}>
          {photo0 ? (
            <img
              src={photo0}
              alt=""
              className="rounded-full"
              style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${C.divider}`, flexShrink: 0 }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 44, height: 44, background: C.ink, color: C.saffron, fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, flexShrink: 0 }}
            >
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                {mom.display_name || '—'}
              </div>
              {mom.verified && (
                <span title="Verified" style={{ color: C.sageDark, fontSize: 14, fontWeight: 700 }}>✓</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
              <span>@{mom.username || '—'}</span>
              <span style={{ color: C.inkMuted }}>·</span>
              <span>{mom.city || '—'}{mom.neighborhood ? ` · ${mom.neighborhood}` : ''}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  background: sourcePill.bg, color: sourcePill.color,
                  fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                }}
              >
                {sourcePill.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            autoFocus
            aria-label="Close profile"
            className="rounded-full p-1.5 transition-colors"
            style={{ background: 'transparent', color: C.inkSoft, border: `1px solid ${C.divider}` }}
          >
            <X size={16}/>
          </button>
        </div>

        {/* Body — Task 5 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
            (body — Task 5)
          </div>
        </div>

        {/* Footer — Task 6 */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${C.divider}`, background: C.cream }}>
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
            (footer — Task 6)
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Mom profiles tab — promoted moms in the discoverable directory.
// ============================================================================
const MomProfilesTab = ({ rows, places, onPatch }) => {
  const placesById = useMemo(
    () => new Map((places || []).map(p => [p.id, p])),
    [places]
  );
  const [selectedMom, setSelectedMom] = useState(null);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [
      r.display_name, r.username, r.city, r.neighborhood,
      ...(r.mom_types || []),
      ...(r.values || []),
      ...(r.interests || []),
    ].some(v => (v || '').toString().toLowerCase().includes(q)));
  }, [rows, query]);

  const cities = tally(rows, r => r.city).slice(0, 8);
  const verified = rows.filter(r => r.verified).length;
  const seedCount = rows.filter(r => r.source === 'seed').length;
  const realCount = rows.filter(r => r.source === 'onboarding').length;

  const fmtKids = (jsonb) => {
    if (!jsonb || typeof jsonb !== 'object') return '—';
    const parts = Object.entries(jsonb).map(([age, n]) => `${n}×${age}`);
    return parts.length ? parts.join(', ') : '—';
  };
  const fmtList = (arr, max = 3) => {
    const a = arr || [];
    if (!a.length) return '—';
    if (a.length <= max) return a.join(', ');
    return `${a.slice(0, max).join(', ')} +${a.length - max}`;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total mom profiles" value={fmt(rows.length)}/>
        <Stat label="Real signups" value={fmt(realCount)} hint="source=onboarding"/>
        <Stat label="Seeded" value={fmt(seedCount)} hint="source=seed"/>
        <Stat label="Verified" value={fmt(verified)} hint={pct(verified, rows.length)}/>
      </div>

      <SectionTitle hint="last 30 days">Daily new mom profiles</SectionTitle>
      <DailyTrend rows={rows} color={C.terracotta}/>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Card>
          <SectionTitle hint="top 8">Cities</SectionTitle>
          <BarList items={cities} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="self-described">Mom types</SectionTitle>
          <BarList items={tally(rows, r => r.mom_types || [])} total={rows.length} color={C.sageDark}/>
        </Card>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / city / values / interests…"
          className="flex-1 rounded-xl px-3 py-2 outline-none text-[13px]"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans' }}/>
        <button onClick={() => downloadCsv(`gomama-mom-profiles-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export CSV ({filtered.length})
        </button>
      </div>

      <Card padding={0}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: C.creamSoft }}>
              <tr>
                {['Name', 'Username', 'City', 'Kids', 'Mom types', 'Values', 'Interests', 'Source', 'Joined'].map(h => (
                  <th key={h} className="text-left px-3 py-2" style={{
                    color: C.inkSoft, fontWeight: 700, letterSpacing: '.04em',
                    textTransform: 'uppercase', fontSize: 10.5, whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, background: C.creamSoft,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map(r => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedMom(r)}
                  className="cursor-pointer transition-colors hover:bg-[var(--mp-row-hover)]"
                  style={{ borderTop: `1px solid ${C.divider}`, ['--mp-row-hover']: C.creamSoft }}
                  aria-label={`Open profile for ${r.display_name || r.username || 'mom'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMom(r);
                    }
                  }}
                >
                  <td className="px-3 py-2" style={{ color: C.ink, whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {r.display_name || '—'}
                    {r.verified && (
                      <span className="ml-1.5 text-[10px]" style={{ color: C.sageDark, fontWeight: 700 }}>✓</span>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ color: C.inkSoft }}>@{r.username || '—'}</td>
                  <td className="px-3 py-2" style={{ color: C.inkSoft, whiteSpace: 'nowrap' }}>
                    {r.city || '—'}
                    {r.neighborhood && <div style={{ color: C.inkMuted, fontSize: 11 }}>{r.neighborhood}</div>}
                  </td>
                  <td className="px-3 py-2" style={{ color: C.ink, whiteSpace: 'nowrap' }}>{fmtKids(r.kids_ages)}</td>
                  <td className="px-3 py-2" style={{ color: C.ink }}>{fmtList(r.mom_types, 2)}</td>
                  <td className="px-3 py-2" style={{ color: C.ink }}>{fmtList(r.values, 3)}</td>
                  <td className="px-3 py-2" style={{ color: C.ink }}>{fmtList(r.interests, 3)}</td>
                  <td className="px-3 py-2" style={{ whiteSpace: 'nowrap' }}>
                    <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{
                      background: r.source === 'seed' ? `${C.saffron}25` : `${C.sageDark}20`,
                      color: r.source === 'seed' ? C.ink : C.sageDark,
                      fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                    }}>{r.source || 'unknown'}</span>
                  </td>
                  <td className="px-3 py-2" style={{ color: C.inkMuted, whiteSpace: 'nowrap' }}>{rel(r.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>
                  No mom profiles match that search.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <div className="px-3 py-2 border-t text-[11.5px]" style={{ borderColor: C.divider, color: C.inkMuted, fontFamily: 'Albert Sans' }}>
            Showing 500 of {fmt(filtered.length)}. Use Export CSV for the full set.
          </div>
        )}
      </Card>

      {selectedMom && (
        <MomProfileDetailModal
          mom={selectedMom}
          placesById={placesById}
          onClose={() => setSelectedMom(null)}
          onPatched={(updated) => {
            setSelectedMom(updated);
            onPatch?.(updated);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// Quick Actions tab — destructive operations live here, gated by typed confirm.
// ============================================================================
const QuickActions = ({ onReset, momsCount, waitlistCount }) => {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'arming' | 'confirming' | 'running' | 'done' | 'error'
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ARM_TOKEN = 'DELETE';
  const armed = confirmText.trim().toUpperCase() === ARM_TOKEN;

  const cancel = () => {
    setPhase('idle');
    setConfirmText('');
    setError(null);
  };

  const fire = async () => {
    if (!armed) return;
    setPhase('running');
    setError(null);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase('error');
        setError(body?.error || `Reset failed (${res.status})`);
        return;
      }
      setResult(body.result || {});
      setPhase('done');
      setConfirmText('');
      onReset?.();
    } catch (e) {
      setPhase('error');
      setError(e?.message || 'Network error');
    }
  };

  // Seed card state — separate from the reset flow.
  const [seedPhase, setSeedPhase] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [seedOpts, setSeedOpts] = useState({ places: 50, events: 30, moms: 200, reset: true });
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState(null);

  const setSeedField = (key) => (e) => {
    const raw = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
    setSeedOpts(o => ({ ...o, [key]: raw }));
  };

  const fireSeed = async () => {
    setSeedPhase('running');
    setSeedError(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seedOpts),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSeedPhase('error');
        setSeedError(body?.error || `Seed failed (${res.status})`);
        return;
      }
      setSeedResult(body.result || {});
      setSeedPhase('done');
      onReset?.();
    } catch (e) {
      setSeedPhase('error');
      setSeedError(e?.message || 'Network error');
    }
  };

  const dismissSeed = () => { setSeedPhase('idle'); setSeedError(null); };

  return (
    <div className="space-y-4">
      <div>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em' }}>
          Quick Actions
        </h2>
        <p className="mt-1 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
          One-click maintenance utilities. Destructive actions require typed confirmation.
        </p>
      </div>

      {/* Run seed card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${C.sageDark}`, background: `${C.sageDark}08` }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${C.sageDark}15`, borderBottom: `1px solid ${C.sageDark}30` }}>
          <Sprout size={16} style={{ color: C.sageDark }}/>
          <div className="text-[12px] tracking-[.16em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.sageDark }}>
            Seed data
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: C.ink, letterSpacing: '-.01em' }}>
            Run seed
          </h3>
          <p className="mt-1 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft, lineHeight: 1.5 }}>
            Populates <strong>places</strong>, <strong>events</strong>, and <strong>mom_profiles</strong> with synthetic data so you can test search and matching at scale. Idempotent — places/events upsert by slug, moms by username. With <em>reset</em> on, mom_profiles where <code>source='seed'</code> are wiped first; real signups are <strong>not</strong> affected.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {['places', 'events', 'moms'].map(field => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  {field}
                </span>
                <input type="number" min={0} step={1}
                  value={seedOpts[field]}
                  onChange={setSeedField(field)}
                  disabled={seedPhase === 'running'}
                  className="rounded-lg px-2 py-1.5 outline-none text-[13px]"
                  style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans' }}/>
              </label>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 cursor-pointer" style={{ width: 'fit-content' }}>
            <input type="checkbox" checked={seedOpts.reset} onChange={setSeedField('reset')} disabled={seedPhase === 'running'}/>
            <span className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink }}>
              Reset (delete <code>source='seed'</code> mom_profiles first)
            </span>
          </label>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={fireSeed} disabled={seedPhase === 'running'}
              className="rounded-xl px-3 py-2 flex items-center gap-1.5"
              style={{
                background: C.sageDark, color: '#fff',
                fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
                opacity: seedPhase === 'running' ? 0.7 : 1,
              }}>
              <Sprout size={14}/> {seedPhase === 'running' ? 'Seeding…' : 'Run seed'}
            </button>
          </div>

          {seedPhase === 'done' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `${C.sageDark}15`, border: `1px solid ${C.sageDark}` }}>
              <CheckIcon size={16} style={{ color: C.sageDark, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
                <strong>Seeded.</strong> {fmt(seedResult?.places ?? 0)} places · {fmt(seedResult?.events ?? 0)} events · {fmt(seedResult?.moms ?? 0)} mom profiles
                {seedResult?.reset?.deleted ? <> (reset deleted {fmt(seedResult.reset.deleted)})</> : null}.
                <button onClick={dismissSeed} className="ml-2 underline" style={{ color: C.sageDark, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {seedPhase === 'error' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
              <AlertTriangle size={16} style={{ color: C.terracotta, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
                <strong>Seed failed.</strong> {seedError}
                <button onClick={dismissSeed} className="ml-2 underline" style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${C.terracotta}`, background: `${C.terracotta}08` }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${C.terracotta}15`, borderBottom: `1px solid ${C.terracotta}30` }}>
          <ShieldAlert size={16} style={{ color: C.terracotta }}/>
          <div className="text-[12px] tracking-[.16em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.terracotta }}>
            Danger zone
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: C.ink, letterSpacing: '-.01em' }}>
            Reset database
          </h3>
          <p className="mt-1 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft, lineHeight: 1.5 }}>
            Truncates every row in <strong>onboarding_profiles</strong> ({fmt(momsCount)} mom{momsCount === 1 ? '' : 's'}) and <strong>waitlist_signups</strong> ({fmt(waitlistCount)} signup{waitlistCount === 1 ? '' : 's'}).
            <br/>
            <strong style={{ color: C.terracotta }}>This cannot be undone.</strong> Auth users in Supabase Auth are NOT deleted.
          </p>

          {phase === 'idle' && (
            <button onClick={() => setPhase('arming')}
              className="mt-3 rounded-xl px-3 py-2 flex items-center gap-1.5"
              style={{ background: C.terracotta, color: '#fff', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5 }}>
              <Trash2 size={14}/> Reset database
            </button>
          )}

          {(phase === 'arming' || phase === 'running') && (
            <div className="mt-3 rounded-xl p-3" style={{ background: C.cream, border: `1px solid ${C.terracotta}` }}>
              <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
                Type <code style={{ background: C.creamSoft, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', color: C.terracotta, fontWeight: 700 }}>{ARM_TOKEN}</code> below to confirm. Cannot be undone.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={`Type ${ARM_TOKEN}`}
                  disabled={phase === 'running'}
                  autoFocus
                  className="flex-1 rounded-xl px-3 py-2 outline-none text-[13px]"
                  style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'monospace', letterSpacing: '.04em' }}
                />
                <button onClick={fire} disabled={!armed || phase === 'running'}
                  className="rounded-xl px-3 py-2 flex items-center gap-1.5"
                  style={{
                    background: armed ? C.terracotta : C.creamSoft,
                    color: armed ? '#fff' : C.inkMuted,
                    fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
                    cursor: armed ? 'pointer' : 'not-allowed',
                  }}>
                  <Trash2 size={13}/> {phase === 'running' ? 'Resetting…' : 'Confirm reset'}
                </button>
                <button onClick={cancel} disabled={phase === 'running'}
                  className="rounded-xl px-3 py-2"
                  style={{ background: 'transparent', border: `1px solid ${C.divider}`, color: C.inkSoft, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `${C.sageDark}15`, border: `1px solid ${C.sageDark}` }}>
              <CheckIcon size={16} style={{ color: C.sageDark, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
                <strong>Database reset.</strong> Deleted {fmt(result?.onboarding_profiles?.deleted ?? 0)} mom profile{result?.onboarding_profiles?.deleted === 1 ? '' : 's'} and {fmt(result?.waitlist_signups?.deleted ?? 0)} waitlist signup{result?.waitlist_signups?.deleted === 1 ? '' : 's'}. Dashboard reloaded.
                <button onClick={cancel} className="ml-2 underline" style={{ color: C.sageDark, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
              <AlertTriangle size={16} style={{ color: C.terracotta, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
                <strong>Reset failed.</strong> {error}
                <button onClick={() => setPhase('arming')} className="ml-2 underline" style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Root
// ============================================================================
export const AdminPage = () => {
  const [tab, setTab] = useState('overview');
  const [moms, setMoms] = useState(null);
  const [waitlist, setWaitlist] = useState(null);
  const [momProfiles, setMomProfiles] = useState(null);
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch + parse one admin endpoint. Detects the `npm run dev` case where
  // Vite serves the raw .js source file (which starts with a `//` comment)
  // instead of running the Vercel function — surfaces a clear hint instead
  // of "Unexpected token '/'…" JSON-parse noise.
  const fetchEndpoint = async (path, label) => {
    let res;
    try {
      res = await fetch(path);
    } catch (e) {
      throw new Error(`${label}: network error — ${e?.message || 'unreachable'}`);
    }
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('application/json')) {
      try {
        const j = JSON.parse(text);
        if (res.status >= 400) {
          throw new Error(`${label} ${res.status}: ${j?.error || 'unknown'}`);
        }
        return j;
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`${label}: response was not valid JSON`);
        }
        throw e;
      }
    }
    // Not JSON — almost always Vite serving the source file in dev mode.
    if (text.trimStart().startsWith('//') || text.includes('export default async function')) {
      throw new Error('API routes don\'t run under `npm run dev`. Use `vercel dev` to serve them locally, or visit the deployed URL.');
    }
    throw new Error(`${label} ${res.status}: unexpected response (${ct || 'no content-type'})`);
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [a, b, c, d] = await Promise.all([
        fetchEndpoint('/api/admin/onboarding',   'Onboarding'),
        fetchEndpoint('/api/admin/waitlist',     'Waitlist'),
        fetchEndpoint('/api/admin/mom-profiles', 'Mom profiles'),
        fetchEndpoint('/api/admin/places',       'Places'),
      ]);
      setMoms(a.rows || []);
      setWaitlist(b.rows || []);
      setMomProfiles(c.rows || []);
      setPlaces(d.rows || []);
    } catch (e) {
      setError(e?.message || 'Could not load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.creamSoft }}>
      <header className="sticky top-0 z-10 border-b" style={{ background: C.cream, borderColor: C.divider }}>
        <div className="max-w-[1200px] mx-auto px-5 py-3 flex items-center gap-3">
          <div className="rounded-lg w-9 h-9 flex items-center justify-center" style={{ background: C.ink, color: C.saffron, fontFamily: 'Fraunces', fontSize: 18, fontWeight: 600 }}>M</div>
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em', lineHeight: 1 }}>
              Go Mama · Admin
            </h1>
            <div className="text-[11px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
              Market study dashboard · {loading ? 'loading…' : moms ? `${moms.length} onboardings · ${momProfiles?.length || 0} mom profiles · ${waitlist?.length || 0} waitlist` : ''}
            </div>
          </div>
          <a href="/preview" target="_blank" rel="noopener noreferrer"
            className="rounded-xl px-3 py-2 flex items-center gap-1.5"
            style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
            <Monitor size={13}/> Show desktop version
          </a>
          <a href="/live" target="_blank" rel="noopener noreferrer"
            className="rounded-xl px-3 py-2 flex items-center gap-1.5"
            style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
            <Smartphone size={13}/> Show mobile version
          </a>
          <button onClick={load} disabled={loading}
            className="rounded-xl px-3 py-2 flex items-center gap-1.5"
            style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, opacity: loading ? 0.6 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> Refresh
          </button>
        </div>
        <div className="max-w-[1200px] mx-auto px-5 pb-2 flex gap-1">
          {[
            { id: 'overview',     icon: BarChart3,  label: 'Overview' },
            { id: 'onboarding',   icon: ListChecks, label: 'Onboarding' },
            { id: 'mom-profiles', icon: Users,      label: 'Mom profiles' },
            { id: 'waitlist',     icon: ListChecks, label: 'Waitlist' },
            { id: 'actions',      icon: Zap,        label: 'Quick Actions' },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                style={{
                  background: active ? C.terracotta : 'transparent',
                  color: active ? '#fff' : C.inkSoft,
                  border: `1px solid ${active ? C.terracotta : C.divider}`,
                  fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
                }}>
                <t.icon size={13}/> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-5 py-5">
        {/* Auth warning */}
        <div className="mb-4 rounded-xl flex items-start gap-2.5 p-3" style={{ background: `${C.saffron}25`, border: `1px solid ${C.saffron}` }}>
          <ShieldOff size={16} style={{ color: C.ink, flexShrink: 0, marginTop: 2 }}/>
          <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
            <strong>No authentication.</strong> Anyone with this URL can read every signup. Add auth before sharing.
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl flex items-start gap-2.5 p-3" style={{ background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
            <AlertTriangle size={16} style={{ color: C.terracotta, flexShrink: 0, marginTop: 2 }}/>
            <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}>
              <strong>Could not load.</strong> {error}<br/>
              <span style={{ color: C.inkSoft }}>
                Check that <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> are set in your Vercel env, and that the
                serverless functions are deployed (they don't run under <code>npm run dev</code>; use <code>vercel dev</code>).
              </span>
            </div>
          </div>
        )}

        {!moms || !waitlist || !momProfiles || !places ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
            <RefreshCw size={20} className="mx-auto mb-2" style={{ color: C.inkSoft, animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
            <div className="text-[13px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
              {loading ? 'Loading data from Supabase…' : 'No data loaded'}
            </div>
          </div>
        ) : (
          <>
            {tab === 'overview'     && <Overview moms={moms} waitlist={waitlist}/>}
            {tab === 'onboarding'   && <MomsReport rows={moms} momProfiles={momProfiles}/>}
            {tab === 'mom-profiles' && <MomProfilesTab rows={momProfiles} places={places || []} onPatch={(updated) => setMomProfiles(prev => prev.map(r => r.id === updated.id ? updated : r))}/>}
            {tab === 'waitlist'     && <WaitlistTable rows={waitlist}/>}
            {tab === 'actions'      && <QuickActions onReset={load} momsCount={moms.length} waitlistCount={waitlist.length}/>}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
