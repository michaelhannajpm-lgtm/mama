import { useState } from 'react';
import { ArrowRight, ShieldCheck, RotateCw } from 'lucide-react';
import { C } from '../theme';

// ==========================================================================
// CodeVerify — shared 6-digit OTP entry block. Channel-agnostic: the caller
// passes the display target (phone/email) plus verify / resend / change
// handlers. Used by Account, Login, and CreateAccountSheet so the passwordless
// code step looks and behaves identically everywhere.
//
// `demo` shows a gentle hint that any 6-digit code works (used when Supabase
// or the SMS provider isn't configured, so the prototype keeps moving).
// ==========================================================================

export const CodeVerify = ({
  target,
  method,
  onVerify,
  onResend,
  onChangeContact,
  submitting = false,
  error = null,
  demo = false,
  accent = C.terracotta,
  cta = 'Verify & continue',
}) => {
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);
  const codeOk = code.replace(/\D/g, '').length === 6;

  const handleChange = (v) => {
    setCode(v.replace(/\D/g, '').slice(0, 6));
  };

  const handleResend = async () => {
    setResent(false);
    await onResend?.();
    setResent(true);
  };

  return (
    <div>
      <div className="text-[10px] tracking-[.2em] uppercase mb-1.5" style={{ color: accent, fontFamily: 'Albert Sans', fontWeight: 600 }}>
        {method === 'phone' ? 'Check your texts' : 'Check your email'}
      </div>
      <h3 style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 24, lineHeight: 1.1, color: C.ink, letterSpacing: '-.02em' }}>
        Enter your <span style={{ fontStyle: 'italic', color: accent }}>code</span>
      </h3>
      <p className="mt-1.5 text-[12.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkSoft, lineHeight: 1.45 }}>
        We sent a 6-digit code to{' '}
        <span style={{ fontWeight: 600, color: C.ink }}>{target}</span>
        {method === 'email' ? '. Tap the link in the email, or type the code below.' : '.'}
      </p>

      <input
        value={code}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && codeOk) onVerify(code); }}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="••••••"
        aria-label="6-digit verification code"
        className="w-full bg-transparent outline-none text-center"
        style={{
          marginTop: 16,
          height: 56,
          borderRadius: 14,
          background: C.paper,
          border: `1.5px solid ${codeOk ? accent : C.divider}`,
          fontFamily: 'Fraunces',
          fontSize: 28,
          fontWeight: 600,
          color: C.ink,
          letterSpacing: '.42em',
          textIndent: '.42em',
        }}
      />

      {demo && (
        <div className="flex items-center gap-1.5 mt-2 text-[10.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
          <ShieldCheck size={12} />
          Demo mode — enter any 6 digits to continue.
        </div>
      )}

      {error && (
        <div className="rounded-xl flex items-start gap-2 px-3 py-2" style={{ marginTop: 10, background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
          <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.4 }}>{error}</div>
        </div>
      )}

      <button
        onClick={() => codeOk && onVerify(code)}
        disabled={!codeOk || submitting}
        className="w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
        style={{
          marginTop: 14,
          height: 52,
          background: codeOk && !submitting ? accent : C.divider,
          color: codeOk && !submitting ? '#fff' : C.inkMuted,
          fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 15,
        }}
      >
        {submitting ? 'Verifying…' : cta} <ArrowRight size={16} />
      </button>

      <div className="flex items-center justify-center gap-4" style={{ marginTop: 12 }}>
        <button
          onClick={handleResend}
          disabled={submitting}
          className="flex items-center gap-1.5 text-[11.5px]"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: accent }}
        >
          <RotateCw size={12} /> {resent ? 'Code sent again' : 'Resend code'}
        </button>
        <span style={{ color: C.divider }}>·</span>
        <button
          onClick={onChangeContact}
          disabled={submitting}
          className="text-[11.5px]"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: C.inkMuted }}
        >
          Change {method === 'phone' ? 'number' : 'email'}
        </button>
      </div>
    </div>
  );
};
