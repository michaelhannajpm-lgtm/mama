import { useEffect, useState } from 'react';
import {
  ArrowRight, MapPin, Search, Compass, ShieldCheck, Plus,
} from 'lucide-react';
import { C } from '../../theme';
import { NEIGHBORHOODS, DISTANCES } from '../../data/taxonomy';
import { StatusBar } from '../../components/StatusBar';
import { StepHeader } from '../../components/StepHeader';
import { PrimaryBtn } from '../../components/PrimaryBtn';

export const LocationStep = ({ onNext, onBack, location, setLocation, distance, setDistance }) => {
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);
  const filtered = query.trim()
    ? NEIGHBORHOODS.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const handleUseCurrentLocation = () => {
    setLocateError(null);

    // Browser doesn't support geolocation — fall back to Tampa.
    if (!navigator.geolocation) {
      setLocation('Tampa, FL');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Nominatim reverse geocoding — free, no key. zoom=10 returns city/town level.
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`);
          const data = await res.json();
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.hamlet || a.county || '';
          const stateCode = a['ISO3166-2-lvl4'] ? a['ISO3166-2-lvl4'].split('-')[1] : '';
          const stateName = a.state || '';
          const label = city
            ? (stateCode ? `${city}, ${stateCode}` : stateName ? `${city}, ${stateName}` : city)
            : (stateName || 'Tampa, FL');
          setLocation(label);
        } catch (e) {
          setLocateError('Could not look that up. Using Tampa, FL.');
          setLocation('Tampa, FL');
        } finally {
          setLocating(false);
        }
      },
      () => {
        // User denied or timeout — fall back to Tampa, FL silently.
        setLocateError('Location access denied. Using Tampa, FL.');
        setLocation('Tampa, FL');
        setLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 600000, // 10 minutes
      }
    );
  };

  const missing = [];
  if (!location) missing.push('location');
  if (distance == null) missing.push('distance');
  const canContinue = missing.length === 0;
  const missingText = missing.length === 1 ? missing[0] : missing.join(' & ');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={1} total={7} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Your neighborhood
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 32, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Where are <span style={{ fontStyle:'italic', color: C.terracotta }}>you</span>, mama?
          </h2>
          <p className="mt-2 text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            We'll match you with moms close enough to actually meet up.
          </p>
        </div>

        {/* Location picker */}
        <div className="mt-5">
          <div className="text-[11.5px] mb-2" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            YOUR LOCATION
          </div>

          {!location ? (
            <>
              <button onClick={handleUseCurrentLocation} disabled={locating}
                className="w-full rounded-2xl flex items-center gap-3 px-4 mb-2.5 transition-all active:scale-[.99]"
                style={{
                  height: 50, background: C.ink, color: C.cream,
                  fontFamily:'Albert Sans', fontWeight:500, fontSize: 13.5,
                  opacity: locating ? 0.7 : 1,
                }}>
                <Compass size={16} style={{ color: C.saffron }}/>
                {locating ? 'Finding your city…' : 'Use my current location'}
              </button>
              {locateError && (
                <div className="mb-2.5 text-[11px] px-1" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                  {locateError}
                </div>
              )}

              <div className="rounded-2xl flex items-center gap-2.5 px-4" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
                <Search size={15} style={{ color: C.inkMuted }}/>
                <input value={query} onChange={e=>setQuery(e.target.value)}
                  placeholder="Search neighborhood…"
                  className="flex-1 bg-transparent outline-none text-[13.5px]"
                  style={{ fontFamily:'Albert Sans', color: C.ink }}/>
              </div>

              <div className="mt-2 space-y-1.5">
                {query.trim() && !filtered.some(n => n.toLowerCase() === query.trim().toLowerCase()) && (
                  <button onClick={()=>setLocation(query.trim())}
                    className="w-full text-left rounded-xl px-4 py-2.5 flex items-center gap-2.5 transition-all"
                    style={{ background: C.terracotta, color:'#fff', border:`1px solid ${C.terracotta}` }}>
                    <Plus size={13}/>
                    <span className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>Use "{query.trim()}"</span>
                  </button>
                )}
                {filtered.map(n => (
                  <button key={n} onClick={()=>setLocation(n)}
                    className="w-full text-left rounded-xl px-4 py-2.5 flex items-center gap-2.5 transition-all"
                    style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
                    <MapPin size={13} style={{ color: C.inkMuted }}/>
                    <span className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>{n}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: C.paper, border:`1.5px solid ${C.terracotta}` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.terracotta, color:'#fff' }}>
                <MapPin size={17}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{location}</div>
                <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>Your exact address stays private.</div>
              </div>
              <button onClick={()=>{ setLocation(null); setQuery(''); }} className="text-[12px] px-2 py-1" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
                Change
              </button>
            </div>
          )}
        </div>

        {/* Distance preference — sliding bar */}
        <DistanceSlider distance={distance} setDistance={setDistance}/>

        {/* Safety note */}
        <div className="mt-5 mb-4 rounded-[16px] p-3.5 flex items-center gap-3" style={{ background: C.ink, color: C.cream }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.saffron, color: C.ink }}>
            <ShieldCheck size={15}/>
          </div>
          <div className="flex-1">
            <div className="text-[13px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>Verified phone &amp; social media.</div>
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.7, lineHeight:1.4 }}>
              Your neighborhood — never your address — is shared with matched moms.
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {!canContinue && (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick {missingText} to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>Continue <ArrowRight size={18}/></PrimaryBtn>
      </div>
    </div>
  );
};

const DistanceSlider = ({ distance, setDistance }) => {
  const idx = DISTANCES.findIndex(d => d.val === distance);
  const effectiveIdx = idx === -1 ? 2 : idx; // default 20 mi
  const current = DISTANCES[effectiveIdx];

  // Auto-set distance to default on mount if it's still null so the user can
  // continue without explicitly tapping the slider.
  useEffect(() => {
    if (distance == null) setDistance(DISTANCES[2].val);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMax = current.val === 150;

  return (
    <div className="mt-5">
      <div className="text-[11.5px] mb-2" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
        HOW FAR WILL YOU GO?
      </div>
      <div className="rounded-2xl px-4 pt-4 pb-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
        <div className="flex items-baseline gap-2 mb-3">
          <div style={{ fontFamily:'Fraunces', fontSize: 36, fontWeight:500, color: C.terracotta, letterSpacing:'-.02em', lineHeight: 1 }}>
            {isMax ? '150+' : current.val}
          </div>
          <div className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:500 }}>
            {isMax ? 'mi or more' : `mile${current.val === 1 ? '' : 's'}`}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={DISTANCES.length - 1}
          step={1}
          value={effectiveIdx}
          onChange={e => setDistance(DISTANCES[parseInt(e.target.value, 10)].val)}
          aria-label="Distance in miles"
          className="w-full"
          style={{ accentColor: C.terracotta }}
        />

        <div className="mt-1 flex justify-between" style={{ fontFamily:'Albert Sans', fontSize: 10, fontWeight:600 }}>
          {DISTANCES.map((d, i) => {
            const active = i === effectiveIdx;
            return (
              <button key={d.val} type="button"
                onClick={() => setDistance(d.val)}
                className="flex flex-col items-center"
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: '2px 0', cursor: 'pointer' }}>
                <div style={{
                  width: active ? 6 : 4, height: active ? 6 : 4,
                  borderRadius: 999,
                  background: active ? C.terracotta : C.inkMuted,
                  opacity: active ? 1 : 0.45,
                  marginBottom: 4,
                  transition: 'all .15s ease',
                }}/>
                <span style={{
                  color: active ? C.ink : C.inkMuted,
                  fontWeight: active ? 700 : 500,
                }}>
                  {d.val === 150 ? '150+' : d.val}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
