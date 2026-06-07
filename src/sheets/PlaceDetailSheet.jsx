import { useState } from 'react';
import {
  MapPin, Star, Phone, Globe, Bookmark, Share2,
  Sparkles, Navigation, Clock, Check,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// PlaceDetailSheet — shared detail surface for places / programs / schools
// across ThisWeek (popular) and Local Picks. Accepts a normalized shape:
//
//   {
//     id, title, photo?, kind, rating?, reviews?, distance?,
//     address?, hours?, tag?, ages?, tagBg?, tagFg?,
//     amenities?, description?, Icon?, iconBg?, iconFg?,
//   }
//
// Action buttons: Save, Share, Get Directions, Interested. Save and
// Interested are stateful, the other two flash.
// ==========================================================================

const FALLBACK_DESCRIPTION_BY_KIND = {
  Place:   "Family-friendly spot with stroller access, changing tables, and plenty of shade. Verified by other moms in your area.",
  Program: "A neighborhood favorite — small classes, structured but flexible, and the kind of place where kids actually want to go back.",
  School:  "Mom-vetted school with strong reviews. Tour availability changes weekly, so check before stopping by.",
};

const FALLBACK_AMENITIES = [
  'Stroller-friendly', 'Changing table', 'Highchairs', 'Quiet area',
];

const ActionTile = ({ active, onClick, accent, Icon, label, activeLabel }) => (
  <button
    onClick={onClick}
    className="flex-1 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[.97]"
    style={{
      height: 44,
      background: active ? accent : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12,
    }}
  >
    <Icon size={14} fill={active && Icon === Bookmark ? '#fff' : 'none'}/>
    {active ? (activeLabel || label) : label}
  </button>
);

export const PlaceDetailSheet = ({
  place,
  saved = false,
  interested = false,
  onSave, onShare, onDirections, onInterested,
  onClose,
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  if (!place) return null;

  const kind = place.kind || 'Place';
  const description = place.description || FALLBACK_DESCRIPTION_BY_KIND[kind] || FALLBACK_DESCRIPTION_BY_KIND.Place;
  const amenities = place.amenities || FALLBACK_AMENITIES;
  const hours = place.hours || 'Open today · 9:00 AM – 8:00 PM';

  // Programs use icon-only hero (no photo). Fall back to a tinted icon panel.
  const Icon = place.Icon;
  const hasPhoto = !!place.photo;

  return (
    <Sheet onClose={onClose} tall>
      <div className="pb-6">
        {/* Hero */}
        <div
          className="relative"
          style={{
            height: 200,
            backgroundImage: hasPhoto ? `url('${place.photo}')` : undefined,
            background: hasPhoto ? undefined : place.iconBg || C.coralSoft,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: hasPhoto ? 'block' : 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {!hasPhoto && Icon && (
            <Icon size={70} color={place.iconFg || C.coralDeep}/>
          )}
          {hasPhoto && (
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,.15) 40%, rgba(0,0,0,.6) 100%)',
            }}/>
          )}
          <div
            className="absolute left-5 right-5 bottom-4"
            style={{ color: hasPhoto ? '#fff' : C.navy }}
          >
            <div className="text-[10.5px] tracking-[.18em] uppercase opacity-95" style={{
              fontFamily: 'Albert Sans', fontWeight: 700,
            }}>
              {kind}
            </div>
            <div className="mt-1" style={{
              fontFamily: 'Fraunces', fontSize: 24, fontWeight: 600,
              letterSpacing: '-.02em', lineHeight: 1.15,
            }}>
              {place.title}
            </div>
          </div>
        </div>

        <div className="px-5 pt-4">
          {/* Meta */}
          <div className="space-y-2">
            {place.rating != null && (
              <MetaRow
                Icon={Star}
                text={`${place.rating}${place.reviews ? ` · ${place.reviews} reviews` : ''}`}
                color={C.saffron}
                fillIcon
              />
            )}
            {place.distance && (
              <MetaRow Icon={MapPin} text={place.address ? `${place.address} · ${place.distance}` : place.distance}/>
            )}
            {place.ages && (
              <MetaRow Icon={Sparkles} text={place.ages} color={C.coralDeep}/>
            )}
            <MetaRow Icon={Clock} text={hours} color={C.sageDark}/>
          </div>

          {/* Tag */}
          {place.tag && (
            <div className="mt-3 inline-block" style={{
              background: place.tagBg || C.sage,
              color: place.tagFg || C.sageDark,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10.5,
              padding: '4px 10px', borderRadius: 12,
            }}>
              {place.tag}
            </div>
          )}

          {/* Description */}
          <div className="mt-5">
            <SectionLabel>About this {kind.toLowerCase()}</SectionLabel>
            <div
              className="text-[13px]"
              style={{
                fontFamily: 'Albert Sans', color: C.navySoft, lineHeight: 1.5,
                display: showFullDesc ? 'block' : '-webkit-box',
                WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </div>
            {description.length > 140 && (
              <button
                onClick={() => setShowFullDesc(v => !v)}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  marginTop: 4,
                  color: C.coralDeep,
                  fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showFullDesc ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Amenities */}
          <div className="mt-5">
            <SectionLabel>Good to know</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {amenities.map(a => (
                <span key={a} style={{
                  background: C.paper, border: `1px solid ${C.divider}`,
                  color: C.navy,
                  fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11.5,
                  padding: '5px 11px', borderRadius: 12,
                }}>
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Quick-info row — call · website (decorative) */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <InfoTile Icon={Phone}  label="Call"    sub="Tap to dial"   onClick={() => onShare?.(place, 'call')}/>
            <InfoTile Icon={Globe}  label="Website" sub="Open in browser" onClick={() => onShare?.(place, 'web')}/>
          </div>

          {/* Primary — Get directions */}
          <button
            onClick={() => onDirections?.(place)}
            className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
            style={{
              height: 50,
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)',
            }}
          >
            <Navigation size={16}/> Get directions
          </button>

          {/* Secondary actions */}
          <div className="mt-2.5 flex gap-2">
            <ActionTile
              active={interested}
              onClick={() => onInterested?.(place)}
              accent={C.saffron}
              Icon={Sparkles}
              label="Interested"
              activeLabel="Interested ✓"
            />
            <ActionTile
              active={saved}
              onClick={() => onSave?.(place)}
              accent={C.coralDeep}
              Icon={Bookmark}
              label="Save"
              activeLabel="Saved"
            />
            <ActionTile
              active={false}
              onClick={() => onShare?.(place, 'share')}
              accent={C.navy}
              Icon={Share2}
              label="Share"
            />
          </div>

          {/* Visited indicator placeholder — keeps social proof front-of-mind */}
          <div className="mt-4 rounded-2xl p-3 flex items-center gap-2.5" style={{
            background: `${C.sageDark}10`, border: `1px solid ${C.sageDark}33`,
          }}>
            <Check size={14} color={C.sageDark}/>
            <div className="text-[11.5px]" style={{
              fontFamily: 'Albert Sans', color: C.navy,
            }}>
              <strong style={{ color: C.sageDark }}>12 moms</strong> in your area visited this week
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="uppercase"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 6,
    }}
  >
    {children}
  </div>
);

const MetaRow = ({ Icon, text, color = C.navy, fillIcon = false }) => (
  <div className="flex items-center gap-2">
    <Icon size={14} color={color} fill={fillIcon ? color : 'none'}/>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.navy,
    }}>
      {text}
    </div>
  </div>
);

const InfoTile = ({ Icon, label, sub, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-2xl flex items-center gap-2.5 transition-all active:scale-[.98]"
    style={{
      background: C.paper, border: `1px solid ${C.divider}`,
      padding: '10px 12px',
      textAlign: 'left',
    }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 10,
      background: C.coralSoft, color: C.coralDeep,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={14}/>
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, color: C.navy,
        lineHeight: 1.1,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted, marginTop: 2,
      }}>
        {sub}
      </div>
    </div>
  </button>
);
