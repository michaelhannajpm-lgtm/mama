import { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight, ArrowLeft, MapPin, Calendar as CalendarIcon, Shield,
  Coffee, TreePine, Sparkles, Lock, Check, ChevronRight, ChevronDown, ChevronUp,
  Search, MessageCircle, X, Crown, Star, Plus, Minus, Heart,
  Compass, CalendarDays, Bell, User, Users, ShieldCheck, Quote,
  Briefcase, Home, Flower2, Music, BookOpen, Palette,
  Leaf, Sun, Building2, Library, Trees,
  PawPrint, Waves, Droplets, Flame, Award,
  Mail, Eye, EyeOff, Phone
} from 'lucide-react';
import { C } from './theme';
import {
  MOM_TYPES, VALUES, VALUE_NO_PREF, INTERESTS, INTEREST_NO_PREF,
  KID_AGES, NEIGHBORHOODS, DISTANCES, WINDOW_TO_BUCKET,
  DAYS, DAY_LABELS, TIME_WINDOWS, MONTH_NAMES, DAYS_SHORT_BY_DOW,
} from './data/taxonomy';
import {
  PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, findPlace,
  TOP_PICKS, BADGE_META, PLACE_CATEGORIES_ALL_DATA,
} from './data/places';
import {
  SAMPLE_MOMS, MOM_POOL, ALL_AVAILABLE_MOMS, matchingMoms,
} from './data/moms';
import { SUGGESTED_EVENTS, EVENTS } from './data/events';
import { Sprig } from './components/icons/Sprig';
import { MamaLogo } from './components/icons/MamaLogo';
import { Sun3 } from './components/icons/Sun3';
import { PhoneFrame } from './components/PhoneFrame';
import { StatusBar } from './components/StatusBar';
import { Pill } from './components/Pill';
import { Dot } from './components/Dot';
import { StepHeader } from './components/StepHeader';
import { PrimaryBtn } from './components/PrimaryBtn';
import { Sheet } from './components/Sheet';
import { Toast } from './components/Toast';
import { MatchCard } from './components/MatchCard';
import { MiniMatchCard } from './components/MiniMatchCard';
import { ScheduleSheet } from './sheets/ScheduleSheet';
import { ProfileSheet } from './sheets/ProfileSheet';
import { MessageSheet } from './sheets/MessageSheet';
import { CreateAccountSheet } from './sheets/CreateAccountSheet';
import { PremiumSheet } from './sheets/PremiumSheet';
import { Splash } from './screens/Splash';
import { Screen1 } from './screens/Screen1';
import { Screen2 } from './screens/Screen2';
import { Screen3 } from './screens/Screen3';
import { Screen4 } from './screens/Screen4';
import { Screen5 } from './screens/Screen5';
import { Screen6 } from './screens/Screen6';
import { Screen7 } from './screens/Screen7';
import { Screen8 } from './screens/Screen8';

// ====================================================================
// MAIN APP
// ====================================================================
// ====================================================================
// MAIN APP — 5 tabs: Calendar · Places · Events · Matches · Profile
// ====================================================================
const MainApp = ({ profile, prefs, setPrefs, location, distance, scheduled1to1, joinedEvents, setJoinedEvents, openSchedule, openProfile, openMessage, openPremium, account, requestAccount, restart, flash }) => {
  const [tab, setTab] = useState('calendar');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {tab==='calendar' && <CalendarTab
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        prefs={prefs} setPrefs={setPrefs}
        openSchedule={openSchedule}
        goToMatches={()=>setTab('matches')}
        flash={flash}/>}
      {tab==='places'   && <PlacesTab prefs={prefs} setPrefs={setPrefs} location={location} goToMatches={()=>setTab('matches')} flash={flash}/>}
      {tab==='events'   && <EventsTab joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents} account={account} requestAccount={requestAccount} openPremium={openPremium} flash={flash}/>}
      {tab==='matches'  && <MatchesTab openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}/>}
      {tab==='profile'  && <YouTab profile={profile} prefs={prefs} location={location} distance={distance} restart={restart}/>}

      {/* Tab Bar — 5 buttons */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.divider, background: C.creamSoft }}>
        <div className="flex justify-between items-center">
          {[
            { id:'calendar', icon: CalendarIcon,  label:'Calendar' },
            { id:'places',   icon: MapPin,        label:'Places'   },
            { id:'events',   icon: Users,         label:'Events'   },
            { id:'matches',  icon: Heart,         label:'Matches'  },
            { id:'profile',  icon: User,          label:'Profile'  },
          ].map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className="flex flex-col items-center gap-0.5 py-1.5 flex-1">
                <t.icon size={19} style={{ color: active ? C.terracotta : C.inkMuted, strokeWidth: active ? 2.2 : 1.7 }}/>
                <span className="text-[10px]" style={{ fontFamily:'Albert Sans', fontWeight: active?600:500, color: active ? C.ink : C.inkMuted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// CALENDAR TAB — month grid · scheduled meetups · edit availability
// ====================================================================
const CalendarTab = ({ scheduled1to1, joinedEvents, prefs, setPrefs, openSchedule, goToMatches, flash }) => {
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

// ====================================================================
// PLACES TAB — editable place picker (mirrors Screen 6 + match CTA)
// ====================================================================
const PlacesTab = ({ prefs, setPrefs, location, goToMatches, flash }) => {
  const [activeCat, setActiveCat] = useState('cafes');
  const [browseOpen, setBrowseOpen] = useState(false);

  const togglePlace = (id) => {
    setPrefs(p => {
      if (id === PLACES_NO_PREF) {
        return { ...p, places: p.places.includes(PLACES_NO_PREF) ? [] : [PLACES_NO_PREF] };
      }
      const cleaned = p.places.filter(x => x !== PLACES_NO_PREF);
      if (cleaned.includes(id)) return { ...p, places: cleaned.filter(x => x !== id) };
      return { ...p, places: [...cleaned, id] };
    });
  };

  const topPicksFull = TOP_PICKS
    .map(t => { const p = findPlace(t.placeId); return p ? { ...p, ...t } : null; })
    .filter(Boolean);

  const noPlacePref = prefs.places.includes(PLACES_NO_PREF);
  const pickedCount = prefs.places.filter(x => x !== PLACES_NO_PREF).length;
  const countByCat = (catId) => (PLACES[catId] || []).filter(p => prefs.places.includes(p.id)).length;

  const renderPlaceRow = (p, badgeOverride) => {
    const isPicked = prefs.places.includes(p.id);
    const badge = badgeOverride || p.badge;
    const meta = badge ? BADGE_META[badge] : null;
    return (
      <button key={p.id} onClick={()=>togglePlace(p.id)}
        className="w-full text-left rounded-xl p-3 transition-all active:scale-[.99]"
        style={{
          background: isPicked ? `${C.terracotta}10` : C.paper,
          border: `1.5px solid ${isPicked ? C.terracotta : C.divider}`,
        }}>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
            background: isPicked ? C.terracotta : C.creamSoft,
            color: isPicked ? '#fff' : C.terracotta,
          }}>
            {isPicked ? <Check size={14}/> : <MapPin size={14}/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-[13px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{p.name}</div>
              {meta && (
                <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: `${meta.color}18`, color: meta.color, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.04em',
                }}>
                  <meta.icon size={8} fill={meta.fill ? meta.color : 'none'}/>
                  {badge.toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>{p.area} · {p.dist} mi</div>
            {p.desc && <div className="text-[10px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, lineHeight: 1.35 }}>{p.desc}</div>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
          {location || 'Your area'}
        </div>
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 26, color: C.ink, letterSpacing:'-.02em' }}>
          Where you like to <span style={{ fontStyle:'italic', color: C.terracotta }}>meet</span>.
        </h1>
        <div className="mt-1 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          Pick spots and we'll match you with moms who love them too.
        </div>
      </div>

      {/* Open to anywhere toggle */}
      <button onClick={()=>togglePlace(PLACES_NO_PREF)}
        className="w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 transition-all"
        style={{
          background: noPlacePref ? C.sageDark : C.paper,
          color: noPlacePref ? '#fff' : C.ink,
          border: `1px ${noPlacePref ? 'solid' : 'dashed'} ${noPlacePref ? C.sageDark : C.divider}`,
        }}>
        <Sparkles size={14} style={{ color: noPlacePref ? C.saffron : C.sageDark, flexShrink: 0 }}/>
        <div className="flex-1 text-left">
          <div className="text-[12.5px]" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>I'm open to anywhere</div>
          <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', opacity: noPlacePref ? .85 : .6 }}>Let her suggest a spot</div>
        </div>
        {noPlacePref && <Check size={15} style={{ color: C.saffron }}/>}
      </button>

      {!noPlacePref && (
        <>
          {/* Top picks */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10.5px] tracking-[.16em] uppercase flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
                <Star size={11} fill={C.terracotta}/> Top picks {location ? `in ${location}` : 'near you'}
              </div>
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                {pickedCount} picked
              </div>
            </div>
            <div className="space-y-1.5">
              {topPicksFull.map(p => renderPlaceRow(p))}
            </div>
          </div>

          {/* Browse more */}
          <button onClick={()=>setBrowseOpen(o=>!o)}
            className="mt-3 w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: browseOpen ? C.ink : 'transparent',
              color: browseOpen ? C.cream : C.inkSoft,
              border: `1px ${browseOpen ? 'solid' : 'dashed'} ${browseOpen ? C.ink : C.divider}`,
            }}>
            {browseOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            <span className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>
              {browseOpen ? 'Hide more places' : 'Browse more places'}
            </span>
          </button>

          {browseOpen && (
            <div className="mt-3" style={{ animation: 'fadeInUp .3s ease both' }}>
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth:'none' }}>
                {PLACE_CATEGORIES.map(cat => {
                  const active = activeCat === cat.id;
                  const cnt = countByCat(cat.id);
                  return (
                    <button key={cat.id} onClick={()=>setActiveCat(cat.id)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all flex-shrink-0"
                      style={{
                        background: active ? C.ink : C.paper,
                        color: active ? C.cream : C.ink,
                        border: `1px solid ${active ? C.ink : C.divider}`,
                      }}>
                      <cat.icon size={12}/>
                      <span className="text-[11.5px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{cat.label}</span>
                      {cnt > 0 && (
                        <span className="ml-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full" style={{
                          background: active ? C.saffron : C.terracotta, color: active ? C.ink : '#fff',
                          fontFamily:'Albert Sans', fontWeight:700,
                        }}>{cnt}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                {PLACES[activeCat].map(p => renderPlaceRow(p))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Find matches by place CTA */}
      <button
        onClick={()=>{
          if (!noPlacePref && pickedCount === 0) {
            flash && flash('Pick at least one place first');
            return;
          }
          flash && flash('✦ Finding moms who love your spots');
          goToMatches && goToMatches();
        }}
        className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
        style={{
          height: 48,
          background: (noPlacePref || pickedCount > 0) ? C.terracotta : C.divider,
          color: (noPlacePref || pickedCount > 0) ? '#fff' : C.inkMuted,
          fontFamily:'Albert Sans', fontWeight: 600, fontSize: 14,
        }}>
        <Heart size={14}/> Find moms who love these spots
      </button>

      <div className="h-3"/>
    </div>
  );
};

// -- Events --
// ====================================================================
// EVENTS TAB — group events scheduled this month
// ====================================================================
const EventsTab = ({ joinedEvents, setJoinedEvents, account, requestAccount, openPremium, flash }) => {
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

const MatchesTab = ({ openSchedule, openProfile, openMessage }) => (
  <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
    <div className="mb-4">
      <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
        Your <span style={{ fontStyle:'italic', color: C.terracotta }}>matches</span>
      </h1>
    </div>
    <div className="space-y-2.5">
      {SAMPLE_MOMS.map(m => (
        <button key={m.id} onClick={()=>openProfile(m)} className="w-full text-left">
          <MiniMatchCard mom={m}/>
        </button>
      ))}
    </div>
  </div>
);

// -- You --
const YouTab = ({ profile, prefs, location, distance, restart }) => {
  const momTypeLabel = profile.momTypes
    .filter(id => id !== 'prefer_not')
    .map(id => MOM_TYPES.find(m=>m.id===id)?.label)
    .filter(Boolean)
    .slice(0,2)
    .join(' & ') || 'Mom';

  const kidsLabel = Object.entries(profile.kidsAges || {})
    .map(([age, count]) => `${count} × ${age}`)
    .join(', ') || '—';

  const distanceLabel = distance === 'any' ? 'anywhere' : distance ? `within ${distance} mi` : '';

  return (
  <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
    <div className="mb-4">
      <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
        You
      </h1>
    </div>

    <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#E8B4A0,#C8553D)', color:'#fff' }}>
      <Sprig style={{ position:'absolute', width: 60, top: 8, right: 8, opacity: .4 }} color="#fff"/>
      <div className="text-[10.5px] tracking-[.18em] uppercase opacity-80" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>You · preview mode</div>
      <div className="mt-1" style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500 }}>
        {momTypeLabel}
      </div>
      <div className="mt-0.5 text-[12.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
        Kids: {kidsLabel}
      </div>
      {location && (
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
          <MapPin size={11}/> {location}{distanceLabel ? ` · ${distanceLabel}` : ''}
        </div>
      )}
      <div className="mt-1 text-[12px] opacity-85" style={{ fontFamily:'Albert Sans' }}>
        {profile.values.slice(0,3).join(' · ') || 'Set your values'}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.92 }}>
        <Lock size={11}/> Sign up to save · keep using free
      </div>
    </div>

    <div className="rounded-[18px] divide-y" style={{ background: C.paper, border:`1px solid ${C.divider}`, borderColor: C.divider }}>
      {[
        { l:'Verified · phone & social media', tag:'Plus', icon: ShieldCheck },
        { l:'Full profile in groups',    tag:'Plus', icon: Star },
        { l:'Unlimited messages',        tag:'Plus', icon: MessageCircle },
        { l:'Calendar & places',         tag:'Free', icon: CalendarIcon },
      ].map((r,i)=>(
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <r.icon size={16} style={{ color: C.ink }}/>
          <div className="flex-1 text-[13.5px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>{r.l}</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
            background: r.tag==='Plus' ? C.ink : C.creamSoft,
            color: r.tag==='Plus' ? C.saffron : C.inkSoft,
            fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'.06em'
          }}>{r.tag.toUpperCase()}</span>
        </div>
      ))}
    </div>

    <button onClick={restart} className="mt-4 w-full text-[12.5px] py-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
      ↺ Restart prototype tour
    </button>
  </div>
  );
};

// ====================================================================
// ROOT
// ====================================================================
export default function App() {
  const [step, setStep] = useState(0);
  const [splashShown, setSplashShown] = useState(false);
  const [profile, setProfile] = useState({ kidsAges:{}, momTypes:[], values:[], interests:[] });
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [prefs, setPrefs] = useState({ slots:[], places:[] });
  const [scheduleMom, setScheduleMom] = useState(null);
  const [profileMom, setProfileMom] = useState(null);
  const [messageMom, setMessageMom] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [account, setAccount] = useState(null); // { firstName, method, phone, email } after signup
  const [pendingAction, setPendingAction] = useState(null); // generic gate: { type, mom?, slot?, event? }
  const [toast, setToast] = useState(null);
  // Lifted state — shared across Screen 7 (1:1) and Screen 8 (groups) for conflict awareness
  const [scheduled1to1, setScheduled1to1] = useState({});
  const [joinedEvents, setJoinedEvents] = useState([]);
  // Message history per mom: { [momId]: [{ text, fromUser, ts }, ...] }
  const [messageHistory, setMessageHistory] = useState({});

  const flash = (m) => { setToast(m); setTimeout(()=>setToast(null), 1900); };

  const restart = () => {
    setStep(0);
    setProfile({ kidsAges:{}, momTypes:[], values:[], interests:[] });
    setLocation(null);
    setDistance(null);
    setPrefs({ slots:[], places:[] });
    setAccount(null);
    setScheduled1to1({});
    setJoinedEvents([]);
    setPendingAction(null);
    setMessageHistory({});
    setSplashShown(false);
  };

  // Generic gate: if no account yet, queue the action and open CreateAccountSheet
  const requestAccount = (action) => setPendingAction(action);

  // Replay the queued action after account creation completes
  const handleAccountComplete = (acct) => {
    setAccount(acct);
    const a = pendingAction;
    if (a) {
      if (a.type === '1to1' && a.mom && a.slot) {
        // Parse slot string into {day, time}
        let day, time, place;
        if (typeof a.slot === 'string') {
          const [d, ...winParts] = a.slot.split('-');
          const win = TIME_WINDOWS.find(w => w.id === winParts.join('-')) || TIME_WINDOWS[1];
          day = d; time = win.label; place = a.mom.nextPlace;
        } else {
          day = a.slot.day; time = a.slot.time; place = a.slot.place || a.mom.nextPlace;
        }
        setScheduled1to1(s => ({ ...s, [a.mom.id]: { day, time, place } }));
        flash(`✦ Welcome ${acct.firstName} · scheduled with ${a.mom.name.split(' ')[0]}`);
      } else if (a.type === 'group' && a.event) {
        setJoinedEvents(j => j.includes(a.event.id) ? j : [...j, a.event.id]);
        flash(`✦ Welcome ${acct.firstName} · joined ${a.event.name}`);
      } else if (a.type === 'invite' && a.mom) {
        flash(`Welcome, ${acct.firstName}. Invite sent to ${a.mom.name.split(' ')[0]} ✦`);
      } else {
        flash(`Welcome, ${acct.firstName} ✦`);
      }
    } else {
      flash(`Welcome, ${acct.firstName} ✦`);
    }
    setPendingAction(null);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8" style={{
      background: `radial-gradient(ellipse at top left, ${C.rose}33, transparent 50%), radial-gradient(ellipse at bottom right, ${C.sage}22, transparent 50%), ${C.creamSoft}`,
    }}>
      <PhoneFrame>
        <div className="w-full h-full relative">
          {!splashShown ? (
            <Splash onBegin={()=>setSplashShown(true)}/>
          ) : (<>
          {step===0 && <Screen1 onNext={()=>setStep(1)}/>}
          {step===1 && <Screen2 onNext={()=>setStep(2)} onBack={()=>setStep(0)}/>}
          {step===2 && <Screen3 onNext={()=>setStep(3)} onBack={()=>setStep(1)} location={location} setLocation={setLocation} distance={distance} setDistance={setDistance}/>}
          {step===3 && <Screen4 onNext={()=>setStep(4)} onBack={()=>setStep(2)} profile={profile} setProfile={setProfile}/>}
          {step===4 && <Screen5 onNext={()=>setStep(5)} onBack={()=>setStep(3)} prefs={prefs} setPrefs={setPrefs}/>}
          {step===5 && <Screen6 onNext={()=>setStep(6)} onBack={()=>setStep(4)} prefs={prefs} setPrefs={setPrefs} location={location}/>}
          {step===6 && <Screen7 onNext={()=>setStep(7)} onBack={()=>setStep(5)}
            profile={profile} prefs={prefs} location={location}
            openProfile={setProfileMom}
            scheduled1to1={scheduled1to1} setScheduled1to1={setScheduled1to1}
            account={account} requestAccount={requestAccount}
            flash={flash}/>}
          {step===7 && <Screen8 onNext={()=>setStep(8)} onBack={()=>setStep(6)}
            prefs={prefs}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            account={account} requestAccount={requestAccount}
            flash={flash}/>}
          {step===8 && <MainApp
            profile={profile} prefs={prefs} setPrefs={setPrefs}
            location={location} distance={distance}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            account={account} requestAccount={requestAccount}
            openSchedule={setScheduleMom}
            openProfile={setProfileMom}
            openMessage={setMessageMom}
            openPremium={()=>setPremiumOpen(true)}
            restart={restart}
            flash={flash}
          />}

          {scheduleMom && <ScheduleSheet mom={scheduleMom}
            hasAccount={!!account}
            onClose={()=>setScheduleMom(null)}
            onContinue={(slot)=>{
              if (account) {
                setScheduleMom(null);
                flash(`Invite sent to ${scheduleMom.name.split(' ')[0]} ✦`);
              } else {
                setPendingAction({ type: 'invite', mom: scheduleMom, slot });
                setScheduleMom(null);
              }
            }}/>}
          {pendingAction && <CreateAccountSheet pendingAction={pendingAction}
            onClose={()=>setPendingAction(null)}
            onComplete={handleAccountComplete}/>}
          {profileMom && <ProfileSheet mom={profileMom}
            profile={profile}
            isPremium={!!account?.isPremium}
            onClose={()=>setProfileMom(null)}
            openPremium={()=>{ setProfileMom(null); setPremiumOpen(true); }}/>}
          {messageMom && <MessageSheet mom={messageMom}
            history={messageHistory[messageMom.id] || []}
            isPremium={!!account?.isPremium}
            onSend={(text)=>{
              setMessageHistory(h => ({
                ...h,
                [messageMom.id]: [...(h[messageMom.id] || []), { text, fromUser: true, ts: Date.now() }],
              }));
              flash(`Sent to ${messageMom.name.split(' ')[0]}`);
            }}
            onClose={()=>setMessageMom(null)}
            openPremium={()=>{ setMessageMom(null); setPremiumOpen(true); }}/>}
          {premiumOpen && <PremiumSheet
            onClose={()=>setPremiumOpen(false)}
            onActivate={()=>{
              setAccount(a => ({ ...(a || { firstName: 'Mama' }), isPremium: true, trialEndsAt: Date.now() + 7*24*3600*1000 }));
              flash('✦ Welcome to Mama Plus · 7-day trial started');
            }}/>}
          </>)}

          {toast && <Toast msg={toast}/>}
        </div>
      </PhoneFrame>
    </div>
  );
}
