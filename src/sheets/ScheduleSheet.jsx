import { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { recordStep } from '../lib/onboarding';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_KEYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ScheduleSheet = ({ mom, onClose, onContinue, hasAccount, prefs, setPrefs }) => {
  const [chosen, setChosen] = useState(0);

  // Derive selected days from prefs.slots ("Mon-morning" → "Mon").
  const initialDays = new Set(
    (prefs?.slots || []).map(s => s.split('-')[0]).filter(d => DAY_KEYS.includes(d)),
  );
  const [days, setDays] = useState(initialDays);
  // Show the day-capture row only when we have no availability on file yet.
  // Once the user starts tapping, persist on each change.
  const showDayCapture = !!setPrefs && initialDays.size === 0;

  const toggleDay = (idx) => {
    setDays(prev => {
      const next = new Set(prev);
      const key = DAY_KEYS[idx];
      if (next.has(key)) next.delete(key); else next.add(key);
      const slots = [...next].map(d => `${d}-morning`);
      setPrefs?.(p => ({ ...p, slots }));
      recordStep(0, { slots });
      return next;
    });
  };

  // Suggested meet-up slots. The first anchors on the mom's own next outing;
  // the rest fall back to well-known Tampa family-friendly spots (this is a
  // Tampa Bay app — never seed out-of-market venues).
  const slots = [
    { day:'Tue', time:'9:30 AM', place: mom.nextPlace || 'Armature Works · Riverwalk' },
    { day:'Thu', time:'10:00 AM', place: 'Buddy Brew · Hyde Park' },
    { day:'Sat', time:'9:00 AM',  place: 'Al Lopez Park · playground' },
  ];

  return (
    <Sheet onClose={onClose} label={`Schedule with ${mom.name.split(' ')[0]}`}>
      <div className="px-6 pt-2 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
          Schedule with {mom.name.split(' ')[0]}
        </div>
        <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 24, fontWeight:500, color: C.ink, letterSpacing:'-.02em' }}>
          You're <span style={{ fontStyle:'italic', color: C.terracotta }}>both</span> free…
        </h3>

        {showDayCapture && (
          <div
            className="mt-4 rounded-2xl"
            style={{
              background: C.creamSoft,
              border: `1px solid ${C.divider}`,
              padding: '10px 12px',
            }}
          >
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11, color: C.inkSoft, marginBottom: 6,
            }}>
              Which days usually work for you? <span style={{ color: C.muted }}>(better slot suggestions next time)</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DAY_LABELS.map((d, i) => {
                const active = days.has(DAY_KEYS[i]);
                return (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className="flex items-center justify-center transition-all active:scale-95"
                    style={{
                      width: 30, height: 30, borderRadius: 15,
                      background: active ? C.terracotta : '#fff',
                      border: `1.3px solid ${active ? C.terracotta : C.divider}`,
                      color: active ? '#fff' : C.ink,
                      fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 11,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {slots.map((s,i)=>(
            <button key={i} onClick={()=>setChosen(i)}
              className="w-full rounded-[16px] p-3.5 flex items-center gap-3 transition-all text-left"
              style={{
                background: chosen===i ? C.ink : C.paper,
                color: chosen===i ? C.cream : C.ink,
                border: `1px solid ${chosen===i ? C.ink : C.divider}`,
              }}>
              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center"
                style={{ background: chosen===i ? C.saffron : C.creamSoft, color: C.ink }}>
                <div className="text-[9px] tracking-[.1em]" style={{ fontFamily:'Albert Sans', fontWeight:700 }}>{s.day.toUpperCase()}</div>
                <div className="text-[11px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>{s.time.split(' ')[0]}</div>
              </div>
              <div className="flex-1">
                <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>{s.day} · {s.time}</div>
                <div className="text-[12px] mt-0.5" style={{ fontFamily:'Albert Sans', opacity: chosen===i ? .8 : .65 }}>{s.place}</div>
              </div>
              {chosen===i && <Check size={18} style={{ color: C.saffron }}/>}
            </button>
          ))}
        </div>
        <button onClick={()=>onContinue(slots[chosen])} className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2"
          style={{ height: 52, background: C.terracotta, color:'#fff', fontFamily:'Albert Sans', fontWeight:600, fontSize: 15 }}>
          {hasAccount ? 'Send invite' : 'Continue'}
          <ArrowRight size={16}/>
        </button>
        <div className="mt-2.5 text-center text-[11.5px] flex items-center justify-center gap-1" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
          {!hasAccount && <ShieldCheck size={11}/>}
          {hasAccount ? 'Adds to your calendar when she accepts.' : 'Quick verify next — keeps Go Mama trustworthy.'}
        </div>
      </div>
    </Sheet>
  );
};
