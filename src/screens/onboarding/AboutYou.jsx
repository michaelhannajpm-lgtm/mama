import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Check, Sparkles, LocateFixed, Lock } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { MOM_DESCRIBES } from '../../data/taxonomy';
import { NeighborhoodPicker } from '../../components/NeighborhoodPicker';
import { nearestArea } from '../../lib/places.js';
import { fetchNearbyMoms } from '../../lib/nearby-moms';

// ==========================================================================
// AboutYou — onboarding screen 2, structured as a 4-step visual carousel:
//   Q1 Stage  →  Q2 Looking for  →  Q3 Describes  →  Q4 Location + radius
// Each step has emoji option cards, a "why we're asking" subhead, and a
// dynamic preview banner that mirrors the Landing promise — events, places,
// support and moms — recomputed live as the user makes selections.
// ==========================================================================

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
  { emoji: '👯', label: 'Mom friends',        sub: 'Real friendships nearby'   },
  { emoji: '📅', label: 'Things to do',       sub: 'Events + meetups'          },
  { emoji: '📍', label: 'Local picks',        sub: 'Trusted places + services' },
  { emoji: '🎈', label: 'Kids activities',    sub: 'Classes, camps, sports'    },
  { emoji: '🏫', label: 'Schools & daycare',  sub: 'Trusted by other moms'     },
  { emoji: '🫂', label: 'Support groups',     sub: 'Moms helping moms'         },
];

const DESCRIBES_PREFER_NOT_TO_SAY = 'Prefer not to say';

// Shared with the profile's Interests & Preferences → Mom type (MOM_DESCRIBES
// in data/taxonomy) so the two surfaces always offer the exact same options.
const DESCRIBES_OPTS = MOM_DESCRIBES;

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

// Live places (grouped by category) are split into "things to do" (active
// programs you sign kids up for) and "local spots" (browse-and-go destinations
// + grown-up resources). Group meetups come from live events; the moms count
// comes from the match-ranked /api/mom-profiles/nearby endpoint.
const ACTIVITY_CATS = ['extracurricular', 'camps', 'sports'];
const SPOT_CATS     = ['fun', 'wellness', 'health', 'childcare', 'schools'];

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

const OptionCard = ({
  active, onClick, emoji, label, sub, span = 1,
  count, onDec, onInc, // when defined, shows a − N + pill instead of the check
}) => {
  const hasCounter = count != null;
  const handleCard = () => {
    // When in counter mode and already active, the card itself is inert —
    // the user adjusts via − / +. Otherwise tap toggles selection.
    if (hasCounter && active) return;
    onClick?.();
  };
  return (
    <button
      onClick={handleCard}
      className="rounded-2xl flex flex-col items-center justify-center transition-all active:scale-[.97]"
      style={{
        padding: '14px 10px 12px',
        background: active ? C.lilac : '#fff',
        border: `1.5px solid ${active ? C.navySoft : C.line}`,
        cursor: hasCounter && active ? 'default' : 'pointer',
        gap: 6,
        position: 'relative',
        minHeight: 92,
        boxShadow: active
          ? '0 10px 22px -10px rgba(27,42,78,.28)'
          : '0 2px 6px -2px rgba(27,42,78,.06)',
        gridColumn: span === 2 ? 'span 2' : undefined,
      }}
    >
      {active && !hasCounter && (
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
      {active && hasCounter && (
        <div
          style={{
            position: 'absolute', top: 6, right: 6,
            display: 'flex', alignItems: 'center',
            background: C.coral, color: '#fff',
            borderRadius: 999, padding: '2px 3px',
            boxShadow: '0 4px 10px -4px rgba(214,68,106,.6)',
            animation: 'popBadge 240ms cubic-bezier(.4,1.5,.5,1)',
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11.5,
          }}
        >
          <span
            role="button"
            aria-label={`Remove one ${label}`}
            onClick={(e) => { e.stopPropagation(); onDec?.(); }}
            style={{
              width: 18, height: 18, borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', userSelect: 'none', lineHeight: 1,
            }}
          >
            −
          </span>
          <span style={{
            minWidth: 14, textAlign: 'center', padding: '0 2px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {count}
          </span>
          <span
            role="button"
            aria-label={`Add one ${label}`}
            onClick={(e) => { e.stopPropagation(); onInc?.(); }}
            style={{
              width: 18, height: 18, borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', userSelect: 'none', lineHeight: 1,
            }}
          >
            +
          </span>
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
};

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

export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation, distance, setDistance, locationGeo, setLocationGeo, places = {}, events = [], thisWeek = [] }) => {
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
  const stageCounts = profile.stageCounts || {};
  const lookingFor = profile.lookingFor || [];
  const describes = profile.describes || [];
  const radius = distance ?? DEFAULT_DISTANCE;
  const hasLocation = !!(location && location.trim());

  // Stage cards support multi-select WITH per-stage counters. Tapping an
  // inactive card adds it with count=1; the inline − / + controls bump
  // the count; decrementing past 1 removes the stage entirely.
  //
  // "Expecting" is a current state, not a child count, so it has no counter
  // and is capped at 1 — but it coexists with any age bucket (a mom who's
  // pregnant with a 2nd kid taps Expecting AND the existing kid's stage).
  const EXPECTING = 'Expecting';
  const incStage = (label) => {
    setProfile(p => {
      const cur = p.stage || [];
      const counts = p.stageCounts || {};

      // Expecting is a single-state flag (no counter, capped at 1).
      // No-op if it's already on.
      if (label === EXPECTING) {
        if (cur.includes(EXPECTING)) return p;
        return {
          ...p,
          stage: [...cur, EXPECTING],
          stageCounts: { ...counts, [EXPECTING]: 1 },
        };
      }

      // Real age stage — bump (or add) independently of Expecting.
      const inCur = cur.includes(label);
      return {
        ...p,
        stage: inCur ? cur : [...cur, label],
        stageCounts: { ...counts, [label]: (counts[label] || 0) + 1 },
      };
    });
  };
  const decStage = (label) => {
    setProfile(p => {
      const cur = p.stage || [];
      const counts = p.stageCounts || {};
      const next = (counts[label] || 0) - 1;
      if (next <= 0) {
        const nextCounts = { ...counts };
        delete nextCounts[label];
        return { ...p, stage: cur.filter(x => x !== label), stageCounts: nextCounts };
      }
      return { ...p, stageCounts: { ...counts, [label]: next } };
    });
  };
  // Legacy entry — tap inactive card or want to fully clear a selection.
  const toggleStage = (label) => {
    const isOn = stage.includes(label);
    if (isOn) {
      setProfile(p => {
        const counts = { ...(p.stageCounts || {}) };
        delete counts[label];
        return { ...p, stage: (p.stage || []).filter(x => x !== label), stageCounts: counts };
      });
    } else {
      incStage(label);
    }
  };

  const toggleLookingFor = (label) => {
    setProfile(p => {
      const cur = p.lookingFor || [];
      const has = cur.includes(label);
      return { ...p, lookingFor: has ? cur.filter(x => x !== label) : [...cur, label] };
    });
  };

  // "Prefer not to say" is exclusive — toggling it clears the rest, and
  // toggling another option clears it.
  const toggleDescribes = (label) => {
    setProfile(p => {
      const cur = p.describes || [];
      const has = cur.includes(label);
      if (label === DESCRIBES_PREFER_NOT_TO_SAY) {
        return { ...p, describes: has ? [] : [label] };
      }
      const cleared = cur.filter(x => x !== DESCRIBES_PREFER_NOT_TO_SAY);
      return {
        ...p,
        describes: has ? cleared.filter(x => x !== label) : [...cleared, label],
      };
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

    // Live places carry `area` but no per-user `dist`; narrow by exact-area
    // match when a neighborhood is set, otherwise show the full pool.
    const allActivities = ACTIVITY_CATS.flatMap(c => places?.[c] || []);
    const allSpots      = SPOT_CATS.flatMap(c => places?.[c] || []);
    const filterByLocation = (list) => {
      if (!hasLocation) return list;
      const local = list.filter(p => p.area === location);
      return local.length ? local : list;
    };

    let meetups = [...events, ...thisWeek];
    if (hasStage) {
      meetups = meetups.filter(e => {
        if (!e.kidAges || !e.kidAges.length) return true;
        return e.kidAges.some(b => (BUCKET_TO_YEARS[b] || []).some(y => stageYears.has(y)));
      });
    }
    if (hasLocation) meetups = meetups.filter(e => (e.mi || 0) <= radius);

    const thingsToDo = filterByLocation(allActivities);
    const spots = filterByLocation(allSpots);

    return { thingsToDo, meetups, spots };
  }, [stage, location, hasLocation, radius, places, events, thisWeek]);

  // Moms count is real, from the match-ranked nearby endpoint keyed on the
  // partial onboarding profile (kid stage + chosen location). Debounced so we
  // don't refetch on every keystroke; a request id guards against races.
  const [momsCount, setMomsCount] = useState(0);
  const momsReqId = useRef(0);
  useEffect(() => {
    const reqId = ++momsReqId.current;
    const stageBuckets = stage.flatMap(s => STAGE_TO_BUCKETS[s] || []);
    const kids_ages = {};
    stageBuckets.forEach(b => { kids_ages[b] = 1; });
    const user = {
      kids_ages,
      interests: [], values: [], mom_types: describes || [], familyTags: [],
      places: [], free_slots: [],
      lat: locationGeo?.lat ?? null,
      lng: locationGeo?.lng ?? null,
      city: locationGeo?.city ?? null,
      neighborhood: locationGeo?.neighborhood ?? null,
      county: locationGeo?.county ?? null,
    };
    const t = setTimeout(() => {
      fetchNearbyMoms(user, { limit: 100, verifiedOnly: true })
        .then(({ total, moms }) => {
          if (reqId !== momsReqId.current) return;
          setMomsCount(Number.isFinite(total) && total > 0 ? total : (moms?.length || 0));
        })
        .catch(() => { if (reqId === momsReqId.current) setMomsCount(0); });
    }, 350);
    return () => clearTimeout(t);
  }, [stage, describes, locationGeo]);

  // Shared 4-bucket items array — order matches Landing promise.
  const previewItems = [
    { count: preview.thingsToDo.length, label: 'Things to do'  },
    { count: preview.meetups.length,    label: 'Group Meetups' },
    { count: momsCount,                 label: 'Moms'          },
    { count: preview.spots.length,      label: 'Local Spots'   },
  ];

  const canContinue =
    step === 1 ? stage.length > 0 :
    step === 2 ? lookingFor.length > 0 :
    step === 3 ? describes.length > 0 :
    step === 4 ? hasLocation :
    false;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else onNext();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onBack();
  };

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      {step === 4 ? (
        <div className="flex flex-col flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
          {/* Top bar — back (no skip; location is required) */}
          <div className="flex items-center flex-shrink-0" style={{ padding: '6px 14px 4px' }}>
            <button
              onClick={handleBack}
              className="rounded-full flex items-center justify-center"
              style={{ width: 32, height: 32, background: '#fff', border: `1px solid ${C.line}` }}
              aria-label="Back"
            >
              <ChevronLeft size={18} color={C.navy}/>
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

            {/* Tampa skyline hero — grounds the "where are you joining from"
                question in the city the app is launching in. */}
            <div style={{
              marginTop: 18, borderRadius: 16, overflow: 'hidden',
              border: `1px solid ${C.line}`,
              boxShadow: '0 6px 16px -12px rgba(27,42,78,.35)',
              position: 'relative',
            }}>
              <img
                src="https://images.unsplash.com/photo-1561063139-e183e66909c4?w=800&auto=format&fit=crop"
                alt="Tampa, Florida skyline"
                style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', left: 10, bottom: 8,
                color: '#fff',
                fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
                letterSpacing: '.14em', textTransform: 'uppercase',
                textShadow: '0 1px 4px rgba(0,0,0,.55)',
              }}>
                Tampa, FL
              </div>
            </div>

            {/* Use-current-location row — matches the Profile location sheet */}
            <button
              onClick={detectLocation}
              disabled={geoStatus === 'detecting'}
              className="w-full flex items-center active:scale-[.99] transition-transform"
              style={{
                marginTop: 14,
                gap: 9, padding: '12px 14px', borderRadius: 13,
                background: C.coralSoft, border: `1px solid ${C.coral}`,
                cursor: geoStatus === 'detecting' ? 'default' : 'pointer',
              }}
            >
              <LocateFixed size={16} color={C.coralDeep} strokeWidth={2.2} style={{ flexShrink: 0 }}/>
              <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.coralDeep }}>
                {geoStatus === 'detecting' ? 'Locating…' : 'Use my current location'}
              </span>
            </button>
            {(geoStatus === 'denied' || geoStatus === 'unsupported') && (
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.coralDeep, marginTop: 6 }}>
                {geoStatus === 'denied'
                  ? 'Couldn’t get your location. Pick an area below.'
                  : 'Location isn’t available on this device.'}
              </div>
            )}

            {/* Searchable neighborhood picker — matches the Profile location sheet */}
            <div style={{ marginTop: 20 }}>
              <div className="uppercase" style={{
                fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
                color: C.muted, fontWeight: 700, marginBottom: 8,
              }}>
                Neighborhood
              </div>
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
      <ProgressBanner step={step} total={4} onBack={handleBack}/>

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
              {STAGE_OPTS.map((opt, i) => {
                // Expecting renders without a −/+ counter — it's a current
                // state, capped at 1. It coexists with any age bucket above.
                const isExpecting = opt.label === EXPECTING;
                return (
                  <OptionCard
                    key={opt.label}
                    emoji={opt.emoji}
                    label={opt.label}
                    sub={opt.sub}
                    active={stage.includes(opt.label)}
                    onClick={() => toggleStage(opt.label)}
                    count={isExpecting
                      ? undefined
                      : (stage.includes(opt.label) ? (stageCounts[opt.label] || 1) : 0)}
                    onDec={isExpecting ? undefined : () => decStage(opt.label)}
                    onInc={isExpecting ? undefined : () => incStage(opt.label)}
                    span={i === STAGE_OPTS.length - 1 ? 2 : 1}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* -------- Q2 · Looking for -------- */}
        {step === 2 && (
          <div className="flex flex-col justify-center" style={{ minHeight: '100%', paddingBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <QuestionHeader why="Pick a few. We'll tune your feed around it.">
                What are you <Emph>hoping</Emph> to find?
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

        {/* -------- Q3 · Describes -------- */}
        {step === 3 && (
          <div className="flex flex-col justify-center" style={{ minHeight: '100%', paddingBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <QuestionHeader why="Helps us connect you with moms in similar circumstances.">
                What <Emph>describes you</Emph> the most?
              </QuestionHeader>
            </div>
            <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 18 }}>
              {DESCRIBES_OPTS.map(opt => (
                <OptionCard
                  key={opt.label}
                  emoji={opt.emoji}
                  label={opt.label}
                  sub={opt.sub}
                  active={describes.includes(opt.label)}
                  onClick={() => toggleDescribes(opt.label)}
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
