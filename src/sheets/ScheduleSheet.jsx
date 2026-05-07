import { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

export const ScheduleSheet = ({ mom, onClose, onContinue, hasAccount }) => {
  const [chosen, setChosen] = useState(0);
  const slots = [
    { day:'Tue', time:'9:30 AM', place: mom.nextPlace },
    { day:'Thu', time:'10:00 AM', place: 'Sightglass · 7th St' },
    { day:'Sat', time:'9:00 AM',  place: 'Dolores Park · north end' },
  ];
  return (
    <Sheet onClose={onClose}>
      <div className="px-6 pt-2 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
          Schedule with {mom.name.split(' ')[0]}
        </div>
        <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 24, fontWeight:500, color: C.ink, letterSpacing:'-.02em' }}>
          You're <span style={{ fontStyle:'italic', color: C.terracotta }}>both</span> free…
        </h3>
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
          {hasAccount ? 'Adds to your calendar when she accepts.' : 'Quick verify next — keeps Mama trustworthy.'}
        </div>
      </div>
    </Sheet>
  );
};
