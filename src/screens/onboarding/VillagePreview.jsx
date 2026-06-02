import { useState } from 'react';
import { Heart, ChevronLeft, MapPin, Bookmark } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// VillagePreview — ported from the GoMama Expo prototype.
// Shown after AboutYou, before CreateAccount. Three horizontally-scrollable
// sections that demonstrate the value of signing up:
//   · Mom Matches
//   · Group Meetups
//   · Activities for kids
// Step 3 of 4 in the new 4-screen onboarding.
// ==========================================================================

const PREVIEW_DATA = [
  {
    section: 'YOUR PEOPLE',
    title: 'Mom Matches',
    items: [
      { id: 'm1', title: 'Sarah M.', sub: 'Working mom · toddler (2)', meta: '0.4 mi · 92% match',
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop' },
      { id: 'm2', title: 'Maya R.',  sub: 'New to Tampa · 1yo',         meta: '0.7 mi · 89% match',
        photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&auto=format&fit=crop' },
      { id: 'm3', title: 'Jess T.',  sub: 'Stay-at-home · twins (3)',   meta: '1.1 mi · 87% match',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop' },
    ],
  },
  {
    section: 'MEET NEARBY',
    title: 'Group Meetups',
    items: [
      { id: 'g1', title: 'Toddler & Coffee Club', sub: '6 moms · kids 1–3', meta: 'Sat 10am · 0.8 mi',
        photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop' },
      { id: 'g2', title: 'Park Picnic Sundays',   sub: 'Open to all',       meta: 'Sun 11am · 0.5 mi',
        photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=400&auto=format&fit=crop' },
      { id: 'g3', title: 'Stroller Walk Crew',    sub: 'Riverwalk · 5 moms',meta: 'Sat 8am · 0.3 mi',
        photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&auto=format&fit=crop' },
    ],
  },
  {
    section: 'THIS WEEK',
    title: 'Activities for your kids',
    items: [
      { id: 'a1', title: 'Little Sprouts Music', sub: 'Drop-in · sliding scale', meta: 'Tue/Thu · 0.6 mi',
        photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop' },
      { id: 'a2', title: 'Splash & Story Hour',  sub: 'Free at library',         meta: 'Sat 11am · 0.9 mi',
        photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop' },
      { id: 'a3', title: 'Bay Area Swim Club',   sub: 'Parent + me classes',     meta: 'Wed 10am · 0.8 mi',
        photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop' },
    ],
  },
];

const StepDots = ({ current, total }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i + 1 === current ? 24 : 8,
        height: 8,
        borderRadius: 4,
        background: i + 1 === current ? C.coral : C.line,
      }}/>
    ))}
  </div>
);

const PhotoCard = ({ photo, title, sub, meta, saved, onSave }) => (
  <div
    className="flex rounded-2xl overflow-hidden mb-2 relative"
    style={{ background: '#fff', border: `1px solid ${C.line}` }}
  >
    <img src={photo} alt="" style={{ width: 88, height: 88, objectFit: 'cover' }}/>
    <div className="flex-1 px-2.5 py-2 flex flex-col justify-center min-w-0">
      <div className="text-[13px] truncate" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
        {title}
      </div>
      <div className="text-[10.5px] mt-0.5 truncate" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
        {sub}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <MapPin size={10} color={C.navySoft}/>
        <span className="text-[9.5px]" style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: C.navySoft }}>
          {meta}
        </span>
      </div>
    </div>
    <button
      onClick={onSave}
      style={{
        position: 'absolute', top: 6, right: 6,
        padding: 4, background: 'transparent', border: 'none', cursor: 'pointer',
      }}
      aria-label={saved ? 'Unsave' : 'Save'}
    >
      <Bookmark size={14} color={saved ? C.coralDeep : C.muted} fill={saved ? C.coralDeep : 'none'}/>
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
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, background: '#fff', border: `1px solid ${C.line}` }}
          aria-label="Back"
        >
          <ChevronLeft size={20} color={C.navy}/>
        </button>
        <StepDots current={3} total={4}/>
        <div style={{ width: 36 }}/>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none' }}>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 26, fontWeight: 600,
          color: C.navy, lineHeight: 1.1, letterSpacing: '-.02em',
        }}>
          Here's{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>your village</span>
        </h2>
        <p className="mt-2 mb-5 text-[13px]" style={{ fontFamily: 'Albert Sans', color: C.muted, lineHeight: 1.4 }}>
          Top picks curated for you.
        </p>

        {PREVIEW_DATA.map(sec => (
          <div key={sec.title} className="mb-6">
            <div className="text-[9px] mb-1" style={{
              fontFamily: 'Albert Sans', fontWeight: 800, letterSpacing: '.12em',
              color: C.coralDeep,
            }}>
              {sec.section}
            </div>
            <div className="text-[17px] mb-2.5" style={{
              fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy,
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
        <div style={{ height: 8 }}/>
      </div>

      <div className="px-5 pb-6 pt-3">
        <button
          onClick={onNext}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '15px 24px',
            fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 22px -8px rgba(214,68,106,.55)',
          }}
        >
          <Heart size={16} fill="currentColor"/>
          Unlock my village
        </button>
      </div>
    </div>
  );
};
