import { useState } from 'react';
import {
  Heart, ChevronLeft, ChevronRight, Bell, SlidersHorizontal, Bookmark,
  Calendar, MapPin, Users, Briefcase, Sparkles,
} from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// VillagePreview — onboarding screen 3.
// V5 layout: "Here's what's waiting for you" with three preview rows
// (Things to do this week · Moms nearby · Local picks) and a coral
// "Unlock My Village" CTA.
// ==========================================================================

// Meetups have their own "Group Meetups nearby" section below, so they're
// excluded here to avoid duplication.
const ACTIVITIES = [
  {
    id: 'a1', kind: 'event', kindLabel: 'EVENT', kindBg: C.coralSoft, kindFg: C.coralDeep,
    title: 'Storytime at The Yard',
    when: 'Tomorrow · 10:00 AM',
    where: 'South Tampa',
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop',
  },
  {
    id: 'a3', kind: 'class', kindLabel: 'CLASS', kindBg: C.lilac, kindFg: '#5E4A8A',
    title: 'Soccer Skills Clinic',
    when: 'Sun, May 12 · 9:30 AM',
    where: 'Westchase',
    photo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&auto=format&fit=crop',
  },
];

const GROUP_MEETUPS = [
  {
    id: 'g1', kind: 'meetup', kindLabel: 'MEETUP', kindBg: C.sage, kindFg: C.sageDark,
    title: 'Stroller Walk @ Bayshore',
    when: 'Sat, May 11 · 8:30 AM',
    where: 'Bayshore Blvd',
    photo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&auto=format&fit=crop',
  },
  {
    id: 'g2', kind: 'meetup', kindLabel: 'MEETUP', kindBg: C.sage, kindFg: C.sageDark,
    title: 'Mom + Tots Picnic',
    when: 'Sun, May 12 · 11:00 AM',
    where: 'Hyde Park',
    photo: 'https://images.unsplash.com/photo-1526635467535-09354c1bdd66?w=400&auto=format&fit=crop',
  },
];

const MOMS_NEARBY = [
  {
    id: 'm1', name: 'Sarah', kids: '2 kids', distance: '0.4 mi',
    tag: 'Solo dad', tagBg: C.coralSoft, tagFg: C.coralDeep, Icon: Heart,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
  },
  {
    id: 'm2', name: 'Amanda', kids: '1 kid', distance: '0.7 mi',
    tag: 'Working mom', tagBg: C.lilac, tagFg: '#5E4A8A', Icon: Briefcase,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop',
  },
  {
    id: 'm3', name: 'Jessica', kids: '2 kids', distance: '0.8 mi',
    tag: 'Lives nearby', tagBg: C.sage, tagFg: C.sageDark, Icon: MapPin,
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&auto=format&fit=crop',
  },
];

const LOCAL_PICKS = [
  {
    id: 'p1', title: 'Bayshore Playground',
    distance: '0.4 mi away',
    photo: 'https://images.unsplash.com/photo-1571086291540-b137111ff5a3?w=400&auto=format&fit=crop',
  },
  {
    id: 'p2', title: 'Little Explorers Play Cafe',
    distance: '0.8 mi away',
    photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop',
  },
  {
    id: 'p3', title: 'Best Daycares Near You',
    distance: '1.2 mi away',
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
];

// -------------------------- shared bits --------------------------

const SectionHead = ({ Icon, iconBg, iconFg, title, link }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 14, marginBottom: 8 }}>
    <div className="flex items-center gap-2">
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: iconBg, color: iconFg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13}/>
      </div>
      <div style={{
        fontFamily: 'Fraunces', fontSize: 15, fontWeight: 700,
        color: C.navy, letterSpacing: '-.01em',
      }}>
        {title}
      </div>
    </div>
    <button
      style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 1,
        color: C.coral,
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {link} <ChevronRight size={11}/>
    </button>
  </div>
);

const KindPill = ({ label, bg, fg }) => (
  <span style={{
    background: bg, color: fg,
    fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
    padding: '2px 6px', borderRadius: 4,
    letterSpacing: '.06em',
    display: 'inline-block', whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

// -------------------------- card primitives --------------------------

const ActivityCard = ({ item }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 64, objectFit: 'cover', display: 'block',
      }}/>
      <div style={{
        position: 'absolute', top: 5, left: 5,
      }}>
        <KindPill label={item.kindLabel} bg={item.kindBg} fg={item.kindFg}/>
      </div>
    </div>
    <div style={{ padding: '6px 7px 7px' }}>
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
        display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 600,
        color: C.coralDeep, marginTop: 4,
      }}>
        <Calendar size={9}/>
        <span style={{ lineHeight: 1.1 }}>{item.when}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 2,
      }}>
        <MapPin size={9}/>
        <span>{item.where}</span>
      </div>
    </div>
  </div>
);

const MomCard = ({ item }) => {
  const Icon = item.Icon;
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${C.line}`,
      boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)',
      padding: '10px 6px 9px',
      textAlign: 'center',
    }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img src={item.photo} alt="" style={{
          width: 54, height: 54, borderRadius: 27, objectFit: 'cover',
          display: 'block',
        }}/>
        <div style={{
          position: 'absolute', top: 1, right: 1,
          width: 9, height: 9, borderRadius: 5,
          background: C.sageDark, border: '1.5px solid #fff',
        }}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
        color: C.navy, marginTop: 5, lineHeight: 1.1,
      }}>
        {item.name}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 2,
      }}>
        {item.kids} · {item.distance}
      </div>
      <div style={{ marginTop: 5, display: 'inline-flex' }}>
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
    </div>
  );
};

const PlaceCard = ({ item }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)',
    overflow: 'hidden',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 60, objectFit: 'cover', display: 'block',
      }}/>
    </div>
    <div style={{ padding: '6px 7px 7px' }}>
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
        display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 3,
      }}>
        <MapPin size={9}/>
        <span>{item.distance}</span>
      </div>
    </div>
  </div>
);

// -------------------------- screen --------------------------

export const VillagePreview = ({ onNext, onBack, savedItems = [], setSavedItems }) => {
  // Preserve bookmark hook for downstream — saving here marks the section
  // for the post-onboarding Favorites surface.
  const [localSaved] = useState(new Set(savedItems));
  void localSaved; void setSavedItems;

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      {/* Top bar — back left, bell + filter right */}
      <div className="flex items-center justify-between" style={{ padding: '6px 14px 4px' }}>
        <button
          onClick={onBack}
          className="rounded-full flex items-center justify-center"
          style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
          aria-label="Back"
        >
          <ChevronLeft size={18} color={C.navy}/>
        </button>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full flex items-center justify-center relative"
            style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
            aria-label="Notifications"
          >
            <Bell size={14} color={C.coralDeep}/>
            <span style={{
              position: 'absolute', top: 3, right: 5,
              width: 6, height: 6, borderRadius: 3, background: C.coralDeep,
              border: '1.5px solid #fff',
            }}/>
          </button>
          <button
            className="rounded-full flex items-center justify-center"
            style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
            aria-label="Filters"
          >
            <SlidersHorizontal size={14} color={C.navy}/>
          </button>
        </div>
      </div>

      {/* Headline */}
      <div className="px-4" style={{ paddingBottom: 4, flexShrink: 0 }}>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700,
          color: C.navy, lineHeight: 1.15, letterSpacing: '-.015em',
        }}>
          Meet <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>your</span>
        </h2>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700,
          color: C.navy, lineHeight: 1.15, letterSpacing: '-.015em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          village
          <Heart size={16} color={C.coral} fill={C.coral} style={{ transform: 'rotate(-10deg)' }}/>
        </h2>
      </div>

      <div className="flex-1 px-4" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
        {/* Things to do this week */}
        <SectionHead
          Icon={Calendar} iconBg={C.coralSoft} iconFg={C.coralDeep}
          title="Things to do this week"
          link="See all 48 activities"
        />
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {ACTIVITIES.slice(0, 2).map(item => (
            <ActivityCard key={item.id} item={item}/>
          ))}
        </div>

        {/* Group Meetups nearby */}
        <SectionHead
          Icon={Users} iconBg={C.sage} iconFg={C.sageDark}
          title="Group Meetups nearby"
          link="See all"
        />
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {GROUP_MEETUPS.slice(0, 2).map(item => (
            <ActivityCard key={item.id} item={item}/>
          ))}
        </div>

        {/* Moms nearby */}
        <SectionHead
          Icon={Users} iconBg={C.lilac} iconFg="#5E4A8A"
          title="Moms nearby"
          link="See all"
        />
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {MOMS_NEARBY.slice(0, 2).map(item => (
            <MomCard key={item.id} item={item}/>
          ))}
        </div>
        <button
          className="w-full"
          style={{
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '8px 0 4px',
            color: C.coralDeep,
            fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Sparkles size={10}/> 9 more moms like you
          <ChevronRight size={11}/>
        </button>

        {/* Local picks */}
        <SectionHead
          Icon={MapPin} iconBg={C.sage} iconFg={C.sageDark}
          title="Local picks"
          link="See all 23 local picks"
        />
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {LOCAL_PICKS.slice(0, 2).map(item => (
            <PlaceCard key={item.id} item={item}/>
          ))}
        </div>

        <div style={{ height: 10 }}/>
      </div>

      {/* Coral CTA */}
      <div style={{
        padding: '8px 16px 6px',
        flexShrink: 0,
      }}>
        <button
          onClick={onNext}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', height: 48,
            fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 800,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 20px -8px rgba(214,68,106,.5)',
          }}
        >
          <Bookmark size={15} fill="currentColor"/>
          Unlock My Village
          <ChevronRight size={16}/>
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
