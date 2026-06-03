import { useState } from 'react';
import { Heart, ChevronLeft, MapPin, Bookmark, X } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { recordStep } from '../../lib/onboarding';

const INTEREST_OPTIONS = [
  '🌳 Outdoors',
  '☕ Coffee',
  '🧘‍♀️ Wellness',
  '🎨 Crafts',
  '📚 Books',
];

// ==========================================================================
// VillagePreview — onboarding screen 3.
// Compressed so Mom Matches + Group Meetups both sit above the fold on a
// 375×740 phone, with the Activities kicker peeking as a scroll teaser.
// Cards are horizontal photo cards (72px image left, copy right, 🔖 top-right).
// Mom cards carry a match-% chip overlaid on the photo top-left.
// ==========================================================================

const PREVIEW_DATA = [
  {
    section: 'YOUR PEOPLE',
    title: 'Mom Matches',
    count: '12 nearby',
    items: [
      { id: 'm1', title: 'Sarah M.', sub: 'Toddler at Curtis Hixon most mornings', meta: '0.4 mi away', badge: '92%', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop' },
      { id: 'm2', title: 'Maya R.',  sub: 'New to Tampa · loves coffee walks',     meta: '0.7 mi away', badge: '89%', photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&auto=format&fit=crop' },
    ],
  },
  {
    section: 'MEET NEARBY',
    title: 'Group Meetups',
    count: '8 this week',
    items: [
      { id: 'g1', title: 'Toddler & Coffee Club', sub: 'Hyde Park · Sat 10am', meta: '3 of your matches going', photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop' },
      { id: 'g2', title: 'Park Picnic Sundays',   sub: 'Bayshore · Sun 11am',  meta: '2 of your matches going', photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=400&auto=format&fit=crop' },
    ],
  },
  {
    section: 'THIS WEEK',
    title: 'Activities for kids',
    count: '6 picks',
    items: [
      { id: 'a1', title: 'Little Sprouts Music', sub: 'Drop-in · sliding scale', meta: 'Tue/Thu · Ages 1–3', photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop' },
      { id: 'a2', title: 'Splash & Story Hour',  sub: 'Free at library',         meta: 'Sat 11am · Family',  photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop' },
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

// Horizontal photo card — 72px image on the left, text on the right,
// bookmark top-right, optional match-% badge top-left over the photo.
const PhotoCard = ({ photo, title, sub, meta, badge, saved, onSave }) => (
  <div
    className="flex items-center overflow-hidden relative"
    style={{
      background: '#fff',
      borderRadius: 12,
      border: `1px solid ${C.line}`,
      marginBottom: 5,
      boxShadow: '0 3px 8px -6px rgba(27,42,78,.15)',
    }}
  >
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <img
        src={photo}
        alt=""
        style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }}
      />
      {badge && (
        <div style={{
          position: 'absolute', top: 5, left: 5,
          padding: '1px 5px',
          borderRadius: 6,
          background: 'rgba(255,255,255,.94)',
          fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
          color: C.coralDeep, letterSpacing: '.02em',
          boxShadow: '0 1px 2px rgba(27,42,78,.18)',
        }}>
          {badge}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0" style={{ padding: '7px 28px 7px 10px' }}>
      <div className="truncate" style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div className="truncate" style={{
        fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, marginTop: 2,
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

export const VillagePreview = ({ onNext, onBack, savedItems = [], setSavedItems, profile, setProfile }) => {
  const [localSaved, setLocalSaved] = useState(new Set(savedItems));
  const initialInterests = profile?.interests || [];
  // Show the prompt once: after the user's first bookmark, unless interests
  // were already captured or the user dismissed it.
  const [interestPromptState, setInterestPromptState] = useState(
    initialInterests.length > 0 ? 'done' : 'hidden',
  ); // hidden | open | done | dismissed
  const [selectedInterests, setSelectedInterests] = useState(initialInterests);

  const toggleSave = (id) => {
    setLocalSaved(prev => {
      const next = new Set(prev);
      const wasEmpty = next.size === 0;
      if (next.has(id)) next.delete(id); else next.add(id);
      setSavedItems?.([...next]);
      // First bookmark → surface the contextual interests prompt.
      if (wasEmpty && next.size === 1 && interestPromptState === 'hidden') {
        setInterestPromptState('open');
      }
      return next;
    });
  };

  const toggleInterest = (label) => {
    setSelectedInterests(prev => {
      const has = prev.includes(label);
      return has ? prev.filter(x => x !== label) : [...prev, label];
    });
  };

  const saveInterests = () => {
    setProfile?.(p => ({ ...p, interests: selectedInterests }));
    recordStep(0, { interests: selectedInterests });
    setInterestPromptState('done');
  };

  const dismissInterests = () => setInterestPromptState('dismissed');

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
      </div>

      <div className="flex-1 px-4" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {interestPromptState === 'open' && (
          <div
            style={{
              background: '#fff',
              border: `1.3px solid ${C.coral}`,
              borderRadius: 14,
              padding: '10px 12px 12px',
              marginBottom: 10,
              boxShadow: '0 8px 20px -10px rgba(214,68,106,.35)',
              animation: 'fadeInUp 0.32s ease-out',
              position: 'relative',
            }}
          >
            <button
              onClick={dismissInterests}
              aria-label="Dismiss"
              style={{
                position: 'absolute', top: 6, right: 6,
                width: 22, height: 22, borderRadius: 11,
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={13} color={C.muted}/>
            </button>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
              letterSpacing: '.12em', color: C.coralDeep, marginBottom: 3,
            }}>
              NICE PICK ✦
            </div>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 14, fontWeight: 600,
              color: C.navy, marginBottom: 8, letterSpacing: '-.01em', paddingRight: 18,
            }}>
              What would you two{' '}
              <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>do together?</span>
            </div>
            <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>
              {INTEREST_OPTIONS.map(i => {
                const active = selectedInterests.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className="rounded-full transition-all active:scale-[.97]"
                    style={{
                      padding: '5px 10px',
                      background: active ? C.sage : '#fff',
                      border: `1.3px solid ${active ? '#5E7A3B' : C.line}`,
                      color: active ? '#3D5E20' : C.navy,
                      fontFamily: 'Albert Sans',
                      fontSize: 11,
                      fontWeight: active ? 700 : 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
            <button
              onClick={saveInterests}
              disabled={selectedInterests.length === 0}
              className="rounded-full active:scale-[.97] transition-transform"
              style={{
                padding: '6px 14px',
                background: selectedInterests.length === 0 ? C.line : C.coral,
                color: '#fff',
                border: 'none',
                fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                cursor: selectedInterests.length === 0 ? 'default' : 'pointer',
              }}
            >
              Save
            </button>
          </div>
        )}
        {PREVIEW_DATA.map((sec, sIdx) => (
          <div key={sec.title} style={{ marginTop: sIdx === 0 ? 0 : 8 }}>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
              letterSpacing: '.12em', color: C.coralDeep, marginBottom: 2,
            }}>
              {sec.section}
            </div>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 5 }}>
              <div style={{
                fontFamily: 'Fraunces', fontSize: 14, fontWeight: 600,
                color: C.navy, letterSpacing: '-.01em',
              }}>
                {sec.title}
              </div>
              {sec.count && (
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 600,
                  color: C.muted, letterSpacing: '.02em',
                }}>
                  {sec.count}
                </div>
              )}
            </div>

            {sec.items.map(item => (
              <PhotoCard
                key={item.id}
                photo={item.photo}
                title={item.title}
                sub={item.sub}
                meta={item.meta}
                badge={item.badge}
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
