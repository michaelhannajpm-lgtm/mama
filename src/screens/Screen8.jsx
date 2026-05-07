import {
  ArrowRight, MapPin, Calendar as CalendarIcon, Check, X, Plus,
  Star, Users,
} from 'lucide-react';
import { C } from '../theme';
import { WINDOW_TO_BUCKET } from '../data/taxonomy';
import { SUGGESTED_EVENTS } from '../data/events';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const Screen8 = ({ onNext, onBack, prefs, scheduled1to1, joinedEvents, setJoinedEvents, account, requestAccount, flash }) => {
  const selectedDays = [...new Set(prefs.slots.map(s => s.split('-')[0]))];
  const matchedEvents = (() => {
    if (!selectedDays.length) return SUGGESTED_EVENTS.slice(0, 5);
    const userBucketsByDay = {};
    prefs.slots.forEach(s => {
      const [day, ...winParts] = s.split('-');
      const winId = winParts.join('-');
      const bucket = WINDOW_TO_BUCKET[winId];
      if (bucket) (userBucketsByDay[day] = userBucketsByDay[day] || new Set()).add(bucket);
    });
    return SUGGESTED_EVENTS
      .filter(e => selectedDays.includes(e.day))
      .map(e => {
        const buckets = userBucketsByDay[e.day];
        const matches = buckets && buckets.has(e.bucket);
        return { ...e, _matches: !!matches };
      })
      .sort((a, b) => Number(b._matches) - Number(a._matches))
      .slice(0, 5);
  })();

  // Build conflict set from 1:1s + already-joined groups
  const committedSlots = new Set();
  Object.values(scheduled1to1).forEach(s => committedSlots.add(`${s.day}|${s.time}`));
  joinedEvents.forEach(eid => {
    const e = matchedEvents.find(x => x.id === eid);
    if (e) committedSlots.add(`${e.day}|${e.time}`);
  });
  const isCommittedSlot = (day, time) => committedSlots.has(`${day}|${time}`);

  const joinGroup = (e) => {
    if (isCommittedSlot(e.day, e.time)) {
      flash && flash(`✗ Conflicts with another meetup at ${e.day} ${e.time}`);
      return;
    }
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name} · ${e.day} ${e.time}`);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={7} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3 flex items-center gap-1.5" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:600 }}>
            <Users size={11}/>
            Step 7 · Join groups (optional)
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Show up to a <span style={{ fontStyle:'italic', color: C.sageDark }}>group walk?</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Lower pressure than 1:1 — just show up. Skip if you'd rather start with one-on-ones.
          </p>
        </div>

        <div className="mt-5 space-y-1.5">
          {matchedEvents.map(e => {
            const joined = joinedEvents.includes(e.id);
            const conflict = !joined && isCommittedSlot(e.day, e.time);
            const meta = e._matches
              ? { icon: Star,         color: '#A0791E', fill: true,  label: 'Match for you' }
              : { icon: CalendarIcon, color: C.sageDark, fill: false, label: e.recurring || 'Group meetup' };
            const Icon = meta.icon;
            return (
              <div key={e.id} className="rounded-xl overflow-hidden" style={{
                background: joined ? C.sageDark : C.paper,
                color: joined ? '#fff' : C.ink,
                border: `1px solid ${joined ? C.sageDark : conflict ? `${C.terracotta}55` : C.divider}`,
                opacity: conflict ? .75 : 1,
              }}>
                <div className="px-3.5 pt-2.5 pb-2 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md mb-1.5" style={{
                      background: joined ? 'rgba(255,255,255,.18)' : `${meta.color}10`,
                      border: `1px solid ${joined ? 'rgba(255,255,255,.32)' : `${meta.color}33`}`,
                    }}>
                      <Icon size={9.5} strokeWidth={2}
                        style={{ color: joined ? '#fff' : meta.color, flexShrink: 0 }}
                        fill={meta.fill ? (joined ? '#fff' : meta.color) : 'none'}/>
                      <span className="text-[9px] tracking-[.14em] uppercase" style={{
                        fontFamily:'Albert Sans', fontWeight: 700,
                        color: joined ? '#fff' : meta.color,
                      }}>{meta.label}</span>
                    </div>
                    <div className="text-[13.5px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
                      {e.name}
                    </div>
                    <div className="text-[10.5px] mt-0.5 flex items-center gap-1 truncate" style={{ fontFamily:'Albert Sans', opacity: joined ? .92 : .65 }}>
                      <MapPin size={9} className="flex-shrink-0"/>
                      <span className="truncate">{e.place}</span>
                    </div>
                    <div className="text-[10.5px] mt-1 flex items-center gap-1" style={{ fontFamily:'Albert Sans' }}>
                      <Users size={10} style={{ color: joined ? '#fff' : C.terracotta }}/>
                      <span style={{ color: joined ? '#fff' : C.terracotta, fontWeight: 700 }}>{e.going}</span>
                      <span style={{ opacity: joined ? .8 : .55 }}>going</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pt-0.5">
                    <div className="text-[8.5px] tracking-[.14em]" style={{
                      fontFamily:'Albert Sans', fontWeight: 700,
                      color: joined ? '#fff' : C.inkMuted, opacity: joined ? .85 : 1,
                    }}>{e.day.toUpperCase()}</div>
                    <div style={{
                      fontFamily:'Fraunces', fontSize: 14, fontWeight:500,
                      color: joined ? '#fff' : C.terracotta, lineHeight:1,
                    }}>{e.time.split(' ')[0]}</div>
                  </div>
                </div>
                <div className="px-3 pb-2.5 pt-1">
                  <button onClick={()=>!joined && !conflict && joinGroup(e)}
                    disabled={joined || conflict}
                    className="w-full rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[.98]"
                    style={{
                      height: 34,
                      background: joined ? 'rgba(255,255,255,.15)' : conflict ? C.creamSoft : C.sageDark,
                      color: joined ? '#fff' : conflict ? C.inkMuted : '#fff',
                      fontFamily:'Albert Sans', fontSize: 12, fontWeight: 600,
                      letterSpacing:'.02em',
                      border: joined ? '1px solid rgba(255,255,255,.25)' : conflict ? `1px solid ${C.divider}` : 'none',
                    }}>
                    {joined ? <><Check size={13}/> RSVP'd</>
                      : conflict ? <><X size={12}/> Time taken</>
                      : <><Plus size={12}/> Join group</>}
                  </button>
                </div>
              </div>
            );
          })}
          {matchedEvents.length === 0 && (
            <div className="rounded-xl p-4 text-center" style={{ background: C.creamSoft, border:`1px dashed ${C.divider}` }}>
              <div className="text-[12px]" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
                No groups at your selected times — that's okay, you can join later from the app.
              </div>
            </div>
          )}
        </div>
        <div className="h-4"/>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={onNext} variant="terracotta">
          Open the app <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
