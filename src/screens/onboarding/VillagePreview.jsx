import { useState } from 'react';
import { Heart, ChevronLeft, MapPin, Bookmark } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// VillagePreview — ported from docs/HTML/GoMama-Prototype-html.html (Screen 3).
// Section kicker = 9px uppercase coralDeep; section title = larger Fraunces
// serif. Cards are horizontal photo cards (88px image left, title/sub/meta
// right, 🔖 bookmark top-right). The body scrolls internally to keep the
// header + CTA visible on iPhone SE.
// ==========================================================================

const PREVIEW_DATA = [
  {
    section: 'YOUR PEOPLE',
    title: 'Mom Matches',
    items: [
      { id: 'm1', title: 'Sarah M.', sub: 'Working mom · toddler (2)',  meta: '0.4 mi · 92% match', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop' },
      { id: 'm2', title: 'Maya R.',  sub: 'New to Tampa · 1yo',         meta: '0.7 mi · 89% match', photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&auto=format&fit=crop' },
      { id: 'm3', title: 'Jess T.',  sub: 'Stay-at-home · 2 kids',      meta: '1.1 mi · 87% match', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop' },
    ],
  },
  {
    section: 'MEET NEARBY',
    title: 'Group Meetups',
    items: [
      { id: 'g1', title: 'Toddler & Coffee Club', sub: 'Hosted by Lara · 6 going', meta: 'Sat 10am · 0.8 mi', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop' },
      { id: 'g2', title: 'Park Picnic Sundays',   sub: 'Open to all · 12 going',   meta: 'Sun 11am · 0.5 mi', photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=400&auto=format&fit=crop' },
      { id: 'g3', title: 'Stroller Walk Crew',    sub: 'Weekly · 8 going',         meta: 'Sat 8am · 1.0 mi',  photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&auto=format&fit=crop' },
    ],
  },
  {
    section: 'THIS WEEK',
    title: 'Activities for kids',
    items: [
      { id: 'a1', title: 'Little Sprouts Music', sub: 'Drop-in · sliding scale', meta: 'Tue/Thu · Ages 1–3', photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop' },
      { id: 'a2', title: 'Splash & Story Hour',  sub: 'Free at library',         meta: 'Sat 11am · Family',  photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop' },
      { id: 'a3', title: 'Bay Area Swim Club',   sub: 'Drop-in · ages 3+',       meta: 'Wed 10am · 0.6 mi',  photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop' },
    ],
  },
];

const StepDots = ({ current, total }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i + 1 === current ? 22 : 7,
        height: 7,
        borderRadius: 4,
        background: i + 1 === current ? C.coral : C.line,
      }}/>
    ))}
  </div>
);

// Horizontal photo card — 88px image on the left, text on the right,
// bookmark in the top-right corner.
const PhotoCard = ({ photo, title, sub, meta, saved, onSave }) => (
  <div
    className="flex items-center overflow-hidden relative"
    style={{
      background: '#fff',
      borderRadius: 12,
      border: `1px solid ${C.line}`,
      marginBottom: 6,
      boxShadow: '0 3px 8px -6px rgba(27,42,78,.15)',
    }}
  >
    <img
      src={photo}
      alt=""
      style={{ width: 88, height: 88, objectFit: 'cover', flexShrink: 0, display: 'block' }}
    />
    <div className="flex-1 min-w-0" style={{ padding: '8px 28px 8px 10px' }}>
      <div className="truncate" style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div className="truncate" style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 2,
      }}>
        {sub}
      </div>
      <div className="flex items-center gap-1 truncate" style={{ marginTop: 3 }}>
        <MapPin size={9} color={C.navySoft}/>
        <span style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 600, color: C.navySoft,
        }}>
          {meta}
        </span>
      </div>
    </div>
    <button
      onClick={onSave}
      aria-label={saved ? 'Unsave' : 'Save'}
      style={{
        position: 'absolute', top: 6, right: 6,
        width: 22, height: 22, borderRadius: 11,
        background: 'rgba(255,255,255,.92)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Bookmark
        size={12}
        color={saved ? C.coralDeep : C.muted}
        fill={saved ? C.coralDeep : 'none'}
      />
    </button>
  </div>
);

export const VillagePreview = ({ onNext, onBack, savedItems = [], setSavedItems }) => {
  const [localSaved, setLocalSaved] = useState(new Set(savedItems));

  const toggleSave = (id) => {
    setLocalSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSavedItems?.([...next]);
      return next;
    });
  };

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      <div className="flex items-center justify-between" style={{ padding: '8px 14px' }}>
        <button
          onClick={onBack}
          className="rounded-full flex items-center justify-center"
          style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
          aria-label="Back"
        >
          <ChevronLeft size={18} color={C.navy}/>
        </button>
        <StepDots current={3} total={4}/>
        <div style={{ width: 32 }}/>
      </div>

      <div className="px-4" style={{ paddingBottom: 8, flexShrink: 0 }}>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700,
          color: C.navy, lineHeight: 1.15, letterSpacing: '-.01em',
        }}>
          Here's{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>your village</span>
        </h2>
        <p style={{
          fontFamily: 'Albert Sans', fontSize: 11, color: C.muted,
          marginTop: 2, lineHeight: 1.4,
        }}>
          Top picks curated for you.
        </p>
      </div>

      <div className="flex-1 px-4" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {PREVIEW_DATA.map((sec, sIdx) => (
          <div key={sec.title} style={{ marginTop: sIdx === 0 ? 0 : 12 }}>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
              letterSpacing: '.12em', color: C.coralDeep, marginBottom: 2,
            }}>
              {sec.section}
            </div>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 15, fontWeight: 600,
              color: C.navy, marginBottom: 6, letterSpacing: '-.01em',
            }}>
              {sec.title}
            </div>

            {sec.items.map(item => (
              <PhotoCard
                key={item.id}
                photo={item.photo}
                title={item.title}
                sub={item.sub}
                meta={item.meta}
                saved={localSaved.has(item.id)}
                onSave={() => toggleSave(item.id)}
              />
            ))}
          </div>
        ))}

        <div style={{ height: 4 }}/>
      </div>

      <div style={{
        padding: '8px 16px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
        borderTop: `1px solid ${C.line}`,
        flexShrink: 0,
      }}>
        <button
          onClick={onNext}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', height: 48,
            fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 800,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 20px -8px rgba(214,68,106,.5)',
          }}
        >
          <Heart size={15} fill="currentColor"/>
          Unlock my village
        </button>
      </div>
    </div>
  );
};
