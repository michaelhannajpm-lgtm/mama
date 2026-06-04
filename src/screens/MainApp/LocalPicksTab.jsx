import { useState } from 'react';
import {
  Search, MapPin, GraduationCap, School, Brain, Star,
  Music, Activity, Sparkles, ChevronRight,
  HeartHandshake, Scale, Wallet, Stethoscope, Smile, Users,
} from 'lucide-react';
import { C } from '../../theme';

// ==========================================================================
// LocalPicksTab — V5 "Local Picks" surface.
//
//   • Search bar with location pin icon
//   • 4 quick-jump tiles: Top Places · Programs · Schools · Mental
//   • "Top Places" — 3 photo cards w/ rating + distance
//   • "Programs For Your Child" — 3 program cards
//   • "Schools Near You" — 3 school cards w/ rating + tag
//   • "Support You Can Count On" — 4 support chips
// ==========================================================================

const QUICK_TILES = [
  { id: 'places',   label: 'Top Places',  icon: MapPin,         fg: C.coralDeep, bg: C.coralSoft },
  { id: 'programs', label: 'Programs',    icon: GraduationCap,  fg: '#5E4A8A',   bg: C.lilac     },
  { id: 'schools',  label: 'Schools',     icon: School,         fg: C.sageDark,  bg: C.sage      },
  { id: 'support',  label: 'Mental',      icon: Brain,          fg: '#8A6610',   bg: '#FFF4D6'   },
];

const TOP_PLACES = [
  {
    id: 'tp1', title: 'Tampa Riverwalk Splash Pad',
    rating: 4.8, distance: '0.4 mi away',
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp2', title: 'ZooTampa at Lowry Park',
    rating: 4.7, distance: '2.1 mi away',
    photo: 'https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp3', title: "Glazer Children's Museum",
    rating: 4.9, distance: '1.5 mi away',
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
];

const PROGRAMS = [
  {
    id: 'pr1', title: 'Music Together', ages: 'Ages 0–5',
    distance: '0.6 mi away', Icon: Music,
    bg: C.coralSoft, fg: C.coralDeep,
  },
  {
    id: 'pr2', title: 'Soccer Kids', ages: 'Ages 3–12',
    distance: '0.9 mi away', Icon: Activity,
    bg: C.lilac, fg: '#5E4A8A',
  },
  {
    id: 'pr3', title: 'Swim Lessons', ages: 'Ages 0–8',
    distance: '0.9 mi away', Icon: Sparkles,
    bg: C.sage, fg: C.sageDark,
  },
];

const SCHOOLS = [
  {
    id: 's1', title: 'Bright Horizons at Harbour Island',
    rating: 4.7, distance: '0.7 mi away', tag: 'Sports available',
    tagBg: C.sage, tagFg: C.sageDark,
    photo: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&auto=format&fit=crop',
  },
  {
    id: 's2', title: 'Primrose School of South Tampa',
    rating: 4.8, distance: '2.1 mi away', tag: 'Waitlist',
    tagBg: '#FFF4D6', tagFg: '#8A6610',
    photo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&auto=format&fit=crop',
  },
  {
    id: 's3', title: 'Sunshine Preschool & VPK',
    rating: 4.6, distance: '1.5 mi away', tag: 'Sports available',
    tagBg: C.sage, tagFg: C.sageDark,
    photo: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=400&auto=format&fit=crop',
  },
];

const SUPPORT = [
  { id: 'pp',  label: 'Postpartum Support', icon: HeartHandshake, bg: C.coralSoft, fg: C.coralDeep },
  { id: 'leg', label: 'Legal Help',         icon: Scale,          bg: C.lilac,     fg: '#5E4A8A'   },
  { id: 'fin', label: 'Financial Help',     icon: Wallet,         bg: '#FFF4D6',   fg: '#8A6610'   },
  { id: 'ped', label: 'Pediatric Care',     icon: Stethoscope,    bg: C.sage,      fg: C.sageDark  },
  { id: 'men', label: 'Mental Health',      icon: Smile,          bg: C.coralSoft, fg: C.coralDeep },
  { id: 'par', label: 'Parenting Groups',   icon: Users,          bg: C.lilac,     fg: '#5E4A8A'   },
];

// -------------------------- shared --------------------------

const SectionHead = ({ title, link = 'See all' }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 14, marginBottom: 10 }}>
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

const QuickTile = ({ item }) => {
  const Icon = item.icon;
  return (
    <button
      style={{
        flexShrink: 0,
        background: '#fff', border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, minWidth: 70,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: item.bg, color: item.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
        color: C.navy, marginTop: 2,
      }}>
        {item.label}
      </div>
    </button>
  );
};

const PhotoCard = ({ item }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
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
        <span style={{
          fontWeight: 500, color: C.muted, marginLeft: 4,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={8}/> {item.distance}
        </span>
      </div>
    </div>
  </div>
);

const ProgramCard = ({ item }) => {
  const Icon = item.Icon;
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `1px solid ${C.line}`,
      boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 62, background: item.bg, color: item.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={26}/>
      </div>
      <div style={{ padding: '6px 7px 8px' }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
          color: C.navy, lineHeight: 1.2,
        }}>
          {item.title}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 3,
        }}>
          {item.ages}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2, marginTop: 3,
          fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
        }}>
          <MapPin size={8}/> {item.distance}
        </div>
      </div>
    </div>
  );
};

const SchoolCard = ({ item }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
  }}>
    <img src={item.photo} alt="" style={{
      width: '100%', height: 60, objectFit: 'cover', display: 'block',
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
        display: 'flex', alignItems: 'center', gap: 3, marginTop: 3,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, color: C.navy,
      }}>
        <Star size={9} fill={C.saffron} color={C.saffron}/>
        {item.rating}
        <span style={{
          fontWeight: 500, color: C.muted, marginLeft: 3,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={8}/> {item.distance}
        </span>
      </div>
      <div style={{
        marginTop: 4, display: 'inline-block',
        background: item.tagBg, color: item.tagFg,
        fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700,
        padding: '1.5px 5px', borderRadius: 4,
      }}>
        {item.tag}
      </div>
    </div>
  </div>
);

const SupportChip = ({ item }) => {
  const Icon = item.icon;
  return (
    <button
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 12px', borderRadius: 18,
        background: item.bg, color: item.fg,
        border: 'none', cursor: 'pointer',
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
      }}
    >
      <Icon size={12}/>
      {item.label}
    </button>
  );
};

// -------------------------- screen --------------------------

export const LocalPicksTab = ({ savedItems, setSavedItems, location, flash }) => {
  void savedItems; void setSavedItems; void location; void flash;
  const [query, setQuery] = useState('');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-5" style={{ paddingBottom: 6 }}>
        <div
          className="flex items-center gap-2 rounded-full px-3"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, height: 40 }}
        >
          <Search size={14} color={C.muted}/>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places, programs, schools, support…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'Albert Sans', fontSize: 12, color: C.navy,
            }}
          />
          <MapPin size={14} color={C.coralDeep}/>
        </div>
      </div>

      {/* Quick tiles */}
      <div className="px-5" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 4 }}>
          {QUICK_TILES.map(item => <QuickTile key={item.id} item={item}/>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 16 }}>
        {/* Top Places */}
        <SectionHead title="Top Places"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {TOP_PLACES.map(item => <PhotoCard key={item.id} item={item}/>)}
        </div>

        {/* Programs For Your Child */}
        <SectionHead title="Programs For Your Child"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {PROGRAMS.map(item => <ProgramCard key={item.id} item={item}/>)}
        </div>

        {/* Schools Near You */}
        <SectionHead title="Schools Near You"/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {SCHOOLS.map(item => <SchoolCard key={item.id} item={item}/>)}
        </div>

        {/* Support You Can Count On */}
        <SectionHead title="Support You Can Count On"/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUPPORT.map(item => <SupportChip key={item.id} item={item}/>)}
        </div>
      </div>
    </div>
  );
};
