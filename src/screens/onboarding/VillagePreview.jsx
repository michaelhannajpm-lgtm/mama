import { useState } from 'react';
import { Heart, ChevronLeft, Bookmark, X } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { recordStep } from '../../lib/onboarding';

// ==========================================================================
// VillagePreview — onboarding screen 3.
// Four sections of curated picks. Each item carries a sage match-chip that
// explains why it surfaced for *this* user (mom type / kids' ages / area).
//
//   1 · Connect with other moms
//        ↳ Group meetups this week  (1 row)
//        ↳ Moms nearby              (2 rows)
//   2 · Things to do this week      (2 rows)
//   3 · Top local spots             (2 rows)
//   4 · Recommended resources       (2 rows)
//
// First bookmark surfaces a contextual interests prompt (kept from prior
// progressive-profiling pass — it only fires once per session).
// ==========================================================================

const INTEREST_OPTIONS = [
  '🌳 Outdoors',
  '☕ Coffee',
  '🧘‍♀️ Wellness',
  '🎨 Crafts',
  '📚 Books',
];

// Two registers per mom-type — "kin" for moms-like-you cards,
// "for" for activities / events / resources that serve that type.
const TYPE_CHIP = {
  '💛 Solo Mom':      { kin: 'Solo mom too',         for: 'For solo moms'         },
  '🌍 Multicultural': { kin: 'Multicultural family', for: 'Multicultural focus'   },
  '💼 Working Mom':   { kin: 'Working mom too',      for: 'Working-mom friendly'  },
  '🏡 Stay-at-home':  { kin: 'Stay-at-home too',     for: 'For SAHMs'             },
  '📍 New to area':   { kin: 'New to Tampa too',     for: 'For Tampa newcomers'   },
  '🤰 Pregnant':      { kin: 'Also pregnant',        for: 'Pregnancy-friendly'    },
};

// Walk the item's tags in order; return the first one that aligns with
// the user's profile. Falls back to the item's hard-coded chip.
const matchChip = (item, profile, mode = 'kin') => {
  const types = profile?.momTypes || [];
  for (const tag of item.tags || []) {
    if (types.includes(tag)) return TYPE_CHIP[tag]?.[mode];
  }
  const ages = Object.keys(profile?.kidsAges || {});
  for (const tag of item.tags || []) {
    if (ages.includes(tag)) return mode === 'for' ? `Ages ${tag}` : `Kids ${tag}`;
  }
  return item.fallbackChip || null;
};

const placeChip = (item, location) =>
  location && item.area === location ? `In ${item.area}` : item.fallbackChip;

const MEETUPS = [
  { id: 'g1', title: 'Saturday Coffee Walk', sub: 'Hyde Park · Sat 10am',
    tags: ['💛 Solo Mom', '🏡 Stay-at-home', '📍 New to area'],
    fallbackChip: '4 moms going',
    photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&auto=format&fit=crop' },
  { id: 'g2', title: 'Bayshore Stroller Group', sub: 'Fri 8am · all paces',
    tags: ['💼 Working Mom', '🤰 Pregnant', '0–1'],
    fallbackChip: 'Beginner-friendly',
    photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=200&auto=format&fit=crop' },
  { id: 'g3', title: 'Mom Mixer at Armature', sub: 'Wed 7pm · social hour',
    tags: ['🌍 Multicultural', '📍 New to area', '3–5'],
    fallbackChip: 'Open RSVP',
    photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=200&auto=format&fit=crop' },
];

const MOMS = [
  { id: 'm1', title: 'Sarah M.', sub: '0.4 mi · Curtis Hixon mornings',
    tags: ['💛 Solo Mom', '🏡 Stay-at-home', '1–3'],
    fallbackChip: 'Near you',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop' },
  { id: 'm2', title: 'Priya K.', sub: '0.7 mi · loves Bayshore walks',
    tags: ['🌍 Multicultural', '💼 Working Mom', '1–3', '3–5'],
    fallbackChip: 'Near you',
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&auto=format&fit=crop' },
  { id: 'm3', title: 'Liz B.', sub: '1.1 mi · weekday playdates',
    tags: ['📍 New to area', '🤰 Pregnant', '0–1'],
    fallbackChip: 'Near you',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop' },
];

const ACTIVITIES = [
  { id: 'a1', title: 'Little Sprouts Music', sub: 'Tue/Thu drop-in · sliding scale',
    tags: ['1–3', '3–5', '🏡 Stay-at-home'],
    fallbackChip: 'Drop-in',
    photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=200&auto=format&fit=crop' },
  { id: 'a2', title: 'Splash & Story Hour', sub: 'Sat 11am · free at library',
    tags: ['0–1', '1–3', '💼 Working Mom'],
    fallbackChip: 'Free · family',
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&auto=format&fit=crop' },
  { id: 'a3', title: 'Tampa Toddler Yoga', sub: 'Mon 9am · YMCA',
    tags: ['1–3', '3–5', '💛 Solo Mom', '🌍 Multicultural'],
    fallbackChip: 'Beginner-friendly',
    photo: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&auto=format&fit=crop' },
];

const PLACES = [
  { id: 'p1', title: 'Buddy Brew Coffee', sub: 'Mom-friendly · sidewalk seating',
    area: 'South Tampa', fallbackChip: 'South Tampa',
    photo: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200&auto=format&fit=crop' },
  { id: 'p2', title: 'Curtis Hixon Park', sub: 'Big lawn · splash fountain',
    area: 'Downtown', fallbackChip: 'Downtown',
    photo: 'https://images.unsplash.com/photo-1571086291540-b137111ff5a3?w=200&auto=format&fit=crop' },
  { id: 'p3', title: 'Armature Works', sub: 'Food hall · stroller-friendly',
    area: 'Downtown', fallbackChip: 'Downtown',
    photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200&auto=format&fit=crop' },
];

const RESOURCES = [
  { id: 'r1', title: 'Tampa Solo Mom Network', sub: 'Free support group · meets monthly',
    tags: ['💛 Solo Mom', '📍 New to area'],
    fallbackChip: 'Recommended',
    photo: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=200&auto=format&fit=crop' },
  { id: 'r2', title: 'Mama-friendly therapists', sub: 'Sliding scale · postpartum focus',
    tags: ['🤰 Pregnant', '💼 Working Mom'],
    fallbackChip: 'Postpartum focus',
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop' },
  { id: 'r3', title: 'MOPS Tampa Chapter', sub: 'Mothers of Preschoolers · Tuesdays',
    tags: ['🏡 Stay-at-home', '🌍 Multicultural', '1–3', '3–5'],
    fallbackChip: 'Weekly',
    photo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=200&auto=format&fit=crop' },
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

// Compact list row — 44px thumb, sage match-chip inline with sub, bookmark top-right.
const CompactRow = ({ photo, title, sub, chip, saved, onSave }) => (
  <div
    className="flex items-center relative"
    style={{
      background: '#fff',
      borderRadius: 10,
      border: `1px solid ${C.line}`,
      marginBottom: 4,
      padding: 6,
      boxShadow: '0 2px 6px -5px rgba(27,42,78,.15)',
    }}
  >
    <img src={photo} alt="" style={{
      width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0,
    }}/>
    <div className="flex-1 min-w-0" style={{ padding: '0 26px 0 8px' }}>
      <div className="truncate" style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div className="flex items-center gap-1.5 truncate" style={{ marginTop: 2 }}>
        {chip && (
          <span style={{
            background: C.sage,
            color: '#3D5E20',
            fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
            padding: '1.5px 5px', borderRadius: 4, letterSpacing: '.02em',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>{chip}</span>
        )}
        <span className="truncate" style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted,
        }}>{sub}</span>
      </div>
    </div>
    {onSave && (
      <button
        onClick={onSave}
        aria-label={saved ? 'Unsave' : 'Save'}
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 20, height: 20, borderRadius: 10,
          background: 'rgba(255,255,255,.92)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bookmark
          size={11}
          color={saved ? C.coralDeep : C.muted}
          fill={saved ? C.coralDeep : 'none'}
        />
      </button>
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontFamily: 'Fraunces', fontSize: 14, fontWeight: 600,
    color: C.navy, letterSpacing: '-.01em', marginBottom: 6,
  }}>
    {children}
  </div>
);

const SubHead = ({ children }) => (
  <div style={{
    fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
    letterSpacing: '.12em', color: C.coralDeep,
    marginTop: 6, marginBottom: 3,
  }}>
    {children}
  </div>
);

export const VillagePreview = ({
  onNext, onBack, savedItems = [], setSavedItems,
  profile, setProfile, location,
}) => {
  const [localSaved, setLocalSaved] = useState(new Set(savedItems));
  const initialInterests = profile?.interests || [];
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

      <div className="px-4" style={{ paddingBottom: 6, flexShrink: 0 }}>
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
              marginBottom: 8,
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

        {/* ---------- 1 · Connect with other moms ---------- */}
        <div>
          <SectionTitle>Connect with other moms</SectionTitle>
          <SubHead>GROUP MEETUPS THIS WEEK</SubHead>
          {MEETUPS.map(item => (
            <CompactRow
              key={item.id}
              photo={item.photo} title={item.title} sub={item.sub}
              chip={matchChip(item, profile, 'for')}
              saved={localSaved.has(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ))}
          <SubHead>MOMS NEARBY</SubHead>
          {MOMS.map(item => (
            <CompactRow
              key={item.id}
              photo={item.photo} title={item.title} sub={item.sub}
              chip={matchChip(item, profile, 'kin')}
              saved={localSaved.has(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ))}
        </div>

        {/* ---------- 2 · Things to do this week ---------- */}
        <div style={{ marginTop: 10 }}>
          <SectionTitle>Things to do this week</SectionTitle>
          {ACTIVITIES.map(item => (
            <CompactRow
              key={item.id}
              photo={item.photo} title={item.title} sub={item.sub}
              chip={matchChip(item, profile, 'for')}
              saved={localSaved.has(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ))}
        </div>

        {/* ---------- 3 · Top local spots ---------- */}
        <div style={{ marginTop: 10 }}>
          <SectionTitle>Top local spots</SectionTitle>
          {PLACES.map(item => (
            <CompactRow
              key={item.id}
              photo={item.photo} title={item.title} sub={item.sub}
              chip={placeChip(item, location)}
              saved={localSaved.has(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ))}
        </div>

        {/* ---------- 4 · Recommended resources ---------- */}
        <div style={{ marginTop: 10 }}>
          <SectionTitle>Recommended resources</SectionTitle>
          {RESOURCES.map(item => (
            <CompactRow
              key={item.id}
              photo={item.photo} title={item.title} sub={item.sub}
              chip={matchChip(item, profile, 'for')}
              saved={localSaved.has(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ))}
        </div>

        <div style={{ height: 6 }}/>
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
