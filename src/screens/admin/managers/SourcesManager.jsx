import { useState } from 'react';
import { AC } from '../admin-theme';
import { BusyOverlay } from '../components/primitives';
import { useConfirm } from '../components/ConfirmDialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { SourceEditModal } from './SourceEditModal';

const summary = (r) => {
  if (r.type === 'google_places') return `${r.queries?.length || 0} queries`;
  if (r.type === 'ics' || r.type === 'json_ld') return r.url || '—';
  if (r.type === 'facebook_graph') return r.pageId || '—';
  return '';
};

export const SourcesManager = ({ rows, adminFetch, onReload }) => {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // { source, isNew }
  const [busy, setBusy] = useState(false);

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/sources/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      await onReload();
    } catch (e) { alert(`Update failed: ${e.message}`); }
    finally { setBusy(false); }
  };

  const toggle = (r) => post({ id: r.id, toggle: !r.enabled });
  const remove = (r) => { confirm({ title: 'Delete source?', message: `Delete source "${r.name}"? This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' }).then((ok) => ok && post({ delete: r.id })); };

  const groups = [
    { key: 'places', label: 'Places' },
    { key: 'events', label: 'Events' },
  ];

  const Row = (r) => (
    <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${AC.border}` }}>
      <label style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={!!r.enabled} disabled={busy} onChange={() => toggle(r)} />
      </label>
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: 'Fraunces', fontSize: 14, color: AC.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: AC.textMuted }}>
          <span style={{ color: r.enabled ? AC.success : AC.textMuted }}>{r.type}</span>
          {summary(r) ? <> · {summary(r)}</> : null}
        </div>
      </div>
      <button title="Edit" onClick={() => setEditing({ source: r, isNew: false })} style={{ color: AC.text, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Pencil size={15} /></button>
      <button title="Delete" disabled={busy} onClick={() => remove(r)} style={{ color: AC.accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <BusyOverlay show={busy} label="Working…" />
      <div className="flex items-center mb-3">
        <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: AC.textMuted, flex: 1 }}>{rows.length} sources</span>
        <button onClick={() => setEditing({ source: null, isNew: true })}
          style={{ background: AC.success, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New source
        </button>
      </div>

      {groups.map(g => {
        const list = rows.filter(r => r.kind === g.key);
        return (
          <div key={g.key} className="mb-4">
            <div style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: AC.textMuted, marginBottom: 6 }}>{g.label}</div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${AC.border}`, background: AC.surface }}>
              {list.map(Row)}
              {list.length === 0 && (
                <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: AC.textMuted }}>No {g.label.toLowerCase()} sources yet.</div>
              )}
            </div>
          </div>
        );
      })}

      {editing && (
        <SourceEditModal source={editing.source} isNew={editing.isNew} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
