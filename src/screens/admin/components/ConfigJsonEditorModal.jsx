// ============================================================================
// JSON config editor modal — a lightweight, dependency-free "code editor" for
// editing a single app_config JSON lookup (family_values, activities, …).
//
//   <ConfigJsonEditorModal
//      configKey="family_values" label="Family values" description="…"
//      value={currentArray} adminFetch={adminFetch}
//      onSaved={(parsed) => …} onClose={() => …} />
//
// Monospace textarea + live JSON.parse validation. Save is blocked while the
// JSON is invalid or unchanged, and posts to /api/admin/config (admin-gated).
// Modeled on ConfirmDialog's overlay/panel pattern; Esc / backdrop = cancel.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { Code2, Check, X, AlertTriangle, Wand2 } from 'lucide-react';
import { AC } from '../admin-theme';

const pretty = (v) => JSON.stringify(v, null, 2);

export const ConfigJsonEditorModal = ({ configKey, label, description, value, adminFetch, onSaved, onClose }) => {
  const initial = useMemo(() => pretty(value ?? null), [value]);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  // Live validation — re-parsed on every keystroke (cheap for config-sized JSON).
  const { valid, error, parsed } = useMemo(() => {
    try { return { valid: true, error: null, parsed: JSON.parse(text) }; }
    catch (e) { return { valid: false, error: e.message, parsed: undefined }; }
  }, [text]);

  const dirty = text !== initial;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const format = () => { if (valid) setText(pretty(parsed)); };

  const save = async () => {
    if (!valid || !dirty || busy) return;
    setBusy(true); setSaveErr(null);
    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: configKey, value: parsed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Save failed (${res.status})`);
      onSaved?.(body.row?.value ?? parsed);
      onClose();
    } catch (e) {
      setSaveErr(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 95, padding: 16,
      background: 'rgba(16,24,40,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .15s ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Edit ${label}`}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: AC.radius,
          boxShadow: AC.shadowLg, overflow: 'hidden', animation: 'slideUp .2s cubic-bezier(.2,.8,.2,1)',
        }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px 18px', borderBottom: `1px solid ${AC.divider}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: AC.accentSoft, color: AC.accent }}>
            <Code2 size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: AC.font, fontSize: 15, fontWeight: 700, color: AC.text }}>{label}</div>
            <div style={{ fontFamily: AC.mono, fontSize: 11, color: AC.textMuted, marginTop: 1 }}>{configKey}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={iconBtn}><X size={16} /></button>
        </div>

        {description && (
          <div style={{ padding: '10px 18px 0', fontFamily: AC.font, fontSize: 12.5, color: AC.textMuted, lineHeight: 1.45 }}>
            {description}
          </div>
        )}

        {/* Editor */}
        <div style={{ padding: 18, overflow: 'auto' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoCapitalize="off" autoCorrect="off"
            style={{
              width: '100%', minHeight: 280, resize: 'vertical',
              fontFamily: AC.mono, fontSize: 12.5, lineHeight: 1.55,
              color: AC.text, background: AC.surfaceAlt,
              border: `1px solid ${valid ? AC.border : AC.dangerBorder}`,
              borderRadius: AC.radiusSm, padding: '12px 14px', outline: 'none',
              tabSize: 2, whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto',
            }}
          />
          {/* Validation line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, minHeight: 18,
            fontFamily: AC.font, fontSize: 12, fontWeight: 600,
            color: valid ? AC.success : AC.danger }}>
            {valid
              ? (<><Check size={13} /> Valid JSON</>)
              : (<><AlertTriangle size={13} /> {error}</>)}
          </div>
          {saveErr && (
            <div style={{ marginTop: 8, fontFamily: AC.font, fontSize: 12.5, color: AC.danger,
              background: AC.dangerSoft, border: `1px solid ${AC.dangerBorder}`, borderRadius: AC.radiusSm, padding: '8px 10px' }}>
              {saveErr}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: AC.surfaceAlt, borderTop: `1px solid ${AC.divider}` }}>
          <button onClick={format} disabled={!valid} title="Re-indent / prettify"
            style={{ ...btn, background: AC.surface, color: AC.text, border: `1px solid ${AC.borderStrong}`,
              opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'default' }}>
            <Wand2 size={14} /> Format
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...btn, background: AC.surface, color: AC.text, border: `1px solid ${AC.borderStrong}` }}>
            Cancel
          </button>
          <button onClick={save} disabled={!valid || !dirty || busy}
            style={{ ...btn, background: (!valid || !dirty) ? AC.border : AC.accent, color: '#fff',
              border: 'none', cursor: (!valid || !dirty || busy) ? 'default' : 'pointer' }}>
            {busy ? 'Saving…' : (<><Check size={14} /> Save</>)}
          </button>
        </div>
      </div>
    </div>
  );
};

const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  borderRadius: AC.radiusSm, fontFamily: AC.font, fontSize: 13, fontWeight: 700 };
const iconBtn = { background: 'transparent', border: 'none', color: AC.textMuted, cursor: 'pointer',
  display: 'inline-flex', padding: 4, borderRadius: 6 };
