import { useState } from 'react';
import { Heart, ChevronLeft } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// AboutYou — ported from the GoMama Expo prototype.
// Single onboarding screen with chip pickers for:
//   · Tampa-Bay area
//   · Kids' ages
//   · Mom type
//   · Available days
//   · Interests
// Replaces the old LocationStep / ProfileStep / ScheduleStep / PlacesStep /
// Summary chain. Step 2 of 4 in the new 4-screen onboarding.
// ==========================================================================

const TAMPA_AREAS = [
  'South Tampa 🌴',
  'North Tampa 🌳',
  'St. Petersburg 🏖️',
  'Clearwater 🌊',
  'SouthShore ☀️',
];

const MOM_TYPES = [
  '💼 Working mom',
  '🏡 Stay-at-home',
  '💛 Solo mom',
  '📍 New to area',
  '🌍 Multicultural',
];

const AGE_OPTS = ['0–1', '1–3', '3–5', '5–8', '8–12', '13+'];
const DAYS     = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const INTERESTS = [
  '🌳 Outdoors',
  '☕ Coffee',
  '🧘‍♀️ Wellness',
  '🎨 Crafts',
  '📚 Books',
];

const StepDots = ({ current, total }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i + 1 === current ? 24 : 8,
        height: 8,
        borderRadius: 4,
        background: i + 1 === current ? C.coral : C.line,
        transition: 'width .15s ease',
      }}/>
    ))}
  </div>
);

const Chip = ({ active, onClick, children, variant = 'coral' }) => {
  const styles = {
    coral: { border: C.coral, bg: C.coralSoft, fg: C.coralDeep },
    lilac: { border: C.navySoft, bg: C.lilac, fg: C.navy },
    sage:  { border: '#5E7A3B', bg: C.sage, fg: '#3D5E20' },
  }[variant];
  return (
    <button
      onClick={onClick}
      className="rounded-full transition-all active:scale-[.97]"
      style={{
        padding: '7px 12px',
        background: active ? styles.bg : '#fff',
        border: `1.3px solid ${active ? styles.border : C.line}`,
        color: active ? styles.fg : C.navy,
        fontFamily: 'Albert Sans',
        fontSize: 11.5,
        fontWeight: active ? 700 : 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
};

export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation, prefs, setPrefs }) => {
  const [area, setArea] = useState(location || '');
  const ages = Object.keys(profile.kidsAges || {});
  const types = profile.momTypes || [];
  const interests = profile.interests || [];
  // Use existing slots; store one Mon-morning per selected day as a sane default
  const [days, setDays] = useState(() => {
    const selected = new Set();
    (prefs.slots || []).forEach(s => {
      const d = s.split('-')[0];
      const idx = DAY_KEYS.indexOf(d);
      if (idx >= 0) selected.add(idx);
    });
    return selected;
  });

  const toggleArea = (a) => { setArea(a); setLocation(a); };

  const toggleAge = (age) => {
    setProfile(p => {
      const next = { ...(p.kidsAges || {}) };
      if (next[age]) delete next[age]; else next[age] = 1;
      return { ...p, kidsAges: next };
    });
  };

  const toggleType = (t) => {
    setProfile(p => {
      const cur = p.momTypes || [];
      const has = cur.includes(t);
      return { ...p, momTypes: has ? cur.filter(x => x !== t) : [...cur, t] };
    });
  };

  const toggleDay = (i) => {
    setDays(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      // Project days → slots: 1 Mon-morning-style slot per chosen day
      const slots = [...next].map(idx => `${DAY_KEYS[idx]}-morning`);
      setPrefs(pp => ({ ...pp, slots }));
      return next;
    });
  };

  const toggleInterest = (label) => {
    setProfile(p => {
      const cur = p.interests || [];
      const has = cur.includes(label);
      return { ...p, interests: has ? cur.filter(x => x !== label) : [...cur, label] };
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-full flex items-center justify-center"
          style={{
            width: 36, height: 36,
            background: '#fff', border: `1px solid ${C.line}`,
          }}
          aria-label="Back"
        >
          <ChevronLeft size={20} color={C.navy}/>
        </button>
        <StepDots current={2} total={4}/>
        <div style={{ width: 36 }}/>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none' }}>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 26, fontWeight: 600,
          color: C.navy, lineHeight: 1.1, letterSpacing: '-.02em',
        }}>
          Tell us about{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>you</span>
        </h2>
        <p className="mt-2 text-[13px]" style={{ fontFamily: 'Albert Sans', color: C.muted, lineHeight: 1.4 }}>
          So we can match you with the right moms nearby.
        </p>

        {/* Where */}
        <SectionLabel>WHERE ARE YOU?</SectionLabel>
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TAMPA_AREAS.map(a => (
            <Chip key={a} active={area === a} onClick={() => toggleArea(a)}>{a}</Chip>
          ))}
        </div>

        {/* Kids ages */}
        <SectionLabel>KIDS' AGES</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {AGE_OPTS.map(a => (
            <Chip key={a} active={ages.includes(a)} onClick={() => toggleAge(a)}>{a}</Chip>
          ))}
        </div>

        {/* Mom type */}
        <SectionLabel>WHAT BEST DESCRIBES YOU?</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {MOM_TYPES.map(t => (
            <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)} variant="lilac">
              {t}
            </Chip>
          ))}
        </div>

        {/* Days */}
        <SectionLabel>USUALLY AVAILABLE</SectionLabel>
        <div className="flex items-center gap-1.5 flex-wrap">
          {DAYS.map((d, i) => {
            const active = days.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className="flex items-center justify-center transition-all active:scale-95"
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: active ? C.coral : '#fff',
                  border: `1.3px solid ${active ? C.coral : C.line}`,
                  color: active ? '#fff' : C.navy,
                  fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 11,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Interests */}
        <SectionLabel>MY INTERESTS</SectionLabel>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {INTERESTS.map(i => (
            <Chip
              key={i}
              active={interests.includes(i)}
              onClick={() => toggleInterest(i)}
              variant="sage"
            >
              {i}
            </Chip>
          ))}
        </div>

        <div style={{ height: 16 }}/>
      </div>

      {/* CTA */}
      <div className="px-5 pb-6 pt-3">
        <button
          onClick={onNext}
          disabled={!area || ages.length === 0 || types.length === 0}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: !area || ages.length === 0 || types.length === 0
              ? '#D8CCB6'
              : `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '15px 24px',
            fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 22px -8px rgba(214,68,106,.55)',
          }}
        >
          <Heart size={16} fill="currentColor"/>
          Find my village
        </button>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="mt-5 mb-2 text-[10px]"
    style={{
      fontFamily: 'Albert Sans', fontWeight: 800,
      letterSpacing: '.1em', color: C.navySoft,
    }}
  >
    {children}
  </div>
);
