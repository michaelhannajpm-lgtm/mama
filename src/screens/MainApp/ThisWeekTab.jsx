import { useState } from 'react';
import {
  MapPin, Calendar, Users, GraduationCap, ChevronRight,
  Star, Palette, Music, Sparkles, SlidersHorizontal, Clock,
} from 'lucide-react';
import { C } from '../../theme';
import { ActivitiesFilterSheet, ACTIVITIES_FILTER_DEFAULT } from '../../sheets/ActivitiesFilterSheet';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';

// ==========================================================================
// ThisWeekTab — curated weekly discovery surface (V5 layout).
//
//   • Location chip ("Tampa, FL")
//   • 4 pill filters: Events · Meetups · Programs · Free
//   • Today / This Weekend / Popular sections, each a 3-col card grid
//   • "Because your child is 0-3 years old" age-targeted categories
//   • Coral "More filters" CTA at the bottom
// ==========================================================================

const PILL_FILTERS = [
  { id: 'events',   label: 'Events',   icon: Calendar,      fg: C.coralDeep, bg: C.coralSoft },
  { id: 'meetups',  label: 'Meetups',  icon: Users,         fg: '#5E4A8A',   bg: C.lilac     },
  { id: 'programs', label: 'Programs', icon: GraduationCap, fg: C.sageDark,  bg: C.sage      },
];

const TODAY_ITEMS = [
  {
    id: 't1', time: '10:00 AM', title: 'Storytime at The Yard',
    place: 'The Yard · Tampa', tag: 'Indoor', distance: '0.7 mi',
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop',
  },
  {
    id: 't2', time: '11:00 AM', title: 'Splash Pad Playdate',
    place: 'Julian B. Lane Riverfront Park', tag: 'Outdoor', distance: '1.4 mi',
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
  },
  {
    id: 't3', time: '11:30 AM', title: 'Mini Makers Art Class',
    place: 'Little Explorers Play Cafe', tag: 'Indoor', distance: '2.1 mi',
    photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop',
  },
];

const WEEKEND_ITEMS = [
  {
    id: 'w1', dow: 'SAT', day: 17, title: 'Hyde Park Village Market',
    place: 'Hyde Park Village', meta: 'All ages', distance: '0.4 mi',
    photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=400&auto=format&fit=crop',
  },
  {
    id: 'w2', dow: 'SUN', day: 18, title: 'Family Yoga in the Park',
    place: 'Curtis Hixon Waterfront Park', meta: 'Ages 2+', distance: '0.9 mi',
    photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop',
  },
  {
    id: 'w3', dow: 'SUN', day: 18, title: 'Tampa Bay History Center',
    place: 'Tampa Bay History Center', meta: 'All ages', distance: '1.2 mi',
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
];

const POPULAR_PLACES = [
  {
    id: 'pp1', title: 'Tampa Riverwalk Splash Pad',
    rating: 4.8, reviews: 128, tag: '92% recommend',
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
  },
  {
    id: 'pp2', title: "Glazer Children's Museum",
    rating: 4.7, reviews: 96, tag: '91% recommend',
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
  {
    id: 'pp3', title: 'Little Explorers Play Cafe',
    rating: 4.9, reviews: 142, tag: '95% recommend',
    photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop',
  },
];

const AGE_CATEGORIES = [
  { id: 'art',     label: 'Art Classes',     count: 12, icon: Palette,  fg: C.coralDeep, bg: C.coralSoft },
  { id: 'play',    label: 'Playdates',       count: 8,  icon: Users,    fg: '#5E4A8A',   bg: C.lilac     },
  { id: 'music',   label: 'Music & Movement', count: 18, icon: Music,   fg: C.sageDark,  bg: C.sage      },
  { id: 'sensory', label: 'Sensory Play',    count: 5,  icon: Sparkles, fg: '#8A6610',   bg: '#FFF4D6'   },
];

// -------------------------- shared bits --------------------------

const SectionHead = ({ title, link = 'See all' }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 12, marginBottom: 8 }}>
    <div style={{
      fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700,
      color: C.navy, letterSpacing: '-.01em',
    }}>
      {title}
    </div>
    <button
      style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 1,
        color: C.coralDeep,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {link} <ChevronRight size={11}/>
    </button>
  </div>
);

const TodayLine = () => (
  <div className="flex items-baseline justify-between" style={{ marginTop: 14, marginBottom: 8 }}>
    <div style={{
      fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700,
      color: C.navy, letterSpacing: '-.01em',
    }}>
      Today
      <span style={{
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 500,
        color: C.muted, marginLeft: 6,
      }}>
        · Thursday, May 16
      </span>
    </div>
    <button
      style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 1,
        color: C.coralDeep,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      See all <ChevronRight size={11}/>
    </button>
  </div>
);

const TodayCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 72, objectFit: 'cover', display: 'block',
      }}/>
      <div style={{
        position: 'absolute', top: 6, left: 6,
        background: 'rgba(255,255,255,.95)',
        padding: '3px 7px', borderRadius: 5,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
        color: C.coralDeep, letterSpacing: '.03em',
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <Clock size={9}/> {item.time}
      </div>
    </div>
    <div style={{ padding: '6px 7px 8px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 25,
      }}>
        {item.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
        marginTop: 4, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.place}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 4,
      }}>
        <span style={{
          background: item.tag === 'Outdoor' ? C.sage : C.lilac,
          color: item.tag === 'Outdoor' ? C.sageDark : '#5E4A8A',
          fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700,
          padding: '1px 5px', borderRadius: 4,
        }}>
          {item.tag}
        </span>
        <span style={{
          fontFamily: 'Albert Sans', fontSize: 8.5, color: C.muted,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={8}/> {item.distance}
        </span>
      </div>
    </div>
  </button>
);

const WeekendCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 70, objectFit: 'cover', display: 'block',
      }}/>
      <div style={{
        position: 'absolute', top: 6, left: 6,
        background: '#fff', borderRadius: 6,
        padding: '3px 5px', textAlign: 'center',
        boxShadow: '0 1px 3px rgba(27,42,78,.2)',
        minWidth: 28,
      }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 7.5, fontWeight: 800,
          color: C.coralDeep, letterSpacing: '.06em', lineHeight: 1,
        }}>
          {item.dow}
        </div>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 13, fontWeight: 700,
          color: C.navy, lineHeight: 1, marginTop: 1,
        }}>
          {item.day}
        </div>
      </div>
    </div>
    <div style={{ padding: '6px 7px 8px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 25,
      }}>
        {item.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
        marginTop: 4, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.place}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginTop: 4,
        fontFamily: 'Albert Sans', fontSize: 8.5, color: C.muted,
      }}>
        <span>{item.meta}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MapPin size={8}/> {item.distance}
        </span>
      </div>
    </div>
  </button>
);

const PopularCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
  }}>
    <img src={item.photo} alt="" style={{
      width: '100%', height: 62, objectFit: 'cover', display: 'block',
    }}/>
    <div style={{ padding: '6px 7px 8px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 24,
      }}>
        {item.title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, marginTop: 4,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, color: C.navy,
      }}>
        <Star size={9} fill={C.saffron} color={C.saffron}/>
        {item.rating}
        <span style={{ fontWeight: 500, color: C.muted }}>
          ({item.reviews})
        </span>
      </div>
      <div style={{
        marginTop: 3, display: 'inline-block',
        background: C.sage, color: C.sageDark,
        fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700,
        padding: '1.5px 5px', borderRadius: 4,
      }}>
        {item.tag}
      </div>
    </div>
  </button>
);

const AgeTile = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className="active:scale-[.97] transition-transform" style={{
      background: '#fff', borderRadius: 12,
      border: `1px solid ${C.line}`,
      boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)',
      padding: '10px 6px',
      textAlign: 'center',
      cursor: 'pointer',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9,
        background: item.bg, color: item.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto',
      }}>
        <Icon size={14}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700,
        color: C.navy, marginTop: 5, lineHeight: 1.15,
      }}>
        {item.label}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 1,
      }}>
        {item.count}
      </div>
    </button>
  );
};

// -------------------------- screen --------------------------

export const ThisWeekTab = ({
  savedItems = [], setSavedItems,
  goingItems = [], setGoingItems,
  joinedEvents = [], setJoinedEvents,
  ratings = {}, setRatings,
  location, flash,
  filterOpen, setFilterOpen,
}) => {
  void ratings; void setRatings;

  // Detail-sheet state — only one open at a time.
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const isSaved      = (id) => savedItems.includes(id);
  const isGoing      = (id) => goingItems.includes(id);
  const isJoined     = (id) => joinedEvents.includes(id);
  const toggleSave   = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleGoing  = (id) => setGoingItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleJoined = (id) => setJoinedEvents?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Normalize per-section card shapes into the common EventDetailSheet shape.
  const openTodayEvent = (item) => setSelectedEvent({
    id: item.id, title: item.title, photo: item.photo,
    when: `Today · ${item.time}`, place: item.place, distance: item.distance,
    tags: item.tag ? [item.tag] : [], kind: 'Event today',
  });
  const openWeekendEvent = (item) => setSelectedEvent({
    id: item.id, title: item.title, photo: item.photo,
    when: `${item.dow} · May ${item.day}`, place: item.place, distance: item.distance,
    tags: item.meta ? [item.meta] : [], kind: 'Weekend event',
  });
  const openPopularPlace = (item) => setSelectedPlace({
    id: item.id, title: item.title, photo: item.photo,
    rating: item.rating, reviews: item.reviews,
    tag: item.tag, distance: 'Near you',
    kind: 'Place',
  });

  const [activeFilters, setActiveFilters] = useState(new Set());
  const toggleFilter = (id) => setActiveFilters(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Advanced filters — Cost/Setting/Day/Time/Ages/Distance/Type/Amenities.
  // Sheet is opened by the inline filter button (next to the pill row) and
  // also by the header sliders icon (which lifts `filterOpen` from MainApp).
  const [filters, setFilters] = useState(ACTIVITIES_FILTER_DEFAULT);
  const advCount =
    filters.cost.length + filters.setting.length + filters.days.length +
    filters.times.length + filters.ages.length + filters.types.length +
    filters.amenities.length + (filters.distance != null ? 1 : 0);

  const locationLabel = location ? location.split(',')[0] + ', FL' : 'Tampa, FL';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Location chip + filter pills */}
      <div className="px-5" style={{ paddingBottom: 4 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: C.muted,
          fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 500,
          marginBottom: 8,
        }}>
          <MapPin size={11}/> {locationLabel}
        </div>
        <div className="flex items-center gap-2" style={{ paddingBottom: 2 }}>
          <div className="flex-1 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {PILL_FILTERS.map(f => {
              const Icon = f.icon;
              const active = activeFilters.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 16,
                    background: active ? f.fg : f.bg,
                    color: active ? '#fff' : f.fg,
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                  }}
                >
                  <Icon size={12}/>
                  {f.label}
                </button>
              );
            })}
          </div>
          <FilterIconBtn
            count={advCount}
            onClick={() => setFilterOpen?.(true)}
            accent={C.coral}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 16 }}>
        {/* Today */}
        <TodayLine/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {TODAY_ITEMS.map(item => (
            <TodayCard key={item.id} item={item} onClick={() => openTodayEvent(item)}/>
          ))}
        </div>

        {/* This Weekend */}
        <SectionHead title="This Weekend"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {WEEKEND_ITEMS.map(item => (
            <WeekendCard key={item.id} item={item} onClick={() => openWeekendEvent(item)}/>
          ))}
        </div>

        {/* Popular with moms near you */}
        <SectionHead title="Popular with moms near you"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {POPULAR_PLACES.map(item => (
            <PopularCard key={item.id} item={item} onClick={() => openPopularPlace(item)}/>
          ))}
        </div>

        {/* Because your child is 0–3 years old */}
        <SectionHead title="Because your child is 0–3 years old"/>
        <div className="grid grid-cols-4" style={{ gap: 6 }}>
          {AGE_CATEGORIES.map(item => (
            <AgeTile
              key={item.id}
              item={item}
              onClick={() => flash?.(`✦ ${item.label} · ${item.count} ideas near you`)}
            />
          ))}
        </div>

        {/* More filters */}
        <button
          onClick={() => setFilterOpen?.(true)}
          style={{
            marginTop: 16, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 14px', borderRadius: 24,
            background: '#fff', border: `1px solid ${C.line}`,
            color: C.navy,
            fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={13}/>
          More filters
        </button>
      </div>

      {filterOpen && (
        <ActivitiesFilterSheet
          filters={filters}
          setFilters={setFilters}
          onClose={() => setFilterOpen?.(false)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          saved={isSaved(selectedEvent.id)}
          joined={isJoined(selectedEvent.id)}
          interested={isGoing(selectedEvent.id)}
          onJoin={() => {
            toggleJoined(selectedEvent.id);
            flash?.(isJoined(selectedEvent.id)
              ? `Removed RSVP · ${selectedEvent.title}`
              : `✦ You're going · ${selectedEvent.title}`);
          }}
          onInterested={() => {
            toggleGoing(selectedEvent.id);
            flash?.(isGoing(selectedEvent.id)
              ? 'Removed interest'
              : '✦ Marked as interested');
          }}
          onSave={() => {
            toggleSave(selectedEvent.id);
            flash?.(isSaved(selectedEvent.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onShare={() => flash?.('Link copied · share with another mom')}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          saved={isSaved(selectedPlace.id)}
          interested={isGoing(selectedPlace.id)}
          onSave={() => {
            toggleSave(selectedPlace.id);
            flash?.(isSaved(selectedPlace.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onInterested={() => {
            toggleGoing(selectedPlace.id);
            flash?.(isGoing(selectedPlace.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onShare={() => flash?.('Link copied · share with another mom')}
          onDirections={() => flash?.('Opening directions…')}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
};

// Round filter icon button — matches the AdvancedFilterBtn pattern in
// MatchesTab. Accent fills when at least one filter is active; the
// count badge mirrors selections so the UI stays honest.
const FilterIconBtn = ({ count = 0, onClick, accent = C.navy }) => (
  <button
    onClick={onClick}
    aria-label="Open advanced filters"
    className="relative flex-shrink-0 flex items-center justify-center rounded-full"
    style={{
      width: 34, height: 34,
      background: count > 0 ? accent : C.paper,
      color: count > 0 ? '#fff' : C.navy,
      border: `1px solid ${count > 0 ? accent : C.divider}`,
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
