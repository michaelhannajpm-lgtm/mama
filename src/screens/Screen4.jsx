import {
  ArrowRight, Sparkles, Lock, Plus, Minus,
} from 'lucide-react';
import { C } from '../theme';
import {
  MOM_TYPES, VALUES, VALUE_NO_PREF, INTERESTS, INTEREST_NO_PREF, KID_AGES,
} from '../data/taxonomy';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';
import { Pill } from '../components/Pill';

export const Screen4 = ({ onNext, onBack, profile, setProfile }) => {
  const incrementKid = (age) => {
    setProfile(p => {
      const cur = p.kidsAges[age] || 0;
      if (cur >= 5) return p; // realistic cap
      return { ...p, kidsAges: { ...p.kidsAges, [age]: cur + 1 } };
    });
  };
  // Tap badge = remove one kid (decrement by 1, allowing fine-grained deselection)
  const decrementKid = (age) => {
    setProfile(p => {
      const next = { ...p.kidsAges };
      const c = (next[age] || 0) - 1;
      if (c <= 0) delete next[age]; else next[age] = c;
      return { ...p, kidsAges: next };
    });
  };

  const toggleMomType = (id) => {
    setProfile(p => ({
      ...p,
      momTypes: p.momTypes.includes(id) ? p.momTypes.filter(x=>x!==id) : [...p.momTypes, id]
    }));
  };

  const toggleValue = (v) => {
    setProfile(p => {
      const has = p.values.includes(v);
      if (has) return { ...p, values: p.values.filter(x => x !== v) };
      if (v === VALUE_NO_PREF) return { ...p, values: [VALUE_NO_PREF] };
      const cleaned = p.values.filter(x => x !== VALUE_NO_PREF);
      if (cleaned.length >= 3) return p;
      return { ...p, values: [...cleaned, v] };
    });
  };

  const toggleInterest = (v) => {
    setProfile(p => {
      const has = p.interests.includes(v);
      if (has) return { ...p, interests: p.interests.filter(x => x !== v) };
      if (v === INTEREST_NO_PREF) return { ...p, interests: [INTEREST_NO_PREF] };
      const cleaned = p.interests.filter(x => x !== INTEREST_NO_PREF);
      return { ...p, interests: [...cleaned, v] };
    });
  };

  const totalKids = Object.values(profile.kidsAges || {}).reduce((a,b)=>a+b, 0);

  const missing = [];
  if (totalKids === 0)             missing.push('kids');
  if (!profile.momTypes.length)    missing.push('mom type');
  if (!profile.values.length)      missing.push('values');
  if (!profile.interests.length)   missing.push('interests');
  const canContinue = missing.length === 0;
  const missingText = missing.length === 1
    ? missing[0]
    : missing.length === 2
      ? missing.join(' & ')
      : missing.slice(0,-1).join(', ') + ' & ' + missing[missing.length-1];

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={3} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Quick start · no signup yet
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Tell us about <span style={{ fontStyle:'italic', color: C.terracotta }}>you</span>.
          </h2>
        </div>

        {/* Kids — explicit stepper UI: +/− buttons appear when an age is active */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
              YOUR KIDS <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· tap an age to add</span>
            </div>
            {totalKids > 0 && (
              <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
                {totalKids} {totalKids===1 ? 'kid' : 'kids'}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {KID_AGES.map(age => {
              const count = profile.kidsAges[age] || 0;
              const active = count > 0;

              if (!active) {
                // Inactive — whole chip is one big add button
                return (
                  <button key={age} onClick={()=>incrementKid(age)}
                    className="rounded-2xl flex flex-col items-center justify-center transition-all active:scale-[.96]"
                    style={{
                      background: C.paper, color: C.ink,
                      border: `1px solid ${C.divider}`,
                      minHeight: 64, padding: '8px 4px',
                    }}>
                    <div className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
                      {age}
                    </div>
                    <div className="mt-0.5 flex items-center gap-0.5 text-[9.5px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:500 }}>
                      <Plus size={8} strokeWidth={2.5}/>
                      add
                    </div>
                  </button>
                );
              }

              // Active — stepper with explicit +/− buttons
              return (
                <div key={age} className="rounded-2xl flex flex-col items-center justify-center"
                  style={{
                    background: C.terracotta, color: '#fff',
                    border: `1px solid ${C.terracotta}`,
                    minHeight: 64, padding: '6px 4px',
                  }}>
                  <div className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight:600, opacity:.95, letterSpacing:'-.01em' }}>
                    {age}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <button onClick={()=>decrementKid(age)}
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{ background:'rgba(255,255,255,.22)' }}
                      aria-label={`Remove one kid age ${age}`}>
                      <Minus size={13} color="#fff" strokeWidth={2.8}/>
                    </button>
                    <div key={`count-${age}-${count}`} className="min-w-[18px] text-center"
                      style={{
                        fontFamily:'Fraunces', fontSize: 17, fontWeight:500, lineHeight:1, color:'#fff',
                        animation: 'popBadge .28s cubic-bezier(.34,1.56,.64,1)',
                      }}>
                      {count}
                    </div>
                    <button onClick={()=>incrementKid(age)} disabled={count >= 5}
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{
                        background: count >= 5 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.22)',
                        opacity: count >= 5 ? .5 : 1,
                      }}
                      aria-label={`Add a kid age ${age}`}>
                      <Plus size={13} color="#fff" strokeWidth={2.8}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mom type — multi-select */}
        <div className="mt-6">
          <div className="text-[12.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            MOM TYPE <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· pick any that fit</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MOM_TYPES.map(m => {
              const active = profile.momTypes.includes(m.id);
              const isOptOut = m.id === 'prefer_not';
              return (
                <button key={m.id} onClick={()=>toggleMomType(m.id)}
                  className="rounded-2xl p-2.5 flex flex-col items-center gap-1 transition-all"
                  style={{
                    background: active ? (isOptOut ? C.inkSoft : C.ink) : C.paper,
                    color: active ? C.cream : C.ink,
                    border: `1px solid ${active ? (isOptOut ? C.inkSoft : C.ink) : C.divider}`,
                    minHeight: 64,
                  }}>
                  <m.icon size={16} style={{ color: active ? C.saffron : (isOptOut ? C.inkMuted : C.terracotta) }}/>
                  <span className="text-[11.5px] text-center leading-tight" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Values — pick up to 3 OR no preference */}
        <div className="mt-6">
          <div className="text-[12.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            VALUES <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· pick up to 3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {VALUES.map(v => (
              <Pill key={v} size="sm" active={profile.values.includes(v)} onClick={()=>toggleValue(v)}>{v}</Pill>
            ))}
            <Pill size="sm" active={profile.values.includes(VALUE_NO_PREF)} onClick={()=>toggleValue(VALUE_NO_PREF)}>
              ✦ {VALUE_NO_PREF}
            </Pill>
          </div>
        </div>

        {/* Interests */}
        <div className="mt-6 mb-4">
          <div className="text-[12.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            INTERESTS <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· anything that sounds nice</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {INTERESTS.map(i => {
              const active = profile.interests.includes(i.label);
              return (
                <button key={i.label} onClick={()=>toggleInterest(i.label)}
                  className="rounded-2xl px-3 py-2.5 flex items-center gap-2 transition-all"
                  style={{
                    background: active ? C.terracotta : C.paper,
                    color: active ? '#fff' : C.ink,
                    border: `1px solid ${active ? C.terracotta : C.divider}`,
                  }}>
                  <i.icon size={15}/>
                  <span className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{i.label}</span>
                </button>
              );
            })}
            <button onClick={()=>toggleInterest(INTEREST_NO_PREF)}
              className="col-span-2 rounded-2xl px-3 py-2.5 flex items-center justify-center gap-2 transition-all"
              style={{
                background: profile.interests.includes(INTEREST_NO_PREF) ? C.inkSoft : C.paper,
                color: profile.interests.includes(INTEREST_NO_PREF) ? '#fff' : C.inkSoft,
                border: `1px dashed ${profile.interests.includes(INTEREST_NO_PREF) ? C.inkSoft : C.divider}`,
              }}>
              <Sparkles size={14}/>
              <span className="text-[12.5px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{INTEREST_NO_PREF}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {canContinue ? (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
            <Lock size={11}/> No account needed yet — try Mama first.
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick {missingText} to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>Continue <ArrowRight size={18}/></PrimaryBtn>
      </div>
    </div>
  );
};
