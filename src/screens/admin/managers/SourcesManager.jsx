import { useState } from 'react';
import { C } from '../../../theme';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { SourceEditModal } from './SourceEditModal';

const summary = (r) => {
  if (r.type === 'google_places') return `${r.queries?.length || 0} queries`;
  if (r.type === 'ics' || r.type === 'json_ld') return r.url || '—';
  if (r.type === 'facebook_graph') return r.pageId || '—';
  return '';
};

export const SourcesManager = ({ rows, adminFetch, onReload }) => {
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
  const remove = (r) => { if (confirm(`Delete source "${r.name}"?`)) post({ delete: r.id }); };

  const groups = [
    { key: 'places', label: 'Places' },
    { key: 'events', label: 'Events' },
  ];

  const Row = (r) => (
    <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
      <label style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={!!r.enabled} disabled={busy} onChange={() => toggle(r)} />
      </label>
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
          <span style={{ color: r.enabled ? C.sageDark : C.inkMuted }}>{r.type}</span>
          {summary(r) ? <> · {summary(r)}</> : null}
        </div>
      </div>
      <button title="Edit" onClick={() => setEditing({ source: r, isNew: false })} style={{ color: C.ink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Pencil size={15} /></button>
      <button title="Delete" disabled={busy} onClick={() => remove(r)} style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center mb-3">
        <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted, flex: 1 }}>{rows.length} sources</span>
        <button onClick={() => setEditing({ source: null, isNew: true })}
          style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New source
        </button>
      </div>

      {groups.map(g => {
        const list = rows.filter(r => r.kind === g.key);
        return (
          <div key={g.key} className="mb-4">
            <div style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.inkMuted, marginBottom: 6 }}>{g.label}</div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
              {list.map(Row)}
              {list.length === 0 && (
                <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No {g.label.toLowerCase()} sources yet.</div>
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
