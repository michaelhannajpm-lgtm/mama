import { useMemo, useState } from 'react';
import { Calendar, MapPin, Bookmark, Users, SlidersHorizontal, Star, Check, Send } from 'lucide-react';
import { C } from '../../theme';
import { SUGGESTED_EVENTS as EVENTS_FALLBACK } from '../../data/events';
import { PLACES, PLACE_CATEGORIES, BADGE_META, TOP_PICKS, findPlace } from '../../data/places';
import { SAMPLE_MOMS } from '../../data/moms';
import { ActivitiesFilterSheet, ACTIVITIES_FILTER_DEFAULT } from '../../sheets/ActivitiesFilterSheet';
import { PlacesFilterSheet, PLACES_FILTER_DEFAULT } from '../../sheets/PlacesFilterSheet';
import { RateSheet } from '../../sheets/RateSheet';
import { InviteSheet } from '../../sheets/InviteSheet';

// ==========================================================================
// ActivitiesTab — two sub-views: "Things to do" (events) and "Places".
// Each view has a visible quick-filter chip row plus an advanced-filter
// icon button that opens a sheet with all mom-relevant filters. Cards
// are bookmarkable.
// ==========================================================================

// Visible quick filters above Things to do. Multi-select toggle: chips
// stack to AND-narrow the list. With no chip active, the list shows all.
const VISIBLE_THINGS_FILTERS = [
  { id: 'this-week',    label: 'This week'    },
  { id: 'this-weekend', label: 'This weekend' },
  { id: 'free',         label: 'Free'         },
  { id: 'outdoor',      label: 'Outdoor'      },
  { id: 'indoor',       label: 'Indoor'       },
];

const isFree    = (e) => (e.tags || []).some(t => /^free/i.test(t));
const isOutdoor = (e) => {
  const hay = `${e.place} ${(e.tags || []).join(' ')}`.toLowerCase();
  return /park|bayshore|outdoor|beach|stroll|walk|waterfront|splash|picnic|sunset/.test(hay);
};
const isIndoor  = (e) => {
  const hay = `${e.place} ${(e.tags || []).join(' ')}`.toLowerCase();
  return /library|indoor|yoga|café|cafe|coffee|brunch|story|highchair/.test(hay);
};

const passesVisibleThings = (e, active) => {
  if (active.size === 0) return true;
  // 'this-week' is a no-op for the prototype — SUGGESTED_EVENTS are weekly recurring.
  if (active.has('this-weekend') && !(e.day === 'Sat' || e.day === 'Sun')) return false;
  if (active.has('free')         && !isFree(e))    return false;
  if (active.has('outdoor')      && !isOutdoor(e)) return false;
  if (active.has('indoor')       && !isIndoor(e))  return false;
  return true;
};

// Apply the advanced filter sheet state to an event.
const passesAdvancedThings = (e, f) => {
  const tagsStr = (e.tags || []).join(' ').toLowerCase();
  const placeStr = (e.place || '').toLowerCase();
  const nameStr  = (e.name  || '').toLowerCase();
  const hay = `${nameStr} ${placeStr} ${tagsStr}`;

  if (f.cost.length) {
    if (f.cost.includes('Free') && !isFree(e)) return false;
    if (f.cost.includes('Paid') &&  isFree(e)) return false;
  }
  if (f.setting.length) {
    const indoor = isIndoor(e), outdoor = isOutdoor(e);
    if (f.setting.includes('Indoor')  && !indoor)  return false;
    if (f.setting.includes('Outdoor') && !outdoor) return false;
  }
  if (f.days.length && !f.days.includes(e.day)) return false;
  if (f.times.length && !f.times.includes(e.bucket)) return false;

  if (f.ages.length) {
    const ageMap = {
      'Under 1': /ages? 0|baby|infant/,
      '1–3':     /ages? 1|toddler|2|3/,
      '3–5':     /ages? 3|ages? 4|ages? 5|pre-?k|preschool/,
      '5–8':     /ages? 5|ages? 6|ages? 7|ages? 8|kindergarten/,
      '8+':      /ages? 8|ages? 9|ages? 10|tween|teen/,
    };
    const ok = f.ages.some(a => ageMap[a]?.test(hay));
    if (!ok) return false;
  }

  if (f.types.length) {
    const typeMap = {
      'Storytime':     /story/,
      'Music':         /music/,
      'Yoga':          /yoga/,
      'Playgroup':     /play(group)?|playdate/,
      'Stroller walk': /stroll|walk|bayshore/,
      'Park':          /park|playground/,
      'Brunch':        /brunch|coffee|café|cafe/,
      'Art':           /art|paint|craft/,
      'Class':         /class|lesson/,
      'Splash pad':    /splash|water/,
    };
    const ok = f.types.some(t => typeMap[t]?.test(hay));
    if (!ok) return false;
  }

  if (f.amenities.length) {
    const amenMap = {
      'Stroller-friendly':  /stroller/,
      'Drop-off welcome':   /drop-?off/,
      'Childcare on-site':  /childcare|sitter|drop-?off/,
      'Recurring':          /weekly|recurring/,
      'Verified':           /verified|vetted|mom favorite/,
    };
    for (const a of f.amenities) {
      if (a === 'Recurring') {
        if (!/weekly|recurring/i.test(e.recurring || '')) return false;
      } else if (!amenMap[a]?.test(hay)) {
        return false;
      }
    }
  }

  return true;
};

// Apply the advanced filter sheet state to a place.
const passesAdvancedPlaces = (p, f) => {
  const tags = (p.tags || []).map(t => t.toLowerCase());
  const hay = `${(p.desc || '').toLowerCase()} ${tags.join(' ')}`;

  if (f.distance != null && p.dist > f.distance) return false;

  if (f.cost.length) {
    const cost = {
      'Free':          /free/,
      'Paid':          /paid/,
      'Membership':    /membership|annual|family pass/,
      'Sliding scale': /sliding/,
    };
    const ok = f.cost.some(c => cost[c]?.test(hay));
    if (!ok) return false;
  }
  if (f.amenities.length) {
    const amenKw = {
      'Stroller-friendly': 'stroller',
      'Highchairs':        'highchair',
      'Changing table':    'changing',
      'Nursing room':      'nursing',
      'Restrooms':         'restroom',
      'Café':              'café',
      'Free WiFi':         'wifi',
      'Indoor':            'indoor',
      'Outdoor':           'outdoor',
    };
    const ok = f.amenities.every(a => {
      const kw = amenKw[a];
      return kw && hay.includes(kw);
    });
    if (!ok) return false;
  }
  if (f.parking.length) {
    const park = {
      'Free lot':       /free lot/,
      'Paid lot':       /paid lot/,
      'Street parking': /street/,
    };
    const ok = f.parking.some(p2 => park[p2]?.test(hay));
    if (!ok) return false;
  }
  if (f.ages.length) {
    const ageMap = {
      'Under 1': /infant|baby|0|under 1|4mo|months/,
      '1–3':     /toddler|1|2|3|vpk/,
      '3–5':     /3|4|5|pre-?k|preschool|vpk/,
      '5–8':     /5|6|7|8|k-|kindergarten/,
      '8+':      /8|9|10|11|12|13|14|tween|teen/,
    };
    const ok = f.ages.some(a => ageMap[a]?.test(hay));
    if (!ok) return false;
  }
  if (f.visit.length) {
    const visitMap = {
      'Drop-off welcome': /drop-?off/,
      'Parent-required':  /co-op|parent|mommy/,
      'Open weekends':    /weekend|sat|sun/,
      'Mom-vetted':       /favorite|vetted|verified/,
    };
    const ok = f.visit.some(v => visitMap[v]?.test(hay));
    if (!ok) return false;
  }
  return true;
};

// ──────────────────────────────────────────────────────────────────────────
// Action row — shared by EventCard + PlaceCard. Three short buttons
// (Rate / Going / Invite) under each card. Saffron = highlight,
// sage = community, coral = 1:1 / sharing — keeps the palette discipline.
// ──────────────────────────────────────────────────────────────────────────
const ActionBtn = ({ Icon, label, active, fg, bg, fill, onClick, last }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="flex-1 flex items-center justify-center gap-1 transition-colors"
    style={{
      padding: '9px 4px',
      background: active ? bg : 'transparent',
      color: active ? fg : C.navySoft,
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11,
      borderRight: last ? 'none' : `1px solid ${C.divider}`,
    }}
  >
    <Icon size={12} color={active ? fg : C.navySoft} fill={active && fill ? fg : 'none'} strokeWidth={2}/>
    {label}
  </button>
);

const ActionRow = ({ rating = 0, going, onRate, onToggleGoing, onInvite }) => (
  <div className="flex" style={{ borderTop: `1px solid ${C.divider}` }}>
    <ActionBtn
      Icon={Star}
      label={rating > 0 ? `${rating}/5` : 'Rate'}
      active={rating > 0}
      fg="#A0791E" bg="#FFF4D6" fill
      onClick={onRate}
    />
    <ActionBtn
      Icon={Check}
      label={going ? "I'm going" : 'Going'}
      active={going}
      fg={C.sageDark} bg={C.sage} fill={false}
      onClick={onToggleGoing}
    />
    <ActionBtn
      Icon={Send}
      label="Invite"
      active={false}
      fg={C.coralDeep} bg={C.coralSoft} fill={false}
      onClick={onInvite}
      last
    />
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
// Card: a single Thing-to-do (event)
// ──────────────────────────────────────────────────────────────────────────
const EventCard = ({ event, saved, onToggleSave, rating, going, onRate, onToggleGoing, onInvite }) => {
  const slotKey = `${event.day}-${event.bucket}`;
  const matched = SAMPLE_MOMS.filter(m => m.freeSlots.includes(slotKey));
  const overlapLine = matched.length === 0
    ? null
    : matched.length <= 2
      ? `${matched.map(m => m.name.split(' ')[0]).join(', ')} going`
      : `${matched.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ')} +${matched.length - 2} more`;

  return (
    <div
      className="rounded-2xl overflow-hidden mb-3 relative"
      style={{ background: C.paper, border: `1px solid ${C.divider}`, boxShadow: '0 4px 14px -8px rgba(27,42,78,.12)' }}
    >
      <div className="flex">
        <div style={{
          width: 92, height: 92, flexShrink: 0,
          backgroundImage: `url('${event.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center',
        }}/>
        <div className="flex-1 min-w-0 px-3 py-2.5">
          <div className="text-[9.5px] tracking-[.14em] uppercase flex items-center gap-1.5" style={{
            color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 800,
          }}>
            <Calendar size={9}/>
            {event.day.toUpperCase()} · {event.time}
          </div>
          <div className="truncate" style={{
            fontFamily: 'Fraunces', fontWeight: 600, fontSize: 15,
            color: C.navy, letterSpacing: '-.01em', marginTop: 2,
          }}>
            {event.name}
          </div>
          <div className="flex items-center gap-1 mt-1 truncate">
            <MapPin size={9} color={C.navySoft}/>
            <span style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.navySoft }} className="truncate">
              {event.place}
            </span>
          </div>
          {overlapLine && (
            <div className="flex items-center gap-1 mt-1">
              <Users size={9} color={C.sageDark}/>
              <span style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, color: C.sageDark }}>
                {overlapLine}
              </span>
            </div>
          )}
        </div>
      </div>
      <ActionRow
        rating={rating}
        going={going}
        onRate={onRate}
        onToggleGoing={onToggleGoing}
        onInvite={onInvite}
      />
      <button
        onClick={onToggleSave}
        aria-label={saved ? 'Unsave' : 'Save'}
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 28, height: 28, borderRadius: 14,
          background: 'rgba(255,255,255,.94)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(27,42,78,.12)',
        }}
      >
        <Bookmark size={14} color={saved ? C.coralDeep : C.muted} fill={saved ? C.coralDeep : 'none'}/>
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Card: a single Place
// ──────────────────────────────────────────────────────────────────────────
const PlaceCard = ({ place, saved, onToggleSave, rating, going, onRate, onToggleGoing, onInvite }) => {
  const badge = place.badge;
  const meta = badge ? BADGE_META[badge] : null;
  return (
    <div
      className="rounded-2xl mb-2 relative overflow-hidden"
      style={{ background: C.paper, border: `1px solid ${C.divider}` }}
    >
      <div className="px-3 py-3 flex items-start gap-2.5 pr-9">
        <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{
          width: 38, height: 38, background: C.coralSoft, color: C.coralDeep,
        }}>
          <MapPin size={16}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 13.5, color: C.navy, letterSpacing: '-.01em' }}>
              {place.name}
            </div>
            {meta && (
              <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded" style={{
                background: `${meta.color}18`, color: meta.color,
                fontFamily: 'Albert Sans', fontWeight: 700, letterSpacing: '.04em',
              }}>
                <meta.icon size={8} fill={meta.fill ? meta.color : 'none'}/>
                {badge.toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-[10.5px] mt-0.5" style={{ fontFamily: 'Albert Sans', color: C.inkSoft }}>
            {place.area} · {place.dist} mi
          </div>
          {place.desc && (
            <div className="text-[10px] mt-1" style={{ fontFamily: 'Albert Sans', color: C.muted, lineHeight: 1.35 }}>
              {place.desc}
            </div>
          )}
        </div>
      </div>
      <ActionRow
        rating={rating}
        going={going}
        onRate={onRate}
        onToggleGoing={onToggleGoing}
        onInvite={onInvite}
      />
      <button
        onClick={onToggleSave}
        aria-label={saved ? 'Unsave' : 'Save'}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 26, height: 26, borderRadius: 13,
          background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bookmark size={13} color={saved ? C.coralDeep : C.muted} fill={saved ? C.coralDeep : 'none'}/>
      </button>
    </div>
  );
};

// Round icon button for "advanced filter" — sits to the right of the chip row.
const AdvancedFilterBtn = ({ count, onClick }) => (
  <button
    onClick={onClick}
    aria-label="Open advanced filters"
    className="relative flex-shrink-0 flex items-center justify-center rounded-full"
    style={{
      width: 34, height: 34,
      background: count > 0 ? C.navy : C.paper,
      color: count > 0 ? '#fff' : C.navy,
      border: `1px solid ${count > 0 ? C.navy : C.divider}`,
    }}
  >
    <SlidersHorizontal size={14}/>
    {count > 0 && (
      <span
        className="absolute"
        style={{
          top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8,
          background: C.coralDeep, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${C.cream}`,
        }}
      >
        {count > 9 ? '9+' : count}
      </span>
    )}
  </button>
);

// Count of active filters in the advanced filter state object (lists +
// non-null distance). Drives the badge on the icon button.
const countActiveFilters = (f) => {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (k === 'distance') { if (v != null) n += 1; }
    else if (Array.isArray(v)) { n += v.length; }
  }
  return n;
};

// ──────────────────────────────────────────────────────────────────────────
// Tab
// ──────────────────────────────────────────────────────────────────────────
export const ActivitiesTab = ({
  events, thisWeek = [],
  savedItems = [], setSavedItems,
  goingItems = [], setGoingItems,
  ratings = {}, setRatings,
  location, flash,
}) => {
  const SUGGESTED_EVENTS = events || EVENTS_FALLBACK;
  const [view, setView] = useState('things');
  const [visibleThings, setVisibleThings] = useState(() => new Set());
  const [thingsAdv, setThingsAdv] = useState(ACTIVITIES_FILTER_DEFAULT);
  const [placeCat, setPlaceCat] = useState('fun');
  const [placesAdv, setPlacesAdv] = useState(PLACES_FILTER_DEFAULT);
  const [filterSheet, setFilterSheet] = useState(null); // 'things' | 'places'
  const [rateTarget, setRateTarget]     = useState(null); // { item, kind }
  const [inviteTarget, setInviteTarget] = useState(null); // { item, kind }

  const toggleSave = (id) => {
    setSavedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const isSaved = (id) => savedItems.includes(id);

  const toggleGoing = (id, name) => {
    const wasGoing = goingItems.includes(id);
    setGoingItems(prev => wasGoing ? prev.filter(x => x !== id) : [...prev, id]);
    flash?.(wasGoing ? `No longer going to ${name}` : `You're going to ${name} · moms can see`);
  };
  const isGoing = (id) => goingItems.includes(id);
  const ratingOf = (id) => ratings[id] || 0;
  const saveRating = (id, stars) => {
    setRatings(prev => {
      const next = { ...prev };
      if (stars === 0) delete next[id]; else next[id] = stars;
      return next;
    });
  };

  const toggleVisibleThing = (id) => {
    setVisibleThings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    // When the "This week" chip is active and we have live dated events, show those.
    const thisWeekActive = visibleThings.has('this-week');
    const thingsSource = (thisWeekActive && thisWeek.length) ? thisWeek : SUGGESTED_EVENTS;
    return thingsSource
      .filter(e => passesVisibleThings(e, visibleThings))
      .filter(e => passesAdvancedThings(e, thingsAdv));
  }, [visibleThings, thingsAdv, thisWeek, SUGGESTED_EVENTS]);

  const topPicks = useMemo(() => TOP_PICKS
    .map(t => { const p = findPlace(t.placeId); return p ? { ...p, ...t } : null; })
    .filter(Boolean), []);

  const filteredPlaces = useMemo(() => {
    return (PLACES[placeCat] || []).filter(p => passesAdvancedPlaces(p, placesAdv));
  }, [placeCat, placesAdv]);

  const thingsAdvCount = countActiveFilters(thingsAdv);
  const placesAdvCount = countActiveFilters(placesAdv);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top toggle — same pattern as MatchesTab. Coral when active. */}
      <div className="px-5 pt-3 pb-2">
        <div className="rounded-full p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
          <button
            onClick={() => setView('things')}
            className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all"
            style={{
              height: 36,
              background: view === 'things' ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : 'transparent',
              color: view === 'things' ? '#fff' : C.inkMuted,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
              boxShadow: view === 'things' ? '0 4px 12px -4px rgba(214,68,106,.5)' : 'none',
            }}
          >
            <Calendar size={13}/> Things to do · {SUGGESTED_EVENTS.length}
          </button>
          <button
            onClick={() => setView('places')}
            className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all"
            style={{
              height: 36,
              background: view === 'places' ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : 'transparent',
              color: view === 'places' ? '#fff' : C.inkMuted,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
              boxShadow: view === 'places' ? '0 4px 12px -4px rgba(214,68,106,.5)' : 'none',
            }}
          >
            <MapPin size={13}/> Places
          </button>
        </div>
      </div>

      {/* Filter chip row — scrollable chips + sticky advanced-filter button on the right */}
      <div className="px-5 pb-2 flex items-center gap-2">
        <div
          className="flex-1 flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {view === 'things'
            ? VISIBLE_THINGS_FILTERS.map(f => {
                const active = visibleThings.has(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleVisibleThing(f.id)}
                    className="flex items-center rounded-full px-3 py-1.5 transition-all flex-shrink-0"
                    style={{
                      background: active ? C.navy : C.paper,
                      color: active ? '#fff' : C.navy,
                      border: `1px solid ${active ? C.navy : C.divider}`,
                      fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
                    }}
                  >
                    {f.label}
                  </button>
                );
              })
            : PLACE_CATEGORIES.map(cat => {
                const active = placeCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setPlaceCat(cat.id)}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 transition-all flex-shrink-0"
                    style={{
                      background: active ? C.navy : C.paper,
                      color: active ? '#fff' : C.navy,
                      border: `1px solid ${active ? C.navy : C.divider}`,
                      fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
                    }}
                  >
                    <cat.icon size={12}/>
                    {cat.label}
                  </button>
                );
              })
          }
        </div>
        <AdvancedFilterBtn
          count={view === 'things' ? thingsAdvCount : placesAdvCount}
          onClick={() => setFilterSheet(view)}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
        {view === 'things' ? (
          filteredEvents.length === 0 ? (
            <EmptyState kind="things"/>
          ) : (
            filteredEvents.map(e => (
              <EventCard
                key={e.id}
                event={e}
                saved={isSaved(e.id)}
                onToggleSave={() => toggleSave(e.id)}
                rating={ratingOf(e.id)}
                going={isGoing(e.id)}
                onRate={() => setRateTarget({ item: e, kind: 'event' })}
                onToggleGoing={() => toggleGoing(e.id, e.name)}
                onInvite={() => setInviteTarget({ item: e, kind: 'event' })}
              />
            ))
          )
        ) : (
          <>
            {placeCat === 'fun' && placesAdvCount === 0 && topPicks.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] tracking-[.14em] uppercase mb-2" style={{
                  color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 800,
                }}>
                  TOP PICKS{location ? ` IN ${location.split(',')[0].toUpperCase()}` : ''}
                </div>
                {topPicks.map(p => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    saved={isSaved(p.id)}
                    onToggleSave={() => toggleSave(p.id)}
                    rating={ratingOf(p.id)}
                    going={isGoing(p.id)}
                    onRate={() => setRateTarget({ item: p, kind: 'place' })}
                    onToggleGoing={() => toggleGoing(p.id, p.name)}
                    onInvite={() => setInviteTarget({ item: p, kind: 'place' })}
                  />
                ))}
              </div>
            )}
            <div className="text-[10px] tracking-[.14em] uppercase mb-2" style={{
              color: C.navySoft, fontFamily: 'Albert Sans', fontWeight: 800,
            }}>
              {PLACE_CATEGORIES.find(c => c.id === placeCat)?.label || 'Places'}
              <span style={{ color: C.muted, fontWeight: 600 }}> · {filteredPlaces.length}</span>
            </div>
            {filteredPlaces.length === 0 ? (
              <EmptyState kind="places"/>
            ) : (
              filteredPlaces.map(p => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  saved={isSaved(p.id)}
                  onToggleSave={() => toggleSave(p.id)}
                  rating={ratingOf(p.id)}
                  going={isGoing(p.id)}
                  onRate={() => setRateTarget({ item: p, kind: 'place' })}
                  onToggleGoing={() => toggleGoing(p.id, p.name)}
                  onInvite={() => setInviteTarget({ item: p, kind: 'place' })}
                />
              ))
            )}
          </>
        )}
      </div>

      {filterSheet === 'things' && (
        <ActivitiesFilterSheet
          filters={thingsAdv}
          setFilters={setThingsAdv}
          onClose={() => setFilterSheet(null)}
        />
      )}
      {filterSheet === 'places' && (
        <PlacesFilterSheet
          filters={placesAdv}
          setFilters={setPlacesAdv}
          onClose={() => setFilterSheet(null)}
        />
      )}
      {rateTarget && (
        <RateSheet
          item={rateTarget.item}
          kind={rateTarget.kind}
          current={ratingOf(rateTarget.item.id)}
          onSave={(stars) => {
            saveRating(rateTarget.item.id, stars);
            flash?.(stars > 0 ? `Rated ${stars}/5 · thanks` : 'Rating cleared');
          }}
          onClose={() => setRateTarget(null)}
        />
      )}
      {inviteTarget && (
        <InviteSheet
          item={inviteTarget.item}
          kind={inviteTarget.kind}
          flash={flash}
          onSent={({ picked }) => flash?.(`Invite sent to ${picked.length} mom${picked.length === 1 ? '' : 's'} ✦`)}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
};

const EmptyState = ({ kind }) => (
  <div className="flex flex-col items-center justify-center" style={{ paddingTop: 60, gap: 8 }}>
    <Calendar size={32} color={C.line}/>
    <div className="text-[14px]" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
      Nothing matches yet
    </div>
    <div className="text-[11.5px] text-center px-6" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
      {kind === 'places'
        ? 'Try widening the distance or clearing a filter.'
        : 'Try clearing a filter or switching to This week.'}
    </div>
  </div>
);
