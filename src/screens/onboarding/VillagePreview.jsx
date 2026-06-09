import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Heart, Bookmark,
  Calendar, MapPin, Coffee, MessageCircle, ArrowRight,
  GraduationCap, TreePine, Baby,
} from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// VillagePreview — onboarding screen 3 (V6 layout).
//
// Editorial preview after the AboutYou interview. Two-line emotional hook
// ("Less searching. More making memories.") sits above an inline stats row
// summarizing what's behind the unlock. Four content blocks follow:
//   • Things to do this week     (2-col event cards, date pill + going)
//   • Meetups this week           (same card shape, sage accent)
//   • Moms near you               (2 horizontal mom chips, soft tint)
//   • Trusted local picks         (3 category tiles, sage/peach/lilac)
// Bottom: coral gradient CTA → advances onboarding.
// ==========================================================================

// --------------------------- data --------------------------------

const ACTIVITIES = [
  {
    id: 'a1', dateLabel: 'SAT, MAY 11', dateBg: C.coralSoft, dateFg: C.coralDeep,
    title: 'Splash Pad Playtime', time: 'Sat, May 11 · 9:00 AM',
    place: 'Apollo Beach', going: 48,
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600&auto=format&fit=crop',
  },
  {
    id: 'a2', dateLabel: 'FRI, MAY 10', dateBg: C.lilac, dateFg: '#5E4A8A',
    title: 'Storytime at the Library', time: 'Fri, May 10 · 10:00 AM',
    place: 'Westchase Library', going: 28,
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop',
  },
  {
    id: 'a3', dateLabel: 'SUN, MAY 12', dateBg: C.sage, dateFg: C.sageDark,
    title: 'Family Beach Day', time: 'Sun, May 12 · 11:00 AM',
    place: 'Clearwater Beach', going: 36,
    photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop',
  },
];

const MEETUPS = [
  {
    id: 'm1', dateLabel: 'SAT, MAY 11', dateBg: C.sage, dateFg: C.sageDark,
    title: 'Moms Coffee Meetup', time: 'Sat, May 11 · 9:30 AM',
    place: 'Hyde Park Village', going: 12,
    photo: 'https://images.unsplash.com/photo-1559030623-0226b1241edd?w=600&auto=format&fit=crop',
  },
  {
    id: 'm2', dateLabel: 'SUN, MAY 12', dateBg: C.peach, dateFg: C.coralDeep,
    title: 'Mom + Tots Picnic', time: 'Sun, May 12 · 12:00 PM',
    place: 'Cypress Point Park', going: 18,
    photo: 'https://images.unsplash.com/photo-1526635467535-09354c1bdd66?w=600&auto=format&fit=crop',
  },
  {
    id: 'm3', dateLabel: 'MON, MAY 13', dateBg: C.coralSoft, dateFg: C.coralDeep,
    title: 'Stroller Walk Club', time: 'Mon, May 13 · 8:00 AM',
    place: 'Bayshore Boulevard', going: 14,
    photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&auto=format&fit=crop',
  },
];

const MOMS_NEARBY = [
  {
    id: 'mn1', name: 'Sarah', age: '3-year-old', distance: '0.5 miles away',
    interest: 'Loves playgrounds', interestIcon: Heart, interestColor: C.coralDeep,
    bg: '#FCEEEE',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop',
  },
  {
    id: 'mn2', name: 'Amanda', age: '4-year-old', distance: '0.7 miles away',
    interest: 'Coffee lover', interestIcon: Coffee, interestColor: C.coralDeep,
    bg: C.coralSoft,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop',
  },
  {
    id: 'mn3', name: 'Priya', age: '2-year-old', distance: '1.1 miles away',
    interest: 'Park days', interestIcon: TreePine, interestColor: C.sageDark,
    bg: C.sage,
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&auto=format&fit=crop',
  },
];

const CATEGORIES = [
  {
    id: 'cat-kids',
    title: 'Kids Programs & Classes', sub: 'Activities for every age',
    Icon: GraduationCap, bg: C.sage, fg: C.sageDark,
  },
  {
    id: 'cat-fun',
    title: 'Fun Places Near You', sub: 'Parks, play spaces, & more',
    Icon: TreePine, bg: C.peach, fg: '#A65A1F',
  },
  {
    id: 'cat-daycare',
    title: 'Daycares & Preschools', sub: 'Trusted care & early learning',
    Icon: Baby, bg: C.lilac, fg: '#5E4A8A',
  },
];

// --------------------------- primitives --------------------------

// Small inline stat with a dot-style icon — used in the headline stats row.
const StatChip = ({ Icon, count, label, fg, bg }) => (
  <div className="flex items-center" style={{ gap: 5 }}>
    <span style={{
      width: 18, height: 18, borderRadius: 9,
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={10} strokeWidth={2.6}/>
    </span>
    <span style={{
      fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 800,
      color: fg, letterSpacing: '-.01em',
    }}>
      {count}
    </span>
    <span style={{
      fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 500,
      color: C.inkSoft,
    }}>
      {label}
    </span>
  </div>
);

const SectionHead = ({ title, link = 'See all', onLink }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 18, marginBottom: 10 }}>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
      color: C.inkSoft, letterSpacing: '.14em',
    }}>
      {title.toUpperCase()}
    </div>
    <button
      onClick={onLink}
      style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 2,
        color: C.coralDeep,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {link} <ChevronRight size={11}/>
    </button>
  </div>
);

// Event card — used by Things to do + Meetups sections. Photo top with
// date pill + bookmark overlay, body below with title, time, place, and
// a tiny attendee row.
const EventCard = ({ item, saved, onToggleSave }) => (
  <div style={{
    background: '#fff', borderRadius: 16,
    border: `1px solid ${C.line}`,
    boxShadow: '0 4px 14px -10px rgba(27,42,78,.22)',
    overflow: 'hidden',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 108, objectFit: 'cover', display: 'block',
      }}/>
      <div style={{
        position: 'absolute', top: 8, left: 8,
        background: item.dateBg, color: item.dateFg,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
        padding: '3px 7px', borderRadius: 5, letterSpacing: '.06em',
      }}>
        {item.dateLabel}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }}
        aria-label={saved ? 'Remove from saved' : 'Save'}
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 28, height: 28, borderRadius: 14,
          background: 'rgba(255,255,255,.92)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Heart
          size={13} strokeWidth={2}
          color={saved ? C.coralDeep : C.navy}
          fill={saved ? C.coralDeep : 'none'}
        />
      </button>
    </div>
    <div style={{ padding: '8px 10px 10px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800,
        color: C.navy, lineHeight: 1.2, letterSpacing: '-.005em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 30,
      }}>
        {item.title}
      </div>
      <div className="flex items-center" style={{ gap: 4, marginTop: 6 }}>
        <Calendar size={10} color={C.coralDeep}/>
        <span style={{ fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 600, color: C.inkSoft }}>
          {item.time}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 4, marginTop: 3 }}>
        <MapPin size={10} color={C.muted}/>
        <span style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.muted }}>
          {item.place}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 6, marginTop: 8 }}>
        <AttendeeAvatars/>
        <span style={{
          fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700, color: C.inkSoft,
        }}>
          {item.going} going
        </span>
      </div>
    </div>
  </div>
);

// 4 tiny overlapping circle avatars — pure CSS, no images so the cards
// load fast and stay layout-stable.
const AVATAR_TINTS = [C.coral, C.sageDark, '#5E4A8A', '#D9A441'];
const AttendeeAvatars = () => (
  <div className="flex" style={{ paddingLeft: 6 }}>
    {AVATAR_TINTS.map((bg, i) => (
      <span
        key={i}
        style={{
          width: 16, height: 16, borderRadius: 8,
          background: bg, border: '2px solid #fff',
          marginLeft: -6,
        }}
      />
    ))}
  </div>
);

// Mom chip — horizontal soft-tinted card. Photo round on left, info on
// right, tiny chat icon bottom-right.
const MomChip = ({ item }) => {
  const InterestIcon = item.interestIcon;
  return (
    <div style={{
      background: item.bg, borderRadius: 16,
      padding: '10px 10px 10px 10px',
      position: 'relative', minHeight: 96,
    }}>
      <div className="flex items-start" style={{ gap: 10 }}>
        <img src={item.photo} alt="" style={{
          width: 40, height: 40, borderRadius: 20, objectFit: 'cover',
          flexShrink: 0,
        }}/>
        <div className="flex-1 min-w-0">
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 800,
            color: C.navy, lineHeight: 1.1, letterSpacing: '-.01em',
          }}>
            {item.name}
          </div>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 10.5, color: C.inkSoft,
            marginTop: 2, lineHeight: 1.2,
          }}>
            Mom of {item.age}
          </div>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 4, marginTop: 8 }}>
        <MapPin size={10} color={C.muted}/>
        <span style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.inkSoft }}>
          {item.distance}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 4, marginTop: 3 }}>
        <InterestIcon size={10} color={item.interestColor} fill={item.interestColor === C.coralDeep ? item.interestColor : 'none'}/>
        <span style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.inkSoft }}>
          {item.interest}
        </span>
      </div>
      <button
        onClick={(e) => e.stopPropagation()}
        aria-label={`Message ${item.name}`}
        style={{
          position: 'absolute', bottom: 8, right: 8,
          width: 26, height: 26, borderRadius: 13,
          background: '#fff', border: `1px solid ${C.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <MessageCircle size={12} color={C.coralDeep}/>
      </button>
    </div>
  );
};

// PeekRow — horizontal row of fixed-width cards. The first two fit fully;
// the third extends past the phone's right edge, gets blurred + faded by
// a gradient overlay, signaling "more behind the unlock" (Hinge-style).
const PEEK_CARD_W = 152;

const PeekRow = ({ children }) => (
  <div style={{ position: 'relative', marginRight: -16, overflow: 'hidden' }}>
    <div style={{ display: 'flex', gap: 10 }}>
      {children}
    </div>
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 72,
      background: `linear-gradient(to right, rgba(251,245,239,0), ${C.cream} 70%)`,
      pointerEvents: 'none',
    }}/>
  </div>
);

const PeekCell = ({ children, blurred, onClick }) => (
  <div
    role={onClick && !blurred ? 'button' : undefined}
    onClick={blurred ? undefined : onClick}
    style={{
      flex: `0 0 ${PEEK_CARD_W}px`,
      cursor: onClick && !blurred ? 'pointer' : 'default',
      ...(blurred ? { filter: 'blur(6px)', opacity: 0.7, pointerEvents: 'none' } : {}),
    }}
  >
    {children}
  </div>
);

// Category tile — 3-up row at the bottom. Color-coded, with an arrow
// chevron in the corner suggesting tap-through.
const CategoryTile = ({ item, onClick }) => {
  const Icon = item.Icon;
  return (
    <button
      onClick={onClick}
      className="text-left active:scale-[.98] transition-transform"
      style={{
        background: item.bg, borderRadius: 14,
        padding: '12px 10px 12px', position: 'relative',
        border: 'none', cursor: 'pointer',
        minHeight: 96,
      }}
    >
      <div style={{
        position: 'absolute', top: 8, right: 8,
        opacity: 0.55,
      }}>
        <ChevronRight size={12} color={item.fg}/>
      </div>
      <div style={{
        width: 28, height: 28, borderRadius: 9,
        background: 'rgba(255,255,255,.6)', color: item.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
      }}>
        <Icon size={14} strokeWidth={2.2}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800,
        color: C.navy, lineHeight: 1.15, letterSpacing: '-.005em',
      }}>
        {item.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9.5, color: C.inkSoft,
        marginTop: 3, lineHeight: 1.25,
      }}>
        {item.sub}
      </div>
    </button>
  );
};

// --------------------------- screen ------------------------------

export const VillagePreview = ({
  onNext, onBack, savedItems = [], setSavedItems,
  location = '',
}) => {
  // Bookmark hook — toggling here marks the section for the post-onboarding
  // Favorites surface (My Village sheet).
  const [localSaved, setLocalSaved] = useState(new Set(savedItems));
  const isSaved = (id) => localSaved.has(id);
  const toggleSave = (id) => {
    setLocalSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // Propagate to App-level savedItems so the count + My Village pick it up.
      setSavedItems?.(Array.from(next));
      return next;
    });
  };

  void location;

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      {/* Top bar — back button (matches AboutYou pattern) */}
      <div className="flex items-center" style={{ padding: '6px 14px 4px' }}>
        <button
          onClick={onBack}
          className="rounded-full flex items-center justify-center"
          style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
          aria-label="Back"
        >
          <ChevronLeft size={18} color={C.navy}/>
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 px-4"
        style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}
      >
        {/* Two-line emotional headline */}
        <div style={{ paddingTop: 6 }}>
          <h2 style={{
            fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700,
            color: C.navy, lineHeight: 1.08, letterSpacing: '-.02em',
            margin: 0,
          }}>
            Less searching.
          </h2>
          <h2
            style={{
              fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700,
              color: C.coral, lineHeight: 1.08, letterSpacing: '-.02em',
              margin: '2px 0 0',
            }}
          >
            More making memories.
          </h2>
          <p style={{
            fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft,
            lineHeight: 1.4, marginTop: 8,
          }}>
            Real activities, local meetups, and mom connections — all in one place.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center" style={{ gap: 14, marginTop: 12 }}>
          <StatChip Icon={Calendar} count="12" label="activities" fg={C.coralDeep} bg={C.coralSoft}/>
          <StatChip Icon={Calendar} count="7"  label="meetups"    fg="#5E4A8A"    bg={C.lilac}/>
          <StatChip Icon={Heart}    count="3"  label="moms nearby" fg={C.coralDeep} bg={C.coralSoft}/>
        </div>

        {/* Things to do this week */}
        <SectionHead title="Things to do this week" link="See all" onLink={onNext}/>
        <PeekRow>
          {ACTIVITIES.map((item, i) => (
            <PeekCell key={item.id} blurred={i === 2} onClick={onNext}>
              <EventCard
                item={item}
                saved={isSaved(item.id)}
                onToggleSave={() => toggleSave(item.id)}
              />
            </PeekCell>
          ))}
        </PeekRow>

        {/* Meetups this week */}
        <SectionHead title="Meetups this week" link="See all" onLink={onNext}/>
        <PeekRow>
          {MEETUPS.map((item, i) => (
            <PeekCell key={item.id} blurred={i === 2} onClick={onNext}>
              <EventCard
                item={item}
                saved={isSaved(item.id)}
                onToggleSave={() => toggleSave(item.id)}
              />
            </PeekCell>
          ))}
        </PeekRow>

        {/* Moms near you */}
        <SectionHead title="Moms near you" link="See all" onLink={onNext}/>
        <PeekRow>
          {MOMS_NEARBY.map((item, i) => (
            <PeekCell key={item.id} blurred={i === 2} onClick={onNext}>
              <MomChip item={item}/>
            </PeekCell>
          ))}
        </PeekRow>

        {/* Trusted local picks */}
        <SectionHead title="Trusted local picks" link="See all" onLink={onNext}/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {CATEGORIES.map(item => (
            <CategoryTile key={item.id} item={item} onClick={onNext}/>
          ))}
        </div>

        <div style={{ height: 14 }}/>
      </div>

      {/* Bottom CTA — coral gradient with subtitle + arrow circle */}
      <div style={{
        padding: '8px 16px 6px',
        flexShrink: 0,
      }}>
        <button
          onClick={onNext}
          className="w-full rounded-2xl active:scale-[.99] transition-transform"
          style={{
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '12px 14px',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 22px -10px rgba(214,68,106,.55)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <div className="flex-1 text-left">
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 800,
              lineHeight: 1.1,
            }}>
              See Everything Waiting For You
            </div>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 500,
              opacity: .92, marginTop: 3, lineHeight: 1.3,
            }}>
              Unlock activities, meetups, and moms in your area.
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 16,
            background: 'rgba(255,255,255,.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowRight size={15} color="#fff" strokeWidth={2.4}/>
          </div>
        </button>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted,
          textAlign: 'center', marginTop: 6,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
        }}>
          Your village is private and only visible to you.
        </div>
      </div>
    </div>
  );
};

// Avoid prop-warning noise — `Bookmark` is left available for future
// promotion of save-toggle into a primary action.
void Bookmark;
