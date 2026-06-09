import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Check, Sparkles, Navigation, Lock } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { SUGGESTED_EVENTS } from '../../data/events';
import { PLACES } from '../../data/places';
import { SAMPLE_MOMS } from '../../data/moms';
import { NeighborhoodPicker } from '../../components/NeighborhoodPicker';
import { nearestArea } from '../../lib/places.js';

// ==========================================================================
// AboutYou — onboarding screen 2, structured as a 3-step visual carousel:
//   Q1 Stage  →  Q2 Looking for  →  Q3 Location + radius
// Each step has emoji option cards, a "why we're asking" subhead, and a
// dynamic preview banner that mirrors the Landing promise — events, places,
// support and moms — recomputed live as the user makes selections.
// ==========================================================================

const AREA_BUCKETS = [
  { label: 'South Tampa',                lat: 27.90, lng: -82.49 },
  { label: 'Westchase & West Tampa',     lat: 28.05, lng: -82.58 },
  { label: 'North Tampa & Wesley Chapel', lat: 28.24, lng: -82.36 },
  { label: 'Brandon & Riverview',        lat: 27.90, lng: -82.30 },
  { label: 'St. Pete & Clearwater',      lat: 27.87, lng: -82.72 },
  { label: 'Apollo Beach & Ruskin',      lat: 27.77, lng: -82.40 },
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
  { emoji: '👯', label: 'Mom friends',  sub: 'Real friendships nearby'   },
  { emoji: '📅', label: 'Things to do', sub: 'Events + meetups'          },
  { emoji: '📍', label: 'Local picks',  sub: 'Trusted places + services' },
  { emoji: '🎈', label: 'Kid programs', sub: 'Classes, camps, sports'    },
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

// Carousel progress banner — back button + full-width 3-segment bar.
const ProgressBanner = ({ step, total, onBack }) => (
  <div style={{ padding: '8px 14px 8px' }}>
    <div className="flex items-center" style={{ marginBottom: 8, gap: 10 }}>
      <button
        onClick={onBack}
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
        aria-label="Back"
      >
        <ChevronLeft size={18} color={C.navy}/>
      </button>
      <div className="flex items-center flex-1" style={{ gap: 5 }}>
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
  </div>
);

const OptionCard = ({ active, onClick, emoji, label, sub, span = 1 }) => (
  <button
    onClick={onClick}
    className="rounded-2xl flex flex-col items-center justify-center transition-all active:scale-[.97]"
    style={{
      padding: '14px 10px 12px',
      background: active ? C.lilac : '#fff',
      border: `1.5px solid ${active ? C.navySoft : C.line}`,
      cursor: 'pointer',
      gap: 6,
      position: 'relative',
      minHeight: 92,
      boxShadow: active
        ? '0 10px 22px -10px rgba(27,42,78,.28)'
        : '0 2px 6px -2px rgba(27,42,78,.06)',
      gridColumn: span === 2 ? 'span 2' : undefined,
    }}
  >
    {active && (
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 7, right: 7,
          width: 18, height: 18, borderRadius: 999,
          background: C.coral, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'popBadge 240ms cubic-bezier(.4,1.5,.5,1)',
        }}
      >
        <Check size={11} strokeWidth={3.5}/>
      </div>
    )}
    <div style={{ fontSize: 30, lineHeight: 1 }}>{emoji}</div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 700,
      color: C.navy, textAlign: 'center', lineHeight: 1.15,
      letterSpacing: '-.005em',
    }}>
      {label}
    </div>
    {sub && (
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 500,
        color: C.muted, lineHeight: 1.2, textAlign: 'center',
      }}>
        {sub}
      </div>
    )}
  </button>
);

const QuestionHeader = ({ children, why }) => (
  <>
    <h2 style={{
      fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
      color: C.navy, lineHeight: 1.12, letterSpacing: '-.02em',
      marginTop: 2,
    }}>
      {children}
    </h2>
    <p style={{
      fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft,
      marginTop: 6, lineHeight: 1.4,
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

export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation, distance, setDistance, locationGeo, setLocationGeo }) => {
  const inputRef = useRef(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | detecting | ok | denied | unsupported
  const [step, setStep] = useState(1); // carousel: 1..3

  // Unifies manual picks and GPS into one structured selection.
  const handleAreaSelect = (entry) => {
    setLocation(entry.label);
    setLocationGeo(entry);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleAreaSelect(nearestArea(pos.coords.latitude, pos.coords.longitude));
        setGeoStatus('ok');
        inputRef.current?.blur();
      },
      () => setGeoStatus('denied'),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  };

  useEffect(() => {
    if (distance == null) setDistance(DEFAULT_DISTANCE);
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
  // age-relevant categories; location + radius filter whenever a neighborhood
  // is set (location is now step 1, so we key off data rather than step).
  const preview = useMemo(() => {
    const stageBuckets = stage.flatMap(s => STAGE_TO_BUCKETS[s] || []);
    const stageYears = new Set(stageBuckets.flatMap(b => BUCKET_TO_YEARS[b] || []));
    const hasStage = stage.length > 0;

    const filterByLocation = (places) => {
      if (!hasLocation) return places;
      let result = places;
      const local = result.filter(p => p.area === location);
      if (local.length) result = local;
      return result.filter(p => (p.dist || 0) <= radius);
    };

    let meetups = SUGGESTED_EVENTS;
    if (hasStage) {
      meetups = meetups.filter(e => {
        if (!e.kidAges) return true;
        return e.kidAges.some(b => (BUCKET_TO_YEARS[b] || []).some(y => stageYears.has(y)));
      });
    }
    if (hasLocation) meetups = meetups.filter(e => (e.mi || 0) <= radius);

    const thingsToDo = filterByLocation(ALL_ACTIVITIES);
    const spots = filterByLocation(ALL_SPOTS);

    let moms = SAMPLE_MOMS;
    if (hasStage) {
      moms = moms.filter(m => {
        const ys = momYearsFromKidsStr(m.kids);
        return ys.some(y => stageYears.has(y));
      });
    }
    if (hasLocation) moms = moms.filter(m => parseFloat(m.distance) <= radius);

    return { thingsToDo, meetups, moms, spots };
  }, [stage, location, hasLocation, radius]);

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

      {step === 3 ? (
        <div className="flex flex-col flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
          {/* Top bar — back · Skip */}
          <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '6px 14px 4px' }}>
            <button
              onClick={handleBack}
              className="rounded-full flex items-center justify-center"
              style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
              aria-label="Back"
            >
              <ChevronLeft size={18} color={C.navy}/>
            </button>
            <button
              onClick={onNext}
              style={{
                background: 'transparent', border: 'none', padding: '6px 8px',
                color: C.navy, fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </div>

          {/* Main content — flex column that vertically distributes 4 sections */}
          <div className="flex-1 flex flex-col justify-center" style={{ minHeight: 0, padding: '0 16px' }}>
            {/* Headline — centered */}
            <div style={{ textAlign: 'center', padding: '0 6px' }}>
              <h2 style={{
                fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
                color: C.navy, lineHeight: 1.1, letterSpacing: '-.02em',
              }}>
                Where are you joining from?
              </h2>
              <p style={{
                fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 500,
                color: C.muted, lineHeight: 1.4, marginTop: 8,
              }}>
                We'll show moms, events, and activities close to you.
              </p>
            </div>

            {/* Dark sage CTA */}
            <button
              onClick={detectLocation}
              disabled={geoStatus === 'detecting'}
              className="w-full flex items-center justify-center gap-3 active:scale-[.98] transition-transform"
              style={{
                marginTop: 22,
                padding: '14px 18px',
                borderRadius: 16,
                background: C.sageDark,
                color: '#fff',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 12px 24px -10px rgba(94,122,59,.5)',
                opacity: geoStatus === 'detecting' ? 0.78 : 1,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: 'rgba(255,255,255,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Navigation size={14} color="#fff" strokeWidth={2.5}/>
              </div>
              <div className="flex flex-col" style={{ alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 800,
                  lineHeight: 1.1,
                }}>
                  {geoStatus === 'detecting' ? 'Finding you…' : 'Use My Location'}
                </span>
                <span style={{
                  fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 500,
                  opacity: 0.92, lineHeight: 1.2, marginTop: 2,
                }}>
                  Find moms and activities near you
                </span>
              </div>
            </button>

            {/* OR · Choose My Area divider */}
            <div className="flex items-center" style={{ marginTop: 22, padding: '0 8px', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: C.line }}/>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700,
                  color: C.muted, letterSpacing: '.16em',
                }}>OR</div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
                  color: C.navy, marginTop: 1, letterSpacing: '-.005em',
                }}>Choose My Area</div>
              </div>
              <div style={{ flex: 1, height: 1, background: C.line }}/>
            </div>

            {/* Searchable neighborhood picker */}
            <div style={{ marginTop: 16 }}>
              <NeighborhoodPicker value={locationGeo} onSelect={handleAreaSelect} />
            </div>
          </div>

          {/* Bottom — Next + privacy note */}
          <div className="flex-shrink-0" style={{
            padding: '8px 16px 0',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
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
                border: 'none', cursor: !canContinue ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 18px -8px rgba(214,68,106,.55)',
              }}
            >
              Next
            </button>
            <div className="flex items-start justify-center" style={{ marginTop: 8, gap: 6 }}>
              <Lock size={11} color={C.muted} style={{ marginTop: 2, flexShrink: 0 }}/>
              <p style={{
                fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 500,
                color: C.muted, lineHeight: 1.4, textAlign: 'center',
              }}>
                Your location helps us show you only relevant local content. You can change this anytime in settings.
              </p>
            </div>
          </div>
        </div>
      ) : (<>
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
          <div className="flex flex-col justify-center" style={{ minHeight: '100%', paddingBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <QuestionHeader why="Match with moms living the same season.">
                What <Emph>stage</Emph> are you in?
              </QuestionHeader>
            </div>
            <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 18 }}>
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
          </div>
        )}

        {/* -------- Q2 · Looking for -------- */}
        {step === 2 && (
          <div className="flex flex-col justify-center" style={{ minHeight: '100%', paddingBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <QuestionHeader why="Pick a few. We'll tune your feed around it.">
                What do you <Emph>need most</Emph>?
              </QuestionHeader>
            </div>
            <div className="grid grid-cols-2" style={{ gap: 12, marginTop: 18 }}>
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
          </div>
        )}
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
          Next
        </button>
        <p style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted,
          textAlign: 'center', marginTop: 5, lineHeight: 1.35,
        }}>
          Your information stays private and is only used to personalize recommendations.
        </p>
      </div>
      </>)}
    </div>
  );
};
