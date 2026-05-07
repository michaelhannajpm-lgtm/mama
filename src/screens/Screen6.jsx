import { useState } from 'react';
import {
  ArrowRight, MapPin, Sparkles, Check, ChevronDown, ChevronUp, Plus, Star,
} from 'lucide-react';
import { C } from '../theme';
import {
  PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, findPlace, TOP_PICKS, BADGE_META,
} from '../data/places';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const Screen6 = ({ onNext, onBack, prefs, setPrefs, location }) => {
  const [activeCat, setActiveCat] = useState('cafes');
  const [browseOpen, setBrowseOpen] = useState(false);
  // Custom places — user-added spots not in our database
  const [customPlaces, setCustomPlaces] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customArea, setCustomArea] = useState('');

  const togglePlace = (id) => {
    setPrefs(p => {
      if (id === PLACES_NO_PREF) {
        return { ...p, places: p.places.includes(PLACES_NO_PREF) ? [] : [PLACES_NO_PREF] };
      }
      const cleaned = p.places.filter(x => x !== PLACES_NO_PREF);
      if (cleaned.includes(id)) {
        return { ...p, places: cleaned.filter(x => x !== id) };
      }
      return { ...p, places: [...cleaned, id] };
    });
  };

  const topPicksFull = TOP_PICKS
    .map(t => {
      const place = findPlace(t.placeId);
      return place ? { ...place, ...t } : null;
    })
    .filter(Boolean);

  const noPlacePref = prefs.places.includes(PLACES_NO_PREF);
  const placeCount = prefs.places.filter(x => x !== PLACES_NO_PREF).length;
  const countByCat = (catId) =>
    PLACES[catId].filter(p => prefs.places.includes(p.id)).length;

  const canContinue = prefs.places.length > 0;

  const renderPlaceRow = (p, badge=null) => {
    const active = prefs.places.includes(p.id);
    return (
      <button key={p.id} onClick={()=>togglePlace(p.id)}
        className="w-full rounded-xl px-3.5 py-2.5 flex items-start gap-3 text-left transition-all active:scale-[.99]"
        style={{
          background: active ? C.terracotta : C.paper,
          color: active ? '#fff' : C.ink,
          border: `1px solid ${active ? C.terracotta : C.divider}`,
        }}>
        <div className="flex-1 min-w-0">
          {badge && (() => {
            const m = BADGE_META[badge] || { icon: Star, color: C.saffron, fill: true };
            const Icon = m.icon;
            return (
              <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md mb-1.5" style={{
                background: active ? 'rgba(255,255,255,.18)' : `${m.color}10`,
                border: `1px solid ${active ? 'rgba(255,255,255,.32)' : `${m.color}33`}`,
              }}>
                <Icon size={9.5} strokeWidth={2}
                  style={{ color: active ? '#fff' : m.color, flexShrink: 0 }}
                  fill={m.fill ? (active ? '#fff' : m.color) : 'none'}/>
                <span className="text-[9px] tracking-[.14em] uppercase" style={{
                  fontFamily:'Albert Sans', fontWeight: 700,
                  color: active ? '#fff' : m.color,
                }}>{badge}</span>
              </div>
            );
          })()}
          <div className="text-[13.5px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
            {p.name}
          </div>
          <div className="text-[10.5px] mt-0.5 flex items-center gap-1 truncate" style={{ fontFamily:'Albert Sans', opacity: active ? .92 : .65 }}>
            <MapPin size={9} className="flex-shrink-0"/>
            <span className="truncate">{p.area} · {p.desc}</span>
          </div>
          {p.tags && (
            <div className="text-[9.5px] mt-1 truncate" style={{ fontFamily:'Albert Sans', opacity: active ? .8 : .5, letterSpacing:'.01em' }}>
              {p.tags.join(' · ')}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0 flex items-center gap-2 pt-0.5">
          {p.dist > 0 ? (
            <div style={{ fontFamily:'Fraunces', fontSize: 14, fontWeight:500, color: active ? '#fff' : C.terracotta, lineHeight:1 }}>
              {p.dist}<span className="text-[10px] ml-0.5" style={{ opacity: active ? .85 : .65 }}>mi</span>
            </div>
          ) : (
            <div className="text-[10.5px] px-2 py-0.5 rounded-full" style={{
              background: active ? 'rgba(255,255,255,.2)' : C.creamSoft,
              color: active ? '#fff' : C.inkSoft,
              fontFamily:'Albert Sans', fontWeight: 500,
            }}>home</div>
          )}
          {active && <Check size={15} style={{ color: C.saffron }}/>}
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={5} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Step 5 · Where you like to meet
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Where do you like to <span style={{ fontStyle:'italic', color: C.terracotta }}>meet?</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Pick spots you'd love to meet at — we'll suggest these to your matches.
          </p>
        </div>

        <button onClick={()=>togglePlace(PLACES_NO_PREF)}
          className="mt-4 w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 transition-all"
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
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] tracking-[.16em] uppercase flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
                <Star size={11} fill={C.terracotta}/>
                Top picks {location ? `in ${location}` : 'near you'}
              </div>
              {placeCount > 0 && (
                <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
                  {placeCount} picked
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {topPicksFull.map(p => renderPlaceRow(p, p.badge))}
            </div>

            <button onClick={() => setBrowseOpen(o => !o)}
              className="mt-2.5 w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all active:scale-[.99]"
              style={{
                background: browseOpen ? C.ink : 'transparent',
                color: browseOpen ? C.cream : C.inkSoft,
                border: `1px ${browseOpen ? 'solid' : 'dashed'} ${browseOpen ? C.ink : C.divider}`,
              }}>
              {browseOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              <span className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight: 500 }}>
                {browseOpen ? 'Hide more places' : 'See more places near you'}
              </span>
            </button>

            {browseOpen && (
              <div className="mt-3 mb-3" style={{ animation: 'fadeInUp .3s ease both' }}>
                {/* Custom places — user-added spots, shown at top of browse panel */}
                {customPlaces.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[9.5px] tracking-[.16em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700 }}>
                      <Sparkles size={10}/> Your places
                    </div>
                    <div className="space-y-1.5">
                      {customPlaces.map(p => renderPlaceRow(p, 'Yours'))}
                    </div>
                  </div>
                )}

                {/* Category pills */}
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
                        <cat.icon size={13}/>
                        <span className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{cat.label}</span>
                        {cnt > 0 && (
                          <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{
                            background: active ? C.saffron : C.terracotta,
                            color: active ? C.ink : '#fff',
                            fontFamily:'Albert Sans', fontWeight:700,
                          }}>{cnt}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Category place list */}
                <div className="space-y-1.5">
                  {PLACES[activeCat].map(p => renderPlaceRow(p))}
                </div>

                {/* Add a place not on the list */}
                {showCustomInput ? (
                  <div className="mt-2.5 rounded-xl p-3" style={{ background: C.creamSoft, border: `1px solid ${C.sageDark}55` }}>
                    <div className="text-[9.5px] tracking-[.16em] uppercase mb-2 flex items-center gap-1.5" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700 }}>
                      <Sparkles size={10}/> Add your own place
                    </div>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e)=>setCustomName(e.target.value)}
                      placeholder="Place name (e.g. Mama's Kitchen)"
                      className="w-full rounded-lg px-3 py-2 text-[12.5px] mb-1.5 outline-none"
                      style={{
                        background: C.paper,
                        border: `1px solid ${C.divider}`,
                        fontFamily:'Albert Sans',
                        color: C.ink,
                      }}
                    />
                    <input
                      type="text"
                      value={customArea}
                      onChange={(e)=>setCustomArea(e.target.value)}
                      placeholder="Neighborhood or area (optional)"
                      className="w-full rounded-lg px-3 py-2 text-[12.5px] mb-2 outline-none"
                      style={{
                        background: C.paper,
                        border: `1px solid ${C.divider}`,
                        fontFamily:'Albert Sans',
                        color: C.ink,
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={()=>{
                          if (!customName.trim()) return;
                          const id = `custom-${Date.now()}`;
                          const newPlace = {
                            id,
                            name: customName.trim(),
                            area: customArea.trim() || 'Custom spot',
                            desc: 'Added by you',
                            dist: 0,
                          };
                          setCustomPlaces(cp => [...cp, newPlace]);
                          // Auto-select the newly added place
                          setPrefs(p => ({
                            ...p,
                            places: [...p.places.filter(x => x !== PLACES_NO_PREF), id],
                          }));
                          setCustomName('');
                          setCustomArea('');
                          setShowCustomInput(false);
                        }}
                        disabled={!customName.trim()}
                        className="flex-1 rounded-lg flex items-center justify-center gap-1.5"
                        style={{
                          height: 36,
                          background: customName.trim() ? C.sageDark : C.creamSoft,
                          color: customName.trim() ? '#fff' : C.inkMuted,
                          border: customName.trim() ? 'none' : `1px solid ${C.divider}`,
                          fontFamily:'Albert Sans', fontSize: 12, fontWeight: 600,
                        }}>
                        <Check size={13}/> Add place
                      </button>
                      <button
                        onClick={()=>{
                          setShowCustomInput(false);
                          setCustomName('');
                          setCustomArea('');
                        }}
                        className="rounded-lg px-3"
                        style={{
                          height: 36,
                          background: 'transparent',
                          color: C.inkMuted,
                          border: `1px solid ${C.divider}`,
                          fontFamily:'Albert Sans', fontSize: 12, fontWeight: 500,
                        }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={()=>setShowCustomInput(true)}
                    className="mt-2.5 w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all active:scale-[.99]"
                    style={{
                      background: 'transparent',
                      color: C.sageDark,
                      border: `1px dashed ${C.sageDark}55`,
                    }}>
                    <Plus size={13}/>
                    <span className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight: 600 }}>
                      Add a place not on the list
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div className="h-2"/>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {!canContinue && (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick at least one place to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>
          See your matches <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};
