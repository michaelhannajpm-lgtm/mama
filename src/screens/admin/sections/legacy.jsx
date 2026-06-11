// ============================================================================
// Legacy admin tab bodies — relocated VERBATIM from the original AdminPage.jsx
// during the 2026-06-11 console restructure. These still use the phone-app
// palette (`C`) and their own private helpers; they sit inside the new console
// chrome and share the coral accent, so they read fine. Migrate each to the
// `AC` console design system incrementally — see
// `.claude/skills/admin-design/SKILL.md`. Exports: Overview, MomsReport,
// MomProfilesTab, QuickActions.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, Check as CheckIcon, CheckCircle2, ChevronLeft,
  ChevronRight, Clock, Download, ListChecks, ShieldAlert, Sprout, Trash2, X,
} from 'lucide-react';
import { AC } from '../admin-theme';
import { adminFetch } from '../lib/adminFetch';
import { useConfirm } from '../components/ConfirmDialog';
import { StatCard } from '../components/primitives';

// Number / relative-time helpers (verbatim from the original AdminPage).
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
  <div className="rounded-2xl" style={{ background: AC.surface, border: `1px solid ${AC.border}`, padding }}>
    {children}
  </div>
);

const Stat = ({ label, value, hint }) => (
  <Card>
    <div className="text-[10.5px] tracking-[.16em] uppercase" style={{ color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 600 }}>
      {label}
    </div>
    <div className="mt-1" style={{ fontFamily: 'Fraunces', fontSize: 32, fontWeight: 500, color: AC.text, letterSpacing: '-.02em', lineHeight: 1 }}>
      {value}
    </div>
    {hint && (
      <div className="mt-1 text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft }}>
        {hint}
      </div>
    )}
  </Card>
);

const SectionTitle = ({ children, hint }) => (
  <div className="flex items-baseline justify-between mb-2 mt-6">
    <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: AC.text, letterSpacing: '-.01em' }}>
      {children}
    </h3>
    {hint && <div className="text-[11px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted }}>{hint}</div>}
  </div>
);

// Horizontal bar chart for a frequency map ----------------------------------
const BarList = ({ items, total, color = AC.accent }) => {
  if (!items.length) return <div className="text-[12px]" style={{ color: AC.textMuted }}>No data yet.</div>;
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <div className="space-y-1.5">
      {items.map(([label, n]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="text-[12px] truncate" style={{ width: 150, fontFamily: 'Albert Sans', color: AC.text }}>{label}</div>
          <div className="flex-1 rounded-full overflow-hidden" style={{ background: AC.surfaceAlt, height: 18 }}>
            <div style={{
              width: `${(n / max) * 100}%`, height: '100%',
              background: color, transition: 'width .25s ease',
            }}/>
          </div>
          <div className="text-[12px] tabular-nums" style={{ width: 80, textAlign: 'right', fontFamily: 'Albert Sans', color: AC.textSoft }}>
            {fmt(n)} <span style={{ color: AC.textMuted }}>· {pct(n, total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Daily trend sparkline-bar chart ------------------------------------------
const DailyTrend = ({ rows, days = 30, color = AC.accent }) => {
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
      <div className="mt-2 flex justify-between text-[10px]" style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>
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

const reviewLabel = (status) => ({
  approved: 'Verified',
  needs_review: 'Needs review',
  rejected: 'Rejected',
  archived: 'Archived',
}[status] || 'Unreviewed');

const inventoryStats = (rows = []) => {
  const nonArchived = rows.filter(r => r.review_status !== 'archived');
  const verified = nonArchived.filter(r => r.review_status === 'approved');
  const needsReview = nonArchived.filter(r => r.review_status === 'needs_review' || !r.review_status);
  const rejected = nonArchived.filter(r => r.review_status === 'rejected');
  const visible = nonArchived.filter(r => r.visible === true);
  const hidden = nonArchived.filter(r => r.visible === false);
  const archived = rows.filter(r => r.review_status === 'archived');
  return { nonArchived, verified, needsReview, rejected, visible, hidden, archived };
};

const InventoryOverviewCard = ({ title, rows, breakdownLabel, breakdownPicker, color = AC.accent }) => {
  const stats = inventoryStats(rows);
  const statusItems = tally(rows, r => reviewLabel(r.review_status));
  const breakdownItems = tally(stats.nonArchived, breakdownPicker).slice(0, 8);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10.5px] tracking-[.16em] uppercase" style={{ color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 700 }}>
            {title}
          </div>
          <div className="mt-1" style={{ fontFamily: 'Fraunces', fontSize: 34, fontWeight: 500, color: AC.text, letterSpacing: '-.02em', lineHeight: 1 }}>
            {fmt(stats.nonArchived.length)}
          </div>
          <div className="mt-1 text-[12px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft }}>
            non-archived · {fmt(stats.archived.length)} archived
          </div>
        </div>
        <div className="text-right text-[12px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft, lineHeight: 1.55 }}>
          <div><strong style={{ color: AC.success }}>{fmt(stats.verified.length)}</strong> verified</div>
          <div><strong style={{ color }}>{fmt(stats.needsReview.length)}</strong> needs review</div>
          <div><strong style={{ color: AC.text }}>{fmt(stats.visible.length)}</strong> visible</div>
          <div><strong style={{ color: AC.textMuted }}>{fmt(stats.hidden.length)}</strong> hidden</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div>
          <div className="mb-2 text-[11px] tracking-[.14em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: AC.textMuted }}>
            Review status
          </div>
          <BarList items={statusItems} total={Math.max(1, rows.length)} color={color}/>
        </div>
        <div>
          <div className="mb-2 text-[11px] tracking-[.14em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: AC.textMuted }}>
            {breakdownLabel}
          </div>
          <BarList items={breakdownItems} total={Math.max(1, stats.nonArchived.length)} color={AC.success}/>
        </div>
      </div>
    </Card>
  );
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
export const Overview = ({ moms, momProfiles, places, events }) => {
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
  const placeStats = inventoryStats(places);
  const eventStats = inventoryStats(events);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Mom profiles" value={fmt(moms.length)} hint="started onboarding"/>
        <Stat label="Live profiles" value={fmt(momProfiles.length)} hint="searchable moms"/>
        <Stat label="Completed signups" value={fmt(completed.length)} hint={`${completionRate} completion`}/>
        <Stat label="Places" value={fmt(placeStats.nonArchived.length)} hint={`${fmt(placeStats.verified.length)} verified`}/>
        <Stat label="Events" value={fmt(eventStats.nonArchived.length)} hint={`${fmt(eventStats.verified.length)} verified`}/>
        <Stat label="Avg. time to complete" value={avgMin} hint="created → finished"/>
      </div>

      <SectionTitle hint="last 30 days">Daily signups — mom onboarding</SectionTitle>
      <DailyTrend rows={moms} color={AC.success}/>

      <SectionTitle hint="non-archived inventory">Places and events</SectionTitle>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <InventoryOverviewCard
          title="Places"
          rows={places}
          breakdownLabel="By category"
          breakdownPicker={r => r.category || 'Uncategorized'}
          color={AC.accent}
        />
        <InventoryOverviewCard
          title="Events"
          rows={events}
          breakdownLabel="By event type"
          breakdownPicker={r => r.event_type || r.kind || 'Uncategorized'}
          color={AC.warn}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Moms report tab
// ============================================================================
export const MomsReport = ({ rows, momProfiles, onReload }) => {
  const completed = rows.filter(r => !!r.completed_at);
  const completionRate = pct(completed.length, rows.length);

  // Funnel by current_step — mirrors the live AboutYou carousel, which records
  // progress at every sub-step (see AboutYou.handleNext):
  //   0 Started · 1 Stage · 2 Looking for · 3 Describes · 4 Location ·
  //   5 Account · 6 Done. promote() pushes finished signups to step 6/7.
  const stepLabels = ['Started', 'Stage', 'Looking for', 'Describes', 'Location', 'Account', 'Done'];
  const stepCounts = stepLabels.map((_, i) => rows.filter(r => (r.current_step || 0) >= i).length);

  // Breakdowns — only the data the current onboarding screen actually collects.
  // `describes` is the mom-type taxonomy; fall back to the legacy mom_types
  // column for historical rows recorded before the v2 carousel.
  const stages    = tally(rows, r => r.stage       || []);
  const lookingFor= tally(rows, r => r.looking_for || []);
  const describes = tally(rows, r => (r.describes && r.describes.length ? r.describes : r.mom_types) || []);
  const locations = tally(rows, r => r.location);
  const auths     = tally(rows, r => r.contact_method);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total profiles" value={fmt(rows.length)} hint="any onboarding step" icon={ListChecks}/>
        <StatCard label="Completed" value={fmt(completed.length)} hint={completionRate} tone={AC.success} icon={CheckCircle2}/>
        <StatCard label="Avg. time to complete" value={avgMs == null ? '—' : `${Math.round(avgMs / 60000)} min`} icon={Clock}/>
        <StatCard label="Verified contact" value={fmt(rows.filter(r => r.email || r.phone).length)} hint="email or phone" tone={AC.accent} icon={BadgeCheck}/>
      </div>

      <SectionTitle hint="last 30 days">Daily onboarding starts</SectionTitle>
      <DailyTrend rows={rows} color={AC.success}/>

      <SectionTitle hint="reach at each step">Funnel</SectionTitle>
      <Card>
        <div className="space-y-1.5">
          {stepLabels.map((label, i) => {
            const n = stepCounts[i];
            const max = stepCounts[0] || 1;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="text-[11.5px]" style={{ width: 84, fontFamily: 'Albert Sans', color: AC.text }}>
                  {i}. {label}
                </div>
                <div className="flex-1 rounded-full overflow-hidden" style={{ background: AC.surfaceAlt, height: 18 }}>
                  <div style={{ width: `${(n / max) * 100}%`, height: '100%', background: i === stepLabels.length - 1 ? AC.success : AC.accent }}/>
                </div>
                <div className="text-[12px] tabular-nums" style={{ width: 90, textAlign: 'right', fontFamily: 'Albert Sans', color: AC.textSoft }}>
                  {fmt(n)} <span style={{ color: AC.textMuted }}>· {pct(n, max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Card>
          <SectionTitle hint="Q1 · kid life-stage">Stage</SectionTitle>
          <BarList items={stages} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="Q2 · what they're hoping to find">Looking for</SectionTitle>
          <BarList items={lookingFor} total={rows.length} color={AC.success}/>
        </Card>
        <Card>
          <SectionTitle hint="Q3 · self-described mom type">Describes</SectionTitle>
          <BarList items={describes} total={rows.length}/>
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
          <BarList items={distBuckets} total={rows.length} color={AC.warn}/>
        </Card>
        <Card>
          <SectionTitle hint="signup method">Auth provider</SectionTitle>
          <BarList items={auths} total={rows.length} color={AC.warn}/>
        </Card>
      </div>

      {/* Aggregated stats CSV — one row per (metric, key, count) entry,
          handy for plugging into Sheets / Numbers for market-study analysis. */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <button onClick={() => {
          const statsRows = [
            ...stages.map(([k, n])     => ({ metric: 'stage',       key: k, count: n })),
            ...lookingFor.map(([k, n]) => ({ metric: 'looking_for', key: k, count: n })),
            ...describes.map(([k, n])  => ({ metric: 'describes',   key: k, count: n })),
            ...kidAges.map(([k, n])    => ({ metric: 'kid_age',     key: k, count: n })),
            ...locations.map(([k, n])  => ({ metric: 'location',    key: k, count: n })),
            ...distBuckets.map(([k, n])=> ({ metric: 'distance',    key: k, count: n })),
            ...auths.map(([k, n])      => ({ metric: 'auth_provider', key: k, count: n })),
          ];
          downloadCsv(`gomama-moms-stats-${new Date().toISOString().slice(0, 10)}.csv`, statsRows);
        }}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: AC.surface, border: `1px solid ${AC.border}`, color: AC.text, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export stats
        </button>
        <button onClick={() => downloadCsv(`gomama-moms-list-${new Date().toISOString().slice(0, 10)}.csv`, rows)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: AC.railBg, color: AC.railTextActive, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export moms list ({fmt(rows.length)})
        </button>
      </div>

      <SectionTitle hint="all onboardings · main info">Onboarding grid</SectionTitle>
      <MomsTable rows={rows} momProfiles={momProfiles} onReload={onReload}/>
    </div>
  );
};

// Compact moms grid shown at the bottom of the moms report. Supports single-row
// and bulk deletion of onboarding_profiles rows (e.g. clearing test / spam
// signups out of the funnel) via /api/admin/onboarding/delete.
const MomsTable = ({ rows, momProfiles, onReload }) => {
  const confirm = useConfirm();
  const promotedIds = new Set((momProfiles || []).map(m => m.auth_user_id).filter(Boolean));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [
      r.first_name, r.username, r.email, r.phone, r.location,
      ...(r.stage || []),
      ...(r.looking_for || []),
      ...(r.describes || []),
      ...(r.mom_types || []),
    ].some(v => (v || '').toString().toLowerCase().includes(q)));
  }, [rows, query]);

  // Render (and select) at most 500 rows — the same cap the footer hints at.
  const visibleRows = filtered.slice(0, 500);
  const allSelected = visibleRows.length > 0 && visibleRows.every(r => selected.has(r.id));

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleRows.map(r => r.id)));
  const clearSelection = () => setSelected(new Set());

  // Single source of truth for the delete call — one id or many.
  const runDelete = async (ids) => {
    setBusy(true); setErr(null);
    try {
      const body = ids.length === 1 ? { id: ids[0] } : { ids };
      const res = await adminFetch('/api/admin/onboarding/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Delete failed (${res.status})`);
      clearSelection();
      onReload?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = (r) => {
    const who = r.first_name || r.email || r.phone || 'this onboarding row';
    confirm({ title: 'Delete onboarding row?', message: `Delete "${who}"? This removes the onboarding record only — it does not delete their Supabase Auth user. This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' })
      .then((ok) => ok && runDelete([r.id]));
  };
  const deleteSelected = () => {
    const ids = visibleRows.filter(r => selected.has(r.id)).map(r => r.id);
    if (!ids.length) return;
    confirm({ title: `Delete ${ids.length} onboarding row${ids.length === 1 ? '' : 's'}?`, message: 'This removes the onboarding records only — it does not delete their Supabase Auth users. This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })
      .then((ok) => ok && runDelete(ids));
  };

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

  const thStyle = {
    color: AC.textSoft, fontWeight: 700, letterSpacing: '.04em',
    textTransform: 'uppercase', fontSize: 10.5, whiteSpace: 'nowrap',
    position: 'sticky', top: 0, background: AC.surfaceAlt,
  };

  return (
    <Card padding={0}>
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: AC.border }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search name / email / city / stage / looking-for…"
          className="flex-1 rounded-xl px-3 py-2 outline-none text-[12.5px]"
          style={{ background: AC.bg, border: `1px solid ${AC.border}`, color: AC.text, fontFamily: 'Albert Sans' }}/>
        <div className="text-[11.5px] tabular-nums" style={{ fontFamily: 'Albert Sans', color: AC.textSoft }}>
          {fmt(filtered.length)} / {fmt(rows.length)}
        </div>
      </div>

      {/* Bulk-action bar — only when a selection exists. */}
      {selected.size > 0 && (
        <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: AC.border, background: AC.surfaceAlt }}>
          <span className="text-[12px]" style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: AC.text }}>
            {fmt(selected.size)} selected
          </span>
          <button disabled={busy} onClick={deleteSelected}
            className="rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[12px]"
            style={{ background: AC.accent, color: '#fff', fontFamily: 'Albert Sans', fontWeight: 600, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            <Trash2 size={13}/> Delete selected
          </button>
          <button disabled={busy} onClick={clearSelection}
            className="rounded-lg px-2.5 py-1.5 text-[12px]"
            style={{ background: AC.surface, color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 600, border: `1px solid ${AC.border}`, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {err && (
        <div className="px-3 py-2 border-b text-[12px]" style={{ borderColor: AC.border, background: AC.dangerSoft, color: AC.danger, fontFamily: 'Albert Sans' }}>
          {err}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ background: AC.surfaceAlt }}>
            <tr>
              <th className="px-3 py-2" style={{ ...thStyle, width: 30 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" style={{ cursor: 'pointer' }}/>
              </th>
              {['Name', 'Email · Phone', 'City', 'Stage', 'Looking for', 'Describes', 'Kids', 'Profile', 'Step', 'Joined'].map(h => (
                <th key={h} className="text-left px-3 py-2" style={thStyle}>{h}</th>
              ))}
              <th className="px-3 py-2" style={{ ...thStyle, textAlign: 'right' }}> </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(r => {
              const isSel = selected.has(r.id);
              return (
              <tr key={r.id} style={{ borderTop: `1px solid ${AC.border}`, background: isSel ? AC.accentSoft : 'transparent' }}>
                <td className="px-3 py-2" style={{ width: 30 }}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(r.id)} aria-label={`Select ${r.first_name || r.id}`} style={{ cursor: 'pointer' }}/>
                </td>
                <td className="px-3 py-2" style={{ color: AC.text, whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600 }}>{r.first_name || '—'}</div>
                  {r.username && <div style={{ color: AC.textMuted, fontSize: 11 }}>@{r.username}</div>}
                </td>
                <td className="px-3 py-2" style={{ color: AC.text }}>
                  <div>{r.email || '—'}</div>
                  {r.phone && <div style={{ color: AC.textMuted, fontSize: 11 }}>{r.phone}</div>}
                </td>
                <td className="px-3 py-2" style={{ color: AC.textSoft, whiteSpace: 'nowrap' }}>
                  {r.location || '—'}
                  {r.distance_miles != null && (
                    <div style={{ color: AC.textMuted, fontSize: 11 }}>{r.distance_miles} mi</div>
                  )}
                </td>
                <td className="px-3 py-2" style={{ color: AC.text }}>{fmtList(r.stage, 2)}</td>
                <td className="px-3 py-2" style={{ color: AC.text }}>{fmtList(r.looking_for, 2)}</td>
                <td className="px-3 py-2" style={{ color: AC.text }}>{fmtList(r.describes && r.describes.length ? r.describes : r.mom_types, 2)}</td>
                <td className="px-3 py-2" style={{ color: AC.text, whiteSpace: 'nowrap' }}>{fmtKids(r.kids_ages)}</td>
                <td className="px-3 py-2" style={{ whiteSpace: 'nowrap' }}>
                  {r.auth_user_id && promotedIds.has(r.auth_user_id) ? (
                    <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{
                      background: `color-mix(in srgb, ${AC.success} 13%, transparent)`, color: AC.success,
                      fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                    }}>Profile</span>
                  ) : (
                    <span style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>—</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums" style={{ color: r.completed_at ? AC.success : AC.textSoft, whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {r.completed_at ? '✓ done' : (r.current_step ?? 0)}
                </td>
                <td className="px-3 py-2" style={{ color: AC.textMuted, whiteSpace: 'nowrap' }}>{rel(r.created_at)}</td>
                <td className="px-3 py-2" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button title="Delete onboarding row" disabled={busy} onClick={() => deleteRow(r)}
                    style={{ color: AC.accent, background: 'transparent', border: 'none', cursor: busy ? 'default' : 'pointer', padding: 4 }}>
                    <Trash2 size={15}/>
                  </button>
                </td>
              </tr>
            );})}
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-6 text-center" style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>
                No moms match that search.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <div className="px-3 py-2 border-t text-[11.5px]" style={{ borderColor: AC.border, color: AC.textMuted, fontFamily: 'Albert Sans' }}>
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
  const [lightboxIndex, setLightboxIndex] = useState(null); // null | number — index into mom.photos
  const [pendingFlag, setPendingFlag] = useState(null); // 'verified' | 'visible' | 'blocked_global' | null
  const [actionError, setActionError] = useState(null);

  // Esc closes the modal — but only when no lightbox is open. The lightbox
  // registers its own Esc handler, so when both listeners fire, this one
  // short-circuits and the lightbox handles the keystroke.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxIndex === null) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, lightboxIndex]);

  const photo0 = Array.isArray(mom.photos) && mom.photos[0];
  const initial = ((mom.display_name || '').trim() || (mom.username || '').trim() || '?').charAt(0).toUpperCase();
  const sourcePill = (() => {
    const isSeed = mom.source === 'seed';
    return {
      bg: isSeed ? `color-mix(in srgb, ${AC.warn} 15%, transparent)` : `color-mix(in srgb, ${AC.success} 13%, transparent)`,
      color: isSeed ? AC.text : AC.success,
      label: mom.source || 'unknown',
    };
  })();

  const fmtKidsAges = (jsonb) => {
    if (!jsonb || typeof jsonb !== 'object') return null;
    const parts = Object.entries(jsonb).map(([age, n]) => `${n}× ${age}`);
    return parts.length ? parts.join(', ') : null;
  };

  const fmtRelative = (iso) => {
    if (!iso) return null;
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

  const fmtAbsolute = (iso) => iso ? new Date(iso).toLocaleString() : null;

  const placeName = (uuid) => {
    const p = placesById?.get(uuid);
    if (p?.name) return p.name;
    return uuid?.slice(0, 8) ?? '—';
  };

  const togglePatch = async (key) => {
    if (pendingFlag) return; // serialize requests
    const next = !mom[key];
    const previous = mom; // captured for rollback
    // Optimistic flip: update local view immediately.
    onPatched({ ...mom, [key]: next });
    setPendingFlag(key);
    setActionError(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mom.id, patch: { [key]: next } }),
      });
      const ct = r.headers.get('content-type') || '';
      const text = await r.text();
      if (!ct.includes('application/json')) {
        if (text.trimStart().startsWith('//') || text.includes('export default async function')) {
          throw new Error("API routes don't run under `npm run dev`. Use `vercel dev` or a deployed preview.");
        }
        throw new Error(`Unexpected ${r.status} response`);
      }
      const body = JSON.parse(text);
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      // Replace the optimistic shape with the server's authoritative row
      // (which also has fresh updated_at, etc).
      onPatched(body.row);
    } catch (e) {
      // Roll back to the pre-click state.
      onPatched(previous);
      setActionError(e?.message || 'Network error');
    } finally {
      setPendingFlag(null);
    }
  };

  const Section = ({ title, children }) => (
    <div className="py-3" style={{ borderBottom: `1px solid ${AC.border}` }}>
      <div className="text-[10.5px] tracking-[.16em] uppercase mb-1.5" style={{ color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );

  const KV = ({ label, value, mono = false }) => (
    <div className="flex items-baseline gap-3 py-0.5">
      <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted, width: 110, flexShrink: 0 }}>
        {label}
      </div>
      <div
        className="text-[12.5px] flex-1 break-words"
        style={{ fontFamily: mono ? 'monospace' : 'Albert Sans', color: value == null || value === '' ? AC.textMuted : AC.text }}
      >
        {value == null || value === '' ? '—' : value}
      </div>
    </div>
  );

  const Chips = ({ items, color = AC.text, bg = AC.surfaceAlt }) => {
    if (!items || items.length === 0) {
      return <span className="text-[12.5px]" style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className="rounded-full px-2 py-0.5 text-[11.5px]"
            style={{ background: bg, color, fontFamily: 'Albert Sans' }}
          >
            {it}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: `rgba(10,14,22,0.55)`, animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Profile detail for ${mom.display_name || 'mom'}`}
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: AC.surface,
          border: `1px solid ${AC.border}`,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Sticky header */}
        <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: `1px solid ${AC.border}`, background: AC.bg }}>
          {photo0 ? (
            <img
              src={photo0}
              alt=""
              className="rounded-full"
              style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${AC.border}`, flexShrink: 0 }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 44, height: 44, background: AC.railBg, color: AC.warn, fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, flexShrink: 0 }}
            >
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: AC.text, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                {mom.display_name || '—'}
              </div>
              {mom.verified && (
                <span title="Verified" style={{ color: AC.success, fontSize: 14, fontWeight: 700 }}>✓</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[12px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft }}>
              <span>@{mom.username || '—'}</span>
              <span style={{ color: AC.textMuted }}>·</span>
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
            style={{ background: 'transparent', color: AC.textSoft, border: `1px solid ${AC.border}` }}
          >
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          <Section title="Photos">
            {Array.isArray(mom.photos) && mom.photos.length ? (
              <div className="flex flex-wrap gap-1.5">
                {mom.photos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`Enlarge photo ${i + 1}`}
                    className="rounded-lg transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                    style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block', ['--tw-ring-color']: AC.text }}
                  >
                    <img
                      src={url}
                      alt=""
                      className="rounded-lg block"
                      style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${AC.border}` }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[12.5px]" style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>No photos</span>
            )}
          </Section>

          <Section title="Bio">
            <div className="text-[13px] leading-snug" style={{ fontFamily: 'Albert Sans', color: mom.bio ? AC.text : AC.textMuted }}>
              {mom.bio || '—'}
            </div>
          </Section>

          <Section title="Identity">
            <KV label="Display name" value={mom.display_name}/>
            <KV label="Username"     value={mom.username ? `@${mom.username}` : null}/>
            <KV label="Age"          value={mom.age}/>
            <KV label="Profile id"   value={mom.id} mono/>
            <KV label="Auth user id" value={mom.auth_user_id} mono/>
          </Section>

          <Section title="Family">
            <KV label="Kids ages" value={fmtKidsAges(mom.kids_ages)}/>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted, width: 110, flexShrink: 0 }}>Mom types</div>
              <div className="flex-1"><Chips items={mom.mom_types}/></div>
            </div>
          </Section>

          <Section title="Preferences">
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted, width: 110, flexShrink: 0 }}>Values</div>
              <div className="flex-1"><Chips items={mom.values} bg={`color-mix(in srgb, ${AC.warn} 15%, transparent)`}/></div>
            </div>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted, width: 110, flexShrink: 0 }}>Interests</div>
              <div className="flex-1"><Chips items={mom.interests} bg={`color-mix(in srgb, ${AC.success} 13%, transparent)`} color={AC.success}/></div>
            </div>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted, width: 110, flexShrink: 0 }}>Free slots</div>
              <div className="flex-1"><Chips items={mom.free_slots}/></div>
            </div>
            <div className="flex items-baseline gap-3 py-0.5">
              <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textMuted, width: 110, flexShrink: 0 }}>Places</div>
              <div className="flex-1"><Chips items={(mom.places || []).map(placeName)}/></div>
            </div>
            <KV
              label="Pref. events"
              value={mom.preferred_event_ids?.length
                ? `${mom.preferred_event_ids.length} event${mom.preferred_event_ids.length === 1 ? '' : 's'}: ${mom.preferred_event_ids.slice(0, 3).map(id => id?.slice(0, 8) ?? id).join(', ')}${mom.preferred_event_ids.length > 3 ? '…' : ''}`
                : null}
            />
          </Section>

          <Section title="Geo">
            <KV label="City"         value={mom.city}/>
            <KV label="Neighborhood" value={mom.neighborhood}/>
            <KV label="Lat / Lng"    value={mom.home_lat != null && mom.home_lng != null ? `${Number(mom.home_lat).toFixed(6)}, ${Number(mom.home_lng).toFixed(6)}` : null} mono/>
            <KV label="Distance"     value={mom.distance_miles != null ? `${mom.distance_miles} mi` : null}/>
          </Section>

          <Section title="Flags">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'visible',        label: 'Visible',   on: !!mom.visible,        onColor: AC.success },
                { key: 'verified',       label: 'Verified',  on: !!mom.verified,       onColor: AC.success },
                { key: 'blocked_global', label: 'Blocked',   on: !!mom.blocked_global, onColor: AC.accent },
              ].map(f => (
                <span
                  key={f.key}
                  className="rounded-full px-2.5 py-1 text-[11px]"
                  style={{
                    background: f.on ? `color-mix(in srgb, ${f.onColor} 13%, transparent)` : AC.surfaceAlt,
                    color: f.on ? f.onColor : AC.textMuted,
                    fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                  }}
                >
                  {f.label} · {f.on ? 'on' : 'off'}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Social">
            {mom.social_links && typeof mom.social_links === 'object' && Object.keys(mom.social_links).length ? (
              <pre
                className="text-[11.5px] rounded-lg p-2 overflow-x-auto"
                style={{ background: AC.surfaceAlt, color: AC.text, fontFamily: 'monospace' }}
              >
                {JSON.stringify(mom.social_links, null, 2)}
              </pre>
            ) : (
              <span className="text-[12.5px]" style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>—</span>
            )}
            {/* GoMama prototype verification signals — self-attested by the mom
                in Profile tab. (Instagram OR Facebook) + photo ⇒ Verified mom. */}
            {mom.verified && typeof mom.verified === 'object' && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { key: 'instagram', label: 'Instagram' },
                  { key: 'facebook',  label: 'Facebook'  },
                  { key: 'photo',     label: 'Real photo' },
                ].map(f => {
                  const on = !!mom.verified[f.key];
                  return (
                    <span key={f.key} className="rounded-full px-2.5 py-1 text-[11px]" style={{
                      background: on ? `color-mix(in srgb, ${AC.success} 13%, transparent)` : AC.surfaceAlt,
                      color: on ? AC.success : AC.textMuted,
                      fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                    }}>
                      {f.label} · {on ? 'on' : 'off'}
                    </span>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Audit">
            <KV label="Source"      value={mom.source}/>
            <KV label="Created"     value={mom.created_at ? `${fmtAbsolute(mom.created_at)} (${fmtRelative(mom.created_at)})` : null}/>
            <KV label="Updated"     value={mom.updated_at ? `${fmtAbsolute(mom.updated_at)} (${fmtRelative(mom.updated_at)})` : null}/>
            <KV label="Last active" value={mom.last_active_at ? `${fmtAbsolute(mom.last_active_at)} (${fmtRelative(mom.last_active_at)})` : null}/>
          </Section>

          {/* Bottom spacer so the last section isn't flush against the footer */}
          <div style={{ height: 12 }}/>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${AC.border}`, background: AC.bg }}>
          <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
            {[
              { key: 'verified',       label: 'Verified', onColor: AC.accent, offLabel: 'Mark verified',   onLabel: 'Verified ✓' },
              { key: 'visible',        label: 'Visible',  onColor: AC.success,   offLabel: 'Mark visible',    onLabel: 'Visible ✓'  },
              { key: 'blocked_global', label: 'Block',    onColor: AC.accent, offLabel: 'Block globally',  onLabel: 'Blocked'    },
            ].map(b => {
              const on = !!mom[b.key];
              const isPending = pendingFlag === b.key;
              const anyPending = !!pendingFlag;
              return (
                <button
                  key={b.key}
                  onClick={() => togglePatch(b.key)}
                  disabled={anyPending}
                  aria-pressed={on}
                  className="rounded-full px-3 py-1.5 transition-colors"
                  style={{
                    background: on ? b.onColor : AC.surface,
                    color: on ? '#fff' : AC.text,
                    border: `1px solid ${on ? b.onColor : AC.border}`,
                    fontFamily: 'Albert Sans',
                    fontWeight: 600,
                    fontSize: 12.5,
                    opacity: anyPending ? 0.6 : 1,
                    cursor: anyPending ? 'wait' : 'pointer',
                  }}
                >
                  {isPending ? '…' : (on ? b.onLabel : b.offLabel)}
                </button>
              );
            })}
          </div>
          {actionError && (
            <div
              className="px-5 pb-3 text-[11.5px]"
              style={{ fontFamily: 'Albert Sans', color: AC.accent }}
              role="alert"
            >
              {actionError}
            </div>
          )}
        </div>
      </div>
      {lightboxIndex !== null && (
        <MomPhotoLightbox
          photos={mom.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

// Full-screen photo lightbox over the detail modal. Click thumbnail in the
// modal's Photos section to open. Loops at both ends; close via X, backdrop, or Esc.
const MomPhotoLightbox = ({ photos, initialIndex, onClose }) => {
  // Defensive clamp in case caller passed an out-of-range initialIndex.
  const clampedInitial = Math.max(0, Math.min(initialIndex ?? 0, (photos?.length ?? 0) - 1));
  const [index, setIndex] = useState(clampedInitial);

  // Esc closes the lightbox. The parent modal's own Esc listener
  // short-circuits while lightboxIndex !== null, so this listener owns Esc.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!photos || photos.length === 0) return null;

  const total = photos.length;
  const showNav = total > 1;
  const next = (e) => {
    e?.stopPropagation();
    setIndex(i => (i + 1) % total);
  };
  const prev = (e) => {
    e?.stopPropagation();
    setIndex(i => (i - 1 + total) % total);
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: `rgba(10,14,22,0.85)`, animation: 'fadeIn 0.15s ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${total}`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        autoFocus
        aria-label="Close enlarged photo"
        className="absolute top-4 right-4 rounded-full p-2 transition-colors"
        style={{ background: AC.surface, color: AC.text, border: `1px solid ${AC.border}` }}
      >
        <X size={20}/>
      </button>

      {showNav && (
        <button
          onClick={prev}
          aria-label="Previous photo"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors"
          style={{ background: AC.surface, color: AC.text, border: `1px solid ${AC.border}` }}
        >
          <ChevronLeft size={24}/>
        </button>
      )}

      <img
        onClick={(e) => e.stopPropagation()}
        src={photos[index]}
        alt=""
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      />

      {showNav && (
        <button
          onClick={next}
          aria-label="Next photo"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors"
          style={{ background: AC.surface, color: AC.text, border: `1px solid ${AC.border}` }}
        >
          <ChevronRight size={24}/>
        </button>
      )}

      {showNav && (
        <div
          aria-live="polite"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12.5px]"
          style={{ fontFamily: 'Albert Sans', color: AC.railTextActive, fontWeight: 600 }}
        >
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Mom profiles tab — promoted moms in the discoverable directory.
// ============================================================================
export const MomProfilesTab = ({ rows, places, onPatch }) => {
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

  // GoMama redesign — verification signal counts (Instagram + Facebook + photo).
  // Source: profile.verified, mirrored into onboarding_profiles JSONB.
  const social = rows.filter(r => r.verified?.instagram || r.verified?.facebook).length;
  const photoVerified = rows.filter(r => r.verified?.photo).length;
  const fullyVerified = rows.filter(r =>
    (r.verified?.instagram || r.verified?.facebook) && r.verified?.photo
  ).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total mom profiles" value={fmt(rows.length)}/>
        <Stat label="Real signups" value={fmt(realCount)} hint="source=onboarding"/>
        <Stat label="Seeded" value={fmt(seedCount)} hint="source=seed"/>
        <Stat label="Verified" value={fmt(verified)} hint={pct(verified, rows.length)}/>
      </div>

      {/* GoMama verification funnel — social ⇄ photo ⇄ fully verified */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Social connected" value={fmt(social)} hint="Instagram or Facebook"/>
        <Stat label="Real photo added" value={fmt(photoVerified)} hint={pct(photoVerified, rows.length)}/>
        <Stat label="Fully verified" value={fmt(fullyVerified)} hint="social + photo"/>
      </div>

      <SectionTitle hint="last 30 days">Daily new mom profiles</SectionTitle>
      <DailyTrend rows={rows} color={AC.accent}/>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Card>
          <SectionTitle hint="top 8">Cities</SectionTitle>
          <BarList items={cities} total={rows.length}/>
        </Card>
        <Card>
          <SectionTitle hint="self-described">Mom types</SectionTitle>
          <BarList items={tally(rows, r => r.mom_types || [])} total={rows.length} color={AC.success}/>
        </Card>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / city / values / interests…"
          className="flex-1 rounded-xl px-3 py-2 outline-none text-[13px]"
          style={{ background: AC.surface, border: `1px solid ${AC.border}`, color: AC.text, fontFamily: 'Albert Sans' }}/>
        <button onClick={() => downloadCsv(`gomama-mom-profiles-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: AC.railBg, color: AC.railTextActive, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export CSV ({filtered.length})
        </button>
      </div>

      <Card padding={0}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: AC.surfaceAlt }}>
              <tr>
                {['Name', 'Username', 'City', 'Kids', 'Mom types', 'Values', 'Interests', 'Source', 'Joined'].map(h => (
                  <th key={h} className="text-left px-3 py-2" style={{
                    color: AC.textSoft, fontWeight: 700, letterSpacing: '.04em',
                    textTransform: 'uppercase', fontSize: 10.5, whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, background: AC.surfaceAlt,
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
                  style={{ borderTop: `1px solid ${AC.border}`, ['--mp-row-hover']: AC.surfaceAlt }}
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
                  <td className="px-3 py-2" style={{ color: AC.text, whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {r.display_name || '—'}
                    {r.verified && (
                      <span className="ml-1.5 text-[10px]" style={{ color: AC.success, fontWeight: 700 }}>✓</span>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ color: AC.textSoft }}>@{r.username || '—'}</td>
                  <td className="px-3 py-2" style={{ color: AC.textSoft, whiteSpace: 'nowrap' }}>
                    {r.city || '—'}
                    {r.neighborhood && <div style={{ color: AC.textMuted, fontSize: 11 }}>{r.neighborhood}</div>}
                  </td>
                  <td className="px-3 py-2" style={{ color: AC.text, whiteSpace: 'nowrap' }}>{fmtKids(r.kids_ages)}</td>
                  <td className="px-3 py-2" style={{ color: AC.text }}>{fmtList(r.mom_types, 2)}</td>
                  <td className="px-3 py-2" style={{ color: AC.text }}>{fmtList(r.values, 3)}</td>
                  <td className="px-3 py-2" style={{ color: AC.text }}>{fmtList(r.interests, 3)}</td>
                  <td className="px-3 py-2" style={{ whiteSpace: 'nowrap' }}>
                    <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{
                      background: r.source === 'seed' ? `color-mix(in srgb, ${AC.warn} 15%, transparent)` : `color-mix(in srgb, ${AC.success} 13%, transparent)`,
                      color: r.source === 'seed' ? AC.text : AC.success,
                      fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
                    }}>{r.source || 'unknown'}</span>
                  </td>
                  <td className="px-3 py-2" style={{ color: AC.textMuted, whiteSpace: 'nowrap' }}>{rel(r.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center" style={{ color: AC.textMuted, fontFamily: 'Albert Sans' }}>
                  No mom profiles match that search.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <div className="px-3 py-2 border-t text-[11.5px]" style={{ borderColor: AC.border, color: AC.textMuted, fontFamily: 'Albert Sans' }}>
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
export const QuickActions = ({ onReset, momsCount, momProfilesCount, placesCount, eventsCount }) => {
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
      const res = await adminFetch('/api/admin/reset', { method: 'POST' });
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
  const [seedOpts, setSeedOpts] = useState({ places: 50, events: 30, moms: 1000, reset: true, resetMoms: 'all' });
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState(null);

  const setSeedField = (key) => (e) => {
    const raw = e.target.type === 'checkbox'
      ? e.target.checked
      : e.target.type === 'number'
        ? Number(e.target.value)
        : e.target.value;
    setSeedOpts(o => ({ ...o, [key]: raw }));
  };

  const fireSeed = async () => {
    setSeedPhase('running');
    setSeedError(null);
    try {
      const res = await adminFetch('/api/admin/seed', {
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
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: AC.text, letterSpacing: '-.02em' }}>
          Quick Actions
        </h2>
        <p className="mt-1 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft }}>
          One-click maintenance utilities. Destructive actions require typed confirmation.
        </p>
      </div>

      {/* Run seed card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${AC.success}`, background: `color-mix(in srgb, ${AC.success} 3%, transparent)` }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: `color-mix(in srgb, ${AC.success} 8%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${AC.success} 19%, transparent)` }}>
          <Sprout size={16} style={{ color: AC.success }}/>
          <div className="text-[12px] tracking-[.16em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: AC.success }}>
            Seed data
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: AC.text, letterSpacing: '-.01em' }}>
            Run seed
          </h3>
          <p className="mt-1 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft, lineHeight: 1.5 }}>
            Populates <strong>places</strong>, <strong>events</strong>, and <strong>mom_profiles</strong> with synthetic Tampa Bay data so you can test search and matching at scale. Idempotent — places/events upsert by slug, moms by username. With <em>reset</em> on, the selected mom reset scope is wiped first.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {['places', 'events', 'moms'].map(field => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 600 }}>
                  {field}
                </span>
                <input type="number" min={0} step={1}
                  value={seedOpts[field]}
                  onChange={setSeedField(field)}
                  disabled={seedPhase === 'running'}
                  className="rounded-lg px-2 py-1.5 outline-none text-[13px]"
                  style={{ background: AC.surface, border: `1px solid ${AC.border}`, color: AC.text, fontFamily: 'Albert Sans' }}/>
              </label>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 cursor-pointer" style={{ width: 'fit-content' }}>
            <input type="checkbox" checked={seedOpts.reset} onChange={setSeedField('reset')} disabled={seedPhase === 'running'}/>
            <span className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.text }}>
              Reset mom profiles first
            </span>
          </label>

          {seedOpts.reset && (
            <label className="mt-3 flex flex-col gap-1" style={{ maxWidth: 360 }}>
              <span className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 600 }}>
                Mom reset scope
              </span>
              <select
                value={seedOpts.resetMoms}
                onChange={setSeedField('resetMoms')}
                disabled={seedPhase === 'running'}
                className="rounded-lg px-2 py-1.5 outline-none text-[13px]"
                style={{ background: AC.surface, border: `1px solid ${AC.border}`, color: AC.text, fontFamily: 'Albert Sans' }}
              >
                <option value="all">All mom profiles</option>
                <option value="seed">Only source=seed</option>
              </select>
            </label>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button onClick={fireSeed} disabled={seedPhase === 'running'}
              className="rounded-xl px-3 py-2 flex items-center gap-1.5"
              style={{
                background: AC.success, color: '#fff',
                fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
                opacity: seedPhase === 'running' ? 0.7 : 1,
              }}>
              <Sprout size={14}/> {seedPhase === 'running' ? 'Seeding…' : 'Run seed'}
            </button>
          </div>

          {seedPhase === 'done' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `color-mix(in srgb, ${AC.success} 8%, transparent)`, border: `1px solid ${AC.success}` }}>
              <CheckIcon size={16} style={{ color: AC.success, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.text, lineHeight: 1.5 }}>
                <strong>Seeded.</strong> {fmt(seedResult?.places ?? 0)} places · {fmt(seedResult?.events ?? 0)} events · {fmt(seedResult?.moms ?? 0)} mom profiles
                {seedResult?.reset?.deleted ? <> (reset {seedResult.reset.scope || 'seed'} deleted {fmt(seedResult.reset.deleted)})</> : null}.
                <button onClick={dismissSeed} className="ml-2 underline" style={{ color: AC.success, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {seedPhase === 'error' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `color-mix(in srgb, ${AC.accent} 8%, transparent)`, border: `1px solid ${AC.accent}` }}>
              <AlertTriangle size={16} style={{ color: AC.accent, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.text, lineHeight: 1.5 }}>
                <strong>Seed failed.</strong> {seedError}
                <button onClick={dismissSeed} className="ml-2 underline" style={{ color: AC.accent, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${AC.accent}`, background: `color-mix(in srgb, ${AC.accent} 3%, transparent)` }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: `color-mix(in srgb, ${AC.accent} 8%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${AC.accent} 19%, transparent)` }}>
          <ShieldAlert size={16} style={{ color: AC.accent }}/>
          <div className="text-[12px] tracking-[.16em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: AC.accent }}>
            Danger zone
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: AC.text, letterSpacing: '-.01em' }}>
            Reset database
          </h3>
          <p className="mt-1 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.textSoft, lineHeight: 1.5 }}>
            Truncates every row in <strong>events</strong> ({fmt(eventsCount)}), <strong>places</strong> ({fmt(placesCount)}), <strong>mom_profiles</strong> ({fmt(momProfilesCount)}), and <strong>onboarding_profiles</strong> ({fmt(momsCount)}).
            <br/>
            <strong style={{ color: AC.accent }}>This cannot be undone.</strong> Auth users in Supabase Auth are NOT deleted.
          </p>

          {phase === 'idle' && (
            <button onClick={() => setPhase('arming')}
              className="mt-3 rounded-xl px-3 py-2 flex items-center gap-1.5"
              style={{ background: AC.accent, color: '#fff', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5 }}>
              <Trash2 size={14}/> Reset database
            </button>
          )}

          {(phase === 'arming' || phase === 'running') && (
            <div className="mt-3 rounded-xl p-3" style={{ background: AC.bg, border: `1px solid ${AC.accent}` }}>
              <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: AC.text, lineHeight: 1.5 }}>
                Type <code style={{ background: AC.surfaceAlt, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', color: AC.accent, fontWeight: 700 }}>{ARM_TOKEN}</code> below to confirm. Cannot be undone.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={`Type ${ARM_TOKEN}`}
                  disabled={phase === 'running'}
                  autoFocus
                  className="flex-1 rounded-xl px-3 py-2 outline-none text-[13px]"
                  style={{ background: AC.surface, border: `1px solid ${AC.border}`, color: AC.text, fontFamily: 'monospace', letterSpacing: '.04em' }}
                />
                <button onClick={fire} disabled={!armed || phase === 'running'}
                  className="rounded-xl px-3 py-2 flex items-center gap-1.5"
                  style={{
                    background: armed ? AC.accent : AC.surfaceAlt,
                    color: armed ? '#fff' : AC.textMuted,
                    fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
                    cursor: armed ? 'pointer' : 'not-allowed',
                  }}>
                  <Trash2 size={13}/> {phase === 'running' ? 'Resetting…' : 'Confirm reset'}
                </button>
                <button onClick={cancel} disabled={phase === 'running'}
                  className="rounded-xl px-3 py-2"
                  style={{ background: 'transparent', border: `1px solid ${AC.border}`, color: AC.textSoft, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `color-mix(in srgb, ${AC.success} 8%, transparent)`, border: `1px solid ${AC.success}` }}>
              <CheckIcon size={16} style={{ color: AC.success, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.text, lineHeight: 1.5 }}>
                <strong>Database reset.</strong> Deleted {fmt(result?.events?.deleted ?? 0)} event{result?.events?.deleted === 1 ? '' : 's'}, {fmt(result?.places?.deleted ?? 0)} place{result?.places?.deleted === 1 ? '' : 's'}, {fmt(result?.mom_profiles?.deleted ?? 0)} mom profile{result?.mom_profiles?.deleted === 1 ? '' : 's'}, and {fmt(result?.onboarding_profiles?.deleted ?? 0)} onboarding profile{result?.onboarding_profiles?.deleted === 1 ? '' : 's'}. Dashboard reloaded.
                <button onClick={cancel} className="ml-2 underline" style={{ color: AC.success, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: `color-mix(in srgb, ${AC.accent} 8%, transparent)`, border: `1px solid ${AC.accent}` }}>
              <AlertTriangle size={16} style={{ color: AC.accent, flexShrink: 0, marginTop: 1 }}/>
              <div className="text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: AC.text, lineHeight: 1.5 }}>
                <strong>Reset failed.</strong> {error}
                <button onClick={() => setPhase('arming')} className="ml-2 underline" style={{ color: AC.accent, background: 'transparent', border: 'none', cursor: 'pointer' }}>
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
