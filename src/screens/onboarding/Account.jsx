import { useState } from 'react';
import { Heart, ArrowRight, Mail, Phone, Check, AlertCircle, ChevronLeft, Zap } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { PrimaryBtn } from '../../components/PrimaryBtn';
import { CodeVerify } from '../../components/CodeVerify';
import { sendOtp, verifyOtp, signInWithProvider } from '../../lib/onboarding';
import { ENABLED_PROVIDERS as PROVIDERS } from '../../data/oauth-providers';

// ==========================================================================
// Account — ported from docs/HTML/GoMama-Prototype-html.html (Screen 4).
// Social-first, passwordless. Three phases:
//   'choose'  — OAuth buttons up front (most moms tap these); phone/email is
//               tucked behind a quiet "Continue with phone or email" link.
//   'collect' — revealed on tap: firstName + phone/email + terms → send code.
//   'code'    — verify the 6-digit code inline (email also gets a magic link).
// No password anywhere. Pattern mirrors Bumble/Airbnb/Substack signup.
// ==========================================================================

// Per-provider visual treatment matching the HTML spec — Apple dark, Google
// white+border. Falls back to the provider config in oauth-providers.js
// for anything not explicitly listed.
const PROVIDER_STYLE = {
  apple:    { bg: C.ink,    fg: '#fff',    border: C.ink   },
  google:   { bg: '#fff',   fg: C.ink,     border: C.line  },
  facebook: { bg: '#1877F2',fg: '#fff',    border: '#1877F2' },
};

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

export const Account = ({ onBack, onLogin, account, onComplete, flash }) => {
  void account;

  const [phase, setPhase] = useState('choose'); // 'choose' | 'collect' | 'code'
  const [firstName, setFirstName] = useState('');
  const [method, setMethod] = useState('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Consent must be an explicit, affirmative action — never pre-checked
  // (GDPR/CCPA opt-in + Apple 5.1.1). `canSend` gates the CTA on it.
  const [agreed, setAgreed] = useState(false);
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
  const canSend = !submitting && contactOk && agreed;
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
        firstName: firstName.trim(),
        agreedTerms: agreed,
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
      onComplete({
        firstName: firstName.trim(),
        auth_user_id: data?.user?.id,
        method,
        phone: method === 'phone' ? phone : undefined,
        email: method === 'email' ? email : undefined,
      });
    } catch (e) {
      setError(e.message || 'Could not verify your code');
      setSubmitting(false);
    }
  };

  // Dev shortcut — skip OTP and drop straight into MainApp as the test mom.
  const handleAutoLogin = () => {
    onComplete({
      firstName: 'Sana',
      username: 'sana',
      auth_user_id: 'local-sana',
      method: 'phone',
      phone: '(813) 956-2058',
    });
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
      <StatusBar/>

      {/* Top bar — back button (matches AboutYou + VillagePreview pattern) */}
      <div className="flex items-center" style={{ padding: '6px 14px 4px' }}>
        <button
          onClick={
            phase === 'code' ? () => { setPhase('collect'); setError(null); } :
            phase === 'collect' ? () => { setPhase('choose'); setError(null); } :
            onBack
          }
          className="rounded-full flex items-center justify-center"
          style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
          aria-label="Back"
        >
          <ChevronLeft size={18} color={C.navy}/>
        </button>
      </div>

      <div className="flex-1 px-6" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* ── Phase: code ─────────────────────────────────────────────── */}
        {phase === 'code' && (
          <div style={{ marginTop: 6 }}>
            <CodeVerify
              target={target}
              method={method}
              demo={demo}
              submitting={submitting}
              error={error}
              onVerify={handleVerify}
              onResend={handleSend}
              onChangeContact={() => { setPhase('collect'); setError(null); }}
              cta="Match me"
            />
          </div>
        )}

        {/* ── Phase: choose (social-first) ────────────────────────────── */}
        {phase === 'choose' && (
          <>
            <div style={{ marginTop: 6 }}>
              <h2 style={{ fontFamily:'Fraunces', fontWeight:700, fontSize: 25, lineHeight:1.15, color: C.navy, letterSpacing:'-.01em' }}>
                Save your <span style={{ fontStyle:'italic', color: C.coral, fontWeight: 500 }}>spot</span>
              </h2>
              <p className="mt-1.5 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.muted, lineHeight:1.45 }}>
                Join your village in one tap — no password to remember.
              </p>
            </div>

            {PROVIDERS.length > 0 && (
              <div style={{ marginTop: 20 }}>
                {PROVIDERS.map(p => {
                  const s = PROVIDER_STYLE[p.id] || { bg: p.bg, fg: p.fg, border: p.border };
                  return (
                    <button key={p.id} onClick={()=>handleOAuth(p.id)}
                      disabled={!!oauthLoading || submitting}
                      className="w-full flex items-center justify-center gap-2.5 transition-all active:scale-[.99]"
                      style={{
                        height: 50, marginBottom: 10,
                        borderRadius: 14,
                        background: s.bg, color: s.fg,
                        border: `1.3px solid ${s.border}`,
                        fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 700,
                        opacity: oauthLoading && oauthLoading !== p.id ? 0.5 : 1,
                      }}
                      aria-label={p.label}>
                      <ProviderGlyph id={p.id} size={18}/>
                      <span>{oauthLoading === p.id ? 'Connecting…' : p.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3" style={{ marginTop: 12, marginBottom: 12 }}>
              <div className="flex-1 h-px" style={{ background: C.divider }}/>
              <div className="text-[10px] tracking-[.18em] uppercase" style={{ color: C.muted, fontFamily:'Albert Sans', fontWeight:600 }}>
                or
              </div>
              <div className="flex-1 h-px" style={{ background: C.divider }}/>
            </div>

            {/* Quiet disclosure — reveals the phone/email form on tap */}
            <button
              onClick={() => { setPhase('collect'); setError(null); }}
              disabled={!!oauthLoading || submitting}
              className="w-full flex items-center justify-center gap-2 transition-all active:scale-[.99]"
              style={{
                height: 50, borderRadius: 14,
                background: 'transparent', color: C.navy,
                border: `1.3px solid ${C.line}`,
                fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 600,
              }}
              aria-label="Continue with phone or email">
              <Mail size={17} style={{ color: C.inkSoft }}/>
              <span>Continue with phone or email</span>
            </button>

            {/* Passive consent — covers the one-tap social path */}
            <p className="text-center text-[10.5px]" style={{ marginTop: 16, fontFamily:'Albert Sans', color: C.inkMuted, lineHeight:1.45 }}>
              By continuing, you agree to Go Mama's{' '}
              <span style={{ color: C.terracotta, textDecoration:'underline' }}>Terms</span> and{' '}
              <span style={{ color: C.terracotta, textDecoration:'underline' }}>Community Pact</span>.
            </p>

            {error && (
              <div className="rounded-xl p-2 flex items-start gap-2" style={{ marginTop: 10, background: `${C.terracotta}14`, border: `1px solid ${C.terracotta}40` }}>
                <AlertCircle size={13} style={{ color: C.terracotta, marginTop: 1 }}/>
                <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.terracotta, lineHeight: 1.35 }}>
                  {error}
                </div>
              </div>
            )}

            {/* Returning member */}
            <div className="text-center" style={{ marginTop: 18 }}>
              <button onClick={onLogin} className="text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                Already a member? <span style={{ color: C.terracotta, fontWeight: 700 }}>Log in</span>
              </button>
            </div>

            {/* Dev shortcut — auto-login as the test mom (Sana). Dev-only:
                tree-shaken out of production builds via import.meta.env.DEV. */}
            {import.meta.env.DEV && (
              <div className="text-center" style={{ marginTop: 10 }}>
                <button
                  onClick={handleAutoLogin}
                  className="inline-flex items-center justify-center active:scale-[.97] transition-transform"
                  style={{
                    height: 24, padding: '0 11px', gap: 5, borderRadius: 999,
                    background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                    color: '#fff',
                    fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
                    boxShadow: '0 6px 14px -8px rgba(124,58,237,.6)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <Zap size={10} strokeWidth={2.6} fill="currentColor"/>
                  Dev · Auto-login as Sana
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Phase: collect (phone/email form) ───────────────────────── */}
        {phase === 'collect' && (
          <>
            <div style={{ marginTop: 2 }}>
              <h2 style={{ fontFamily:'Fraunces', fontWeight:700, fontSize: 24, lineHeight:1.15, color: C.navy, letterSpacing:'-.01em' }}>
                A few <span style={{ fontStyle:'italic', color: C.coral, fontWeight: 500 }}>details</span>
              </h2>
              <p className="mt-1 text-[12px]" style={{ fontFamily:'Albert Sans', color: C.muted, lineHeight:1.4 }}>
                We'll send a 6-digit code to confirm it's you.
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="text-[10px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
                First name
              </label>
              <div className="rounded-xl px-3 flex items-center" style={{ marginTop: 4, background: C.paper, border:`1px solid ${C.divider}`, height: 40 }}>
                <input value={firstName} onChange={e=>setFirstName(e.target.value)}
                  placeholder="What should other moms call you?"
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ fontFamily:'Albert Sans', color: C.ink }}/>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="text-[10px] tracking-[.14em] uppercase block" style={{ marginBottom: 4, color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
                Send my code to
              </label>
              <div className="rounded-xl p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
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
              </div>

              {method === 'phone' ? (
                <div className="rounded-xl px-3 flex items-center gap-2" style={{ marginTop: 6, background: C.paper, border:`1px solid ${C.divider}`, height: 40 }}>
                  <span className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>+1</span>
                  <input value={phone} onChange={e=>setPhone(formatPhone(e.target.value))}
                    inputMode="tel" type="tel" placeholder="(555) 123-4567"
                    className="flex-1 bg-transparent outline-none text-[13px]"
                    style={{ fontFamily:'Albert Sans', color: C.ink, letterSpacing:'.02em' }}/>
                </div>
              ) : (
                <div className="rounded-xl px-3 flex items-center gap-2" style={{ marginTop: 6, background: C.paper, border:`1px solid ${C.divider}`, height: 40 }}>
                  <Mail size={13} style={{ color: C.inkMuted }}/>
                  <input value={email} onChange={e=>setEmail(e.target.value)}
                    inputMode="email" type="email" autoComplete="email" placeholder="you@example.com"
                    className="flex-1 bg-transparent outline-none text-[13px]"
                    style={{ fontFamily:'Albert Sans', color: C.ink }}/>
                </div>
              )}
            </div>

            {/* Verification note — blush bg + dashed coral border (HTML S4) */}
            <div className="flex items-start gap-2.5 rounded-xl" style={{
              marginTop: 12, padding: 10,
              background: C.blush, border: `1px dashed ${C.coralSoft}`,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>🛡️</span>
              <p style={{
                fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 600,
                color: C.navy, lineHeight: 1.45, margin: 0,
              }}>
                We'll ask you to verify your profile later — it's how we keep this safe for moms.
              </p>
            </div>

            <button onClick={()=>setAgreed(a=>!a)}
              className="w-full text-left flex items-start gap-2"
              style={{ marginTop: 10 }}>
              <div className="rounded-md flex items-center justify-center flex-shrink-0" style={{
                width: 16, height: 16, marginTop: 1,
                background: agreed ? C.terracotta : 'transparent',
                border: `1.5px solid ${agreed ? C.terracotta : C.inkMuted}`,
              }}>
                {agreed && <Check size={11} color="#fff" strokeWidth={3}/>}
              </div>
              <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.35 }}>
                I agree to Go Mama's <span style={{ color: C.terracotta, textDecoration:'underline' }}>Terms</span> and <span style={{ color: C.terracotta, textDecoration:'underline' }}>Community Pact</span>.
              </div>
            </button>

            {error && (
              <div className="rounded-xl p-2 flex items-start gap-2" style={{ marginTop: 8, background: `${C.terracotta}14`, border: `1px solid ${C.terracotta}40` }}>
                <AlertCircle size={13} style={{ color: C.terracotta, marginTop: 1 }}/>
                <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.terracotta, lineHeight: 1.35 }}>
                  {error}
                </div>
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
