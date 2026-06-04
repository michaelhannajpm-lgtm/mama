import { useEffect, useRef, useState } from 'react';
import { Heart, ChevronLeft, MapPin, Search, X } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';

// ==========================================================================
// AboutYou — onboarding screen 2.
// Location: free-text input + geolocation detect button (no autocomplete).
// Kids: tap-to-count stepper chips with × clear.
// Mom-types: multi-select chips ("What describes you best, mama?").
// Sized to fit a 375×667 iPhone SE with no internal scroll.
// ==========================================================================

// Used by the geolocation detect to bucket coords to a label.
const AREA_BUCKETS = [
  { label: 'Apollo Beach & Ruskin',    lat: 27.77, lng: -82.40 },
  { label: 'Riverview & Brandon',       lat: 27.90, lng: -82.30 },
  { label: 'South Tampa',               lat: 27.90, lng: -82.49 },
  { label: 'Downtown Tampa',            lat: 27.95, lng: -82.46 },
  { label: 'Wesley Chapel & New Tampa', lat: 28.24, lng: -82.36 },
  { label: 'Clearwater & St. Pete',     lat: 27.87, lng: -82.72 },
];

const AGE_OPTS = ['0–1', '1–3', '3–5', '5–8', '8–12', '13+'];
const KID_COUNT_CAP = 9;

const DISTANCE_STOPS = [1, 3, 5, 10, 15, 25];
const DEFAULT_DISTANCE = 5;

const MOM_TYPES = [
  { emoji: '🤰', label: 'Expecting mom' },
  { emoji: '💼', label: 'Working mom' },
  { emoji: '🏡', label: 'Stay at home' },
  { emoji: '💛', label: 'Solo mom' },
  { emoji: '🌍', label: 'Multicultural' },
  { emoji: '🌟', label: 'New to area' },
];

const nearestBucket = (lat, lng) => {
  let best = AREA_BUCKETS[0], bestD = Infinity;
  for (const a of AREA_BUCKETS) {
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

const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginTop: 10, marginBottom: 5 }}>
    <div style={{
      fontFamily: 'Fraunces', fontSize: 15, fontWeight: 600,
      color: C.navy, letterSpacing: '-.01em', lineHeight: 1.15,
    }}>
      {title}
    </div>
    {subtitle && (
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
        marginTop: 1, lineHeight: 1.3,
      }}>
        {subtitle}
      </div>
    )}
  </div>
);

// Kid-age stepper chip — inactive = simple pill; active = split into
// {label + ×N count} | {× clear}.
const KidChip = ({ age, count, onIncrement, onClear }) => {
  if (count === 0) {
    return (
      <button
        onClick={onIncrement}
        className="rounded-full transition-all active:scale-[.97]"
        style={{
          height: 32,
          padding: '0 14px',
          background: '#fff',
          border: `1.3px solid ${C.line}`,
          color: C.navy,
          fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap', cursor: 'pointer',
        }}
      >
        {age}
      </button>
    );
  }
  return (
    <div
      className="flex items-center rounded-full"
      style={{
        height: 32,
        background: C.sage,
        border: `1.3px solid #5E7A3B`,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onIncrement}
        className="flex items-center gap-1.5 active:scale-[.97]"
        style={{
          height: '100%', padding: '0 8px 0 13px',
          background: 'transparent', border: 'none',
          color: '#3D5E20',
          fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', cursor: 'pointer',
        }}
      >
        <span>{age}</span>
        {count >= 2 && (
          <span style={{
            background: '#5E7A3B', color: '#fff',
            fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
            padding: '1px 6px', borderRadius: 9, lineHeight: 1.3,
          }}>
            ×{count}
          </span>
        )}
      </button>
      <button
        onClick={onClear}
        aria-label={`Remove ${age}`}
        className="flex items-center justify-center active:scale-95"
        style={{
          height: '100%', padding: '0 9px',
          background: 'rgba(0,0,0,.06)',
          border: 'none', borderLeft: '1px solid rgba(94,122,59,.35)',
          cursor: 'pointer',
        }}
      >
        <X size={11} color="#3D5E20" strokeWidth={2.5}/>
      </button>
    </div>
  );
};

const Chip = ({ active, onClick, children, variant = 'lilac', fullWidth = false }) => {
  const styles = {
    sage:  { border: '#5E7A3B', bg: C.sage,  fg: '#3D5E20' },
    lilac: { border: C.navySoft, bg: C.lilac, fg: C.navy   },
  }[variant];
  return (
    <button
      onClick={onClick}
      className={`rounded-full transition-all active:scale-[.97] flex items-center justify-center gap-1.5 ${fullWidth ? 'w-full' : ''}`}
      style={{
        height: 32,
        background: active ? styles.bg : '#fff',
        border: `1.3px solid ${active ? styles.border : C.line}`,
        color: active ? styles.fg : C.navy,
        fontFamily: 'Albert Sans',
        fontSize: 11.5,
        fontWeight: active ? 700 : 600,
        whiteSpace: 'nowrap',
        padding: '0 12px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
};

export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation, distance, setDistance }) => {
  const inputRef = useRef(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | detecting | ok | denied | unsupported

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

  // On mount: seed radius, then auto-detect location if we don't have one.
  useEffect(() => {
    if (distance == null) setDistance(DEFAULT_DISTANCE);
    if (!location) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ages = profile.kidsAges || {};
  const momTypes = profile.momTypes || [];
  const totalKids = Object.values(ages).reduce((s, n) => s + n, 0);
  const radius = distance ?? DEFAULT_DISTANCE;

  const incrementAge = (age) => {
    setProfile(p => {
      const next = { ...(p.kidsAges || {}) };
      const cur = next[age] || 0;
      next[age] = Math.min(cur + 1, KID_COUNT_CAP);
      return { ...p, kidsAges: next };
    });
  };

  const clearAge = (age) => {
    setProfile(p => {
      const next = { ...(p.kidsAges || {}) };
      delete next[age];
      return { ...p, kidsAges: next };
    });
  };

  const toggleMomType = (label) => {
    setProfile(p => {
      const cur = p.momTypes || [];
      const has = cur.includes(label);
      return { ...p, momTypes: has ? cur.filter(x => x !== label) : [...cur, label] };
    });
  };

  const radiusIdx = Math.max(0, DISTANCE_STOPS.indexOf(radius));
  const radiusLabel = radiusIdx === DISTANCE_STOPS.length - 1 ? '25+ mi' : `${radius} mi`;
  const hasLocation = !!(location && location.trim());

  const canContinue = hasLocation && totalKids > 0 && momTypes.length > 0;

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      <div className="flex items-center justify-between" style={{ padding: '6px 14px' }}>
        <button
          onClick={onBack}
          className="rounded-full flex items-center justify-center"
          style={{ width: 30, height: 30, background: '#fff', border: `1px solid ${C.line}` }}
          aria-label="Back"
        >
          <ChevronLeft size={17} color={C.navy}/>
        </button>
        <StepDots current={2} total={4}/>
        <div style={{ width: 30 }}/>
      </div>

      <div className="flex-1 px-4" style={{ minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Headline */}
        <h2 style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700,
          color: C.navy, lineHeight: 1.1, letterSpacing: '-.02em',
        }}>
          Tell us about{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>you</span>
        </h2>

        {/* -------- Section 1 · Area -------- */}
        <SectionHeader title="Where are you located?" subtitle="Type your neighborhood or tap 📍 to detect."/>

        <div
          className="flex items-center gap-2 rounded-full"
          style={{
            height: 36,
            padding: '0 4px 0 12px',
            background: '#fff',
            border: `1.3px solid ${hasLocation ? C.coral : C.line}`,
          }}
        >
          <Search size={13} color={hasLocation ? C.coralDeep : C.muted}/>
          <input
            ref={inputRef}
            type="text"
            value={location || ''}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={geoStatus === 'detecting' ? 'Detecting your location…' : 'Type your neighborhood…'}
            className="flex-1 bg-transparent outline-none min-w-0"
            style={{
              fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600,
              color: C.navy,
            }}
          />
          {hasLocation && (
            <button
              onClick={() => setLocation('')}
              aria-label="Clear"
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                width: 18, height: 18, background: C.line, border: 'none', cursor: 'pointer',
              }}
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
              width: 28, height: 28, background: C.coral, border: 'none', cursor: 'pointer',
              opacity: geoStatus === 'detecting' ? 0.6 : 1,
            }}
          >
            <MapPin size={13} color="#fff"/>
          </button>
        </div>

        {/* Radius slider — stops up to 25+. */}
        <div className="flex items-center gap-3" style={{ marginTop: 10 }}>
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

        {/* -------- Section 2 · Kids -------- */}
        <SectionHeader
          title="How old are your kids?"
          subtitle={
            totalKids > 0
              ? `${totalKids} kid${totalKids > 1 ? 's' : ''} · tap again to add, tap × to remove`
              : 'Tap an age — tap again to add multiple'
          }
        />
        <div className="flex flex-wrap" style={{ gap: 5 }}>
          {AGE_OPTS.map(age => (
            <KidChip
              key={age}
              age={age}
              count={ages[age] || 0}
              onIncrement={() => incrementAge(age)}
              onClear={() => clearAge(age)}
            />
          ))}
        </div>

        {/* -------- Section 3 · Mom types -------- */}
        <SectionHeader
          title="What describes you best?"
          subtitle="Select all that apply — we'll match you with moms on a similar journey."
        />
        <div className="grid grid-cols-2" style={{ gap: 5 }}>
          {MOM_TYPES.map(m => (
            <Chip
              key={m.label}
              active={momTypes.includes(m.label)}
              onClick={() => toggleMomType(m.label)}
              variant="lilac"
              fullWidth
            >
              <span style={{ fontSize: 13 }}>{m.emoji}</span>
              <span>{m.label}</span>
            </Chip>
          ))}
        </div>

        <div style={{ height: 8 }}/>
      </div>

      {/* CTA + footer */}
      <div style={{
        padding: '6px 16px 0',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
      }}>
        <button
          onClick={onNext}
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
          <Heart size={14} fill="currentColor"/>
          Find My Village
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
