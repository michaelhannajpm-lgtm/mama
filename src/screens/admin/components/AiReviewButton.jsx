// ============================================================================
// AiReviewButton — "🔎 Review record" AI suggestions action.
//
// Props:
//   kind      — string, e.g. 'place' | 'event' | 'mom_profile'
//   record    — plain object, the current form state to review
//   onApply   — (field: string, value: string) => void — parent patches the form
//
// State machine:
//   result === null  → not yet run (shows only the Review button)
//   result === []    → ran, no suggestions ("Looks good — no suggestions.")
//   result.length>0  → shows SuggestionChips
//
// onAccept(s) → calls onApply(s.field, s.suggested), removes chip from result.
// onDismiss(s) → removes chip from result.
// NEVER writes to the DB — all mutations flow to the parent form via onApply.
// ============================================================================
import { useState } from 'react';
import { ScanSearch } from 'lucide-react';
import { AC } from '../admin-theme';
import { adminFetch } from '../lib/adminFetch';
import { SuggestionChips } from './SuggestionChips';

export const AiReviewButton = ({ kind, record, onApply }) => {
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  const [result, setResult] = useState(null); // null | suggestion[]

  const review = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await adminFetch('/api/admin/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, record }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (e) {
      setErr(e.message || 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  const accept = (s) => {
    onApply(s.field, s.suggested);
    setResult((prev) => prev.filter((x) => x !== s));
  };

  const dismiss = (s) => {
    setResult((prev) => prev.filter((x) => x !== s));
  };

  return (
    <div>
      {/* Review button */}
      <button
        type="button"
        disabled={busy}
        onClick={review}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 13px', borderRadius: AC.radiusSm,
          background: busy ? AC.surfaceAlt : AC.surface,
          color: busy ? AC.textMuted : AC.textSoft,
          border: `1px solid ${AC.border}`,
          fontFamily: AC.font, fontSize: 12.5, fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'background .12s, border-color .12s',
          whiteSpace: 'nowrap',
        }}
      >
        <ScanSearch size={14} />
        {busy ? 'Reviewing…' : '🔎 Review record'}
      </button>

      {/* Inline error */}
      {err && (
        <div style={{
          marginTop: 6,
          fontFamily: AC.font, fontSize: 12, color: AC.danger,
        }}>
          {err}
        </div>
      )}

      {/* Empty result — ran successfully but no suggestions */}
      {result !== null && result.length === 0 && !busy && !err && (
        <div style={{
          marginTop: 8,
          fontFamily: AC.font, fontSize: 12.5, color: AC.textMuted,
          fontStyle: 'italic',
        }}>
          Looks good — no suggestions.
        </div>
      )}

      {/* Suggestion chips */}
      {result !== null && result.length > 0 && (
        <SuggestionChips
          suggestions={result}
          onAccept={accept}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
};
