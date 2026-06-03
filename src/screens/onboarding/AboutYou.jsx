import { useEffect, useState } from 'react';
import { Heart, ChevronLeft, MapPin, LocateFixed, Check } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// AboutYou — 3-question onboarding (progressive profiling).
// We collect only what's needed to render the village preview:
//   1. Where are you?      (geolocation auto-detect + chip fallback)
//   2. Kids' ages          (multi-select chips — #1 matching signal)
//   3. What kind of mom?   (single-select card — drives match tone)
// Interests + availability are captured later in context:
//   - interests: after first bookmark on VillagePreview
//   - days:      when the user opens ScheduleSheet for the first time
// ==========================================================================

const TAMPA_AREAS = [
  { label: 'South Tampa 🌴',  lat: 27.90, lng: -82.49 },
  { label: 'North Tampa 🌳',  lat: 28.05, lng: -82.42 },
  { label: 'St. Petersburg 🏖️', lat: 27.77, lng: -82.64 },
  { label: 'Clearwater 🌊',   lat: 27.97, lng: -82.80 },
  { label: 'SouthShore ☀️',   lat: 27.65, lng: -82.40 },
];

const MOM_TYPES = [
  { id: '💼 Working mom',    blurb: 'Juggling 9–5 + bedtime' },
  { id: '🏡 Stay-at-home',   blurb: 'Home base, every day' },
  { id: '💛 Solo mom',        blurb: 'Doing it on my own' },
  { id: '📍 New to area',     blurb: 'Just landed in Tampa' },
  { id: '🌍 Multicultural',   blurb: 'Raising across cultures' },
];

const AGE_OPTS = ['0–1', '1–3', '3–5', '5–8', '8–12', '13+'];

// Distance metric — Euclidean on lat/lng is fine across a single metro.
const nearestArea = (lat, lng) => {
  let best = TAMPA_AREAS[0], bestD = Infinity;
  for (const a of TAMPA_AREAS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  return best.label;
};

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
  }[variant];
  return (
    <button
      onClick={onClick}
      className="rounded-full transition-all active:scale-[.97]"
      style={{
        padding: '6px 11px',
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

// Single-select card for mom-type — bigger weight than a chip because
// this is the centerpiece signal after location + ages.
const TypeCard = ({ active, onClick, label, blurb }) => (
  <button
    onClick={onClick}
    className="rounded-xl transition-all active:scale-[.98] text-left flex items-center gap-2.5"
    style={{
      padding: '9px 12px',
      width: '100%',
      background: active ? C.coralSoft : '#fff',
      border: `1.3px solid ${active ? C.coral : C.line}`,
      color: C.navy,
      fontFamily: 'Albert Sans',
    }}
  >
    <div className="flex-1 min-w-0">
      <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? C.coralDeep : C.navy }}>
        {label}
      </div>
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>
        {blurb}
      </div>
    </div>
    {active && (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: 20, height: 20, background: C.coral }}
      >
        <Check size={12} color="#fff" strokeWidth={3}/>
      </div>
    )}
  </button>
);

export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation }) => {
  const [area, setArea] = useState(location && TAMPA_AREAS.some(a => a.label === location) ? location : '');
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | locating | ok | denied | unsupported
  const ages = Object.keys(profile.kidsAges || {});
  const selectedType = (profile.momTypes || [])[0] || null;

  const toggleArea = (a) => { setArea(a); setLocation(a); };

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return; }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestArea(pos.coords.latitude, pos.coords.longitude);
        setArea(nearest); setLocation(nearest);
        setGeoStatus('ok');
      },
      () => setGeoStatus('denied'),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  };

  // Surface the auto-detect prompt only if the user hasn't already picked an area.
  useEffect(() => { /* prompt is manual — user taps "Use my location" */ }, []);

  const toggleAge = (age) => {
    setProfile(p => {
      const next = { ...(p.kidsAges || {}) };
      if (next[age]) delete next[age]; else next[age] = 1;
      return { ...p, kidsAges: next };
    });
  };

  const selectType = (t) => {
    setProfile(p => ({ ...p, momTypes: selectedType === t ? [] : [t] }));
  };

  const canContinue = area && ages.length > 0 && selectedType;

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
          fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
          color: C.navy, lineHeight: 1.12, letterSpacing: '-.02em',
        }}>
          Tell us about{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>you</span>
        </h2>
        <p className="mt-1 text-[12px]" style={{ fontFamily: 'Albert Sans', color: C.muted, lineHeight: 1.4 }}>
          Three quick taps — we'll fill in the rest as we go.
        </p>

        <SectionLabel>WHERE ARE YOU?</SectionLabel>
        <button
          onClick={detectLocation}
          disabled={geoStatus === 'locating'}
          className="flex items-center gap-1.5 rounded-full active:scale-[.97] transition-transform"
          style={{
            padding: '6px 11px',
            background: geoStatus === 'ok' ? C.coralSoft : '#fff',
            border: `1.3px solid ${geoStatus === 'ok' ? C.coral : C.line}`,
            color: geoStatus === 'ok' ? C.coralDeep : C.navy,
            fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
            marginBottom: 6,
          }}
        >
          <LocateFixed size={12} />
          {geoStatus === 'locating' ? 'Finding you…'
            : geoStatus === 'ok' ? `Found: ${area}`
            : geoStatus === 'denied' ? 'Pick your area below'
            : geoStatus === 'unsupported' ? 'Pick your area below'
            : 'Use my location'}
        </button>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TAMPA_AREAS.map(a => (
            <Chip key={a.label} active={area === a.label} onClick={() => toggleArea(a.label)}>
              {a.label}
            </Chip>
          ))}
        </div>

        <SectionLabel>KIDS' AGES</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {AGE_OPTS.map(a => (
            <Chip key={a} active={ages.includes(a)} onClick={() => toggleAge(a)}>{a}</Chip>
          ))}
        </div>

        <SectionLabel>WHAT KIND OF MOM ARE YOU?</SectionLabel>
        <div className="flex flex-col gap-1.5">
          {MOM_TYPES.map(t => (
            <TypeCard
              key={t.id}
              label={t.id}
              blurb={t.blurb}
              active={selectedType === t.id}
              onClick={() => selectType(t.id)}
            />
          ))}
        </div>

        <div style={{ height: 12 }}/>
      </div>

      <div style={{
        padding: '8px 20px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
      }}>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: !canContinue
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
    className="mb-2 text-[10px]"
    style={{
      marginTop: 16,
      fontFamily: 'Albert Sans', fontWeight: 800,
      letterSpacing: '.1em', color: C.navySoft,
    }}
  >
    {children}
  </div>
);
