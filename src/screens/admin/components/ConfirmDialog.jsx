// ============================================================================
// Confirm dialog — a styled replacement for window.confirm() across the admin
// console. Promise-based so call sites read naturally:
//
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;
//
// Mount <ConfirmProvider> once at the console root (index.jsx); every section
// under it can call useConfirm(). Esc / backdrop = cancel, Enter = confirm.
// ============================================================================
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AC } from '../admin-theme';

const ConfirmContext = createContext(null);

// Returns confirm(opts) => Promise<boolean>. Falls back to window.confirm if
// used outside a provider (so it never silently no-ops).
export const useConfirm = () => useContext(ConfirmContext)
  || ((opts = {}) => Promise.resolve(window.confirm(opts.message || opts.title || 'Are you sure?')));

export const ConfirmProvider = ({ children }) => {
  const [opts, setOpts] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    resolveRef.current = resolve;
    setOpts(options);
  }), []);

  const settle = useCallback((result) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOpts(null);
    resolve?.(result);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && <ConfirmDialog opts={opts} onResolve={settle} />}
    </ConfirmContext.Provider>
  );
};

const ConfirmDialog = ({ opts, onResolve }) => {
  const {
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'danger', // 'danger' | 'default'
  } = opts;
  const danger = tone === 'danger';
  const accent = danger ? AC.danger : AC.accent;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onResolve(false); }
      if (e.key === 'Enter') { e.preventDefault(); onResolve(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onResolve]);

  return (
    <div
      onClick={() => onResolve(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 90, padding: 16,
        background: 'rgba(16,24,40,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn .15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: '100%', maxWidth: 420,
          background: AC.surface, border: `1px solid ${AC.border}`,
          borderRadius: AC.radius, boxShadow: AC.shadowLg, overflow: 'hidden',
          animation: 'slideUp .2s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div style={{ display: 'flex', gap: 14, padding: '20px 20px 16px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}1A`, color: accent,
          }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: AC.font, fontSize: 16, fontWeight: 700, color: AC.text, letterSpacing: '-.01em' }}>
              {title}
            </div>
            {message && (
              <div style={{ fontFamily: AC.font, fontSize: 13, color: AC.textSoft, marginTop: 6, lineHeight: 1.5 }}>
                {message}
              </div>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 16px', background: AC.surfaceAlt, borderTop: `1px solid ${AC.divider}`,
        }}>
          <button
            onClick={() => onResolve(false)}
            style={{
              padding: '9px 16px', borderRadius: AC.radiusSm, cursor: 'pointer',
              background: AC.surface, color: AC.text, border: `1px solid ${AC.borderStrong}`,
              fontFamily: AC.font, fontSize: 13, fontWeight: 600,
            }}
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => onResolve(true)}
            style={{
              padding: '9px 18px', borderRadius: AC.radiusSm, cursor: 'pointer',
              background: accent, color: '#fff', border: `1px solid ${accent}`,
              fontFamily: AC.font, fontSize: 13, fontWeight: 700,
              boxShadow: `0 6px 16px -8px ${accent}`,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
