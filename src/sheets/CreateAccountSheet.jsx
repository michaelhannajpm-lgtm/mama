import { useState } from 'react';
import { ArrowRight, Check, Lock, Mail, Phone, Eye, EyeOff, Users } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { TIME_WINDOWS } from '../data/taxonomy';

export const CreateAccountSheet = ({ pendingAction, onClose, onComplete }) => {
  const [method, setMethod] = useState('phone'); // 'phone' or 'email'
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('(813) 956-2058');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  // Format phone as (XXX) XXX-XXXX while typing
  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const passwordOk = password.length >= 8;
  const canSubmit = firstName.trim().length >= 2 && contactOk && passwordOk && agreed;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      firstName,
      method,
      phone: method === 'phone' ? phone : null,
      email: method === 'email' ? email : null,
    });
  };

  // Pending action determines the summary card at the top
  const action = pendingAction || {};
  const isGroup = action.type === 'group';
  const isOneOnOne = action.type === '1to1' || action.type === 'invite';

  // Parse 1:1 slot string ("Mon-morning") into display-friendly day/time
  const slotDisplay = (() => {
    if (!isOneOnOne || !action.slot) return null;
    if (typeof action.slot === 'string') {
      const [day, ...winParts] = action.slot.split('-');
      const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
      return { day, time: win ? win.label : '' };
    }
    return action.slot; // already an object {day, time, place}
  })();

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6 flex flex-col" style={{ minHeight: 540 }}>
        {/* Header — title */}
        <div>
          <div className="text-[10.5px] tracking-[.2em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
            {isGroup ? 'Joining a group' : isOneOnOne ? 'Almost matched' : 'Almost there'}
          </div>
          <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 26, fontWeight:500, color: C.ink, letterSpacing:'-.02em', lineHeight:1.1 }}>
            Create your <span style={{ fontStyle:'italic', color: C.terracotta }}>account</span>
          </h3>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            {isGroup ? "We'll save your RSVP and let the group know you're in." :
             isOneOnOne ? "We'll save your match and send an intro for you." :
             "Verified moms only — quick sign-up, your details stay private."}
          </p>
        </div>

        {/* Pending-action summary card */}
        {(isOneOnOne || isGroup) && (
          <div className="mt-4 rounded-[14px] p-3 flex items-center gap-3" style={{ background: C.creamSoft, border:`1px solid ${C.divider}` }}>
            {isOneOnOne && action.mom && (
              <>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: action.mom.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500, fontSize: 14 }}>
                  {action.mom.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[.16em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
                    1:1 with
                  </div>
                  <div className="text-[13px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, color: C.ink }}>
                    {action.mom.name}{slotDisplay ? ` · ${slotDisplay.day} ${slotDisplay.time}` : ''}
                  </div>
                  {action.mom.nextPlace && (
                    <div className="text-[10.5px] truncate" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                      {action.mom.nextPlace}
                    </div>
                  )}
                </div>
              </>
            )}
            {isGroup && action.event && (
              <>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: action.event.hue || `linear-gradient(135deg,${C.sageDark},${C.saffron})`, color:'#fff' }}>
                  <Users size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[.16em] uppercase" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700 }}>
                    Joining
                  </div>
                  <div className="text-[13px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, color: C.ink }}>
                    {action.event.name}
                  </div>
                  <div className="text-[10.5px] truncate" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                    {action.event.day} {action.event.time} · {action.event.place}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* First name */}
        <div className="mt-4">
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
            <button onClick={()=>setShowPassword(s=>!s)} className="flex items-center justify-center" style={{ color: C.inkMuted }}>
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
            I agree to Go Mama's <span style={{ color: C.terracotta, textDecoration:'underline' }}>Terms</span> and <span style={{ color: C.terracotta, textDecoration:'underline' }}>Community Pact</span>.
          </div>
        </button>

        {/* CTA */}
        <div className="mt-4">
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              height: 52,
              background: canSubmit ? C.terracotta : C.divider,
              color: canSubmit ? '#fff' : C.inkMuted,
              fontFamily:'Albert Sans', fontWeight:600, fontSize: 15,
            }}>
            {isGroup ? 'Create account & join' : isOneOnOne ? 'Create account & match' : 'Create account'}
            <ArrowRight size={16}/>
          </button>
          <div className="mt-2.5 text-center text-[10.5px] flex items-center justify-center gap-1" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
            <Lock size={10}/>
            Your {method} is never shown to other moms.
          </div>
        </div>
      </div>
    </Sheet>
  );
};
