import { useState } from 'react';
import {
  ArrowRight, Calendar as CalendarIcon, Sparkles, Check, X, Heart,
  User, ShieldCheck, Briefcase, Sun,
} from 'lucide-react';
import { C } from '../theme';
import { MOM_TYPES, TIME_WINDOWS } from '../data/taxonomy';
import { PLACES_NO_PREF, findPlace } from '../data/places';
import { SAMPLE_MOMS } from '../data/moms';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const Screen7 = ({ onNext, onBack, profile, prefs, location, openProfile, scheduled1to1, setScheduled1to1, account, requestAccount, flash }) => {
  const [pickingFor, setPickingFor] = useState(null);

  // Match 1:1 moms by overlap with user's slots
  const matchedMoms = [...SAMPLE_MOMS]
    .map(m => {
      const overlapSlots = m.freeSlots ? m.freeSlots.filter(s => prefs.slots.includes(s)) : [];
      // Compute commonality stats
      const commonValues = (m.values || []).filter(v => (profile.values || []).includes(v));
      const commonInterests = (m.interests || []).filter(i => (profile.interests || []).includes(i));
      const userKidAges = Object.keys(profile.kidsAges || {});
      const momKidAges = (m.kids || '').split('·').flatMap(k => {
        // Try to map "2y" or "2y · 4y" to age buckets
        const num = parseInt(k.trim().replace('y', ''), 10);
        if (isNaN(num)) return [];
        if (num <= 1) return ['0–1'];
        if (num <= 3) return ['1–3'];
        if (num <= 5) return ['3–5'];
        if (num <= 8) return ['5–8'];
        if (num <= 12) return ['8–12'];
        return ['12–18'];
      });
      const commonKidAges = userKidAges.filter(a => momKidAges.includes(a));
      // Type alignment — does mom.type label match any of user's selected MOM_TYPES?
      const userTypeLabels = (profile.momTypes || [])
        .map(id => MOM_TYPES.find(mt => mt.id === id)?.label)
        .filter(Boolean);
      const sameType = userTypeLabels.includes(m.type);
      return { ...m, _overlapSlots: overlapSlots, _commonValues: commonValues, _commonInterests: commonInterests, _commonKidAges: commonKidAges, _sameType: sameType };
    })
    .filter(m => m._overlapSlots.length > 0 || prefs.slots.length === 0)
    .sort((a, b) => b.overlap - a.overlap);

  const userPlaceName = (() => {
    const picks = prefs.places.filter(x => x !== PLACES_NO_PREF);
    if (!picks.length) return null;
    const place = findPlace(picks[0]);
    return place ? place.name : null;
  })();

  // committedSlots from scheduled1to1
  const committedSlots = new Set();
  Object.values(scheduled1to1).forEach(s => committedSlots.add(`${s.day}|${s.time}`));
  const isCommittedSlot = (day, time) => committedSlots.has(`${day}|${time}`);
  const slotConflicts = (slotStr) => {
    const [day, ...winParts] = slotStr.split('-');
    const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
    if (!win) return false;
    return isCommittedSlot(day, win.label);
  };

  const autoSchedule = (mom) => {
    const slot = mom._overlapSlots.find(s => !slotConflicts(s));
    if (!slot) {
      flash && flash(`✗ All ${mom.name.split(' ')[0]}'s times taken — pick manually`);
      return;
    }
    if (!account && requestAccount) {
      requestAccount({ type: '1to1', mom, slot });
      return;
    }
    commitSlot(mom, slot);
  };

  const commitSlot = (mom, slotStr) => {
    if (!account && requestAccount) {
      requestAccount({ type: '1to1', mom, slot: slotStr });
      setPickingFor(null);
      return;
    }
    const [day, ...winParts] = slotStr.split('-');
    const win = TIME_WINDOWS.find(w => w.id === winParts.join('-')) || TIME_WINDOWS[1];
    const placeName = userPlaceName || mom.nextPlace;
    setScheduled1to1(s => ({ ...s, [mom.id]: { day, time: win.label, place: placeName } }));
    setPickingFor(null);
    flash && flash(`✦ Scheduled with ${mom.name.split(' ')[0]} · ${day} ${win.label}`);
  };

  // Render a small stat row inside the mom card
  const StatRow = ({ icon: Icon, label, items, accent, sched }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="flex items-start gap-1.5 text-[10px]" style={{ fontFamily:'Albert Sans' }}>
        <Icon size={10} style={{ color: sched ? '#fff' : accent, flexShrink: 0, marginTop: 1.5, opacity: sched ? .9 : 1 }}/>
        <div className="flex-1 min-w-0">
          <span style={{ fontWeight: 700, color: sched ? '#fff' : accent, opacity: sched ? .9 : 1, letterSpacing:'.04em', textTransform:'uppercase', fontSize: 8.5 }}>{label}</span>
          <span className="ml-1.5" style={{ color: sched ? '#fff' : C.ink, opacity: sched ? .92 : .85, fontWeight: 500 }}>
            {items.join(' · ')}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={6} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3 flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            <Heart size={11} fill={C.terracotta}/>
            Step 6 · Match with moms
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Moms who match <span style={{ fontStyle:'italic', color: C.terracotta }}>your week.</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Auto-schedule the best time, pick one yourself, or read her profile first.
          </p>
        </div>

        {Object.keys(scheduled1to1).length > 0 && (
          <div className="mt-3 text-[10.5px] flex items-center gap-1.5" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
            <Check size={11}/> {Object.keys(scheduled1to1).length} scheduled · we'll never double-book
          </div>
        )}

        <div className="mt-4 space-y-2 pb-3">
          {matchedMoms.map(m => {
            const sched = scheduled1to1[m.id];
            const isPicking = pickingFor === m.id;
            return (
              <div key={m.id} className="rounded-2xl overflow-hidden" style={{
                background: sched ? C.terracotta : C.paper,
                color: sched ? '#fff' : C.ink,
                border: `1px solid ${sched ? C.terracotta : C.divider}`,
              }}>
                {/* Top: identity + match % (BIG) */}
                <div className="px-3.5 pt-3 pb-2 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] flex-shrink-0"
                    style={{ background: m.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500, marginTop: 2 }}>
                    {m.name.split(' ').map(s=>s[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <div className="text-[15px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
                        {m.name}
                      </div>
                      {m.verified && <ShieldCheck size={12} style={{ color: sched ? '#fff' : C.sageDark, flexShrink: 0, opacity: sched ? .9 : 1 }}/>}
                    </div>
                    <div className="text-[10.5px] mt-0.5 truncate" style={{ fontFamily:'Albert Sans', opacity: sched ? .9 : .65 }}>
                      {m.type} · Kids {m.kids} · {m.distance}
                    </div>
                  </div>
                  {/* BIG match percentage */}
                  <div className="text-right flex-shrink-0 pt-0.5">
                    <div style={{ fontFamily:'Fraunces', fontSize: 26, fontWeight:500, color: sched ? '#fff' : C.terracotta, lineHeight:1, letterSpacing:'-.02em' }}>
                      {m.overlap}<span className="text-[12px]" style={{ opacity:.65 }}>%</span>
                    </div>
                    <div className="text-[8.5px] tracking-[.14em] uppercase mt-0.5" style={{
                      fontFamily:'Albert Sans', fontWeight: 700,
                      color: sched ? '#fff' : C.inkMuted, opacity: sched ? .85 : 1,
                    }}>match</div>
                  </div>
                </div>

                {/* Stats panel — common values, interests, kid ages, type */}
                <div className="mx-3 mb-2.5 rounded-lg px-2.5 py-2 space-y-1" style={{
                  background: sched ? 'rgba(255,255,255,.12)' : C.creamSoft,
                  border: `1px solid ${sched ? 'rgba(255,255,255,.2)' : C.divider}`,
                }}>
                  {m._sameType && (
                    <StatRow icon={Briefcase} label="TYPE" items={[`Both ${m.type.toLowerCase()}`]} accent={C.terracotta} sched={sched}/>
                  )}
                  {m._commonKidAges.length > 0 && (
                    <StatRow icon={Sun} label="KIDS" items={[`Both have ${m._commonKidAges.join(', ')} year olds`]} accent={C.saffron} sched={sched}/>
                  )}
                  {m._commonValues.length > 0 ? (
                    <StatRow icon={Heart} label="VALUES" items={m._commonValues} accent={C.terracotta} sched={sched}/>
                  ) : (
                    <StatRow icon={Heart} label="HER VALUES" items={(m.values || []).slice(0, 3)} accent={C.inkMuted} sched={sched}/>
                  )}
                  {m._commonInterests.length > 0 ? (
                    <StatRow icon={Sparkles} label="INTERESTS" items={m._commonInterests} accent={C.sageDark} sched={sched}/>
                  ) : (
                    <StatRow icon={Sparkles} label="HER INTERESTS" items={(m.interests || []).slice(0, 3)} accent={C.inkMuted} sched={sched}/>
                  )}
                  {m._overlapSlots.length > 0 && (
                    <StatRow icon={CalendarIcon} label="FREE" items={[[...new Set(m._overlapSlots.map(s => s.split('-')[0]))].join(', ')]} accent={C.sageDark} sched={sched}/>
                  )}
                </div>

                {/* Action area — scheduled summary | inline picker | three buttons */}
                {sched ? (
                  <div className="px-3 pb-3 pt-1">
                    <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{
                      background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)',
                    }}>
                      <Check size={13} style={{ color: C.saffron }}/>
                      <div className="flex-1 text-[11px]" style={{ fontFamily:'Albert Sans', color:'#fff', fontWeight:600 }}>
                        {sched.day} · {sched.time} · {sched.place}
                      </div>
                    </div>
                  </div>
                ) : isPicking ? (
                  <div className="px-3 pb-3 pt-1">
                    <div className="text-[9.5px] tracking-[.16em] uppercase mb-1.5" style={{
                      color: C.inkMuted, fontFamily:'Albert Sans', fontWeight: 700,
                    }}>
                      Pick a time you both have free
                    </div>
                    {m._overlapSlots.length === 0 ? (
                      <div className="text-[11px] py-2 text-center" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
                        No overlap yet — try widening your availability
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {m._overlapSlots.map(slotStr => {
                          const [day, ...winParts] = slotStr.split('-');
                          const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
                          if (!win) return null;
                          const conflict = isCommittedSlot(day, win.label);
                          return (
                            <button key={slotStr}
                              onClick={()=>!conflict && commitSlot(m, slotStr)}
                              disabled={conflict}
                              className="w-full rounded-lg px-3 py-2 flex items-center gap-2 transition-all active:scale-[.99]"
                              style={{
                                background: conflict ? C.creamSoft : C.paper,
                                border: `1px solid ${conflict ? C.divider : `${C.terracotta}55`}`,
                                opacity: conflict ? .55 : 1,
                              }}>
                              <CalendarIcon size={11} style={{ color: conflict ? C.inkMuted : C.terracotta, flexShrink: 0 }}/>
                              <div className="flex-1 text-left">
                                <span className="text-[11.5px]" style={{ fontFamily:'Albert Sans', fontWeight:600, color: conflict ? C.inkMuted : C.ink }}>{day}</span>
                                <span className="text-[11.5px] ml-1.5" style={{ fontFamily:'Albert Sans', color: conflict ? C.inkMuted : C.inkSoft }}>· {win.label}</span>
                              </div>
                              {conflict
                                ? <span className="text-[9px] flex items-center gap-0.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:600 }}><X size={9}/> taken</span>
                                : <ArrowRight size={11} style={{ color: C.terracotta }}/>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={()=>setPickingFor(null)}
                      className="w-full text-[11px] py-1.5 mt-1.5"
                      style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight: 500 }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="px-3 pb-3 pt-1 grid grid-cols-3 gap-1.5">
                    <button onClick={()=>autoSchedule(m)}
                      className="rounded-lg flex items-center justify-center gap-1 transition-all active:scale-[.98]"
                      style={{
                        height: 36,
                        background: C.terracotta, color: '#fff',
                        fontFamily:'Albert Sans', fontSize: 11, fontWeight: 600,
                        letterSpacing:'.02em',
                      }}>
                      <Sparkles size={11}/> Auto
                    </button>
                    <button onClick={()=>setPickingFor(m.id)}
                      className="rounded-lg flex items-center justify-center gap-1 transition-all active:scale-[.98]"
                      style={{
                        height: 36,
                        background: C.paper, color: C.terracotta,
                        border: `1px solid ${C.terracotta}55`,
                        fontFamily:'Albert Sans', fontSize: 11, fontWeight: 600,
                      }}>
                      <CalendarIcon size={11}/> Pick time
                    </button>
                    <button onClick={()=>openProfile && openProfile(m)}
                      className="rounded-lg flex items-center justify-center gap-1 transition-all active:scale-[.98]"
                      style={{
                        height: 36,
                        background: C.paper, color: C.ink,
                        border: `1px solid ${C.divider}`,
                        fontFamily:'Albert Sans', fontSize: 11, fontWeight: 600,
                      }}>
                      <User size={11}/> Profile
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {matchedMoms.length === 0 && (
            <div className="rounded-xl p-4 text-center" style={{ background: C.creamSoft, border:`1px dashed ${C.divider}` }}>
              <div className="text-[12px]" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
                No matches at your selected times — widen availability to see more.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={onNext} variant="terracotta">
          Continue <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
