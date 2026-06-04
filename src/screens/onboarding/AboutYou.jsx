import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, ChevronLeft, MapPin, Search, X, Check, Sparkles } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { SUGGESTED_EVENTS } from '../../data/events';
import { PLACES } from '../../data/places';
import { SAMPLE_MOMS } from '../../data/moms';

// ==========================================================================
// AboutYou — onboarding screen 2, structured as a 3-step visual carousel:
//   Q1 Stage  →  Q2 Looking for  →  Q3 Location + radius
// Each step has emoji option cards, a "why we're asking" subhead, and a
// dynamic preview banner that mirrors the Landing promise — events, places,
// support and moms — recomputed live as the user makes selections.
// ==========================================================================

const AREA_BUCKETS = [
  { label: 'Apollo Beach & Ruskin',     lat: 27.77, lng: -82.40 },
  { label: 'Riverview & Brandon',       lat: 27.90, lng: -82.30 },
  { label: 'South Tampa',               lat: 27.90, lng: -82.49 },
  { label: 'Downtown Tampa',            lat: 27.95, lng: -82.46 },
  { label: 'Wesley Chapel & New Tampa', lat: 28.24, lng: -82.36 },
  { label: 'Clearwater & St. Pete',     lat: 27.87, lng: -82.72 },
];

const DISTANCE_STOPS = [1, 3, 5, 10, 15, 25];
const DEFAULT_DISTANCE = 5;

const STAGE_OPTS = [
  { emoji: '🤰', label: 'Expecting',  sub: 'Pregnant now'    },
  { emoji: '👶', label: 'Newborn',    sub: '0–12 months'     },
  { emoji: '🧸', label: 'Toddler',    sub: '1–3 years'       },
  { emoji: '🎨', label: 'Preschool',  sub: '3–5 years'       },
  { emoji: '🎒', label: 'School-age', sub: '5–9 years'       },
  { emoji: '🛹', label: 'Tween',      sub: '9–12 years'      },
  { emoji: '🎧', label: 'Teen',       sub: '13+ years'       },
];

const LOOKING_FOR_OPTS = [
  { emoji: '👯', label: 'Moms nearby',   sub: 'Real friendships'       },
  { emoji: '📅', label: 'Things to do',  sub: 'Events + classes'       },
  { emoji: '📍', label: 'Places',        sub: 'Mom-vetted spots'       },
  { emoji: '💛', label: 'Resources',     sub: 'Pediatricians, sitters' },
  { emoji: '🎈', label: 'Kids programs', sub: 'Camps, sports, lessons' },
  { emoji: '🌿', label: 'Just browsing', sub: 'Take your time'         },
];

// Stage → kid-age bucket used by events + mom-year matching.
const STAGE_TO_BUCKETS = {
  'Expecting':  ['0–1'],
  'Newborn':    ['0–1'],
  'Toddler':    ['1–3'],
  'Preschool':  ['3–5'],
  'School-age': ['5–8'],
  'Tween':      ['8–12'],
  'Teen':       ['13+'],
};

const BUCKET_TO_YEARS = {
  '0–1':   [0, 1],
  '1–3':   [1, 2, 3],
  '3–5':   [3, 4, 5],
  '5–8':   [5, 6, 7, 8],
  '8–12':  [8, 9, 10, 11, 12],
  '13+':   [13, 14, 15, 16, 17, 18],
};

// PLACES are split into "things to do" (active programs you sign kids up for)
// and "local spots" (browse-and-go destinations + grown-up resources). Group
// meetups + moms come from SUGGESTED_EVENTS and SAMPLE_MOMS respectively.
const ACTIVITY_CATS = ['extracurricular', 'camps', 'sports'];
const SPOT_CATS     = ['fun', 'wellness', 'health', 'childcare', 'schools'];

const ALL_ACTIVITIES = ACTIVITY_CATS.flatMap(c => PLACES[c] || []);
const ALL_SPOTS      = SPOT_CATS.flatMap(c => PLACES[c] || []);

const momYearsFromKidsStr = (s = '') => {
  const out = [];
  (s.match(/(\d+)\s*y/g) || []).forEach(m => out.push(Number(/(\d+)/.exec(m)[1])));
  (s.match(/(\d+)\s*m/g) || []).forEach(m => {
    const months = Number(/(\d+)/.exec(m)[1]);
    out.push(months >= 12 ? 1 : 0);
  });
  return out;
};

const nearestBucket = (lat, lng) => {
  let best = AREA_BUCKETS[0], bestD = Infinity;
  for (const a of AREA_BUCKETS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  return best.label;
};

const STEP_LABELS = ['Your Stage', 'Your Focus', 'Your Area'];

// Carousel progress banner — step count + label + full-width 3-segment bar.
const ProgressBanner = ({ step, total, onBack }) => (
  <div style={{ padding: '8px 14px 8px' }}>
    <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
      <button
        onClick={onBack}
        className="rounded-full flex items-center justify-center"
        style={{ width: 30, height: 30, background: '#fff', border: `1px solid ${C.line}` }}
        aria-label="Back"
      >
        <ChevronLeft size={17} color={C.navy}/>
      </button>
      <div
        className="flex items-center"
        style={{
          gap: 7,
          fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
          letterSpacing: '.04em',
        }}
      >
        <span style={{ color: C.coralDeep }}>{step} of {total}</span>
        <span aria-hidden style={{ color: C.line }}>·</span>
        <span style={{ color: C.navy }}>{STEP_LABELS[step - 1]}</span>
      </div>
      <div style={{ width: 30 }}/>
    </div>
    <div className="flex items-center" style={{ gap: 5 }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i + 1 < step;
        const active = i + 1 === step;
        return (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: done || active ? C.coral : C.line,
            opacity: done ? 0.55 : 1,
            transition: 'background .25s ease, opacity .25s ease',
          }}/>
        );
      })}
    </div>
  </div>
);

const OptionCard = ({ active, onClick, emoji, label, sub, span = 1 }) => (
  <button
    onClick={onClick}
    className="rounded-2xl flex flex-col items-center justify-center transition-all active:scale-[.96]"
    style={{
      padding: '7px 6px 6px',
      background: active ? C.lilac : '#fff',
      border: `1.5px solid ${active ? C.navySoft : C.line}`,
      cursor: 'pointer',
      gap: 2,
      position: 'relative',
      minHeight: 70,
      boxShadow: active
        ? '0 6px 14px -8px rgba(27,42,78,.28)'
        : '0 1px 2px rgba(27,42,78,.04)',
      gridColumn: span === 2 ? 'span 2' : undefined,
    }}
  >
    {active && (
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 5, right: 5,
          width: 15, height: 15, borderRadius: 999,
          background: C.coral, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'popBadge 240ms cubic-bezier(.4,1.5,.5,1)',
        }}
      >
        <Check size={9} strokeWidth={3.5}/>
      </div>
    )}
    <div style={{ fontSize: 21, lineHeight: 1 }}>{emoji}</div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
      color: C.navy, textAlign: 'center', lineHeight: 1.15,
    }}>
      {label}
    </div>
    {sub && (
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 500,
        color: C.muted, lineHeight: 1.15, textAlign: 'center',
      }}>
        {sub}
      </div>
    )}
  </button>
);

const QuestionHeader = ({ children, why }) => (
  <>
    <h2 style={{
      fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700,
      color: C.navy, lineHeight: 1.15, letterSpacing: '-.02em',
      marginTop: 2,
    }}>
      {children}
    </h2>
    <p style={{
      fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft,
      marginTop: 4, lineHeight: 1.35,
    }}>
      {why}
    </p>
  </>
);

const Emph = ({ children }) => (
  <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>{children}</span>
);

// Dynamic preview banner — mirrors the Landing stat-pill promise (events ·
// places · moms) but recomputes live from the user's selections so they can
// watch the curation tighten as they tap.
const PreviewBanner = ({ title, items, snippet, hint }) => (
  <div
    className="rounded-2xl"
    style={{
      marginTop: 10,
      padding: '9px 12px',
      background: `linear-gradient(135deg, #FFF7F0 0%, ${C.coralSoft} 100%)`,
      border: `1px solid ${C.coralSoft}`,
      boxShadow: '0 2px 8px -4px rgba(214,68,106,.14)',
    }}
  >
    <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
      <Sparkles size={12} color={C.coralDeep} fill={C.coralDeep} strokeWidth={1.5}/>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
        color: C.coralDeep, textTransform: 'uppercase', letterSpacing: '.08em',
      }}>
        {title}
      </div>
    </div>
    <div
      className="grid grid-cols-2"
      style={{ gap: '5px 14px', marginBottom: snippet || hint ? 6 : 0 }}
    >
      {items.map(it => (
        <div key={it.label} className="flex items-baseline" style={{ gap: 5 }}>
          <span
            key={it.count}
            style={{
              fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700,
              color: C.navy, lineHeight: 1, letterSpacing: '-.01em',
              display: 'inline-block',
              animation: 'popBadge 220ms cubic-bezier(.4,1.5,.5,1)',
            }}
          >
            {it.count}
          </span>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 600,
            color: C.inkSoft, lineHeight: 1.15,
          }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
    {snippet && (
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 600,
        color: C.navy, lineHeight: 1.35, opacity: .82,
      }}>
        {snippet}
      </div>
    )}
    {hint && (
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontStyle: 'italic',
        color: C.muted, lineHeight: 1.35,
      }}>
        {hint}
      </div>
    )}
  </div>
);

export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation, distance, setDistance }) => {
  const inputRef = useRef(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | detecting | ok | denied | unsupported
  const [step, setStep] = useState(1); // carousel: 1..3

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(nearestBucket(pos.coords.latitude, pos.coords.longitude));
        setGeoStatus('ok');
        inputRef.current?.blur();
      },
      () => setGeoStatus('denied'),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  };

  useEffect(() => {
    if (distance == null) setDistance(DEFAULT_DISTANCE);
    if (!location) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stage = profile.stage || [];
  const lookingFor = profile.lookingFor || [];
  const radius = distance ?? DEFAULT_DISTANCE;
  const hasLocation = !!(location && location.trim());

  const toggleStage = (label) => {
    setProfile(p => {
      const cur = p.stage || [];
      const has = cur.includes(label);
      return { ...p, stage: has ? cur.filter(x => x !== label) : [...cur, label] };
    });
  };

  const toggleLookingFor = (label) => {
    setProfile(p => {
      const cur = p.lookingFor || [];
      const has = cur.includes(label);
      return { ...p, lookingFor: has ? cur.filter(x => x !== label) : [...cur, label] };
    });
  };

  const radiusIdx = Math.max(0, DISTANCE_STOPS.indexOf(radius));
  const radiusLabel = radiusIdx === DISTANCE_STOPS.length - 1 ? '25+ mi' : `${radius} mi`;

  // Compute curation preview — 4 fixed buckets mirroring the Landing promise:
  // Things to do · Group Meetups · Moms · Local Spots. Stage filters
  // age-relevant categories; location + radius gate everything at step 3.
  const preview = useMemo(() => {
    const stageBuckets = stage.flatMap(s => STAGE_TO_BUCKETS[s] || []);
    const stageYears = new Set(stageBuckets.flatMap(b => BUCKET_TO_YEARS[b] || []));
    const hasStage = stage.length > 0;

    const filterByLocation = (places) => {
      if (step < 3) return places;
      let result = places;
      if (hasLocation) {
        const local = result.filter(p => p.area === location);
        if (local.length) result = local;
      }
      return result.filter(p => (p.dist || 0) <= radius);
    };

    let meetups = SUGGESTED_EVENTS;
    if (hasStage) {
      meetups = meetups.filter(e => {
        if (!e.kidAges) return true;
        return e.kidAges.some(b => (BUCKET_TO_YEARS[b] || []).some(y => stageYears.has(y)));
      });
    }
    if (step >= 3) meetups = meetups.filter(e => (e.mi || 0) <= radius);

    const thingsToDo = filterByLocation(ALL_ACTIVITIES);
    const spots = filterByLocation(ALL_SPOTS);

    let moms = SAMPLE_MOMS;
    if (hasStage) {
      moms = moms.filter(m => {
        const ys = momYearsFromKidsStr(m.kids);
        return ys.some(y => stageYears.has(y));
      });
    }
    if (step >= 3) moms = moms.filter(m => parseFloat(m.distance) <= radius);

    return { thingsToDo, meetups, moms, spots };
  }, [stage, location, hasLocation, radius, step]);

  // Shared 4-bucket items array — order matches Landing promise.
  const previewItems = [
    { count: preview.thingsToDo.length, label: 'Things to do'  },
    { count: preview.meetups.length,    label: 'Group Meetups' },
    { count: preview.moms.length,       label: 'Moms'          },
    { count: preview.spots.length,      label: 'Local Spots'   },
  ];

  const canContinue =
    step === 1 ? stage.length > 0 :
    step === 2 ? lookingFor.length > 0 :
    step === 3 ? hasLocation :
    false;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onNext();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onBack();
  };

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      <ProgressBanner step={step} total={3} onBack={handleBack}/>

      <div
        key={step}
        className="flex-1 px-4"
        style={{
          minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none',
          animation: 'fadeInUp 280ms ease-out',
        }}
      >
        {/* -------- Q1 · Stage -------- */}
        {step === 1 && (
          <>
            <QuestionHeader why="Your week bends around your kid's stage.">
              Tell us your <Emph>stage</Emph>
            </QuestionHeader>
            <div className="grid grid-cols-2" style={{ gap: 6, marginTop: 8 }}>
              {STAGE_OPTS.map((opt, i) => (
                <OptionCard
                  key={opt.label}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  active={stage.includes(opt.label)}
                  onClick={() => toggleStage(opt.label)}
                  span={i === STAGE_OPTS.length - 1 ? 2 : 1}
                />
              ))}
            </div>
            <PreviewBanner
              title="For your stage"
              items={previewItems}
              snippet={
                stage.length > 0 && preview.meetups.length > 0
                  ? preview.meetups.slice(0, 2).map(e => e.name).join(' · ')
                  : null
              }
              hint={stage.length === 0 ? 'Pick a stage to see your curation tighten.' : null}
            />
          </>
        )}

        {/* -------- Q2 · Looking for -------- */}
        {step === 2 && (
          <>
            <QuestionHeader why="What should we surface first in your feed?">
              What are you <Emph>looking for</Emph>?
            </QuestionHeader>
            <div className="grid grid-cols-2" style={{ gap: 8, marginTop: 12 }}>
              {LOOKING_FOR_OPTS.map(opt => (
                <OptionCard
                  key={opt.label}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  active={lookingFor.includes(opt.label)}
                  onClick={() => toggleLookingFor(opt.label)}
                />
              ))}
            </div>
            <PreviewBanner
              title="In your feed"
              items={previewItems}
              snippet={
                preview.thingsToDo.length > 0
                  ? preview.thingsToDo.slice(0, 3).map(p => p.name).join(' · ')
                  : null
              }
              hint={lookingFor.length === 0 ? 'Pick what you want to see first.' : null}
            />
          </>
        )}

        {/* -------- Q3 · Location + radius -------- */}
        {step === 3 && (
          <>
            <QuestionHeader why="So we keep your village within easy reach.">
              Where in <Emph>Tampa</Emph> are you?
            </QuestionHeader>

            <div
              className="flex items-center gap-2 rounded-full"
              style={{
                marginTop: 12,
                height: 38,
                padding: '0 4px 0 12px',
                background: '#fff',
                border: `1.3px solid ${hasLocation ? C.coral : C.line}`,
              }}
            >
              <Search size={14} color={hasLocation ? C.coralDeep : C.muted}/>
              <input
                ref={inputRef}
                type="text"
                value={location || ''}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={geoStatus === 'detecting' ? 'Detecting your location…' : 'Type your neighborhood…'}
                className="flex-1 bg-transparent outline-none min-w-0"
                style={{
                  fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 600,
                  color: C.navy,
                }}
              />
              {hasLocation && (
                <button
                  onClick={() => setLocation('')}
                  aria-label="Clear"
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 18, height: 18, background: C.line, border: 'none', cursor: 'pointer' }}
                >
                  <X size={10} color={C.navy}/>
                </button>
              )}
              <button
                onClick={detectLocation}
                aria-label="Use my location"
                disabled={geoStatus === 'detecting'}
                className="rounded-full flex items-center justify-center flex-shrink-0 active:scale-[.95] transition-transform"
                style={{
                  width: 30, height: 30, background: C.coral, border: 'none', cursor: 'pointer',
                  opacity: geoStatus === 'detecting' ? 0.6 : 1,
                }}
              >
                <MapPin size={14} color="#fff"/>
              </button>
            </div>

            <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
                color: C.navySoft, whiteSpace: 'nowrap',
              }}>
                Within
              </div>
              <input
                type="range"
                className="range-coral flex-1"
                min={0}
                max={DISTANCE_STOPS.length - 1}
                step={1}
                value={radiusIdx}
                onChange={(e) => setDistance(DISTANCE_STOPS[parseInt(e.target.value, 10)])}
                aria-label="Match radius in miles"
              />
              <div style={{
                fontFamily: 'Fraunces', fontSize: 15, fontWeight: 600,
                color: C.coralDeep, minWidth: 56, textAlign: 'right',
              }}>
                {radiusLabel}
              </div>
            </div>

            <PreviewBanner
              title={hasLocation ? `Near ${location}` : 'Near you'}
              items={previewItems}
              snippet={
                hasLocation && preview.spots.length > 0
                  ? preview.spots.slice(0, 3).map(p => p.name).join(' · ')
                  : null
              }
              hint={!hasLocation ? 'Add your neighborhood to localize the list.' : null}
            />
          </>
        )}

        <div style={{ height: 8 }}/>
      </div>

      <div style={{
        padding: '6px 16px 0',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
      }}>
        <button
          onClick={handleNext}
          disabled={!canContinue}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: !canContinue
              ? '#D8CCB6'
              : `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '11px 24px',
            fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 18px -8px rgba(214,68,106,.55)',
          }}
        >
          {step === 3 ? (
            <>
              <Heart size={14} fill="currentColor"/>
              Find My Village
            </>
          ) : (
            'Next'
          )}
        </button>
        <p style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted,
          textAlign: 'center', marginTop: 5, lineHeight: 1.35,
        }}>
          Your information stays private and is only used to personalize recommendations.
        </p>
      </div>
    </div>
  );
};
