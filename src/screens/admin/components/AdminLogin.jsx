// Login gate — email OTP. Step 1: enter an allowlisted email to receive a
// 6-digit code (POST /api/admin/otp/start). Step 2: enter the code to exchange
// it for a signed session token (POST /api/admin/otp/verify). Only emails on
// the admin allowlist (app_config.admin_users) can complete sign-in.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AC } from '../admin-theme';
import { setAdminToken } from '../lib/adminFetch';

const RESEND_SECONDS = 45;

const postJson = async (path, payload) => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('API routes need `vercel dev` or a deployed preview to run.');
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
};

export const AdminLogin = ({ onSuccess }) => {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef(null);

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const sendCode = async () => {
    setSubmitting(true); setErr(null);
    try {
      await postJson('/api/admin/otp/start', { email: email.trim() });
      setStep('code');
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setErr(e?.message || 'Could not send code');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    setSubmitting(true); setErr(null);
    try {
      const body = await postJson('/api/admin/otp/verify', { email: email.trim(), code: code.trim() });
      if (!body?.token) throw new Error('No token returned');
      setAdminToken(body.token);
      onSuccess();
    } catch (e) {
      setErr(e?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (step === 'email') { if (email.includes('@')) sendCode(); }
    else { if (code.trim().length >= 4) verify(); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: AC.bg }}>
      <form onSubmit={submit} className="w-full max-w-[380px]" style={{
        background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: AC.radius,
        boxShadow: AC.shadowLg, padding: 28,
      }}>
        <div className="flex items-center justify-center mb-4" style={{
          width: 40, height: 40, borderRadius: 10, background: AC.railBg,
          color: AC.accent, fontFamily: AC.brandFont, fontSize: 20, fontWeight: 600,
        }}>M</div>
        <h1 style={{ fontFamily: AC.brandFont, fontSize: 24, fontWeight: 500, color: AC.text, letterSpacing: '-.02em' }}>
          Go Mama · <span style={{ fontStyle: 'italic', color: AC.accent, fontWeight: 500 }}>Console</span>
        </h1>

        {step === 'email' ? (
          <>
            <p className="mt-1 mb-5" style={subStyle}>
              Enter your admin email to get a one-time sign-in code.
            </p>
            <input
              type="email" value={email} autoFocus inputMode="email" autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full mb-3 outline-none" style={inputStyle(err)}
            />
            {err && <div className="mb-3" style={errStyle}>{err}</div>}
            <button type="submit" disabled={submitting || !email.includes('@')}
              className="w-full flex items-center justify-center" style={btnStyle(submitting || !email.includes('@'))}>
              {submitting ? 'Sending…' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 mb-1" style={subStyle}>
              If <strong style={{ color: AC.text }}>{email}</strong> is an admin, we just emailed a 6-digit code. Enter it below.
            </p>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setErr(null); }}
              className="flex items-center gap-1 mb-4" style={{ ...linkStyle, marginTop: 2 }}>
              <ArrowLeft size={12} /> Use a different email
            </button>
            <input
              ref={codeRef} type="text" value={code} inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full mb-3 outline-none"
              style={{ ...inputStyle(err), letterSpacing: '8px', textAlign: 'center', fontSize: 22, fontFamily: AC.mono }}
            />
            {err && <div className="mb-3" style={errStyle}>{err}</div>}
            <button type="submit" disabled={submitting || code.trim().length < 6}
              className="w-full flex items-center justify-center" style={btnStyle(submitting || code.trim().length < 6)}>
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <div className="mt-3 text-center">
              <button type="button" disabled={resendIn > 0 || submitting} onClick={sendCode}
                style={{ ...linkStyle, opacity: resendIn > 0 || submitting ? 0.5 : 1, cursor: resendIn > 0 ? 'default' : 'pointer' }}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

const subStyle = { fontFamily: AC.font, fontSize: 13, color: AC.textSoft, lineHeight: 1.5 };
const errStyle = { fontFamily: AC.font, fontSize: 12.5, color: AC.danger };
const linkStyle = { background: 'none', border: 'none', padding: 0, fontFamily: AC.font, fontSize: 12.5, fontWeight: 600, color: AC.accent, cursor: 'pointer' };
const inputStyle = (err) => ({
  background: AC.bg, border: `1px solid ${err ? AC.danger : AC.borderStrong}`,
  borderRadius: AC.radiusSm, padding: '11px 13px', color: AC.text, fontFamily: AC.font, fontSize: 14,
});
const btnStyle = (disabled) => ({
  background: AC.accent, color: AC.accentText, borderRadius: AC.radiusSm, padding: '11px',
  fontFamily: AC.font, fontWeight: 600, fontSize: 14, opacity: disabled ? 0.6 : 1,
});
