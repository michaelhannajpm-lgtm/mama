import { useState } from 'react';
import { Heart, ArrowRight, ArrowLeft, Mail, Phone, AlertCircle } from 'lucide-react';
import { C } from '../../theme';
import { PrimaryBtn } from '../../components/PrimaryBtn';
import { CodeVerify } from '../../components/CodeVerify';
import { sendOtp, verifyOtp, signInWithProvider } from '../../lib/onboarding';
import { ENABLED_PROVIDERS as PROVIDERS } from '../../data/oauth-providers';

// ==========================================================================
// Login — passwordless. Returning moms enter phone/email, receive a 6-digit
// code (email also gets a magic link), and verify inline. Sized to fit
// iPhone SE (375x667) without scroll. OAuth providers as icon-only buttons.
// ==========================================================================

const ProviderGlyph = ({ id, size = 16 }) => {
  if (id === 'google') return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/>
      <path fill="#34A853" d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.5 2.9-2.1 5.4-4.4 7.1l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16.0z"/>
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.8-6.1C.9 17.1 0 20.5 0 24.3s.9 7.2 2.6 10.4l7.8-6z"/>
      <path fill="#EA4335" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.4-4.6 2.2-8.1 2.2-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
  if (id === 'facebook') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M22 12.07C22 6.48 17.52 2 12 2S2 6.48 2 12.07c0 5 3.66 9.13 8.44 9.93v-7.02H7.9v-2.91h2.54V9.83c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.8 8.44-4.93 8.44-9.93z"/>
    </svg>
  );
  if (id === 'apple') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.16-1.26 3.07-1.01 1.08-2.21 1.7-3.32 1.6-.15-1.13.41-2.31 1.26-3.21.93-.99 2.5-1.71 3.32-1.46zm3.42 16.32c-.55 1.27-.81 1.83-1.52 2.95-.99 1.55-2.39 3.49-4.13 3.5-1.55 0-1.95-1.01-4.05-1.0-2.1.01-2.54 1.02-4.09 1.01-1.74-.01-3.07-1.76-4.06-3.31C-.04 17.39-.32 12.4 1.7 9.74c1.43-1.88 3.69-2.99 5.81-2.99 2.16 0 3.52 1.18 5.31 1.18 1.74 0 2.79-1.18 5.29-1.18 1.89 0 3.89 1.03 5.32 2.81-4.68 2.56-3.92 9.25-2.94 9.19z"/>
    </svg>
  );
  return null;
};

export const Login = ({ onBack, onSuccess, flash }) => {
  const [phase, setPhase] = useState('collect'); // 'collect' | 'code'
  const [method, setMethod] = useState('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(false);

  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const canSend = !submitting && contactOk;
  const target = method === 'phone' ? phone : email;

  const handleSend = async () => {
    if (!canSend) return;
    setError(null);
    setSubmitting(true);
    try {
      const r = await sendOtp({
        method,
        phone: method === 'phone' ? phone : undefined,
        email: method === 'email' ? email : undefined,
      });
      setDemo(!!r.local);
      setPhase('code');
    } catch (e) {
      setError(e.message || 'Could not send your code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (token) => {
    setError(null);
    setSubmitting(true);
    try {
      const data = await verifyOtp({
        method,
        phone: method === 'phone' ? phone : undefined,
        email: method === 'email' ? email : undefined,
        token,
        local: demo,
      });
      const user = data?.user;
      const md = user?.user_metadata || {};
      onSuccess({
        firstName: md.first_name || md.name?.split(' ')[0] || (email ? email.split('@')[0] : 'Mama'),
        username: md.username,
        auth_user_id: user?.id,
        method,
        phone: method === 'phone' ? phone : undefined,
        email: method === 'email' ? email : (user?.email || undefined),
      });
    } catch (e) {
      setError(e.message || 'Could not verify your code');
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError(null);
    setOauthLoading(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      setError(e.message || `Could not start ${provider} sign-in`);
      setOauthLoading(null);
      flash?.(e.message || `Could not start ${provider} sign-in`);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <div className="px-6 flex items-center" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <button
          onClick={phase === 'code' ? () => { setPhase('collect'); setError(null); } : onBack}
          aria-label="Back" className="rounded-full p-2 -ml-2" style={{ color: C.inkSoft }}>
          <ArrowLeft size={18}/>
        </button>
      </div>

      <div className="flex-1 px-6" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {phase === 'code' ? (
          <div style={{ marginTop: 2 }}>
            <CodeVerify
              target={target}
              method={method}
              demo={demo}
              submitting={submitting}
              error={error}
              onVerify={handleVerify}
              onResend={handleSend}
              onChangeContact={() => { setPhase('collect'); setError(null); }}
              cta="Sign in"
            />
          </div>
        ) : (
          <>
            <div style={{ marginTop: 2 }}>
              <div className="text-[10px] tracking-[.2em] uppercase mb-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
                Welcome back
              </div>
              <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 24, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
                Hello again, <span style={{ fontStyle:'italic', color: C.terracotta }}>mama</span>.
              </h2>
              <p className="mt-1 text-[12px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.4 }}>
                Enter your phone or email — we'll send a quick code, no password needed.
              </p>
            </div>

            {PROVIDERS.length > 0 && (
              <>
                <div className="grid gap-2" style={{ marginTop: 12, gridTemplateColumns: `repeat(${PROVIDERS.length}, minmax(0, 1fr))` }}>
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={()=>handleOAuth(p.id)}
                      disabled={!!oauthLoading || submitting}
                      className="rounded-xl flex items-center justify-center transition-all active:scale-[.99]"
                      style={{
                        height: 40, background: p.bg, color: p.fg,
                        border: `1px solid ${p.border}`,
                        opacity: oauthLoading && oauthLoading !== p.id ? 0.5 : 1,
                      }}
                      aria-label={p.label}>
                      <ProviderGlyph id={p.id} size={18}/>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3" style={{ marginTop: 10, marginBottom: 6 }}>
                  <div className="flex-1 h-px" style={{ background: C.divider }}/>
                  <div className="text-[9.5px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
                    or sign in with
                  </div>
                  <div className="flex-1 h-px" style={{ background: C.divider }}/>
                </div>
              </>
            )}

            <div style={{ marginTop: PROVIDERS.length > 0 ? 4 : 12 }}>
              <label className="text-[10px] tracking-[.14em] uppercase block" style={{ marginBottom: 4, color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
                Send my code to
              </label>
              <div className="rounded-xl p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
                <button onClick={()=>setMethod('email')}
                  className="flex-1 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    height: 30,
                    background: method === 'email' ? C.paper : 'transparent',
                    color: method === 'email' ? C.ink : C.inkMuted,
                    fontFamily:'Albert Sans', fontSize: 12, fontWeight: 600,
                    boxShadow: method === 'email' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  }}>
                  <Mail size={12}/> Email
                </button>
                <button onClick={()=>setMethod('phone')}
                  className="flex-1 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    height: 30,
                    background: method === 'phone' ? C.paper : 'transparent',
                    color: method === 'phone' ? C.ink : C.inkMuted,
                    fontFamily:'Albert Sans', fontSize: 12, fontWeight: 600,
                    boxShadow: method === 'phone' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  }}>
                  <Phone size={12}/> Phone
                </button>
              </div>

              {method === 'phone' ? (
                <div className="rounded-xl px-3 flex items-center gap-2" style={{ marginTop: 6, background: C.paper, border:`1px solid ${C.divider}`, height: 40 }}>
                  <span className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>+1</span>
                  <input value={phone} onChange={e=>setPhone(formatPhone(e.target.value))}
                    inputMode="tel" type="tel" placeholder="(555) 123-4567"
                    onKeyDown={(e) => { if (e.key === 'Enter' && canSend) handleSend(); }}
                    className="flex-1 bg-transparent outline-none text-[13px]"
                    style={{ fontFamily:'Albert Sans', color: C.ink, letterSpacing:'.02em' }}/>
                </div>
              ) : (
                <div className="rounded-xl px-3 flex items-center gap-2" style={{ marginTop: 6, background: C.paper, border:`1px solid ${C.divider}`, height: 40 }}>
                  <Mail size={13} style={{ color: C.inkMuted }}/>
                  <input value={email} onChange={e=>setEmail(e.target.value)}
                    inputMode="email" type="email" autoComplete="email" placeholder="you@example.com"
                    onKeyDown={(e) => { if (e.key === 'Enter' && canSend) handleSend(); }}
                    className="flex-1 bg-transparent outline-none text-[13px]"
                    style={{ fontFamily:'Albert Sans', color: C.ink }}/>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl flex items-start gap-2 px-3 py-2" style={{ marginTop: 8, background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
                <AlertCircle size={13} style={{ color: C.terracotta, flexShrink: 0, marginTop: 1 }}/>
                <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.4 }}>{error}</div>
              </div>
            )}
          </>
        )}

        <div style={{ height: 4 }}/>
      </div>

      {phase === 'collect' && (
        <div style={{
          padding: '6px 24px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
          background: C.cream,
        }}>
          <PrimaryBtn onClick={handleSend} disabled={!canSend} variant="terracotta">
            <Heart size={15} fill="currentColor"/> {submitting ? 'Sending code…' : 'Send my code'} <ArrowRight size={17}/>
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
};
