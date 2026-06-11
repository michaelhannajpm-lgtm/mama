// ============================================================================
// Mom profiles — admin directory of every mom that has a public profile.
//
// Replaces the legacy `MomProfilesTab` in sections/legacy.jsx (still exported
// for compat). Uses the console design system (AC + primitives), supports
// every end-user action mirrored to the admin side (edit identity / family /
// preferences / location / photos / social, plus admin-only moderation flags),
// and ships with bulk actions on the list (verify, hide, block, delete, set
// source). Deep-link target for the Users-tab "Mom profile" link via the
// session-storage handshake + `gm-admin-open-mom` window event.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import {
  Users, Search, X, ChevronLeft, ChevronRight, ExternalLink, Trash2, AlertTriangle,
  ShieldCheck, ShieldOff, Eye, EyeOff, Star, RotateCcw, Save, AlertCircle, RefreshCw,
} from 'lucide-react';
import { AC, AC_TONES } from '../admin-theme';
import { adminFetch } from '../lib/adminFetch';
import {
  PageHeader, StatCard, Card, DataTable, Toolbar, Input, Badge, Banner, Button,
  EmptyState, BusyOverlay, fmt, pct, rel,
} from '../components/primitives';
import { useConfirm } from '../components/ConfirmDialog';
import { navigateRecord, navigateSection, currentRecordRef } from '../lib/adminRouter';
import { MOM_TYPES, VALUES, INTERESTS, KID_AGES, DAYS, TIME_WINDOWS } from '../../../data/taxonomy';
import { AiWriteButton } from '../components/AiWriteButton.jsx';
import { AiImageControl } from '../components/AiImageControl.jsx';
import { AiReviewButton } from '../components/AiReviewButton.jsx';
import { CopyLinkButton } from '../components/CopyLinkButton';

// Stable chip palettes for read-only displays.
const CHIP_TONES = {
  default: AC_TONES.neutral,
  values: AC_TONES.warn,
  interests: AC_TONES.success,
  age: AC_TONES.info,
};

// All free-time slot tokens, "Day-windowId" e.g. "Mon-morning". 7×4 = 28.
const ALL_SLOTS = DAYS.flatMap((d) => TIME_WINDOWS.map((w) => `${d}-${w.id}`));

// ============================================================================
// Section root
// ============================================================================
export const MomProfilesSection = ({ rows, places, onPatch, onReload, reloading = false }) => {
  const confirm = useConfirm();
  const placesById = useMemo(
    () => new Map((places || []).map((p) => [p.id, p])),
    [places]
  );

  const [query, setQuery] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('all');     // all | verified | unverified
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // all | visible | hidden
  const [sourceFilter, setSourceFilter] = useState('all');         // all | seed | onboarding
  const [blockedFilter, setBlockedFilter] = useState('not-blocked'); // not-blocked | blocked | all
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedMom, setSelectedMom] = useState(null);
  const [deepLinkMiss, setDeepLinkMiss] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Listen for "open mom <id>" from the Users tab — the link there sets a
  // sessionStorage key + dispatches this event. We auto-open the modal once
  // the row arrives in our props.
  useEffect(() => {
    let pendingId = null;
    try { pendingId = sessionStorage.getItem('gm-admin-open-mom'); } catch { /* ignore */ }
    if (pendingId && rows?.length) {
      const target = rows.find((r) => r.id === pendingId || r.username === pendingId);
      if (target) { setSelectedMom(target); setDeepLinkMiss(null); }
      else setDeepLinkMiss(pendingId);
      try { sessionStorage.removeItem('gm-admin-open-mom'); } catch { /* ignore */ }
    }
    const onOpen = (ev) => {
      const ref = ev?.detail?.id;
      if (!ref) return;
      const target = (rows || []).find((r) => r.id === ref || r.username === ref);
      if (target) { if (selectedMom?.id !== target.id) setSelectedMom(target); setDeepLinkMiss(null); }
      else if (rows?.length) setDeepLinkMiss(ref);
    };
    window.addEventListener('gm-admin-open-mom', onOpen);
    return () => window.removeEventListener('gm-admin-open-mom', onOpen);
  }, [rows]);

  // Sync the address bar with the open profile (canonical id form).
  useEffect(() => {
    if (selectedMom && selectedMom.id) {
      navigateRecord('mom-profiles', selectedMom.id);
    } else if (!selectedMom && currentRecordRef()) {
      navigateSection('mom-profiles');
    }
  }, [selectedMom]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (verifiedFilter === 'verified' && !r.verified) return false;
      if (verifiedFilter === 'unverified' && r.verified) return false;
      if (visibilityFilter === 'visible' && !r.visible) return false;
      if (visibilityFilter === 'hidden' && r.visible) return false;
      if (sourceFilter !== 'all' && (r.source || 'unknown') !== sourceFilter) return false;
      if (blockedFilter === 'blocked' && !r.blocked_global) return false;
      if (blockedFilter === 'not-blocked' && r.blocked_global) return false;
      if (!q) return true;
      return [
        r.display_name, r.username, r.city, r.neighborhood, r.bio,
        ...(r.mom_types || []), ...(r.values || []), ...(r.interests || []),
      ].some((v) => (v || '').toString().toLowerCase().includes(q));
    });
  }, [rows, query, verifiedFilter, visibilityFilter, sourceFilter, blockedFilter]);

  // Stats
  const verified = (rows || []).filter((r) => r.verified).length;
  const visible = (rows || []).filter((r) => r.visible).length;
  const blocked = (rows || []).filter((r) => r.blocked_global).length;
  const seeded = (rows || []).filter((r) => r.source === 'seed').length;
  const real = (rows || []).filter((r) => r.source === 'onboarding').length;

  const allFilteredIds = filtered.map((r) => r.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && allFilteredIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkPatch = async (patch, confirmMsg) => {
    if (selectedIds.size === 0) return;
    if (confirmMsg && !(await confirm({ title: 'Please confirm', message: confirmMsg, confirmLabel: 'Confirm', tone: 'default' }))) return;
    setBusy(true); setActionMsg(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], patch }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      setActionMsg(`Updated ${body.count ?? selectedIds.size} profile${selectedIds.size === 1 ? '' : 's'} ✓`);
      setSelectedIds(new Set());
      onReload?.();
    } catch (e) {
      setActionMsg(e?.message || 'Bulk update failed');
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.size} mom profile${selectedIds.size === 1 ? '' : 's'}?`,
      message: 'This cannot be undone. Auth users in Supabase Auth are not affected.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true); setActionMsg(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], delete: true }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      setActionMsg(`Deleted ${body.deleted ?? selectedIds.size} profile${selectedIds.size === 1 ? '' : 's'} ✓`);
      setSelectedIds(new Set());
      onReload?.();
    } catch (e) {
      setActionMsg(e?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
    if (!filtered.length) return;
    const cols = [
      'id', 'auth_user_id', 'display_name', 'username', 'age', 'city', 'neighborhood',
      'distance_miles', 'kids_ages', 'mom_types', 'values', 'interests', 'free_slots',
      'verified', 'visible', 'blocked_global', 'account_status', 'source',
      'created_at', 'updated_at', 'last_active_at',
    ];
    const esc = (v) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [cols.join(','), ...filtered.map((r) => cols.map((k) => esc(r[k])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gomama-mom-profiles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Filter chip — compact pill toggle.
  const FilterPill = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: AC.radiusPill,
        background: active ? AC.accentSoft : AC.surface,
        color: active ? AC.accent : AC.textSoft,
        border: `1px solid ${active ? AC.accentBorder : AC.borderStrong}`,
        fontFamily: AC.font, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );

  // Per-row checkbox column
  const columns = [
    {
      key: 'select', header: (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected; }}
          onChange={toggleAll}
          aria-label={allSelected ? 'Deselect all' : 'Select all'}
          style={{ cursor: 'pointer' }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: 28,
      sortable: false,
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r.id)}
          onChange={() => toggleOne(r.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${r.display_name || r.username || 'profile'}`}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      key: 'name', header: 'Name',
      sort: (r) => (r.display_name || r.username || '').toLowerCase(),
      render: (r) => (
        <div className="flex items-center gap-2">
          {Array.isArray(r.photos) && r.photos[0] ? (
            <img src={r.photos[0]} alt="" style={{ width: 30, height: 30, borderRadius: AC.radiusPill, objectFit: 'cover', border: `1px solid ${AC.border}` }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: AC.radiusPill, background: AC.accentSoft, color: AC.accent, fontFamily: AC.font, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {((r.display_name || r.username || '?')[0] || '?').toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: AC.text }}>
              {r.display_name || '—'}
              {r.verified && <span title="Verified" style={{ color: AC.success, marginLeft: 4 }}>✓</span>}
            </div>
            <div style={{ fontSize: 11, color: AC.textMuted }}>{r.username ? `@${r.username}` : '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'location', header: 'Location',
      sort: (r) => (r.city || r.neighborhood || '').toLowerCase(),
      render: (r) => (
        <div>
          <div style={{ color: AC.text }}>{r.city || '—'}</div>
          {r.neighborhood && <div style={{ fontSize: 11, color: AC.textMuted }}>{r.neighborhood}</div>}
        </div>
      ),
    },
    {
      key: 'kids', header: 'Kids',
      sort: (r) => (r.kids_ages && typeof r.kids_ages === 'object'
        ? Object.values(r.kids_ages).filter(Boolean).length : 0),
      render: (r) => {
        const ja = r.kids_ages;
        if (!ja || typeof ja !== 'object') return '—';
        const parts = Object.entries(ja).filter(([, v]) => v).map(([k]) => k);
        return parts.length ? parts.join(', ') : '—';
      },
    },
    {
      key: 'flags', header: 'Status', sortable: false, render: (r) => (
        <div className="flex gap-1 flex-wrap">
          {r.verified ? <Badge tone="success" dot>verified</Badge> : <Badge tone="neutral">unverified</Badge>}
          {!r.visible && <Badge tone="warn">hidden</Badge>}
          {r.blocked_global && <Badge tone="danger" dot>blocked</Badge>}
          {r.account_status && r.account_status !== 'active' && <Badge tone="warn">{r.account_status}</Badge>}
        </div>
      ),
    },
    {
      key: 'source', header: 'Source', render: (r) => (
        <Badge tone={r.source === 'seed' ? 'warn' : 'info'}>{r.source || 'unknown'}</Badge>
      ),
    },
    {
      key: 'last_active_at', header: 'Last active', align: 'right', mono: true,
      sort: (r) => Date.parse(r.last_active_at || r.updated_at) || 0,
      render: (r) => rel(r.last_active_at || r.updated_at),
    },
  ];

  return (
    <div>
      <PageHeader
        title=""
        subtitle=""
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total" value={fmt((rows || []).length)} icon={Users} />
        <StatCard label="Verified" value={fmt(verified)} tone={AC.success} hint={pct(verified, (rows || []).length)} />
        <StatCard label="Visible" value={fmt(visible)} hint={pct(visible, (rows || []).length)} />
        <StatCard label="Blocked" value={fmt(blocked)} tone={AC.danger} />
        <StatCard label="Seeded" value={fmt(seeded)} tone={AC.warn} />
        <StatCard label="Real signups" value={fmt(real)} tone={AC.accent} />
      </div>

      {actionMsg && (
        <Banner tone={actionMsg.includes('✓') ? 'success' : 'danger'} icon={actionMsg.includes('✓') ? ShieldCheck : AlertTriangle}>
          {actionMsg}
        </Banner>
      )}

      {/* Action bar — directly above the grid */}
      <div className="flex items-center justify-end gap-2" style={{ marginBottom: 12 }}>
        <Button size="sm" onClick={downloadCsv} disabled={!filtered.length}>Export CSV ({filtered.length})</Button>
        <Button
          size="sm" variant="primary" onClick={onReload} disabled={reloading}
          icon={(p) => <RefreshCw {...p} style={{ animation: reloading ? 'spin 1s linear infinite' : 'none' }} />}
        >
          {reloading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Content blocker: while a bulk action is in flight (busy) or the
          directory is re-fetching (reloading), block + spinner over the grid
          only — never the whole page. */}
      <div style={{ position: 'relative' }}>
      <Card padding={0}>
        {/* Row 1: search + counts */}
        <Toolbar style={{ margin: 0, padding: '12px 14px', borderBottom: `1px solid ${AC.divider}` }}>
          <div className="relative flex-1" style={{ maxWidth: 420 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: AC.textMuted }} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name / username / city / values / interests / bio…"
              style={{ width: '100%', paddingLeft: 32 }} />
          </div>
          <div className="tabular-nums ml-auto" style={{ fontFamily: AC.font, fontSize: 12, color: AC.textMuted }}>
            {filtered.length} / {(rows || []).length}
          </div>
        </Toolbar>

        {/* Row 2: filter pills */}
        <div style={{ display: 'flex', gap: 14, padding: '10px 14px', borderBottom: `1px solid ${AC.divider}`, flexWrap: 'wrap' }}>
          <FilterGroup label="Verified">
            <FilterPill active={verifiedFilter === 'all'} onClick={() => setVerifiedFilter('all')}>All</FilterPill>
            <FilterPill active={verifiedFilter === 'verified'} onClick={() => setVerifiedFilter('verified')}>Verified</FilterPill>
            <FilterPill active={verifiedFilter === 'unverified'} onClick={() => setVerifiedFilter('unverified')}>Unverified</FilterPill>
          </FilterGroup>
          <FilterGroup label="Visibility">
            <FilterPill active={visibilityFilter === 'all'} onClick={() => setVisibilityFilter('all')}>All</FilterPill>
            <FilterPill active={visibilityFilter === 'visible'} onClick={() => setVisibilityFilter('visible')}>Visible</FilterPill>
            <FilterPill active={visibilityFilter === 'hidden'} onClick={() => setVisibilityFilter('hidden')}>Hidden</FilterPill>
          </FilterGroup>
          <FilterGroup label="Source">
            <FilterPill active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>All</FilterPill>
            <FilterPill active={sourceFilter === 'onboarding'} onClick={() => setSourceFilter('onboarding')}>Real</FilterPill>
            <FilterPill active={sourceFilter === 'seed'} onClick={() => setSourceFilter('seed')}>Seeded</FilterPill>
          </FilterGroup>
          <FilterGroup label="Blocked">
            <FilterPill active={blockedFilter === 'not-blocked'} onClick={() => setBlockedFilter('not-blocked')}>Not blocked</FilterPill>
            <FilterPill active={blockedFilter === 'blocked'} onClick={() => setBlockedFilter('blocked')}>Blocked</FilterPill>
            <FilterPill active={blockedFilter === 'all'} onClick={() => setBlockedFilter('all')}>All</FilterPill>
          </FilterGroup>
        </div>

        {/* Row 3: bulk actions (sticky when something is selected) */}
        {selectedIds.size > 0 && (
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${AC.divider}`,
            background: AC.accentSoft, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: AC.font, fontSize: 12.5, color: AC.accent, fontWeight: 700 }}>
              {selectedIds.size} selected
            </span>
            <Button size="sm" icon={ShieldCheck} onClick={() => bulkPatch({ verified: true })} disabled={busy}>Verify</Button>
            <Button size="sm" icon={ShieldOff} onClick={() => bulkPatch({ verified: false })} disabled={busy}>Unverify</Button>
            <Button size="sm" icon={Eye} onClick={() => bulkPatch({ visible: true })} disabled={busy}>Show</Button>
            <Button size="sm" icon={EyeOff} onClick={() => bulkPatch({ visible: false })} disabled={busy}>Hide</Button>
            <Button size="sm" icon={AlertTriangle} onClick={() => bulkPatch({ blocked_global: true }, 'Block all selected profiles globally?')} disabled={busy}>Block</Button>
            <Button size="sm" icon={RotateCcw} onClick={() => bulkPatch({ blocked_global: false })} disabled={busy}>Unblock</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete} disabled={busy}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={busy}>Clear</Button>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          empty="No mom profiles match those filters."
          onRowClick={(r) => setSelectedMom(r)}
        />
      </Card>
      <BusyOverlay
        show={busy || reloading}
        label={busy ? 'Updating…' : 'Refreshing directory…'}
        radius={AC.radius}
      />
      </div>

      {deepLinkMiss && (
        <div style={{
          margin: '8px 0', padding: '8px 12px', borderRadius: 8,
          background: AC.warningSoft || '#FBF1E2', color: AC.text,
          fontFamily: AC.font, fontSize: 12.5,
        }}>
          Couldn't find a profile for "{deepLinkMiss}". It may be deleted or renamed.
          <button onClick={() => setDeepLinkMiss(null)} style={{
            marginLeft: 8, background: 'transparent', border: 'none',
            color: AC.accent, fontWeight: 600, cursor: 'pointer',
          }}>Dismiss</button>
        </div>
      )}

      {selectedMom && (
        <MomProfileDetailModal
          mom={selectedMom}
          placesById={placesById}
          onClose={() => setSelectedMom(null)}
          onPatched={(updated) => {
            setSelectedMom(updated);
            onPatch?.(updated);
          }}
          onDeleted={() => {
            setSelectedMom(null);
            onReload?.();
          }}
        />
      )}
    </div>
  );
};

// FilterGroup — bracketed label + horizontal pill row.
const FilterGroup = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontFamily: AC.font, fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: AC.textMuted, textTransform: 'uppercase' }}>
      {label}
    </span>
    {children}
  </div>
);

// ============================================================================
// Detail modal — view + edit all mom_profile fields, plus admin actions.
// ============================================================================
const MomProfileDetailModal = ({ mom, placesById, onClose, onPatched, onDeleted }) => {
  const confirm = useConfirm();
  const [tab, setTab] = useState('overview'); // overview | identity | family | preferences | location | social | settings | audit
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mom);
  const [pendingFlag, setPendingFlag] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Reset draft when the underlying mom changes (e.g. after a patch)
  useEffect(() => { setDraft(mom); }, [mom.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxIndex === null && !editing) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, lightboxIndex, editing]);

  const togglePatch = async (key) => {
    if (pendingFlag) return;
    const next = !mom[key];
    const previous = mom;
    onPatched({ ...mom, [key]: next });
    setPendingFlag(key);
    setActionError(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mom.id, patch: { [key]: next } }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      onPatched(body.row);
    } catch (e) {
      onPatched(previous);
      setActionError(e?.message || 'Network error');
    } finally {
      setPendingFlag(null);
    }
  };

  // Patch a single arbitrary field (used by lifecycle buttons, source change).
  const patchField = async (patch, confirmMsg) => {
    if (confirmMsg && !(await confirm({ title: 'Please confirm', message: confirmMsg, confirmLabel: 'Confirm', tone: 'default' }))) return;
    setSaveBusy(true); setActionError(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mom.id, patch }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      onPatched(body.row);
    } catch (e) {
      setActionError(e?.message || 'Network error');
    } finally {
      setSaveBusy(false);
    }
  };

  // Compute the diff between draft and the saved mom, send only changed keys.
  const saveDraft = async () => {
    const diff = {};
    const keys = [
      'display_name', 'username', 'age', 'bio',
      'city', 'neighborhood', 'distance_miles', 'home_lat', 'home_lng',
      'kids_ages', 'mom_types', 'values', 'interests', 'free_slots', 'photos',
      'social_links', 'settings',
    ];
    for (const k of keys) {
      const a = draft[k]; const b = mom[k];
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) diff[k] = a;
    }
    if (Object.keys(diff).length === 0) {
      setEditing(false);
      return;
    }
    setSaveBusy(true); setActionError(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mom.id, patch: diff }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      onPatched(body.row);
      setEditing(false);
    } catch (e) {
      setActionError(e?.message || 'Save failed');
    } finally {
      setSaveBusy(false);
    }
  };

  const cancelEdit = () => { setDraft(mom); setEditing(false); setActionError(null); };

  const deleteProfile = async () => {
    const ok = await confirm({
      title: `Delete @${mom.username || 'this profile'}?`,
      message: 'This permanently deletes the mom profile. It cannot be undone. The Supabase auth user is not affected.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setSaveBusy(true); setDeleting(true); setActionError(null);
    try {
      const r = await adminFetch('/api/admin/mom-profiles/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mom.id, delete: true }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `Server returned ${r.status}`);
      onDeleted?.();
    } catch (e) {
      setActionError(e?.message || 'Delete failed');
    } finally {
      setSaveBusy(false); setDeleting(false);
    }
  };

  const photo0 = Array.isArray(mom.photos) && mom.photos[0];
  const initial = ((mom.display_name || '').trim() || (mom.username || '').trim() || '?').charAt(0).toUpperCase();

  return (
    <div
      onClick={editing ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,24,40,0.55)', animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Mom profile · ${mom.display_name || mom.username || 'detail'}`}
        style={{
          position: 'relative',
          background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: AC.radius,
          width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: AC.shadowLg, overflow: 'hidden', animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Blocks the whole popup while a save / delete / lifecycle action runs */}
        <BusyOverlay show={saveBusy} label={deleting ? 'Deleting…' : 'Saving…'} radius={AC.radius} />
        {/* Sticky header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${AC.divider}`, background: AC.surfaceAlt,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {photo0 ? (
            <img src={photo0} alt="" style={{ width: 44, height: 44, borderRadius: AC.radiusPill, objectFit: 'cover', border: `1px solid ${AC.border}`, flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: AC.radiusPill, background: AC.accentSoft, color: AC.accent,
              fontFamily: AC.font, fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{initial}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontFamily: AC.font, fontSize: 17, fontWeight: 700, color: AC.text, letterSpacing: '-.01em' }}>
                {mom.display_name || '—'}
              </div>
              {mom.verified && <Badge tone="success" dot>verified</Badge>}
              {!mom.visible && <Badge tone="warn">hidden</Badge>}
              {mom.blocked_global && <Badge tone="danger" dot>blocked</Badge>}
              {mom.account_status && mom.account_status !== 'active' && <Badge tone="warn">{mom.account_status}</Badge>}
            </div>
            <div style={{ fontFamily: AC.font, fontSize: 12, color: AC.textMuted, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>@{mom.username || '—'}</span>
              <span>·</span>
              <span>{mom.city || '—'}{mom.neighborhood ? ` · ${mom.neighborhood}` : ''}</span>
              <span>·</span>
              <Badge tone={mom.source === 'seed' ? 'warn' : 'info'}>{mom.source || 'unknown'}</Badge>
            </div>
          </div>
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saveBusy}>Cancel</Button>
              <Button size="sm" variant="primary" icon={Save} onClick={saveDraft} disabled={saveBusy}>
                {saveBusy ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
          )}
          {mom?.id && <CopyLinkButton section="mom-profiles" id={mom.id} />}
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close" icon={X}>{null}</Button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 12px',
          borderBottom: `1px solid ${AC.divider}`, background: AC.surface, overflowX: 'auto',
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'identity', label: 'Identity' },
            { id: 'family', label: 'Family' },
            { id: 'preferences', label: 'Preferences' },
            { id: 'location', label: 'Location' },
            { id: 'social', label: 'Social & verify' },
            { id: 'settings', label: 'Settings' },
            { id: 'audit', label: 'Audit' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '5px 10px', borderRadius: AC.radiusSm,
                background: tab === t.id ? AC.accent : 'transparent',
                color: tab === t.id ? AC.accentText : AC.textSoft,
                border: 'none', fontFamily: AC.font, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
          {tab === 'overview' && (
            <OverviewTab mom={mom} placesById={placesById} onOpenPhoto={(i) => setLightboxIndex(i)} />
          )}
          {tab === 'identity' && (
            <IdentityTab mom={mom} draft={draft} setDraft={setDraft} editing={editing} onOpenPhoto={(i) => setLightboxIndex(i)} />
          )}
          {tab === 'family' && (
            <FamilyTab mom={mom} draft={draft} setDraft={setDraft} editing={editing} />
          )}
          {tab === 'preferences' && (
            <PreferencesTab mom={mom} draft={draft} setDraft={setDraft} editing={editing} placesById={placesById} />
          )}
          {tab === 'location' && (
            <LocationTab mom={mom} draft={draft} setDraft={setDraft} editing={editing} />
          )}
          {tab === 'social' && (
            <SocialTab mom={mom} draft={draft} setDraft={setDraft} editing={editing} />
          )}
          {tab === 'settings' && (
            <SettingsTab mom={mom} draft={draft} setDraft={setDraft} editing={editing} />
          )}
          {tab === 'audit' && (
            <AuditTab mom={mom} onPatchSource={(s) => patchField({ source: s })} busy={saveBusy} />
          )}
        </div>

        {/* Footer — admin actions */}
        <div style={{ borderTop: `1px solid ${AC.divider}`, background: AC.surfaceAlt }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', flexWrap: 'wrap' }}>
            <Button
              size="sm" icon={mom.verified ? ShieldCheck : ShieldOff}
              onClick={() => togglePatch('verified')} disabled={!!pendingFlag}
              style={mom.verified ? { background: AC.successSoft, color: AC.success, borderColor: AC.successBorder } : undefined}
            >
              {mom.verified ? 'Verified' : 'Mark verified'}
            </Button>
            <Button
              size="sm" icon={mom.visible ? Eye : EyeOff}
              onClick={() => togglePatch('visible')} disabled={!!pendingFlag}
            >
              {mom.visible ? 'Visible' : 'Hidden'}
            </Button>
            <Button
              size="sm" icon={mom.blocked_global ? AlertCircle : ShieldOff}
              variant={mom.blocked_global ? 'danger' : 'secondary'}
              onClick={() => togglePatch('blocked_global')} disabled={!!pendingFlag}
            >
              {mom.blocked_global ? 'Blocked' : 'Block'}
            </Button>
            {mom.account_status === 'deactivated' && (
              <Button size="sm" icon={RotateCcw}
                onClick={() => patchField({ account_status: 'active', deactivated_at: null }, 'Reactivate this profile?')}
                disabled={saveBusy}>Reactivate</Button>
            )}
            {(!mom.account_status || mom.account_status === 'active') && (
              <Button size="sm" icon={EyeOff}
                onClick={() => patchField({ account_status: 'deactivated', deactivated_at: new Date().toISOString() }, 'Deactivate this profile?')}
                disabled={saveBusy}>Deactivate</Button>
            )}
            <div style={{ flex: 1 }} />
            <Button
              size="sm" variant="danger" onClick={deleteProfile} disabled={saveBusy}
              icon={deleting ? (p) => <RefreshCw {...p} style={{ animation: 'spin 1s linear infinite' }} /> : Trash2}
            >
              {deleting ? 'Deleting…' : 'Delete profile'}
            </Button>
          </div>
          {actionError && (
            <div style={{
              padding: '0 14px 10px', fontFamily: AC.font, fontSize: 12, color: AC.danger,
            }}>{actionError}</div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox photos={mom.photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Tab bodies
// ----------------------------------------------------------------------------

const Field = ({ label, children, full }) => (
  <div style={{ minWidth: 0, gridColumn: full ? '1 / -1' : undefined }}>
    <div style={{ fontFamily: AC.font, fontSize: 10.5, fontWeight: 700, letterSpacing: '.10em', color: AC.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
      {label}
    </div>
    {children}
  </div>
);

const ReadValue = ({ value, mono }) => (
  <div style={{
    fontFamily: mono ? AC.mono : AC.font, fontSize: 13, color: value == null || value === '' ? AC.textFaint : AC.text,
    wordBreak: 'break-word',
  }}>
    {value == null || value === '' ? '—' : value}
  </div>
);

const Chips = ({ items, tone = 'default' }) => {
  if (!items || items.length === 0) return <ReadValue value={null} />;
  const t = CHIP_TONES[tone] || CHIP_TONES.default;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, i) => (
        <span key={`${it}-${i}`} style={{
          padding: '2px 8px', borderRadius: AC.radiusPill,
          background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
          fontFamily: AC.font, fontSize: 11.5, fontWeight: 600,
        }}>{it}</span>
      ))}
    </div>
  );
};

// Multi-select chip picker for edit mode.
const ChipPicker = ({ options, selected, onChange, tone = 'default' }) => {
  const set = new Set(selected || []);
  const t = CHIP_TONES[tone] || CHIP_TONES.default;
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.label || opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const on = set.has(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              const next = new Set(set);
              if (on) next.delete(id); else next.add(id);
              onChange([...next]);
            }}
            style={{
              padding: '3px 9px', borderRadius: AC.radiusPill,
              background: on ? t.bg : AC.surface,
              color: on ? t.fg : AC.textSoft,
              border: `1px solid ${on ? t.bd : AC.borderStrong}`,
              fontFamily: AC.font, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

// Overview tab — quick read-only summary.
const OverviewTab = ({ mom, placesById, onOpenPhoto }) => {
  const placeName = (id) => placesById?.get(id)?.name || id?.slice(0, 8) || '—';
  const kidParts = (() => {
    const ja = mom.kids_ages;
    if (!ja || typeof ja !== 'object') return [];
    return Object.entries(ja).filter(([, v]) => v).map(([k]) => k);
  })();
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Bio" full>
        <ReadValue value={mom.bio} />
      </Field>
      <Field label="Photos" full>
        {Array.isArray(mom.photos) && mom.photos.length ? (
          <div className="flex flex-wrap gap-1.5">
            {mom.photos.map((url, i) => (
              <button key={`${url}-${i}`} type="button" onClick={() => onOpenPhoto(i)}
                style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: AC.radiusSm, objectFit: 'cover', border: `1px solid ${AC.border}` }} />
              </button>
            ))}
          </div>
        ) : <ReadValue value={null} />}
      </Field>
      <Field label="Kids"><Chips items={kidParts} tone="age" /></Field>
      <Field label="Mom types"><Chips items={mom.mom_types} /></Field>
      <Field label="Values"><Chips items={mom.values} tone="values" /></Field>
      <Field label="Interests"><Chips items={mom.interests} tone="interests" /></Field>
      <Field label="Free slots" full><Chips items={mom.free_slots} /></Field>
      <Field label="Saved places" full><Chips items={(mom.places || []).map(placeName)} /></Field>
      <Field label="Distance"><ReadValue value={mom.distance_miles != null ? `${mom.distance_miles} mi` : null} /></Field>
      <Field label="Age"><ReadValue value={mom.age} /></Field>
    </div>
  );
};

const IdentityTab = ({ mom, draft, setDraft, editing, onOpenPhoto }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
    {editing && (
      <div style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
        <AiReviewButton
          kind="mom"
          record={draft}
          // Safe to set [field] generically only because the server constrains
          // mom suggestions to REVIEW_FIELDS.mom = ['bio'] (a string). Do NOT add
          // array taxonomy fields (mom_types/values/interests) there — they're
          // string[] chips and a free-text suggestion would corrupt them.
          onApply={(field, value) => setDraft((d) => ({ ...d, [field]: value }))}
        />
      </div>
    )}
    <Field label="Display name">
      {editing
        ? <Input value={draft.display_name ?? ''} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} style={{ width: '100%' }} />
        : <ReadValue value={mom.display_name} />}
    </Field>
    <Field label="Username">
      {editing
        ? <Input value={draft.username ?? ''} onChange={(e) => setDraft({ ...draft, username: e.target.value })} style={{ width: '100%' }} />
        : <ReadValue value={mom.username ? `@${mom.username}` : null} />}
    </Field>
    <Field label="Age">
      {editing
        ? <Input type="number" min={18} max={99} value={draft.age ?? ''} onChange={(e) => setDraft({ ...draft, age: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 90 }} />
        : <ReadValue value={mom.age} />}
    </Field>
    <Field label="Profile id"><ReadValue value={mom.id} mono /></Field>
    <Field label="Auth user id" full><ReadValue value={mom.auth_user_id} mono /></Field>
    <div style={{ minWidth: 0, gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: AC.font, fontSize: 10.5, fontWeight: 700, letterSpacing: '.10em', color: AC.textMuted, textTransform: 'uppercase' }}>
          Bio
        </span>
        {editing && (
          <AiWriteButton
            kind="mom"
            record={draft}
            onWrite={(text) => setDraft((d) => ({ ...d, bio: text }))}
          />
        )}
      </div>
      {editing
        ? <textarea value={draft.bio ?? ''} onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            rows={4}
            style={{
              width: '100%', background: AC.surface, border: `1px solid ${AC.borderStrong}`, borderRadius: AC.radiusSm,
              padding: '8px 11px', fontFamily: AC.font, fontSize: 13, color: AC.text, outline: 'none', resize: 'vertical',
            }} />
        : <ReadValue value={mom.bio} />}
    </div>
    <Field label="Photos" full>
      <div className="flex flex-wrap gap-1.5">
        {(editing ? (draft.photos || []) : (mom.photos || [])).map((url, i) => (
          <div key={`${url}-${i}`} style={{ position: 'relative' }}>
            <button type="button" onClick={() => onOpenPhoto(i)}
              style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: AC.radiusSm, objectFit: 'cover', border: `1px solid ${AC.border}` }} />
            </button>
            {editing && (
              <button type="button"
                onClick={() => setDraft({ ...draft, photos: (draft.photos || []).filter((_, j) => j !== i) })}
                title="Remove this photo"
                style={{
                  position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 999,
                  background: AC.danger, color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 11, lineHeight: 1, fontWeight: 700,
                }}>×</button>
            )}
            {editing && i > 0 && (
              <button type="button"
                onClick={() => {
                  const arr = [...(draft.photos || [])];
                  const [moved] = arr.splice(i, 1);
                  arr.unshift(moved);
                  setDraft({ ...draft, photos: arr });
                }}
                title="Make primary"
                style={{
                  position: 'absolute', bottom: -6, left: -6, width: 18, height: 18, borderRadius: 999,
                  background: AC.accent, color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 10, lineHeight: 1, fontWeight: 700,
                }}>★</button>
            )}
          </div>
        ))}
      </div>
      {editing && (draft.photos || []).length < 5 && (
        <div style={{ marginTop: 10, fontFamily: AC.font, fontSize: 12, color: AC.textMuted, fontStyle: 'italic' }}>
          Tip: paste an image URL below to add up to 5 photos (uses Vercel Blob for app uploads).
        </div>
      )}
      {editing && (
        <AddPhotoRow
          disabled={(draft.photos || []).length >= 5}
          onAdd={(url) => setDraft({ ...draft, photos: [...(draft.photos || []), url] })}
        />
      )}
      {editing && (draft.photos || []).length < 5 && (
        <div style={{ marginTop: 8 }}>
          <AiImageControl
            kind="mom"
            record={draft}
            onImage={(url) => setDraft((d) => ({ ...d, photos: [...(d.photos || []), url].slice(0, 5) }))}
          />
        </div>
      )}
    </Field>
  </div>
);

const AddPhotoRow = ({ onAdd, disabled }) => {
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <Input value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="https://…  (paste a public image URL)" style={{ flex: 1 }} disabled={disabled} />
      <Button size="sm" onClick={() => {
        const v = value.trim();
        if (v) { onAdd(v); setValue(''); }
      }} disabled={disabled || !value.trim()}>Add</Button>
    </div>
  );
};

const FamilyTab = ({ mom, draft, setDraft, editing }) => {
  const kidsObj = (editing ? draft.kids_ages : mom.kids_ages) || {};
  const kidEntries = Object.entries(kidsObj).filter(([, v]) => v).map(([k]) => k);
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Kid age ranges" full>
        {editing ? (
          <ChipPicker
            options={KID_AGES}
            selected={KID_AGES.filter((b) => kidsObj[b])}
            onChange={(arr) => {
              const next = {};
              KID_AGES.forEach((b) => { if (arr.includes(b)) next[b] = true; });
              setDraft({ ...draft, kids_ages: next });
            }}
            tone="age"
          />
        ) : (
          <Chips items={kidEntries} tone="age" />
        )}
      </Field>
      <Field label="Mom types" full>
        {editing ? (
          <ChipPicker
            options={MOM_TYPES.map((t) => ({ id: t.id, label: t.label }))}
            selected={draft.mom_types || []}
            onChange={(arr) => setDraft({ ...draft, mom_types: arr })}
          />
        ) : (
          <Chips items={mom.mom_types} />
        )}
      </Field>
    </div>
  );
};

const PreferencesTab = ({ mom, draft, setDraft, editing, placesById }) => {
  const placeName = (id) => placesById?.get(id)?.name || id?.slice(0, 8) || '—';
  return (
    <div className="grid grid-cols-1 gap-y-4">
      <Field label="Values">
        {editing ? (
          <ChipPicker options={VALUES} selected={draft.values || []}
            onChange={(arr) => setDraft({ ...draft, values: arr })} tone="values" />
        ) : <Chips items={mom.values} tone="values" />}
      </Field>
      <Field label="Interests">
        {editing ? (
          <ChipPicker options={INTERESTS.map((i) => i.label)} selected={draft.interests || []}
            onChange={(arr) => setDraft({ ...draft, interests: arr })} tone="interests" />
        ) : <Chips items={mom.interests} tone="interests" />}
      </Field>
      <Field label="Free slots">
        {editing ? (
          <ChipPicker options={ALL_SLOTS} selected={draft.free_slots || []}
            onChange={(arr) => setDraft({ ...draft, free_slots: arr })} />
        ) : <Chips items={mom.free_slots} />}
      </Field>
      <Field label="Saved places (read-only)">
        <Chips items={(mom.places || []).map(placeName)} />
      </Field>
      <Field label="Preferred events">
        <ReadValue value={mom.preferred_event_ids?.length
          ? `${mom.preferred_event_ids.length} event${mom.preferred_event_ids.length === 1 ? '' : 's'}: ${mom.preferred_event_ids.slice(0, 3).map((id) => id?.slice(0, 8) ?? id).join(', ')}${mom.preferred_event_ids.length > 3 ? '…' : ''}`
          : null} />
      </Field>
    </div>
  );
};

const LocationTab = ({ mom, draft, setDraft, editing }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
    <Field label="City">
      {editing
        ? <Input value={draft.city ?? ''} onChange={(e) => setDraft({ ...draft, city: e.target.value })} style={{ width: '100%' }} />
        : <ReadValue value={mom.city} />}
    </Field>
    <Field label="Neighborhood">
      {editing
        ? <Input value={draft.neighborhood ?? ''} onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value })} style={{ width: '100%' }} />
        : <ReadValue value={mom.neighborhood} />}
    </Field>
    <Field label="Latitude">
      {editing
        ? <Input type="number" step="0.000001" value={draft.home_lat ?? ''} onChange={(e) => setDraft({ ...draft, home_lat: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%' }} />
        : <ReadValue value={mom.home_lat != null ? Number(mom.home_lat).toFixed(6) : null} mono />}
    </Field>
    <Field label="Longitude">
      {editing
        ? <Input type="number" step="0.000001" value={draft.home_lng ?? ''} onChange={(e) => setDraft({ ...draft, home_lng: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: '100%' }} />
        : <ReadValue value={mom.home_lng != null ? Number(mom.home_lng).toFixed(6) : null} mono />}
    </Field>
    <Field label="Travel distance" full>
      {editing ? (
        <Input type="number" min={0} max={500} value={draft.distance_miles ?? ''}
          onChange={(e) => setDraft({ ...draft, distance_miles: e.target.value === '' ? null : Number(e.target.value) })}
          style={{ width: 120 }} />
      ) : <ReadValue value={mom.distance_miles != null ? `${mom.distance_miles} mi` : null} />}
    </Field>
  </div>
);

const SocialTab = ({ mom, draft, setDraft, editing }) => {
  const social = (editing ? draft.social_links : mom.social_links) || {};
  // Per-signal verification can live on any of three places: a future
  // `verified_signals` column, an object-valued `verified` field, or — for
  // seeded profiles — `settings.verification`. Check all three.
  const verifiedSig = mom.verified_signals
    || (typeof mom.verified === 'object' ? mom.verified : null)
    || (mom.settings && mom.settings.verification)
    || null;
  const setSocial = (key, val) => setDraft({ ...draft, social_links: { ...social, [key]: val } });
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Instagram URL" full>
        {editing
          ? <Input value={social.instagram ?? ''} onChange={(e) => setSocial('instagram', e.target.value)} placeholder="https://instagram.com/…" style={{ width: '100%' }} />
          : <ReadValue value={social.instagram} mono />}
      </Field>
      <Field label="Facebook URL" full>
        {editing
          ? <Input value={social.facebook ?? ''} onChange={(e) => setSocial('facebook', e.target.value)} placeholder="https://facebook.com/…" style={{ width: '100%' }} />
          : <ReadValue value={social.facebook} mono />}
      </Field>
      <Field label="TikTok URL" full>
        {editing
          ? <Input value={social.tiktok ?? ''} onChange={(e) => setSocial('tiktok', e.target.value)} placeholder="https://tiktok.com/@…" style={{ width: '100%' }} />
          : <ReadValue value={social.tiktok} mono />}
      </Field>
      <Field label="Verification signals" full>
        <div className="flex flex-wrap gap-1.5">
          {['instagram', 'facebook', 'photo'].map((key) => {
            const on = !!(verifiedSig && verifiedSig[key]);
            return (
              <span key={key} style={{
                padding: '3px 9px', borderRadius: AC.radiusPill,
                background: on ? AC.successSoft : AC.surfaceSunken,
                color: on ? AC.success : AC.textMuted,
                border: `1px solid ${on ? AC.successBorder : AC.border}`,
                fontFamily: AC.font, fontSize: 11.5, fontWeight: 600,
              }}>{key} · {on ? 'on' : 'off'}</span>
            );
          })}
        </div>
      </Field>
    </div>
  );
};

const SettingsTab = ({ mom, draft, setDraft, editing }) => {
  const settings = (editing ? draft.settings : mom.settings) || {};
  const setSettingPath = (path, val) => {
    const next = JSON.parse(JSON.stringify(settings || {}));
    const keys = path.split('.');
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) {
      cur[keys[i]] = cur[keys[i]] || {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
    setDraft({ ...draft, settings: next });
  };
  const privacy = settings.privacy || {};
  const notifications = settings.notifications || {};
  return (
    <div className="grid grid-cols-1 gap-y-4">
      <Field label="Privacy — verified-only DMs">
        <SettingToggle
          on={!!privacy.verified_only_dms}
          disabled={!editing}
          onChange={(v) => setSettingPath('privacy.verified_only_dms', v)}
          label={privacy.verified_only_dms ? 'Only verified moms can DM' : 'Anyone can DM'}
        />
      </Field>
      <Field label="Notifications — new matches">
        <SettingToggle
          on={notifications.new_matches !== false}
          disabled={!editing}
          onChange={(v) => setSettingPath('notifications.new_matches', v)}
          label={notifications.new_matches === false ? 'Off' : 'On'}
        />
      </Field>
      <Field label="Notifications — messages">
        <SettingToggle
          on={notifications.messages !== false}
          disabled={!editing}
          onChange={(v) => setSettingPath('notifications.messages', v)}
          label={notifications.messages === false ? 'Off' : 'On'}
        />
      </Field>
      <Field label="Raw settings JSON" full>
        <pre style={{
          background: AC.surfaceSunken, border: `1px solid ${AC.border}`, borderRadius: AC.radiusSm,
          padding: 10, fontFamily: AC.mono, fontSize: 11.5, color: AC.text, overflow: 'auto', maxHeight: 220,
        }}>{JSON.stringify(settings, null, 2)}</pre>
      </Field>
    </div>
  );
};

const SettingToggle = ({ on, disabled, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 42, height: 24, borderRadius: 999, padding: 2, border: 'none',
        background: on ? AC.accent : AC.borderStrong,
        display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
        cursor: disabled ? 'default' : 'pointer', transition: 'background .15s', opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)' }} />
    </button>
    <span style={{ fontFamily: AC.font, fontSize: 13, color: AC.text, fontWeight: 600 }}>{label}</span>
  </div>
);

const AuditTab = ({ mom, onPatchSource, busy }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
    <Field label="Created"><ReadValue value={mom.created_at ? `${new Date(mom.created_at).toLocaleString()} (${rel(mom.created_at)})` : null} /></Field>
    <Field label="Updated"><ReadValue value={mom.updated_at ? `${new Date(mom.updated_at).toLocaleString()} (${rel(mom.updated_at)})` : null} /></Field>
    <Field label="Last active"><ReadValue value={mom.last_active_at ? `${new Date(mom.last_active_at).toLocaleString()} (${rel(mom.last_active_at)})` : null} /></Field>
    <Field label="Last seen"><ReadValue value={mom.last_seen_at ? `${new Date(mom.last_seen_at).toLocaleString()} (${rel(mom.last_seen_at)})` : null} /></Field>
    <Field label="Account status"><ReadValue value={mom.account_status || 'active'} /></Field>
    <Field label="Deactivated at"><ReadValue value={mom.deactivated_at ? new Date(mom.deactivated_at).toLocaleString() : null} /></Field>
    <Field label="Deleted at"><ReadValue value={mom.deleted_at ? new Date(mom.deleted_at).toLocaleString() : null} /></Field>
    <Field label="Source" full>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge tone={mom.source === 'seed' ? 'warn' : 'info'}>{mom.source || 'unknown'}</Badge>
        <Button size="sm" variant="ghost" onClick={() => onPatchSource(mom.source === 'seed' ? 'onboarding' : 'seed')} disabled={busy}>
          Switch to {mom.source === 'seed' ? 'onboarding' : 'seed'}
        </Button>
      </div>
    </Field>
  </div>
);

// ----------------------------------------------------------------------------
// Photo lightbox — same UX as the legacy version, restyled with AC tokens.
// ----------------------------------------------------------------------------
const PhotoLightbox = ({ photos, initialIndex, onClose }) => {
  const clamped = Math.max(0, Math.min(initialIndex ?? 0, (photos?.length ?? 0) - 1));
  const [index, setIndex] = useState(clamped);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [photos, onClose]);

  if (!photos || photos.length === 0) return null;
  const total = photos.length;
  const showNav = total > 1;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,24,40,0.85)', animation: 'fadeIn 0.15s ease-out' }}
      role="dialog"
      aria-modal="true"
    >
      <button onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 rounded-full p-2"
        style={{ background: AC.surface, color: AC.text, border: `1px solid ${AC.border}` }}>
        <X size={20} />
      </button>
      {showNav && (
        <button onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + total) % total); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2"
          style={{ background: AC.surface, color: AC.text, border: `1px solid ${AC.border}` }}>
          <ChevronLeft size={24} />
        </button>
      )}
      <img onClick={(e) => e.stopPropagation()} src={photos[index]} alt=""
        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', animation: 'fadeInUp 0.2s ease-out' }} />
      {showNav && (
        <button onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % total); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2"
          style={{ background: AC.surface, color: AC.text, border: `1px solid ${AC.border}` }}>
          <ChevronRight size={24} />
        </button>
      )}
      {showNav && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2"
          style={{ fontFamily: AC.font, fontSize: 12.5, color: '#fff', fontWeight: 600 }}>
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
};
