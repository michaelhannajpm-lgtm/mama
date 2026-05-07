import {
  Users, Calendar as CalendarIcon, MapPin, Lock, Check, Plus, Crown, ChevronRight,
} from 'lucide-react';
import { C } from '../../theme';
import { MONTH_NAMES, DAYS_SHORT_BY_DOW } from '../../data/taxonomy';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS } from '../../data/events';

// ====================================================================
// EVENTS TAB — group events scheduled this month
// ====================================================================
export const EventsTab = ({ joinedEvents, setJoinedEvents, account, requestAccount, openPremium, flash }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // For each suggested event, compute all dates this month matching its weekday
  // (treating events as recurring weekly), then take just the next upcoming one.
  const dowToIdx = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 };
  const occurrencesThisMonth = (dow) => {
    const targetIdx = dowToIdx[dow];
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === targetIdx) result.push(d);
    }
    return result;
  };

  // Build events list — one card per (event, next upcoming date) pair
  const eventsThisMonth = SUGGESTED_EVENTS
    .map(e => {
      const dates = occurrencesThisMonth(e.day);
      const upcoming = dates.filter(d => d >= today.getDate());
      const nextDate = upcoming[0] || dates[dates.length - 1]; // fall back to last if none upcoming
      const moreCount = upcoming.length > 1 ? upcoming.length - 1 : 0;
      return { ...e, _date: nextDate, _moreCount: moreCount, _isPast: !upcoming.length };
    })
    .filter(e => e._date)
    .sort((a, b) => {
      // Upcoming first, then past (shouldn't happen mid-month), sorted by date
      if (a._isPast !== b._isPast) return a._isPast ? 1 : -1;
      return a._date - b._date;
    });

  const handleJoin = (e) => {
    if ((joinedEvents || []).includes(e.id)) return;
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name}`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 26, color: C.ink, letterSpacing:'-.02em' }}>
          Events this <span style={{ fontStyle:'italic', color: C.terracotta }}>month</span>.
        </h1>
        <div className="mt-1 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          {eventsThisMonth.length} group meetups · tap to RSVP.
        </div>
      </div>

      <div className="space-y-2.5">
        {eventsThisMonth.map(e => {
          const joined = (joinedEvents || []).includes(e.id);
          return (
            <div key={e.id} className="rounded-2xl overflow-hidden" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
              {/* Hero band */}
              <div style={{ height: 78, background: e.hue, position:'relative' }}>
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                  <div className="text-[10px] px-2 py-1 rounded-full" style={{ background:'rgba(255,255,255,.92)', color: C.ink, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.04em' }}>
                    {DAYS_SHORT_BY_DOW[e.day]} · {MONTH_NAMES[month].slice(0,3)} {e._date}
                  </div>
                  {e._moreCount > 0 && (
                    <div className="text-[10px] px-2 py-1 rounded-full" style={{ background:'rgba(0,0,0,.32)', color:'#fff', fontFamily:'Albert Sans', fontWeight:500 }}>
                      +{e._moreCount} more
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2.5 right-3 text-[10.5px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background:'rgba(0,0,0,.32)', color:'#fff', fontFamily:'Albert Sans', fontWeight:500 }}>
                  <Users size={10}/> {e.going} going
                </div>
              </div>
              {/* Body */}
              <div className="p-3.5">
                <div style={{ fontFamily:'Fraunces', fontSize: 16, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{e.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                  <CalendarIcon size={11}/> {e.time}
                  <span style={{ color: C.divider }}>·</span>
                  <MapPin size={11}/> <span className="truncate">{e.place}</span>
                </div>

                {/* Tags */}
                {e.tags && e.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.tags.slice(0,3).map((t, i) => (
                      <div key={i} className="text-[9.5px] px-1.5 py-0.5 rounded" style={{
                        background: `${C.saffron}25`, color: C.ink, fontFamily:'Albert Sans', fontWeight:600,
                      }}>{t}</div>
                    ))}
                  </div>
                )}

                {/* Attendee preview — partial free, full Plus */}
                {(() => {
                  const isPlus = !!account?.isPremium;
                  // Generate stable attendee subset from SAMPLE_MOMS based on event id hash
                  const seed = (e.id.charCodeAt(2) + e.id.charCodeAt(3)) % SAMPLE_MOMS.length;
                  const ordered = [...SAMPLE_MOMS.slice(seed), ...SAMPLE_MOMS.slice(0, seed)];
                  const visible = isPlus ? ordered : ordered.slice(0, 3);
                  const hidden = Math.max(0, e.going - visible.length);
                  return (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {visible.map((m, i) => (
                          <div key={m.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px]" style={{
                            background: m.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500,
                            border: `2px solid ${C.paper}`, zIndex: 10 - i,
                          }}>
                            {m.name.split(' ').map(s=>s[0]).join('')}
                          </div>
                        ))}
                        {hidden > 0 && !isPlus && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9.5px]" style={{
                            background: C.creamSoft, color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:700,
                            border: `2px solid ${C.paper}`, filter: 'blur(.5px)',
                          }}>
                            +{hidden}
                          </div>
                        )}
                      </div>
                      {isPlus ? (
                        <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.sageDark, fontWeight:600 }}>
                          All {e.going} visible
                        </div>
                      ) : (
                        <button onClick={(ev)=>{ ev.stopPropagation(); openPremium && openPremium(); }}
                          className="text-[10.5px] flex items-center gap-1" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
                          <Lock size={9}/> See all {e.going}
                        </button>
                      )}
                    </div>
                  );
                })()}

                <button onClick={()=>handleJoin(e)}
                  className="mt-3 w-full rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    height: 38,
                    background: joined ? C.sageDark : C.ink,
                    color: joined ? '#fff' : C.cream,
                    fontFamily:'Albert Sans', fontWeight:600, fontSize: 12.5,
                  }}>
                  {joined ? <><Check size={12}/> Going</> : <><Plus size={12}/> I'm in</>}
                </button>
              </div>
            </div>
          );
        })}

        {!account?.isPremium && (
          <button onClick={openPremium} className="w-full rounded-[18px] p-4 flex items-center gap-3 mt-1" style={{
            background: C.creamSoft, border:`1px dashed ${C.divider}`, color: C.ink, textAlign:'left',
          }}>
            <Crown size={17} style={{ color: C.saffron }}/>
            <div className="flex-1">
              <div className="text-[12.5px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>See who else is going</div>
              <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>Full attendee profiles · Mama Plus</div>
            </div>
            <ChevronRight size={15}/>
          </button>
        )}
      </div>
    </div>
  );
};
