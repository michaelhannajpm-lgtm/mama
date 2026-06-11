// ============================================================================
// Users — Supabase Auth users, read live from /api/admin/users (service-role →
// GoTrue Admin API). Built in the console design system (`AC` + primitives).
// Adds a Hide-anonymous filter and a deep-link to the linked mom profile when
// the user has been promoted.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserCog, Search, AlertTriangle, Mail, Phone, EyeOff, Eye, Users as UsersIcon, ExternalLink } from 'lucide-react';
import { AC } from '../admin-theme';
import { fetchEndpoint } from '../lib/adminFetch';
import { navigateSection } from '../lib/adminRouter';
import {
  PageHeader, StatCard, Card, DataTable, Toolbar, Input, Badge, Banner, Button, EmptyState, rel,
} from '../components/primitives';

const PROVIDER_TONE = {
  google: 'info', facebook: 'info', apple: 'neutral',
  email: 'success', phone: 'success', anonymous: 'warn',
};

// Cross-section deep link. The MomProfilesTab listens for this event on mount
// and opens the matching profile in its detail modal.
const openMomProfile = (momId) => {
  try { sessionStorage.setItem('gm-admin-open-mom', momId); } catch { /* ignore */ }
  navigateSection('mom-profiles');
  // Tab is already mounted? Notify it too.
  window.dispatchEvent(new CustomEvent('gm-admin-open-mom', { detail: { id: momId } }));
};

export const UsersSection = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [hideAnonymous, setHideAnonymous] = useState(true);
  const [onlyLinked, setOnlyLinked] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const highlightRowRef = useRef(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setData(await fetchEndpoint('/api/admin/users', 'Users'));
    } catch (e) {
      setError(e?.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Deep-link: /admin/users/<id> highlights (and scrolls to) the row.
  useEffect(() => {
    const apply = (ref) => { if (ref) setHighlightId(ref); };
    try { apply(sessionStorage.getItem('gm-admin-open-user')); } catch { /* ignore */ }
    try { sessionStorage.removeItem('gm-admin-open-user'); } catch { /* ignore */ }
    const onOpen = (ev) => apply(ev?.detail?.id);
    window.addEventListener('gm-admin-open-user', onOpen);
    return () => window.removeEventListener('gm-admin-open-user', onOpen);
  }, []);

  // Scroll to the highlighted row once when highlightId is set — not on every render.
  useEffect(() => {
    if (highlightId) highlightRowRef.current?.scrollIntoView({ block: 'center' });
  }, [highlightId]);

  const users = data?.users || [];
  const stats = data?.stats || { total: 0, confirmed: 0, anonymous: 0, momLinked: 0, byProvider: {} };
  const topProvider = useMemo(() => {
    const entries = Object.entries(stats.byProvider || {}).sort((a, b) => b[1] - a[1]);
    return entries[0] ? `${entries[0][0]} · ${entries[0][1]}` : '—';
  }, [stats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (hideAnonymous && u.isAnonymous) return false;
      if (onlyLinked && !u.mom) return false;
      if (!q) return true;
      return [u.email, u.phone, u.displayName, u.provider, u.id,
        u.mom?.username, u.mom?.displayName,
      ].some((v) => (v || '').toString().toLowerCase().includes(q));
    });
  }, [users, query, hideAnonymous, onlyLinked]);

  const columns = [
    {
      key: 'user', header: 'User',
      sort: (u) => (u.email || u.phone || u.displayName || '').toLowerCase(),
      render: (u) => {
        const isHighlighted = u.id === highlightId;
        return (
          <div
            ref={isHighlighted ? (el) => { highlightRowRef.current = el; } : undefined}
            style={isHighlighted ? {
              borderRadius: AC.radius,
              boxShadow: `0 0 0 2px ${AC.accent}`,
              background: AC.accentSoft,
              padding: '2px 6px',
              margin: '-2px -6px',
            } : undefined}
          >
            <div className="flex items-center gap-1.5" style={{ fontWeight: 600, color: AC.text }}>
              {u.email ? <Mail size={12} style={{ color: AC.textMuted }} /> : u.phone ? <Phone size={12} style={{ color: AC.textMuted }} /> : null}
              {u.email || u.phone || (u.isAnonymous ? 'Anonymous' : '—')}
            </div>
            {u.displayName && <div style={{ fontSize: 11, color: AC.textMuted }}>{u.displayName}</div>}
          </div>
        );
      },
    },
    {
      key: 'provider', header: 'Provider',
      sort: (u) => (u.providers && u.providers[0]) || u.provider || '',
      render: (u) => (
        <div className="flex gap-1 flex-wrap">
          {(u.providers.length ? u.providers : [u.provider || 'unknown']).map((p) => (
            <Badge key={p} tone={PROVIDER_TONE[p] || 'neutral'}>{p}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'mom', header: 'Mom profile',
      sort: (u) => (u.mom ? (u.mom.displayName || u.mom.username || '') : '').toLowerCase(),
      render: (u) => (
        u.mom ? (
          <button
            onClick={(e) => { e.stopPropagation(); openMomProfile(u.mom.id); }}
            title="Open this user's mom profile"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: AC.accentSoft, border: `1px solid ${AC.accentBorder}`,
              color: AC.accent, fontFamily: AC.font, fontSize: 12, fontWeight: 600,
              borderRadius: AC.radiusPill, padding: '3px 9px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {u.mom.displayName || (u.mom.username ? `@${u.mom.username}` : 'View profile')}
            <ExternalLink size={11} />
          </button>
        ) : (
          <span style={{ color: AC.textFaint, fontFamily: AC.font, fontSize: 12 }}>—</span>
        )
      ),
    },
    {
      key: 'status', header: 'Status',
      sort: (u) => (u.banned ? 'banned' : u.isAnonymous ? 'anonymous' : u.confirmed ? 'confirmed' : 'unconfirmed'),
      render: (u) => (
        u.banned ? <Badge tone="danger" dot>banned</Badge>
          : u.isAnonymous ? <Badge tone="warn" dot>anonymous</Badge>
            : u.confirmed ? <Badge tone="success" dot>confirmed</Badge>
              : <Badge tone="neutral" dot>unconfirmed</Badge>
      ),
    },
    { key: 'lastSignInAt', header: 'Last sign-in', align: 'right', mono: true, sort: (u) => Date.parse(u.lastSignInAt) || 0, render: (u) => rel(u.lastSignInAt) },
    { key: 'createdAt', header: 'Joined', align: 'right', mono: true, sort: (u) => Date.parse(u.createdAt) || 0, render: (u) => rel(u.createdAt) },
    { key: 'id', header: 'User ID', mono: true, render: (u) => (u.id ? u.id.slice(0, 8) : '—') },
  ];

  // FilterChip — compact toggle that fits the toolbar density.
  const FilterChip = ({ active, onClick, icon: Icon, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 11px', borderRadius: AC.radiusPill,
        background: active ? AC.accentSoft : AC.surface,
        color: active ? AC.accent : AC.textSoft,
        border: `1px solid ${active ? AC.accentBorder : AC.borderStrong}`,
        fontFamily: AC.font, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Every Supabase Auth identity — OAuth sign-ins, phone/email, and the anonymous sessions that power chat."
      />

      {/* Stats — directly under the page header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total users" value={stats.total} icon={UserCog} />
        <StatCard label="Confirmed" value={stats.confirmed} tone={AC.success} />
        <StatCard label="Anonymous" value={stats.anonymous} tone={AC.warn} hint="chat sessions" />
        <StatCard label="Mom profiles" value={stats.momLinked || 0} tone={AC.accent} hint="linked to a profile" />
        <StatCard label="Top provider" value={topProvider} />
      </div>

      {error && <Banner tone="danger" icon={AlertTriangle}>{error}</Banner>}

      {/* Action bar — directly above the grid */}
      <div className="flex items-center justify-end gap-2" style={{ marginBottom: 12 }}>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</Button>
      </div>

      <Card padding={0}>
        <Toolbar style={{ margin: 0, padding: '12px 14px', borderBottom: `1px solid ${AC.border}` }}>
          <div className="relative flex-1" style={{ maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: AC.textMuted }} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email / phone / provider / mom / id…"
              style={{ width: '100%', paddingLeft: 32 }} />
          </div>
          <FilterChip
            active={hideAnonymous}
            onClick={() => setHideAnonymous((x) => !x)}
            icon={hideAnonymous ? EyeOff : Eye}
            title={hideAnonymous ? 'Showing only real users' : 'Showing anonymous sessions too'}
          >
            {hideAnonymous ? 'Hiding anonymous' : 'Show anonymous'}
          </FilterChip>
          <FilterChip
            active={onlyLinked}
            onClick={() => setOnlyLinked((x) => !x)}
            icon={UsersIcon}
            title="Only show users linked to a mom profile"
          >
            Linked moms only
          </FilterChip>
          <div className="tabular-nums ml-auto" style={{ fontFamily: AC.font, fontSize: 12, color: AC.textMuted }}>
            {filtered.length} / {users.length}
          </div>
        </Toolbar>
        {loading && !data ? (
          <div className="text-center" style={{ padding: 36, fontFamily: AC.font, fontSize: 13, color: AC.textMuted }}>Loading users…</div>
        ) : users.length === 0 && !error ? (
          <EmptyState icon={UserCog} title="No users yet" body="Auth identities appear here as moms sign in." />
        ) : (
          <DataTable columns={columns} rows={filtered} empty="No users match those filters." />
        )}
      </Card>

      {data?.truncated && (
        <div className="mt-2" style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textMuted }}>
          Showing the first {users.length} users (cap reached).
        </div>
      )}
    </div>
  );
};
