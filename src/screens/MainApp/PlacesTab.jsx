import { useState } from 'react';
import {
  Check, MapPin, Sparkles, Star, ChevronUp, ChevronDown, Heart,
} from 'lucide-react';
import { C } from '../../theme';
import {
  PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, findPlace, TOP_PICKS, BADGE_META,
} from '../../data/places';

// ====================================================================
// PLACES TAB — editable place picker (mirrors Screen 6 + match CTA)
// ====================================================================
export const PlacesTab = ({ prefs, setPrefs, location, goToMatches, flash }) => {
  const [activeCat, setActiveCat] = useState('cafes');
  const [browseOpen, setBrowseOpen] = useState(false);

  const togglePlace = (id) => {
    setPrefs(p => {
      if (id === PLACES_NO_PREF) {
        return { ...p, places: p.places.includes(PLACES_NO_PREF) ? [] : [PLACES_NO_PREF] };
      }
      const cleaned = p.places.filter(x => x !== PLACES_NO_PREF);
      if (cleaned.includes(id)) return { ...p, places: cleaned.filter(x => x !== id) };
      return { ...p, places: [...cleaned, id] };
    });
  };

  const topPicksFull = TOP_PICKS
    .map(t => { const p = findPlace(t.placeId); return p ? { ...p, ...t } : null; })
    .filter(Boolean);

  const noPlacePref = prefs.places.includes(PLACES_NO_PREF);
  const pickedCount = prefs.places.filter(x => x !== PLACES_NO_PREF).length;
  const countByCat = (catId) => (PLACES[catId] || []).filter(p => prefs.places.includes(p.id)).length;

  const renderPlaceRow = (p, badgeOverride) => {
    const isPicked = prefs.places.includes(p.id);
    const badge = badgeOverride || p.badge;
    const meta = badge ? BADGE_META[badge] : null;
    return (
      <button key={p.id} onClick={()=>togglePlace(p.id)}
        className="w-full text-left rounded-xl p-3 transition-all active:scale-[.99]"
        style={{
          background: isPicked ? `${C.terracotta}10` : C.paper,
          border: `1.5px solid ${isPicked ? C.terracotta : C.divider}`,
        }}>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{
            background: isPicked ? C.terracotta : C.creamSoft,
            color: isPicked ? '#fff' : C.terracotta,
          }}>
            {isPicked ? <Check size={14}/> : <MapPin size={14}/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-[13px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{p.name}</div>
              {meta && (
                <div className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: `${meta.color}18`, color: meta.color, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.04em',
                }}>
                  <meta.icon size={8} fill={meta.fill ? meta.color : 'none'}/>
                  {badge.toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>{p.area} · {p.dist} mi</div>
            {p.desc && <div className="text-[10px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, lineHeight: 1.35 }}>{p.desc}</div>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
          {location || 'Your area'}
        </div>
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 26, color: C.ink, letterSpacing:'-.02em' }}>
          Where you like to <span style={{ fontStyle:'italic', color: C.terracotta }}>meet</span>.
        </h1>
        <div className="mt-1 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          Pick spots and we'll match you with moms who love them too.
        </div>
      </div>

      {/* Open to anywhere toggle */}
      <button onClick={()=>togglePlace(PLACES_NO_PREF)}
        className="w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 transition-all"
        style={{
          background: noPlacePref ? C.sageDark : C.paper,
          color: noPlacePref ? '#fff' : C.ink,
          border: `1px ${noPlacePref ? 'solid' : 'dashed'} ${noPlacePref ? C.sageDark : C.divider}`,
        }}>
        <Sparkles size={14} style={{ color: noPlacePref ? C.saffron : C.sageDark, flexShrink: 0 }}/>
        <div className="flex-1 text-left">
          <div className="text-[12.5px]" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>I'm open to anywhere</div>
          <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', opacity: noPlacePref ? .85 : .6 }}>Let her suggest a spot</div>
        </div>
        {noPlacePref && <Check size={15} style={{ color: C.saffron }}/>}
      </button>

      {!noPlacePref && (
        <>
          {/* Top picks */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10.5px] tracking-[.16em] uppercase flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
                <Star size={11} fill={C.terracotta}/> Top picks {location ? `in ${location}` : 'near you'}
              </div>
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                {pickedCount} picked
              </div>
            </div>
            <div className="space-y-1.5">
              {topPicksFull.map(p => renderPlaceRow(p))}
            </div>
          </div>

          {/* Browse more */}
          <button onClick={()=>setBrowseOpen(o=>!o)}
            className="mt-3 w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: browseOpen ? C.ink : 'transparent',
              color: browseOpen ? C.cream : C.inkSoft,
              border: `1px ${browseOpen ? 'solid' : 'dashed'} ${browseOpen ? C.ink : C.divider}`,
            }}>
            {browseOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            <span className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>
              {browseOpen ? 'Hide more places' : 'Browse more places'}
            </span>
          </button>

          {browseOpen && (
            <div className="mt-3" style={{ animation: 'fadeInUp .3s ease both' }}>
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth:'none' }}>
                {PLACE_CATEGORIES.map(cat => {
                  const active = activeCat === cat.id;
                  const cnt = countByCat(cat.id);
                  return (
                    <button key={cat.id} onClick={()=>setActiveCat(cat.id)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all flex-shrink-0"
                      style={{
                        background: active ? C.ink : C.paper,
                        color: active ? C.cream : C.ink,
                        border: `1px solid ${active ? C.ink : C.divider}`,
                      }}>
                      <cat.icon size={12}/>
                      <span className="text-[11.5px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{cat.label}</span>
                      {cnt > 0 && (
                        <span className="ml-0.5 text-[9.5px] px-1.5 py-0.5 rounded-full" style={{
                          background: active ? C.saffron : C.terracotta, color: active ? C.ink : '#fff',
                          fontFamily:'Albert Sans', fontWeight:700,
                        }}>{cnt}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                {PLACES[activeCat].map(p => renderPlaceRow(p))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Find matches by place CTA */}
      <button
        onClick={()=>{
          if (!noPlacePref && pickedCount === 0) {
            flash && flash('Pick at least one place first');
            return;
          }
          flash && flash('✦ Finding moms who love your spots');
          goToMatches && goToMatches();
        }}
        className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
        style={{
          height: 48,
          background: (noPlacePref || pickedCount > 0) ? C.terracotta : C.divider,
          color: (noPlacePref || pickedCount > 0) ? '#fff' : C.inkMuted,
          fontFamily:'Albert Sans', fontWeight: 600, fontSize: 14,
        }}>
        <Heart size={14}/> Find moms who love these spots
      </button>

      <div className="h-3"/>
    </div>
  );
};
