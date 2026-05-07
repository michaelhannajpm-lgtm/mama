import { Heart, Users, ArrowRight } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { StepHeader } from '../../components/StepHeader';
import { PrimaryBtn } from '../../components/PrimaryBtn';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS } from '../../data/events';

export const Summary = ({ onNext, onBack, profile, prefs, location, distance }) => {
  // Avoid lint warnings for unused props that are part of the documented API
  void profile; void distance;

  const slots = (prefs && prefs.slots) || [];

  const matchingMomCount = (() => {
    if (!slots.length) return SAMPLE_MOMS.length;
    return SAMPLE_MOMS.filter(m =>
      m.freeSlots && m.freeSlots.some(s => slots.includes(s))
    ).length;
  })();

  const selectedDays = [...new Set(slots.map(s => s.split('-')[0]))];

  const eventCount = selectedDays.length === 0
    ? SUGGESTED_EVENTS.length
    : SUGGESTED_EVENTS.filter(e => selectedDays.includes(e.day)).length;

  // Pick first 3 matching moms for the preview row (or first 3 if no slots set)
  const previewMoms = (() => {
    if (!slots.length) return SAMPLE_MOMS.slice(0, 3);
    const filtered = SAMPLE_MOMS.filter(m =>
      m.freeSlots && m.freeSlots.some(s => slots.includes(s))
    );
    return filtered.slice(0, 3);
  })();

  const previewEvents = (() => {
    if (!selectedDays.length) return SUGGESTED_EVENTS.slice(0, 2);
    return SUGGESTED_EVENTS.filter(e => selectedDays.includes(e.day)).slice(0, 2);
  })();

  const showEmpty = matchingMomCount === 0 && eventCount === 0;

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={5} total={7} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth: 'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            ✨ Step 6 · Your week awaits
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            We found your <span style={{ fontStyle:'italic', color: C.terracotta }}>people</span>.
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            Based on your week, here's what's waiting for you in {location || 'your area'}.
          </p>
        </div>

        {/* Two counter tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Terracotta tile — moms */}
          <div className="relative rounded-2xl overflow-hidden p-4" style={{
            background: C.paper,
            border: `1px solid ${C.terracotta}55`,
          }}>
            <div className="absolute pointer-events-none" style={{
              top: -30, right: -30, width: 80, height: 80, borderRadius: '50%',
              background: `radial-gradient(circle, ${C.terracotta}1F 0%, transparent 70%)`,
            }}/>
            <div className="relative">
              <Heart size={20} style={{ color: C.terracotta }} fill={C.terracotta}/>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span style={{ fontFamily:'Fraunces', fontWeight:500, fontSize: 44, color: C.ink, letterSpacing:'-.03em', lineHeight:1 }}>
                  {matchingMomCount}
                </span>
                <span style={{ fontFamily:'Fraunces', fontStyle:'italic', fontWeight:400, fontSize: 16, color: C.terracotta }}>
                  moms
                </span>
              </div>
              <div className="text-[11px] mt-1" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:500 }}>
                match your week
              </div>
            </div>
          </div>

          {/* Sage tile — events */}
          <div className="relative rounded-2xl overflow-hidden p-4" style={{
            background: C.paper,
            border: `1px solid ${C.sage}55`,
          }}>
            <div className="absolute pointer-events-none" style={{
              top: -30, right: -30, width: 80, height: 80, borderRadius: '50%',
              background: `radial-gradient(circle, ${C.sage}1F 0%, transparent 70%)`,
            }}/>
            <div className="relative">
              <Users size={20} style={{ color: C.sage }}/>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span style={{ fontFamily:'Fraunces', fontWeight:500, fontSize: 44, color: C.ink, letterSpacing:'-.03em', lineHeight:1 }}>
                  {eventCount}
                </span>
                <span style={{ fontFamily:'Fraunces', fontStyle:'italic', fontWeight:400, fontSize: 16, color: C.sageDark }}>
                  events
                </span>
              </div>
              <div className="text-[11px] mt-1" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:500 }}>
                in your area
              </div>
            </div>
          </div>
        </div>

        {/* Mom preview row */}
        {matchingMomCount > 0 && previewMoms.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] tracking-[.2em] uppercase mb-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
              A taste of your matches
            </div>
            <div className="flex gap-2">
              {previewMoms.map(m => {
                const firstName = m.name.split(' ')[0];
                const initials = m.name.split(' ').map(s => s[0]).join('');
                const firstKidAge = (m.kids || '').split('·')[0].trim();
                return (
                  <div key={m.id} className="flex-1 rounded-xl px-2.5 py-2.5 flex items-center gap-2"
                    style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
                    <div className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 36, height: 36, background: m.hue,
                        color: '#fff', fontFamily:'Fraunces', fontWeight:500, fontSize: 14,
                      }}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div style={{ fontFamily:'Fraunces', fontSize: 13, color: C.ink, lineHeight:1.1 }}>
                        {firstName}
                      </div>
                      <div className="text-[10px] mt-0.5 truncate" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                        {firstKidAge}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event preview row */}
        {eventCount > 0 && previewEvents.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] tracking-[.2em] uppercase mb-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
              Group meetups this week
            </div>
            <div className="space-y-1.5">
              {previewEvents.map(e => (
                <div key={e.id} className="rounded-xl px-2.5 py-2.5 flex items-center gap-3"
                  style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
                  <div className="rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ width: 40, height: 40, background: e.hue }}>
                    <Users size={18} color="#fff"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontFamily:'Fraunces', fontSize: 14, color: C.ink, lineHeight:1.15 }}>
                      {e.name}
                    </div>
                    <div className="text-[11px] mt-0.5 truncate" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                      {e.day} · {e.time} · {e.place}
                    </div>
                  </div>
                  <div className="text-[10px] tracking-[.16em] uppercase flex-shrink-0" style={{
                    fontFamily:'Albert Sans', fontWeight: 700, color: C.sage,
                  }}>
                    {e.going} going
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty fallback */}
        {showEmpty && (
          <div className="mt-6 rounded-xl p-4 text-center" style={{ background: C.creamSoft, border: `1px dashed ${C.divider}` }}>
            <div style={{ fontFamily:'Fraunces', fontStyle:'italic', fontSize: 14, color: C.inkSoft, lineHeight:1.4 }}>
              Widen your availability or location to see more moms.
            </div>
          </div>
        )}

        <div className="h-4"/>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={onNext} variant="terracotta">
          Create account & meet them <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
