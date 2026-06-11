// ============================================================================
// AiWriteButton — inline "✨ Write with AI" pill next to a textarea label.
//
// Props:
//   kind     — string, e.g. 'place' | 'event' | 'mom'
//   record   — plain object, the current form state passed to the AI endpoint
//   onWrite  — (description: string) => void — parent patches the form field
//
// Calls POST /api/admin/ai/describe → { description }.
// Manages local busy / error state only; NEVER writes to the DB.
// ============================================================================
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AC } from '../admin-theme';
import { adminFetch } from '../lib/adminFetch';

export const AiWriteButton = ({ kind, record, onWrite }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await adminFetch('/api/admin/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, record }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      if (!data.description) throw new Error('No description returned');
      onWrite(data.description);
    } catch (e) {
      setErr(e.message || 'AI write failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
      <button
        type="button"
        disabled={busy}
        onClick={run}
        title="Generate a description with AI"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 9px', borderRadius: AC.radiusPill,
          background: busy ? AC.surfaceAlt : AC.accentSoft,
          color: busy ? AC.textMuted : AC.accent,
          border: `1px solid ${busy ? AC.border : AC.accentBorder}`,
          fontFamily: AC.font, fontSize: 11, fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'background .12s, color .12s',
          whiteSpace: 'nowrap',
        }}
      >
        <Sparkles size={11} />
        {busy ? 'Writing…' : '✨ Write with AI'}
      </button>
      {err && (
        <span style={{
          fontFamily: AC.font, fontSize: 11, color: AC.danger,
          maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={err}>
          {err}
        </span>
      )}
    </span>
  );
};
