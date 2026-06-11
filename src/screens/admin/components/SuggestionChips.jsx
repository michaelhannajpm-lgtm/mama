// ============================================================================
// SuggestionChips — pure presentational component.
//
// Props:
//   suggestions — array of { field, suggested, reason }
//   onAccept    — (suggestion) => void
//   onDismiss   — (suggestion) => void
//
// Returns null when suggestions is empty/null.
// Each row shows: field (mono, accent) | suggested value + "— reason" (muted)
// | Accept (success) | × dismiss.
// NEVER writes to the DB — callbacks go up to the parent form only.
// ============================================================================
import { AC } from '../admin-theme';
import { Check, X } from 'lucide-react';

export const SuggestionChips = ({ suggestions, onAccept, onDismiss }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div style={{
      marginTop: 8,
      border: `1px solid ${AC.accentBorder}`,
      borderRadius: AC.radiusSm,
      background: AC.accentSoft,
      overflow: 'hidden',
    }}>
      {suggestions.map((s, i) => (
        <div
          key={`${s.field}-${s.suggested}`}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 12px',
            borderBottom: i < suggestions.length - 1 ? `1px solid ${AC.accentBorder}` : 'none',
          }}
        >
          {/* Field name — mono, accent colored */}
          <span style={{
            fontFamily: AC.mono,
            fontSize: 11.5, fontWeight: 700,
            color: AC.accent,
            flexShrink: 0,
            paddingTop: 1,
            minWidth: 90,
          }}>
            {s.field}
          </span>

          {/* Suggested value + reason */}
          <span style={{
            fontFamily: AC.font, fontSize: 12.5, color: AC.text,
            flex: 1, lineHeight: 1.45,
          }}>
            {s.suggested}
            {s.reason && (
              <span style={{ color: AC.textMuted, marginLeft: 4 }}>
                — {s.reason}
              </span>
            )}
          </span>

          {/* Accept */}
          <button
            type="button"
            onClick={() => onAccept(s)}
            title="Accept suggestion"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '3px 9px', borderRadius: AC.radiusPill,
              background: AC.success, color: '#fff', border: 'none',
              fontFamily: AC.font, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            <Check size={11} /> Accept
          </button>

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => onDismiss(s)}
            title="Dismiss suggestion"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 999,
              background: 'transparent', border: `1px solid ${AC.accentBorder}`,
              color: AC.textMuted, cursor: 'pointer', flexShrink: 0,
              padding: 0,
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
