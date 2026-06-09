import { useState } from 'react';
import {
  MapPin, Clock, Users, Check, Star, Bookmark, Share2,
  Sparkles, CalendarDays,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// EventDetailSheet — shared detail surface for events / meetups across
// ThisWeek and Connect. Accepts a normalized event shape:
//
//   { id, title, photo, when, place, distance?, going?, tags?, description? }
//
// Action buttons: Join (RSVP), Interested, Save, Share. The first three
// are stateful (joined / interested / saved flags toggle their UI),
// Share just flashes.
// ==========================================================================

const FALLBACK_DESCRIPTION =
  "Casual, mom-friendly meetup. Bring your kid, your stroller, and your favorite coffee — no pressure to stay the whole time.";

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

export const EventDetailSheet = ({
  event,
  saved = false,
  joined = false,
  interested = false,
  onJoin, onInterested, onSave, onShare,
  onClose,
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  if (!event) return null;

  const description = event.description || FALLBACK_DESCRIPTION;
  const tags = event.tags || [];

  return (
    <Sheet onClose={onClose} tall bleedTop>
      <div className="pb-6">
        {/* Hero */}
        <div
          className="relative"
          style={{
            height: 200,
            backgroundImage: `url('${event.photo}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,.15) 40%, rgba(0,0,0,.6) 100%)',
          }}/>
          <div className="absolute left-5 right-5 bottom-4 text-white">
            <div className="text-[10.5px] tracking-[.18em] uppercase opacity-95" style={{
              fontFamily: 'Albert Sans', fontWeight: 700,
            }}>
              {event.kind || 'Meetup'}
            </div>
            <div className="mt-1" style={{
              fontFamily: 'Fraunces', fontSize: 24, fontWeight: 600,
              letterSpacing: '-.02em', lineHeight: 1.15,
            }}>
              {event.title}
            </div>
          </div>
        </div>

        <div className="px-5 pt-4">
          {/* When / where summary */}
          <div className="space-y-2">
            {event.when && (
              <MetaRow Icon={Clock} text={event.when}/>
            )}
            {event.place && (
              <MetaRow
                Icon={MapPin}
                text={event.place + (event.distance ? ` · ${event.distance}` : '')}
              />
            )}
            {event.going != null && (
              <MetaRow
                Icon={Users}
                text={`${event.going} mom${event.going === 1 ? '' : 's'} going`}
                color={C.sageDark}
              />
            )}
            {event.rating != null && (
              <MetaRow
                Icon={Star}
                text={`${event.rating} stars${event.reviews ? ` · ${event.reviews} reviews` : ''}`}
                color={C.saffron}
                fillIcon
              />
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span key={t} style={{
                  background: C.coralSoft, color: C.coralDeep,
                  fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10.5,
                  padding: '4px 10px', borderRadius: 12,
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mt-5">
            <SectionLabel>About this meetup</SectionLabel>
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

          {/* Hosted by (always shown to suggest social context) */}
          <div className="mt-5 rounded-2xl p-3.5 flex items-center gap-3" style={{
            background: C.paper, border: `1px solid ${C.divider}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 19,
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces', fontWeight: 600, fontSize: 14,
            }}>
              GM
            </div>
            <div className="flex-1 min-w-0">
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.navy,
              }}>
                Hosted by Go Mama
              </div>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 1,
              }}>
                Verified mom-friendly · Reviewed weekly
              </div>
            </div>
            <Sparkles size={14} color={C.saffron}/>
          </div>

          {/* Primary action — Join */}
          <button
            onClick={() => onJoin?.(event)}
            className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
            style={{
              height: 50,
              background: joined
                ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
                : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: joined
                ? '0 6px 16px -6px rgba(94,122,59,.5)'
                : '0 6px 16px -6px rgba(214,68,106,.55)',
            }}
          >
            {joined ? <><Check size={16}/> You're going</> : <><CalendarDays size={16}/> Join meetup</>}
          </button>

          {/* Secondary actions — Interested · Save · Share */}
          <div className="mt-2.5 flex gap-2">
            <ActionTile
              active={interested}
              onClick={() => onInterested?.(event)}
              accent={C.saffron}
              Icon={Sparkles}
              label="Interested"
              activeLabel="Interested ✓"
            />
            <ActionTile
              active={saved}
              onClick={() => onSave?.(event)}
              accent={C.coralDeep}
              Icon={Bookmark}
              label="Save"
              activeLabel="Saved"
            />
            <ActionTile
              active={false}
              onClick={() => onShare?.(event)}
              accent={C.navy}
              Icon={Share2}
              label="Share"
            />
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
