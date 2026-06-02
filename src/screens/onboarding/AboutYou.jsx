import { useState } from 'react';
import { Heart, ChevronLeft } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// AboutYou — sized to fit iPhone SE (375x667) without scroll.
// Section spacing, chip padding, and section labels are compressed; CTA
// honours safe-area-inset-bottom for the iOS home indicator.
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
        width: i + 1 === current ? 22 : 7,
        height: 7,
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
        padding: '5px 10px',
        background: active ? styles.bg : '#fff',
        border: `1.3px solid ${active ? styles.border : C.line}`,
        color: active ? styles.fg : C.navy,
        fontFamily: 'Albert Sans',
        fontSize: 11,
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
        <StepDots current={2} total={4}/>
        <div style={{ width: 32 }}/>
      </div>

      <div className="flex-1 px-5" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600,
          color: C.navy, lineHeight: 1.12, letterSpacing: '-.02em',
        }}>
          Tell us about{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>you</span>
        </h2>
        <p className="mt-1 text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.muted, lineHeight: 1.35 }}>
          So we can match you with the right moms nearby.
        </p>

        <SectionLabel>WHERE ARE YOU?</SectionLabel>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TAMPA_AREAS.map(a => (
            <Chip key={a} active={area === a} onClick={() => toggleArea(a)}>{a}</Chip>
          ))}
        </div>

        <SectionLabel>KIDS' AGES</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {AGE_OPTS.map(a => (
            <Chip key={a} active={ages.includes(a)} onClick={() => toggleAge(a)}>{a}</Chip>
          ))}
        </div>

        <SectionLabel>WHAT BEST DESCRIBES YOU?</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {MOM_TYPES.map(t => (
            <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)} variant="lilac">
              {t}
            </Chip>
          ))}
        </div>

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
                  width: 28, height: 28, borderRadius: 14,
                  background: active ? C.coral : '#fff',
                  border: `1.3px solid ${active ? C.coral : C.line}`,
                  color: active ? '#fff' : C.navy,
                  fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 10.5,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <SectionLabel>MY INTERESTS</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
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

        <div style={{ height: 8 }}/>
      </div>

      <div style={{
        padding: '8px 20px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
      }}>
        <button
          onClick={onNext}
          disabled={!area || ages.length === 0 || types.length === 0}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: !area || ages.length === 0 || types.length === 0
              ? '#D8CCB6'
              : `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '13px 24px',
            fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 22px -8px rgba(214,68,106,.55)',
          }}
        >
          <Heart size={15} fill="currentColor"/>
          Find my village
        </button>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="mb-1.5 text-[9.5px]"
    style={{
      marginTop: 12,
      fontFamily: 'Albert Sans', fontWeight: 800,
      letterSpacing: '.1em', color: C.navySoft,
    }}
  >
    {children}
  </div>
);
