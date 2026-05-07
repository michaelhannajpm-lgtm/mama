import { ArrowRight, Plus } from 'lucide-react';
import { C } from '../../theme';
import { DAYS, DAY_LABELS, TIME_WINDOWS } from '../../data/taxonomy';
import { matchingMoms } from '../../data/moms';
import { StatusBar } from '../../components/StatusBar';
import { StepHeader } from '../../components/StepHeader';
import { PrimaryBtn } from '../../components/PrimaryBtn';

export const ScheduleStep = ({ onNext, onBack, prefs, setPrefs }) => {
  const dayHasSlots = (day) => prefs.slots.some(s => s.startsWith(`${day}-`));
  const selectedDays = DAYS.filter(d => dayHasSlots(d));

  const toggleDay = (day) => {
    if (dayHasSlots(day)) {
      setPrefs(p => ({ ...p, slots: p.slots.filter(s => !s.startsWith(`${day}-`)) }));
    } else {
      setPrefs(p => ({ ...p, slots: [...p.slots, `${day}-morning`] }));
    }
  };

  const toggleSlot = (day, winId) => {
    const key = `${day}-${winId}`;
    setPrefs(p => ({
      ...p,
      slots: p.slots.includes(key) ? p.slots.filter(x=>x!==key) : [...p.slots, key]
    }));
  };

  const matched = matchingMoms(prefs.slots);
  const matchedFaces = matched.slice(0, 6);
  const totalSlots = prefs.slots.length;
  const canContinue = totalSlots > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={3} total={7} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Step 4 · When you're free
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            When can you <span style={{ fontStyle:'italic', color: C.terracotta }}>meet?</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Pick the days that usually work. Then pick time windows for each.
          </p>
        </div>

        <div className="mt-5">
          <div className="text-[11px] mb-2 tracking-[.04em]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600 }}>
            DAYS
          </div>
          <div className="flex gap-1.5">
            {DAYS.map(day => {
              const isSel = dayHasSlots(day);
              return (
                <button key={day} onClick={()=>toggleDay(day)}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    background: isSel ? C.terracotta : C.paper,
                    color: isSel ? '#fff' : C.ink,
                    border: `1px solid ${isSel ? C.terracotta : C.divider}`,
                    padding: '8px 0',
                    fontFamily: 'Albert Sans',
                    fontSize: 12, fontWeight: 500,
                  }}>
                  {day[0]}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDays.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-[11px] tracking-[.04em]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600 }}>
              TIME WINDOWS
            </div>
            {selectedDays.map(day => (
              <div key={day} className="rounded-xl px-3 py-2" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div style={{ fontFamily:'Fraunces', fontSize: 13.5, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>
                    {DAY_LABELS[day]}
                  </div>
                  <button onClick={()=>toggleDay(day)} className="text-[10px]" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
                    Remove
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {TIME_WINDOWS.map(win => {
                    const on = prefs.slots.includes(`${day}-${win.id}`);
                    return (
                      <button key={win.id} onClick={()=>toggleSlot(day, win.id)}
                        className="rounded-full px-3 py-1.5 transition-all flex items-center gap-1.5"
                        style={{
                          background: on ? C.terracotta : C.creamSoft,
                          color: on ? '#fff' : C.ink,
                          border: `1px solid ${on ? C.terracotta : C.divider}`,
                          fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 500,
                        }}>
                        <span aria-hidden style={{ fontSize: 13 }}>{win.emoji}</span>
                        {win.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl p-3.5 text-center" style={{ background: C.creamSoft, border: `1px dashed ${C.divider}` }}>
            <div className="text-[11.5px]" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
              Tap a day above to set your time windows.
            </div>
          </div>
        )}

        {totalSlots > 0 && matched.length > 0 && (
          <div className="mt-5 rounded-2xl p-3.5 relative overflow-hidden" style={{
            background: C.ink, color: C.cream, animation: 'fadeInUp .5s ease both',
          }}>
            <div className="text-[10px] tracking-[.18em] uppercase mb-2" style={{ fontFamily:'Albert Sans', fontWeight:700, opacity:.6 }}>
              ✦ Free at your times
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-shrink-0">
                {matchedFaces.map((m, i) => (
                  <div key={m.id} className="w-9 h-9 rounded-full flex items-center justify-center text-[10.5px]"
                    style={{
                      background: m.hue, color:'#fff',
                      fontFamily:'Fraunces', fontWeight:500,
                      marginLeft: i ? -10 : 0,
                      border: `2px solid ${C.ink}`,
                    }}>
                    {m.init}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <div style={{ fontFamily:'Fraunces', fontSize: 26, fontWeight:500, color: C.cream, lineHeight:1, letterSpacing:'-.02em' }}>
                    {matched.length}
                  </div>
                  <div className="text-[12px]" style={{ fontFamily:'Albert Sans', opacity:.85 }}>
                    moms free then
                  </div>
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ fontFamily:'Albert Sans', opacity:.55, lineHeight:1.3 }}>
                  Add more times to widen the pool
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {!canContinue && (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick at least one time to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>
          Continue <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
