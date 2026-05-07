import { useState } from 'react';
import { Heart, ArrowRight, ArrowLeft, Mail, Phone, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { C } from '../../theme';
import { PrimaryBtn } from '../../components/PrimaryBtn';
import { signInWithPassword, signInWithProvider } from '../../lib/onboarding';
import { ENABLED_PROVIDERS as PROVIDERS } from '../../data/oauth-providers';

const ProviderGlyph = ({ id }) => {
  const size = 14;
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
  const [method, setMethod] = useState('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState(null);

  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const passwordOk = password.length >= 1; // server will reject if wrong; don't gate UI on length here
  const canSubmit = !submitting && contactOk && passwordOk;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await signInWithPassword({
        method,
        phone: method === 'phone' ? phone : undefined,
        email: method === 'email' ? email : undefined,
        password,
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
      setError(e.message || 'Could not sign in');
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError(null);
    setOauthLoading(provider);
    try {
      await signInWithProvider(provider);
      // signInWithOAuth redirects away; if it returns, the redirect was a no-op.
    } catch (e) {
      setError(e.message || `Could not start ${provider} sign-in`);
      setOauthLoading(null);
      flash?.(e.message || `Could not start ${provider} sign-in`);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      {/* Top back button */}
      <div className="px-7 pt-3 pb-2 flex items-center">
        <button onClick={onBack} aria-label="Back" className="rounded-full p-2 -ml-2" style={{ color: C.inkSoft }}>
          <ArrowLeft size={18}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth: 'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Welcome back
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Hello again, <span style={{ fontStyle:'italic', color: C.terracotta }}>mama</span>.
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            Sign in to pick up where you left off.
          </p>
        </div>

        {/* OAuth buttons + divider — only render when at least one provider is enabled. */}
        {PROVIDERS.length > 0 && (
          <>
            <div className="mt-5 space-y-2">
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={()=>handleOAuth(p.id)}
                  disabled={!!oauthLoading || submitting}
                  className="w-full rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[.99]"
                  style={{
                    height: 46, background: p.bg, color: p.fg,
                    border: `1px solid ${p.border}`,
                    fontFamily:'Albert Sans', fontWeight:600, fontSize: 13.5,
                    opacity: oauthLoading && oauthLoading !== p.id ? 0.5 : 1,
                  }}>
                  <ProviderGlyph id={p.id}/>
                  {oauthLoading === p.id ? 'Redirecting…' : p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4 mb-3">
              <div className="flex-1 h-px" style={{ background: C.divider }}/>
              <div className="text-[10.5px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
                or sign in with
              </div>
              <div className="flex-1 h-px" style={{ background: C.divider }}/>
            </div>
          </>
        )}

        {/* Phone | Email toggle */}
        <div className="mt-2">
          <label className="text-[10.5px] tracking-[.14em] uppercase mb-1.5 block" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Sign in with
          </label>
          <div className="rounded-2xl p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
            <button onClick={()=>setMethod('email')}
              className="flex-1 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              style={{
                height: 36,
                background: method === 'email' ? C.paper : 'transparent',
                color: method === 'email' ? C.ink : C.inkMuted,
                fontFamily:'Albert Sans', fontSize: 12.5, fontWeight: 600,
                boxShadow: method === 'email' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
              }}>
              <Mail size={12}/> Email
            </button>
            <button onClick={()=>setMethod('phone')}
              className="flex-1 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              style={{
                height: 36,
                background: method === 'phone' ? C.paper : 'transparent',
                color: method === 'phone' ? C.ink : C.inkMuted,
                fontFamily:'Albert Sans', fontSize: 12.5, fontWeight: 600,
                boxShadow: method === 'phone' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
              }}>
              <Phone size={12}/> Phone
            </button>
          </div>

          {/* Conditional input */}
          {method === 'phone' ? (
            <div className="mt-2 rounded-2xl px-4 flex items-center gap-2" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
              <span className="text-[13.5px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>+1</span>
              <input value={phone} onChange={e=>setPhone(formatPhone(e.target.value))}
                inputMode="tel" type="tel"
                placeholder="(555) 123-4567"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                style={{ fontFamily:'Albert Sans', color: C.ink, letterSpacing:'.02em' }}/>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl px-4 flex items-center gap-2" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
              <Mail size={14} style={{ color: C.inkMuted }}/>
              <input value={email} onChange={e=>setEmail(e.target.value)}
                inputMode="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                style={{ fontFamily:'Albert Sans', color: C.ink }}/>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="mt-3.5">
          <label className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Password
          </label>
          <div className="mt-1 rounded-2xl px-4 flex items-center gap-2" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
            <Lock size={13} style={{ color: C.inkMuted }}/>
            <input value={password} onChange={e=>setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              placeholder="Your password"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ fontFamily:'Albert Sans', color: C.ink }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}/>
            <button onClick={()=>setShowPassword(s=>!s)}
              className="flex items-center justify-center"
              style={{ color: C.inkMuted }}>
              {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-xl flex items-start gap-2 px-3 py-2" style={{ background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
            <AlertCircle size={14} style={{ color: C.terracotta, flexShrink: 0, marginTop: 1 }}/>
            <div className="text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.4 }}>{error}</div>
          </div>
        )}

        <div className="h-2"/>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={handleSubmit} disabled={!canSubmit} variant="terracotta">
          <Heart size={16} fill="currentColor"/> {submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
