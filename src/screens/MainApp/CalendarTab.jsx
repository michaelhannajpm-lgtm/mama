import { useState } from 'react';
import { Sparkles, Check, Heart, Users } from 'lucide-react';
import { C } from '../../theme';
import {
  DAYS, DAY_LABELS, TIME_WINDOWS, MONTH_NAMES,
} from '../../data/taxonomy';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS } from '../../data/events';

// ====================================================================
// CALENDAR TAB — month grid · scheduled meetups · edit availability
// ====================================================================
export const CalendarTab = ({ scheduled1to1, joinedEvents, prefs, setPrefs, openSchedule, goToMatches, flash }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Convert JS Sun-start (0..6) to Mon-start (0=Mon..6=Sun)
  const firstDowMonStart = (new Date(year, month, 1).getDay() + 6) % 7;

  const dowOf = (d) => DAYS[(new Date(year, month, d).getDay() + 6) % 7];
  const selectedDow = dowOf(selectedDate);

  // Build grid cells (with leading null padding)
  const cells = [];
  for (let i = 0; i < firstDowMonStart; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Per-day flags
  const has1to1OnDow = (dow) => Object.values(scheduled1to1 || {}).some(s => s.day === dow);
  const hasGroupOnDow = (dow) => (joinedEvents || []).some(eid => {
    const e = SUGGESTED_EVENTS.find(ev => ev.id === eid);
    return e && e.day === dow;
  });
  const hasAvailOnDow = (dow) => (prefs.slots || []).some(s => s.startsWith(`${dow}-`));

  // Selected day data
  const meetupsToday = Object.entries(scheduled1to1 || {})
    .filter(([_, s]) => s.day === selectedDow)
    .map(([momId, s]) => ({ mom: SAMPLE_MOMS.find(m => m.id === momId), ...s }));
  const groupsToday = (joinedEvents || [])
    .map(eid => SUGGESTED_EVENTS.find(e => e.id === eid))
    .filter(e => e && e.day === selectedDow);

  const isAvailable = (winId) => (prefs.slots || []).includes(`${selectedDow}-${winId}`);
  const toggleSlot = (winId) => {
    const slotKey = `${selectedDow}-${winId}`;
    setPrefs(p => ({
      ...p,
      slots: (p.slots || []).includes(slotKey)
        ? p.slots.filter(s => s !== slotKey)
        : [...(p.slots || []), slotKey],
    }));
  };

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const totalAvail = (prefs.slots || []).length;
  const totalScheduled = Object.keys(scheduled1to1 || {}).length + (joinedEvents || []).length;

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
          Your month
        </div>
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 26, color: C.ink, letterSpacing:'-.02em' }}>
          {monthLabel}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: C.terracotta }}/> {Object.keys(scheduled1to1 || {}).length} 1:1</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: C.sageDark }}/> {(joinedEvents || []).length} groups</span>
          <span style={{ color: C.inkMuted }}>· {totalAvail} time slot{totalAvail===1?'':'s'} set</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl p-3" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[9px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:600, letterSpacing:'.06em' }}>
              {d.toUpperCase().slice(0,1)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square"/>;
            const dow = dowOf(d);
            const isToday = d === today.getDate();
            const isSelected = d === selectedDate;
            const hasAvail = hasAvailOnDow(dow);
            const has1to1 = has1to1OnDow(dow);
            const hasGroup = hasGroupOnDow(dow);
            return (
              <button key={i} onClick={()=>setSelectedDate(d)}
                className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all active:scale-95"
                style={{
                  background: isSelected ? C.terracotta : (hasAvail ? `${C.terracotta}10` : 'transparent'),
                  color: isSelected ? '#fff' : C.ink,
                  border: isToday && !isSelected ? `1.5px solid ${C.terracotta}` : `1px solid transparent`,
                }}>
                <span className="text-[12.5px]" style={{
                  fontFamily: 'Fraunces',
                  fontWeight: isToday || isSelected ? 600 : 400,
                  lineHeight: 1,
                }}>{d}</span>
                {(has1to1 || hasGroup) && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {has1to1 && <div className="w-1 h-1 rounded-full" style={{ background: isSelected ? '#fff' : C.terracotta }}/>}
                    {hasGroup && <div className="w-1 h-1 rounded-full" style={{ background: isSelected ? '#fff' : C.sageDark }}/>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="mt-4">
        <div className="text-[10.5px] tracking-[.16em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
          {DAY_LABELS[selectedDow]}, {MONTH_NAMES[month]} {selectedDate}
          {selectedDate === today.getDate() && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px]" style={{ background: C.saffron, color: C.ink }}>TODAY</span>}
        </div>

        {/* Meetups for the day */}
        {(meetupsToday.length > 0 || groupsToday.length > 0) ? (
          <div className="mt-2 space-y-2">
            {meetupsToday.map((m, i) => (
              <div key={`o${i}`} onClick={()=>m.mom && openSchedule && openSchedule(m.mom)}
                className="rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all active:scale-[.99]"
                style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] flex-shrink-0" style={{
                  background: m.mom?.hue || C.terracotta, color:'#fff', fontFamily:'Fraunces', fontWeight:500,
                }}>
                  {m.mom ? m.mom.name.split(' ').map(s=>s[0]).join('') : '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>
                    {m.mom ? m.mom.name : 'Meetup'}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                    {m.time}{m.place ? ` · ${m.place}` : ''}
                  </div>
                </div>
                <div className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.terracotta}18`, color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.06em' }}>1:1</div>
              </div>
            ))}
            {groupsToday.map((e, i) => (
              <div key={`g${i}`} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                  background: e.hue || `linear-gradient(135deg,${C.sageDark},${C.saffron})`, color:'#fff',
                }}>
                  <Users size={14}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>
                    {e.name}
                  </div>
                  <div className="text-[11px] truncate mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                    {e.time} · {e.place}
                  </div>
                </div>
                <div className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.sageDark}22`, color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.06em' }}>GROUP</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-xl p-3 text-center" style={{ background: C.creamSoft, border:`1px dashed ${C.divider}` }}>
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
              No meetups on {DAY_LABELS[selectedDow]}s yet.
            </div>
          </div>
        )}

        {/* Update availability */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10.5px] tracking-[.16em] uppercase flex items-center gap-1.5" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700 }}>
              <Sparkles size={11}/> Your {selectedDow} availability
            </div>
            {(prefs.slots || []).filter(s => s.startsWith(`${selectedDow}-`)).length > 0 && (
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                Tap to toggle
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIME_WINDOWS.map(w => {
              const active = isAvailable(w.id);
              return (
                <button key={w.id} onClick={()=>toggleSlot(w.id)}
                  className="rounded-full px-3 py-1.5 transition-all active:scale-[.97]"
                  style={{
                    background: active ? C.sageDark : C.paper,
                    color: active ? '#fff' : C.inkSoft,
                    border: `1px solid ${active ? C.sageDark : C.divider}`,
                    fontFamily:'Albert Sans', fontSize: 12, fontWeight: active ? 600 : 500,
                  }}>
                  {active && <Check size={10} style={{ display:'inline-block', marginRight: 4, marginTop:-2 }}/>}
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Find new matches CTA */}
        <button onClick={()=>{ flash && flash('✦ Looking for new matches with your availability'); goToMatches && goToMatches(); }}
          className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
          style={{
            height: 48,
            background: C.terracotta, color:'#fff',
            fontFamily:'Albert Sans', fontWeight: 600, fontSize: 14,
          }}>
          <Heart size={14}/> Find new matches with this week
        </button>

        <div className="h-3"/>
      </div>
    </div>
  );
};
