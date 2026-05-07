import { useState } from 'react';
import { Heart, ArrowRight, Mail, Phone, Eye, EyeOff, Lock, Check } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const AccountScreen = ({ onNext, onBack, account, setAccount }) => {
  // Avoid lint warnings for the documented `account` prop (read-only here)
  void account;

  const [firstName, setFirstName] = useState('');
  const [method, setMethod] = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  // Format phone as (XXX) XXX-XXXX while typing
  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const passwordOk = password.length >= 8;
  const canSubmit = firstName.trim().length >= 2 && contactOk && passwordOk && agreed;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setAccount({
      firstName: firstName.trim(),
      method,
      phone: method === 'phone' ? phone : undefined,
      email: method === 'email' ? email : undefined,
    });
    onNext();
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={6} total={7} onBack={onBack}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth: 'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            ✨ Step 7 · Match me
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Almost <span style={{ fontStyle:'italic', color: C.terracotta }}>there</span>.
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            Create your account so we can save your preferences and connect you with verified moms.
          </p>
        </div>

        {/* First name */}
        <div className="mt-5">
          <label className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            First name
          </label>
          <div className="mt-1 rounded-2xl px-4 flex items-center" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
            <input value={firstName} onChange={e=>setFirstName(e.target.value)}
              placeholder="What should other moms call you?"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ fontFamily:'Albert Sans', color: C.ink }}/>
          </div>
        </div>

        {/* Phone | Email toggle */}
        <div className="mt-3.5">
          <label className="text-[10.5px] tracking-[.14em] uppercase mb-1.5 block" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Sign up with
          </label>
          <div className="rounded-2xl p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
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
          </div>

          {/* Conditional input based on method */}
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
              type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              placeholder="At least 8 characters"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ fontFamily:'Albert Sans', color: C.ink }}/>
            <button onClick={()=>setShowPassword(s=>!s)}
              className="flex items-center justify-center"
              style={{ color: C.inkMuted }}>
              {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          {password.length > 0 && password.length < 8 && (
            <div className="mt-1 text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.terracotta }}>
              {8 - password.length} more character{8 - password.length === 1 ? '' : 's'}
            </div>
          )}
        </div>

        {/* Terms */}
        <button onClick={()=>setAgreed(a=>!a)}
          className="w-full text-left flex items-start gap-2.5 pt-3 mt-1">
          <div className="mt-0.5 w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0" style={{
            background: agreed ? C.terracotta : 'transparent',
            border: `1.5px solid ${agreed ? C.terracotta : C.inkMuted}`,
          }}>
            {agreed && <Check size={12} color="#fff" strokeWidth={3}/>}
          </div>
          <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.4 }}>
            I agree to Mama's <span style={{ color: C.terracotta, textDecoration:'underline' }}>Terms</span> and <span style={{ color: C.terracotta, textDecoration:'underline' }}>Community Pact</span>.
          </div>
        </button>

        {/* Privacy footer */}
        <div className="mt-4 mb-2 text-[11px] flex items-center justify-center gap-1.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
          <Lock size={11}/>
          Your phone is never shown to other moms.
        </div>

        <div className="h-2"/>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={handleSubmit} disabled={!canSubmit} variant="terracotta">
          <Heart size={16} fill="currentColor"/> Match me <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
