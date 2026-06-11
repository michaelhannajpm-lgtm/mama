// ============================================================================
// Users — Supabase Auth users, read live from /api/admin/users (service-role →
// GoTrue Admin API). Built in the console design system (`AC` + primitives).
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { UserCog, Search, AlertTriangle, Mail, Phone } from 'lucide-react';
import { AC } from '../admin-theme';
import { fetchEndpoint } from '../lib/adminFetch';
import {
  PageHeader, StatCard, Card, DataTable, Toolbar, Input, Badge, Banner, Button, EmptyState, rel,
} from '../components/primitives';

const PROVIDER_TONE = {
  google: 'info', facebook: 'info', apple: 'neutral',
  email: 'success', phone: 'success', anonymous: 'warn',
};

export const UsersSection = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const users = data?.users || [];
  const stats = data?.stats || { total: 0, confirmed: 0, anonymous: 0, byProvider: {} };
  const topProvider = useMemo(() => {
    const entries = Object.entries(stats.byProvider || {}).sort((a, b) => b[1] - a[1]);
    return entries[0] ? `${entries[0][0]} · ${entries[0][1]}` : '—';
  }, [stats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.email, u.phone, u.displayName, u.provider, u.id]
      .some((v) => (v || '').toString().toLowerCase().includes(q)));
  }, [users, query]);

  const columns = [
    {
      key: 'user', header: 'User', render: (u) => (
        <div>
          <div className="flex items-center gap-1.5" style={{ fontWeight: 600, color: AC.text }}>
            {u.email ? <Mail size={12} style={{ color: AC.textMuted }} /> : u.phone ? <Phone size={12} style={{ color: AC.textMuted }} /> : null}
            {u.email || u.phone || (u.isAnonymous ? 'Anonymous' : '—')}
          </div>
          {u.displayName && <div style={{ fontSize: 11, color: AC.textMuted }}>{u.displayName}</div>}
        </div>
      ),
    },
    {
      key: 'provider', header: 'Provider', render: (u) => (
        <div className="flex gap-1 flex-wrap">
          {(u.providers.length ? u.providers : [u.provider || 'unknown']).map((p) => (
            <Badge key={p} tone={PROVIDER_TONE[p] || 'neutral'}>{p}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', render: (u) => (
        u.banned ? <Badge tone="danger" dot>banned</Badge>
          : u.isAnonymous ? <Badge tone="warn" dot>anonymous</Badge>
            : u.confirmed ? <Badge tone="success" dot>confirmed</Badge>
              : <Badge tone="neutral" dot>unconfirmed</Badge>
      ),
    },
    { key: 'lastSignInAt', header: 'Last sign-in', align: 'right', mono: true, render: (u) => rel(u.lastSignInAt) },
    { key: 'createdAt', header: 'Joined', align: 'right', mono: true, render: (u) => rel(u.createdAt) },
    { key: 'id', header: 'User ID', mono: true, render: (u) => (u.id ? u.id.slice(0, 8) : '—') },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Every Supabase Auth identity — OAuth sign-ins, phone/email, and the anonymous sessions that power chat."
        actions={<Button size="sm" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</Button>}
      />

      {error && <Banner tone="danger" icon={AlertTriangle}>{error}</Banner>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total users" value={stats.total} icon={UserCog} />
        <StatCard label="Confirmed" value={stats.confirmed} tone={AC.success} />
        <StatCard label="Anonymous" value={stats.anonymous} tone={AC.warn} hint="chat sessions" />
        <StatCard label="Top provider" value={topProvider} />
      </div>

      <Card padding={0}>
        <Toolbar style={{ margin: 0, padding: '12px 14px', borderBottom: `1px solid ${AC.border}` }}>
          <div className="relative flex-1" style={{ maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: AC.textMuted }} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email / phone / provider / id…"
              style={{ width: '100%', paddingLeft: 32 }} />
          </div>
          <div className="tabular-nums" style={{ fontFamily: AC.font, fontSize: 12, color: AC.textMuted }}>
            {filtered.length} / {users.length}
          </div>
        </Toolbar>
        {loading && !data ? (
          <div className="text-center" style={{ padding: 36, fontFamily: AC.font, fontSize: 13, color: AC.textMuted }}>Loading users…</div>
        ) : users.length === 0 && !error ? (
          <EmptyState icon={UserCog} title="No users yet" body="Auth identities appear here as moms sign in." />
        ) : (
          <DataTable columns={columns} rows={filtered} empty="No users match that search." />
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
