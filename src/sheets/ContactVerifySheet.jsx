import { useState } from 'react';
import { ChevronLeft, X, Mail, Phone, Lock } from 'lucide-react';
import { C } from '../theme';
import { CodeVerify } from '../components/CodeVerify';
import { requestContactChange, confirmContactChange } from '../lib/onboarding';
import { isSupabaseReady } from '../lib/supabase';

// ==========================================================================
// ContactVerifySheet — add/change the signed-in mom's phone or email, verified
// by a Supabase OTP code. Two steps in one full-screen panel:
//   1. enter   — type the new value, "Send code"
//   2. verify  — the shared CodeVerify 6-digit step
//
// On success the value is verified by Supabase AND mirrored to mom_profiles via
// api/mom-profiles/sync-contact (server reads it from the verified identity).
// Closes with the verified value through onVerified(value).
//
// `kind` is 'email' | 'phone'.
// ==========================================================================

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
const phoneOk = (v) => (v || '').replace(/\D/g, '').length >= 10;

export const ContactVerifySheet = ({ kind, current, onVerified, onClose, flash }) => {
  const isPhone = kind === 'phone';
  const [step, setStep] = useState('enter'); // 'enter' | 'verify'
  const [value, setValue] = useState(current || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(false);

  const valid = isPhone ? phoneOk(value) : emailOk(value);

  const send = async () => {
    if (!valid || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const r = await requestContactChange({ kind, value });
      setDemo(!!r?.local);
      setStep('verify');
    } catch (e) {
      setError(e?.message || 'Could not send the code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (token) => {
    setSubmitting(true); setError(null);
    try {
      const r = await confirmContactChange({ kind, value, token });
      const verified = isPhone ? (r?.phone || value) : (r?.email || value);
      flash?.(isPhone ? '✦ Phone verified' : '✦ Email verified');
      onVerified?.(verified);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'That code didn’t match. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = isPhone ? Phone : Mail;

  return (
    <div className="absolute inset-0 z-40" style={{ background: 'rgba(20,14,16,.45)' }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="absolute left-0 right-0 bottom-0 flex flex-col overflow-hidden"
      style={{
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: C.cream, maxHeight: '82%',
        animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)',
      }}>
      {/* Header — back (verify→enter) / close, + eyebrow */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.divider}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step === 'verify' && (
              <button onClick={() => setStep('enter')} aria-label="Back" className="active:scale-[.94] transition-transform" style={{
                width: 36, height: 36, borderRadius: 999, flexShrink: 0,
                background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChevronLeft size={18} color={C.navy} />
              </button>
            )}
            <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
              {isPhone ? 'Phone number' : 'Email address'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="active:scale-[.94] transition-transform" style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={15} color={C.ink} />
          </button>
        </div>
      </div>

      {/* Body — shrink-wraps short content (the "enter" step is small); scrolls
          only if it would exceed the drawer's height cap. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 16, paddingBottom: 16 }}>
        {step === 'enter' ? (
          <>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em', lineHeight: 1.15 }}>
              {current ? <>Update your <span style={{ fontStyle: 'italic', color: C.coral }}>{isPhone ? 'number' : 'email'}</span></>
                       : <>Add your <span style={{ fontStyle: 'italic', color: C.coral }}>{isPhone ? 'number' : 'email'}</span></>}
            </h3>
            <p className="mt-1.5" style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
              We’ll text {isPhone ? '' : 'email '}you a 6-digit code to confirm it’s really yours.
            </p>

            {/* Input */}
            <div className="flex items-center gap-2.5 mt-4" style={{
              background: C.paper, border: `1.5px solid ${valid ? C.coral : C.divider}`,
              borderRadius: 14, padding: '0 14px', height: 54,
            }}>
              <Icon size={17} color={C.muted}/>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                inputMode={isPhone ? 'tel' : 'email'}
                autoComplete={isPhone ? 'tel' : 'email'}
                autoFocus
                placeholder={isPhone ? '(555) 123-4567' : 'you@email.com'}
                className="flex-1 min-w-0 bg-transparent outline-none"
                style={{ fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 600, color: C.navy }}
              />
            </div>

            {/* Privacy reassurance — neutral warm surface (not a community/sage
                or coral accent); this is a quiet personal-data note. */}
            <div className="flex items-start gap-2 mt-3" style={{
              background: C.blush, borderRadius: 12, padding: '10px 12px',
            }}>
              <Lock size={13} color={C.inkSoft} style={{ marginTop: 1, flexShrink: 0 }}/>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.inkSoft, lineHeight: 1.45 }}>
                Private to you. Your {isPhone ? 'number' : 'email'} is never shown to other moms — we only use it to keep your account secure.
              </div>
            </div>

            {error && (
              <div className="mt-3" style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.coralDeep, lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            <button
              onClick={send}
              disabled={!valid || submitting}
              className="w-full active:scale-[.99] transition-transform"
              style={{
                marginTop: 18, height: 52, borderRadius: 16, border: 'none',
                cursor: valid && !submitting ? 'pointer' : 'default',
                background: valid && !submitting ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : C.divider,
                color: valid && !submitting ? '#fff' : C.muted,
                fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 700,
                boxShadow: valid && !submitting ? '0 8px 18px -8px rgba(214,68,106,.55)' : 'none',
              }}
            >
              {submitting ? 'Sending…' : 'Send code'}
            </button>
          </>
        ) : (
          <CodeVerify
            target={value}
            method={kind}
            onVerify={verify}
            onResend={() => requestContactChange({ kind, value }).catch(() => {})}
            onChangeContact={() => { setError(null); setStep('enter'); }}
            submitting={submitting}
            error={error}
            demo={demo}
            accent={C.coral}
            cta="Verify"
          />
        )}
      </div>
    </div>
    </div>
  );
};
