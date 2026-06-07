import { useState } from 'react';
import {
  Search, UserPlus, Heart, Briefcase, MapPin, Users,
  ChevronRight, Sparkles, Moon, Baby, Coffee, Smile, BookOpen,
  SlidersHorizontal, ShieldCheck, Home, Sprout,
} from 'lucide-react';
import { C } from '../../theme';
import { MeetupsFilterSheet, MEETUPS_FILTER_DEFAULT } from '../../sheets/MeetupsFilterSheet';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { MomDetailSheet } from '../../sheets/MomDetailSheet';

// ==========================================================================
// ConnectTab — V5 "Connect" surface.
//
//   • Search input + add-friend icon
//   • "Moms nearby" — 3 round avatar cards + "9 more moms nearby" link
//   • "Upcoming meetups" — 3 event cards
//   • "Popular topics" — coloured chip row
// ==========================================================================

const MOMS = [
  {
    id: 'm1', name: 'Sarah', kids: '2 kids', distance: '0.4 mi away',
    tag: 'Working mom', tagBg: C.lilac, tagFg: '#5E4A8A', Icon: Briefcase,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
  },
  {
    id: 'm2', name: 'Amanda', kids: '1 kid', distance: '0.7 mi away',
    tag: 'Similar kids', tagBg: C.coralSoft, tagFg: C.coralDeep, Icon: Heart,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop',
  },
  {
    id: 'm3', name: 'Jessica', kids: '2 kids', distance: '0.8 mi away',
    tag: 'Lives nearby', tagBg: C.sage, tagFg: C.sageDark, Icon: MapPin,
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&auto=format&fit=crop',
  },
];

const MEETUPS = [
  {
    id: 'um1', dow: 'SAT', day: 17, title: 'Stroller Walk + Coffee',
    place: 'Curtis Hixon Waterfront Park', meta: 'Sat, May 17 · 9:00 AM',
    going: 12,
    photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&auto=format&fit=crop',
  },
  {
    id: 'um2', dow: 'SUN', day: 18, title: 'Moms & Littles Playdate',
    place: 'The Yard · Tampa', meta: 'Sun, May 18 · 10:30 AM',
    going: 8,
    photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&auto=format&fit=crop',
  },
  {
    id: 'um3', dow: 'SUN', day: 21, title: 'Picnic in the Park',
    place: 'Al Lopez Park', meta: 'Sun, May 18 · 11:00 AM',
    going: 6,
    photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop',
  },
];

// Quick category chips for the top filter row. Multi-toggle. These are
// shortcuts into the more granular MeetupsFilterSheet — moms can flip
// the obvious ones inline, or open the sheet for everything.
const MOM_QUICK = [
  { id: 'working',  label: 'Working',     icon: Briefcase    },
  { id: 'stayhome', label: 'Stay-at-home',icon: Home         },
  { id: 'newmom',   label: 'New mom',     icon: Baby         },
  { id: 'verified', label: 'Verified',    icon: ShieldCheck  },
  { id: 'nearme',   label: 'Near me',     icon: MapPin       },
  { id: 'similar',  label: 'Similar kids',icon: Heart        },
  { id: 'crunchy',  label: 'Crunchy',     icon: Sprout       },
];

const TOPICS = [
  { id: 'sleep',    label: 'Sleep',             icon: Moon,      bg: C.lilac,   fg: '#5E4A8A'   },
  { id: 'playd',    label: 'Playdates',         icon: Users,     bg: C.sage,    fg: C.sageDark  },
  { id: 'dayc',     label: 'Daycare',           icon: BookOpen,  bg: '#FFF4D6', fg: '#8A6610'   },
  { id: 'toddler',  label: 'Toddler Activities', icon: Sparkles, bg: C.coralSoft, fg: C.coralDeep },
  { id: 'working',  label: 'Working Moms',      icon: Briefcase, bg: C.lilac,   fg: '#5E4A8A'   },
  { id: 'potty',    label: 'Potty Training',    icon: Baby,      bg: C.sage,    fg: C.sageDark  },
  { id: 'coffee',   label: 'Coffee Meetups',    icon: Coffee,    bg: '#FFF4D6', fg: '#8A6610'   },
  { id: 'self',     label: 'Self-care',         icon: Smile,     bg: C.coralSoft, fg: C.coralDeep },
];

// -------------------------- shared --------------------------

const SectionHead = ({ title, link = 'See all' }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 16, marginBottom: 10 }}>
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

const MomCard = ({ item, onClick }) => {
  const Icon = item.Icon;
  return (
    <button onClick={onClick} className="active:scale-[.97] transition-transform" style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${C.line}`,
      boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)',
      padding: '12px 6px 10px',
      textAlign: 'center',
      cursor: 'pointer',
    }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img src={item.photo} alt="" style={{
          width: 62, height: 62, borderRadius: 31, objectFit: 'cover',
          display: 'block',
        }}/>
        <div style={{
          position: 'absolute', top: 2, right: 2,
          width: 10, height: 10, borderRadius: 5,
          background: C.sageDark, border: '2px solid #fff',
        }}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
        color: C.navy, marginTop: 6, lineHeight: 1.1,
      }}>
        {item.name}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 2,
      }}>
        {item.kids} · {item.distance}
      </div>
      <div style={{ marginTop: 6, display: 'inline-flex' }}>
        <span style={{
          background: item.tagBg, color: item.tagFg,
          fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700,
          padding: '2px 6px 2px 5px', borderRadius: 8,
          display: 'inline-flex', alignItems: 'center', gap: 3,
          whiteSpace: 'nowrap',
        }}>
          <Icon size={9}/>
          {item.tag}
        </span>
      </div>
    </button>
  );
};

const MeetupCard = ({ item, onClick }) => (
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
        marginTop: 3, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.place}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 5,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: 6,
              background: [C.coral, C.sage, C.lilac][i],
              border: '1.5px solid #fff',
              marginLeft: i === 0 ? 0 : -4,
            }}/>
          ))}
        </div>
        <span style={{
          fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700, color: C.sageDark,
        }}>
          {item.going} going
        </span>
      </div>
    </div>
  </button>
);

const TopicChip = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 12px', borderRadius: 18,
        background: item.bg, color: item.fg,
        border: 'none', cursor: 'pointer',
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
      }}
    >
      <Icon size={12}/>
      {item.label}
    </button>
  );
};

// -------------------------- screen --------------------------

export const ConnectTab = ({
  profile, prefs, openSchedule, openProfile, openMessage,
  joinedEvents = [], setJoinedEvents,
  savedItems = [], setSavedItems,
  account, requestAccount, flash,
  filterOpen, setFilterOpen,
}) => {
  void profile;
  void openSchedule; void openProfile;
  void account; void requestAccount;

  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState({});
  const toggleQuick = (id) => setQuick(q => ({ ...q, [id]: !q[id] }));

  // Detail-sheet state — only one open at a time.
  const [selectedMom, setSelectedMom] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [invited, setInvited] = useState({}); // {momId: true} — local prototype state

  const isSaved   = (id) => savedItems.includes(id);
  const isJoined  = (id) => joinedEvents.includes(id);
  const toggleSave   = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleJoined = (id) => setJoinedEvents?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openMomDetail = (mom) => setSelectedMom(mom);
  const openMeetupDetail = (m) => setSelectedEvent({
    id: m.id, title: m.title, photo: m.photo,
    when: m.meta, place: m.place, going: m.going,
    tags: ['Stroller-friendly', 'Free'], kind: 'Upcoming meetup',
  });

  // Advanced filters cover mom type, kid ages, interests, values,
  // calendar, distance, verified. Sheet opens via inline icon or via
  // the header sliders button (lifted state from MainApp).
  const [filters, setFilters] = useState(MEETUPS_FILTER_DEFAULT);
  const advCount =
    filters.momTypes.length + filters.kidAges.length +
    filters.interests.length + filters.values.length +
    (filters.calSameAsMe ? 1 : 0) +
    filters.calDays.length + filters.calTimes.length +
    (filters.distance != null ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0);
  const quickCount = Object.values(quick).filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-5" style={{ paddingBottom: 4 }}>
        <div
          className="flex items-center gap-2 rounded-full px-3"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, height: 40 }}
        >
          <Search size={14} color={C.muted}/>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search moms, groups or topics…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy,
            }}
          />
          <button
            aria-label="Invite a friend"
            className="rounded-full flex items-center justify-center"
            style={{
              width: 28, height: 28,
              background: 'transparent', border: 'none', color: C.navy,
            }}
          >
            <UserPlus size={14}/>
          </button>
        </div>
      </div>

      {/* Quick categories + advanced filter button. */}
      <div className="px-5" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
            {MOM_QUICK.map(c => {
              const Icon = c.icon;
              const active = !!quick[c.id];
              return (
                <button
                  key={c.id}
                  onClick={() => toggleQuick(c.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 16,
                    background: active ? C.coral : C.paper,
                    color: active ? '#fff' : C.navy,
                    border: `1px solid ${active ? C.coral : C.divider}`,
                    cursor: 'pointer',
                    fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                  }}
                >
                  <Icon size={11.5}/>
                  {c.label}
                </button>
              );
            })}
          </div>
          <ConnectFilterIconBtn
            count={advCount + quickCount}
            onClick={() => setFilterOpen?.(true)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 16 }}>
        {/* Moms nearby */}
        <SectionHead title="Moms nearby"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {MOMS.map(item => (
            <MomCard key={item.id} item={item} onClick={() => openMomDetail(item)}/>
          ))}
        </div>
        <button
          className="w-full"
          style={{
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 0 4px',
            color: C.coralDeep,
            fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Sparkles size={11}/> 9 more moms nearby
          <ChevronRight size={11}/>
        </button>

        {/* Upcoming meetups */}
        <SectionHead title="Upcoming meetups"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {MEETUPS.map(item => (
            <MeetupCard key={item.id} item={item} onClick={() => openMeetupDetail(item)}/>
          ))}
        </div>

        {/* Popular topics */}
        <SectionHead title="Popular topics"/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TOPICS.map(item => (
            <TopicChip
              key={item.id}
              item={item}
              onClick={() => flash?.(`Filtering by ${item.label}`)}
            />
          ))}
        </div>
      </div>

      {filterOpen && (
        <MeetupsFilterSheet
          filters={filters}
          setFilters={setFilters}
          userSlotsCount={prefs?.slots?.length || 0}
          onClose={() => setFilterOpen?.(false)}
        />
      )}

      {selectedMom && (
        <MomDetailSheet
          mom={selectedMom}
          saved={isSaved(`mom-${selectedMom.id}`)}
          invited={!!invited[selectedMom.id]}
          onInvite={() => {
            setInvited(i => ({ ...i, [selectedMom.id]: true }));
            flash?.(`✦ Invite sent to ${selectedMom.name}`);
          }}
          onMessage={() => {
            // MessageSheet expects SAMPLE_MOMS shape with .id (number) + .name; the
            // ConnectTab MOMS shape is close enough to render the basic chat.
            openMessage?.(selectedMom);
            setSelectedMom(null);
          }}
          onSave={() => {
            const key = `mom-${selectedMom.id}`;
            toggleSave(key);
            flash?.(isSaved(key) ? `Removed ${selectedMom.name} from saved` : `✦ Saved ${selectedMom.name}`);
          }}
          onShare={() => flash?.(`Link copied · share ${selectedMom.name}'s profile`)}
          onClose={() => setSelectedMom(null)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          saved={isSaved(selectedEvent.id)}
          joined={isJoined(selectedEvent.id)}
          interested={isSaved(`int-${selectedEvent.id}`)}
          onJoin={() => {
            toggleJoined(selectedEvent.id);
            flash?.(isJoined(selectedEvent.id)
              ? `Removed RSVP · ${selectedEvent.title}`
              : `✦ You're going · ${selectedEvent.title}`);
          }}
          onInterested={() => {
            toggleSave(`int-${selectedEvent.id}`);
            flash?.(isSaved(`int-${selectedEvent.id}`) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onSave={() => {
            toggleSave(selectedEvent.id);
            flash?.(isSaved(selectedEvent.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onShare={() => flash?.('Link copied · share with another mom')}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

// Round filter icon button. Coral accent when any filter is active.
const ConnectFilterIconBtn = ({ count = 0, onClick }) => (
  <button
    onClick={onClick}
    aria-label="Open advanced filters"
    className="relative flex-shrink-0 flex items-center justify-center rounded-full"
    style={{
      width: 34, height: 34,
      background: count > 0 ? C.coral : C.paper,
      color: count > 0 ? '#fff' : C.navy,
      border: `1px solid ${count > 0 ? C.coral : C.divider}`,
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
