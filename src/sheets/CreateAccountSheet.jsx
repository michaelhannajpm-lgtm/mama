import { useState } from 'react';
import { ArrowRight, Check, Lock, Mail, Phone, Users } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { PrimaryBtn } from '../components/PrimaryBtn';
import { CodeVerify } from '../components/CodeVerify';
import { TIME_WINDOWS } from '../data/taxonomy';
import { sendOtp, verifyOtp } from '../lib/onboarding';

// ==========================================================================
// CreateAccountSheet — the in-app gate shown when a mom schedules a 1:1 or
// RSVPs to a group before she has an account. Passwordless: collect firstName
// + phone/email + terms, send a 6-digit code, verify inline, then hand the
// real account back to onComplete (which replays the queued action).
// ==========================================================================

export const CreateAccountSheet = ({ pendingAction, onClose, onComplete }) => {
  const [phase, setPhase] = useState('collect'); // 'collect' | 'code'
  const [method, setMethod] = useState('phone'); // 'phone' or 'email'
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Consent is an explicit opt-in — never pre-checked (GDPR/CCPA, Apple 5.1.1).
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [demo, setDemo] = useState(false);

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
  const canSend = !submitting && contactOk && agreed;
  const target = method === 'phone' ? phone : email;

  // Pending action determines the summary card + CTA copy
  const action = pendingAction || {};
  const isGroup = action.type === 'group';
  const isOneOnOne = action.type === '1to1' || action.type === 'invite';
  const verifyCta = isGroup ? 'Join the group' : isOneOnOne ? 'Confirm match' : 'Verify & continue';

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
        phone: method === 'phone' ? phone : null,
        email: method === 'email' ? email : null,
      });
    } catch (e) {
      setError(e.message || 'Could not verify your code');
      setSubmitting(false);
    }
  };

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
        {phase === 'code' ? (
          <div className="pt-2">
            <CodeVerify
              target={target}
              method={method}
              demo={demo}
              submitting={submitting}
              error={error}
              onVerify={handleVerify}
              onResend={handleSend}
              onChangeContact={() => { setPhase('collect'); setError(null); }}
              cta={verifyCta}
            />
          </div>
        ) : (
          <>
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
                 "Verified moms only — no password, just a quick code."}
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
                Send my code to
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

            {error && (
              <div className="mt-3 rounded-xl flex items-start gap-2 px-3 py-2" style={{ background: `${C.terracotta}15`, border: `1px solid ${C.terracotta}` }}>
                <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.4 }}>{error}</div>
              </div>
            )}

            {/* CTA — shared PrimaryBtn (coral, medium) so every sheet's primary
                action has one height / radius / disabled treatment. */}
            <div className="mt-4">
              <PrimaryBtn onClick={handleSend} disabled={!canSend} variant="terracotta" size="md">
                {submitting ? 'Sending code…' : 'Send my code'}
                <ArrowRight size={16}/>
              </PrimaryBtn>
              <div className="mt-2.5 text-center text-[10.5px] flex items-center justify-center gap-1" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
                <Lock size={10}/>
                Your {method} is never shown to other moms.
              </div>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
};
