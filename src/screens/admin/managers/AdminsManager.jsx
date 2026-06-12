// Admins management — the email-OTP allowlist (app_config.admin_users).
// Add/remove console admins and set their role + module access. Roles/modules
// are stored now; enforcement (nav filtering, write-blocking) is a fast follow,
// so today every admin is effectively full. Backed by /api/admin/admins.
import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Trash2, Plus } from 'lucide-react';
import { AC } from '../admin-theme';
import { PageHeader, Card, DataTable, Button, Badge, Banner, Input, Select, BusyOverlay } from '../components/primitives';
import { useConfirm } from '../components/ConfirmDialog';

const ROLE_TONE = { full: 'accent', 'read-write': 'info', 'read-only': 'neutral' };
const ROLE_OPTIONS = [
  { value: 'full', label: 'Full admin' },
  { value: 'read-write', label: 'Read · write' },
  { value: 'read-only', label: 'Read only' },
];

export const AdminsManager = ({ adminFetch }) => {
  const [admins, setAdmins] = useState([]);
  const [modules, setModules] = useState([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const confirm = useConfirm();

  // Add-admin form.
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('full');
  const [picked, setPicked] = useState(() => new Set());

  const moduleLabel = useMemo(() => Object.fromEntries(modules.map((m) => [m.id, m.label])), [modules]);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await adminFetch('/api/admin/admins');
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      setAdmins(body.admins || []);
      setModules(body.modules || []);
      setCurrentEmail((body.currentEmail || '').toLowerCase());
    } catch (e) { setErr(e.message || 'Could not load admins'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleModule = (id) => setPicked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const addAdmin = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) { setErr('Enter a valid email'); return; }
    const modulesPayload = role === 'full' ? ['*'] : [...picked];
    if (role !== 'full' && modulesPayload.length === 0) { setErr('Pick at least one module'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await adminFetch('/api/admin/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, role, modules: modulesPayload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      setAdmins(body.admins || []);
      setEmail(''); setRole('full'); setPicked(new Set());
    } catch (e2) { setErr(e2.message || 'Could not add admin'); }
    finally { setBusy(false); }
  };

  const removeAdmin = async (row) => {
    const ok = await confirm({
      title: `Remove ${row.email}?`,
      message: 'They will lose access to the console immediately and can no longer request a login code.',
      confirmLabel: 'Remove admin', tone: 'danger',
    });
    if (!ok) return;
    setBusy(true); setErr(null);
    try {
      const res = await adminFetch('/api/admin/admins', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: row.email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`);
      setAdmins(body.admins || []);
    } catch (e) { setErr(e.message || 'Could not remove admin'); }
    finally { setBusy(false); }
  };

  const columns = [
    { key: 'email', header: 'Email', wrap: true, render: (r) => (
      <span style={{ fontWeight: 600, color: AC.text }}>
        {r.email}
        {r.email.toLowerCase() === currentEmail && (
          <span style={{ marginLeft: 8, fontFamily: AC.font, fontSize: 11, color: AC.textMuted }}>(you)</span>
        )}
      </span>
    ) },
    { key: 'role', header: 'Role', width: 130, render: (r) => (
      <Badge tone={ROLE_TONE[r.role] || 'neutral'}>{r.role || 'full'}</Badge>
    ) },
    { key: 'modules', header: 'Modules', wrap: true, render: (r) => {
      const mods = r.modules || ['*'];
      if (mods.includes('*')) return <span style={{ color: AC.textMuted }}>All modules</span>;
      return <span style={{ color: AC.textSoft }}>{mods.map((m) => moduleLabel[m] || m).join(', ')}</span>;
    } },
    { key: 'addedBy', header: 'Added by', width: 160, mono: true, render: (r) => (
      <span style={{ color: AC.textMuted }}>{r.addedBy || '—'}</span>
    ) },
    { key: 'actions', header: '', width: 60, align: 'right', render: (r) => {
      const isSelf = r.email.toLowerCase() === currentEmail;
      const isLast = admins.length <= 1;
      return (
        <Button variant="ghost" size="sm" icon={Trash2}
          disabled={busy || isSelf || isLast}
          title={isSelf ? "You can't remove yourself" : isLast ? "Can't remove the last admin" : 'Remove'}
          onClick={() => removeAdmin(r)} />
      );
    } },
  ];

  return (
    <div style={{ position: 'relative', padding: 24 }}>
      <BusyOverlay show={busy} label="Saving…" />
      <PageHeader
        title="Admins"
        subtitle="Who can sign in to the console (email-OTP allowlist), and their role & module access."
        actions={<Button variant="secondary" size="sm" onClick={load} disabled={loading}>Refresh</Button>}
      />

      {err && <Banner tone="danger">{err}</Banner>}

      {/* Add admin */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: AC.font, fontSize: 13, fontWeight: 700, color: AC.text, marginBottom: 10 }}>
          Add an admin
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="email" value={email} placeholder="email@example.com" inputMode="email"
            onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 240, flex: '1 1 240px' }} />
          <Select value={role} options={ROLE_OPTIONS} onChange={(e) => setRole(e.target.value)} />
          <Button variant="primary" icon={Plus} disabled={busy || !email.includes('@')} onClick={addAdmin}>
            Add
          </Button>
        </div>
        {role === 'full' ? (
          <div style={{ marginTop: 10, fontFamily: AC.font, fontSize: 12, color: AC.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={13} style={{ color: AC.accent }} /> Full admins have access to every module.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: AC.font, fontSize: 11.5, fontWeight: 700, color: AC.textMuted, marginBottom: 8 }}>
              MODULE ACCESS
            </div>
            <div className="flex flex-wrap gap-2">
              {modules.map((m) => {
                const on = picked.has(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggleModule(m.id)} style={{
                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                    fontFamily: AC.font, fontSize: 12.5, fontWeight: 600,
                    background: on ? AC.accent : AC.surface, color: on ? '#fff' : AC.text,
                    border: `1px solid ${on ? AC.accent : AC.border}`,
                  }}>{m.label}</button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card padding={0}>
        <DataTable columns={columns} rows={admins} rowKey={(r) => r.email}
          empty={loading ? 'Loading…' : 'No admins yet.'} />
      </Card>

      <p style={{ marginTop: 12, fontFamily: AC.font, fontSize: 12, color: AC.textFaint, lineHeight: 1.5, maxWidth: 720 }}>
        Roles &amp; module access are saved but not yet enforced — every admin currently has full access.
        Enforcement (filtered navigation and read-only write-blocking) is coming next.
      </p>
    </div>
  );
};
