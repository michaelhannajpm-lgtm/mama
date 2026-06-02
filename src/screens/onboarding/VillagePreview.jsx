import { useState } from 'react';
import { Heart, ChevronLeft, MapPin, Bookmark } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// VillagePreview — sized to fit iPhone SE (375x667) without scroll.
// Each section is condensed to a compact horizontal carousel of small cards
// (66x photo, photo card 132 wide). 3 sections fit stacked vertically;
// users swipe inside each row to see all 3 picks.
// ==========================================================================

const PREVIEW_DATA = [
  {
    section: 'YOUR PEOPLE',
    title: 'Mom Matches',
    items: [
      { id: 'm1', title: 'Sarah M.', sub: '0.4 mi · 92%', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop' },
      { id: 'm2', title: 'Maya R.',  sub: '0.7 mi · 89%', photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&auto=format&fit=crop' },
      { id: 'm3', title: 'Jess T.',  sub: '1.1 mi · 87%', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop' },
    ],
  },
  {
    section: 'MEET NEARBY',
    title: 'Group Meetups',
    items: [
      { id: 'g1', title: 'Toddler Coffee Club', sub: 'Sat 10am',  photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop' },
      { id: 'g2', title: 'Park Picnic Sundays', sub: 'Sun 11am',  photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=400&auto=format&fit=crop' },
      { id: 'g3', title: 'Stroller Walk Crew',  sub: 'Sat 8am',   photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&auto=format&fit=crop' },
    ],
  },
  {
    section: 'THIS WEEK',
    title: 'Activities for kids',
    items: [
      { id: 'a1', title: 'Little Sprouts Music', sub: 'Tue/Thu',  photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop' },
      { id: 'a2', title: 'Splash & Story Hour',  sub: 'Sat 11am', photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop' },
      { id: 'a3', title: 'Bay Area Swim Club',   sub: 'Wed 10am', photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop' },
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

const MiniCard = ({ photo, title, sub, saved, onSave }) => (
  <div
    className="rounded-xl overflow-hidden relative flex-shrink-0"
    style={{ width: 124, background: '#fff', border: `1px solid ${C.line}` }}
  >
    <img src={photo} alt="" style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }}/>
    <button
      onClick={onSave}
      style={{
        position: 'absolute', top: 4, right: 4,
        width: 22, height: 22, borderRadius: 11,
        background: 'rgba(255,255,255,.92)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      aria-label={saved ? 'Unsave' : 'Save'}
    >
      <Bookmark size={12} color={saved ? C.coralDeep : C.muted} fill={saved ? C.coralDeep : 'none'}/>
    </button>
    <div style={{ padding: '5px 7px 7px' }}>
      <div className="truncate" style={{ fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, color: C.navy, lineHeight: 1.15 }}>
        {title}
      </div>
      <div className="truncate flex items-center gap-0.5" style={{ marginTop: 2 }}>
        <MapPin size={9} color={C.navySoft}/>
        <span style={{ fontFamily: 'Albert Sans', fontSize: 9.5, color: C.navySoft, fontWeight: 600 }}>
          {sub}
        </span>
      </div>
    </div>
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

      <div className="flex-1 px-5" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600,
          color: C.navy, lineHeight: 1.12, letterSpacing: '-.02em',
        }}>
          Here's{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>your village</span>
        </h2>
        <p className="mt-1 text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.muted, lineHeight: 1.35 }}>
          Top picks curated for you.
        </p>

        {PREVIEW_DATA.map(sec => (
          <div key={sec.title} style={{ marginTop: 14 }}>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
              letterSpacing: '.12em', color: C.coralDeep, marginBottom: 2,
            }}>
              {sec.section}
            </div>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700,
              color: C.navy, marginBottom: 8,
            }}>
              {sec.title}
            </div>

            <div
              className="flex gap-2 overflow-x-auto"
              style={{
                scrollbarWidth: 'none',
                marginLeft: -20, marginRight: -20,
                paddingLeft: 20, paddingRight: 20, paddingBottom: 4,
              }}
            >
              {sec.items.map(item => (
                <MiniCard
                  key={item.id}
                  photo={item.photo}
                  title={item.title}
                  sub={item.sub}
                  saved={localSaved.has(item.id)}
                  onSave={() => toggleSave(item.id)}
                />
              ))}
            </div>
          </div>
        ))}

        <div style={{ height: 4 }}/>
      </div>

      <div style={{
        padding: '8px 20px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
      }}>
        <button
          onClick={onNext}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '13px 24px',
            fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 22px -8px rgba(214,68,106,.55)',
          }}
        >
          <Heart size={15} fill="currentColor"/>
          Unlock my village
        </button>
      </div>
    </div>
  );
};
