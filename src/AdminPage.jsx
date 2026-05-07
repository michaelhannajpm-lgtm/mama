import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff, ExternalLink,
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
const MomsReport = ({ rows }) => {
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

      <div className="flex items-center justify-end mt-2">
        <button onClick={() => downloadCsv(`mama-moms-${new Date().toISOString().slice(0, 10)}.csv`, rows)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export full CSV ({fmt(rows.length)})
        </button>
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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch('/api/admin/onboarding').then(r => r.json().then(j => ({ status: r.status, j }))),
        fetch('/api/admin/waitlist').then(r => r.json().then(j => ({ status: r.status, j }))),
      ]);
      if (a.status >= 400) throw new Error(`Onboarding ${a.status}: ${a.j?.error || 'unknown'}`);
      if (b.status >= 400) throw new Error(`Waitlist ${b.status}: ${b.j?.error || 'unknown'}`);
      setMoms(a.j.rows || []);
      setWaitlist(b.j.rows || []);
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
              Market study dashboard · {loading ? 'loading…' : moms ? `${moms.length} profiles · ${waitlist?.length || 0} waitlist` : ''}
            </div>
          </div>
          <a href="/prototype" target="_blank" rel="noopener noreferrer"
            className="rounded-xl px-3 py-2 flex items-center gap-1.5"
            style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
            <ExternalLink size={13}/> View preview
          </a>
          <button onClick={load} disabled={loading}
            className="rounded-xl px-3 py-2 flex items-center gap-1.5"
            style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, opacity: loading ? 0.6 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> Refresh
          </button>
        </div>
        <div className="max-w-[1200px] mx-auto px-5 pb-2 flex gap-1">
          {[
            { id: 'overview', icon: BarChart3, label: 'Overview' },
            { id: 'moms',     icon: Users,     label: 'Moms report' },
            { id: 'waitlist', icon: ListChecks,label: 'Waitlist' },
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

        {!moms || !waitlist ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
            <RefreshCw size={20} className="mx-auto mb-2" style={{ color: C.inkSoft, animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
            <div className="text-[13px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
              {loading ? 'Loading data from Supabase…' : 'No data loaded'}
            </div>
          </div>
        ) : (
          <>
            {tab === 'overview' && <Overview moms={moms} waitlist={waitlist}/>}
            {tab === 'moms'     && <MomsReport rows={moms}/>}
            {tab === 'waitlist' && <WaitlistTable rows={waitlist}/>}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
