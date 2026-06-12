import { useState } from 'react';
import {
  MapPin, Clock, Users, Check, Star, Share2,
  Sparkles, MessageCircle, ListChecks, Navigation,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { mapsUrl } from '../lib/geo';

// ==========================================================================
// EventDetailSheet — shared detail surface for events, meetups, and
// "things-to-do" cards. Accepts a normalized shape:
//
//   { id, title, photo, when, place, distance?, going?, tags?,
//     description?, instructions?, goingAvatars? }
//
// Action layout (same for every variant):
//
//   ┌────────────────────────────────────────┐
//   │              I'm going                  │   ← full-width primary
//   ├────────────────────────────────────────┤
//   │  Interested │ Join chat │   Share      │   ← secondary row
//   └────────────────────────────────────────┘
//
// "Join chat" stays tappable even when the user hasn't RSVP'd — tapping
// it surfaces a flash message ("Only accessible for moms going to the
// event") instead of opening the thread. RSVP'ing first opens the
// thread normally (the group chat closes 2 days after the event).
//
// "I'm going" also surfaces a flash ("Complete your profile & earn
// verified badge") to nudge profile completion alongside the RSVP.
//
// `variant` ('event' | 'meetup', default 'event') still controls whether
// the meetup-only extras render:
//   - blurred "N moms going" preview row
//   - "Meetup instructions" checklist after the About section
// ==========================================================================

const FALLBACK_DESCRIPTION =
  "Casual, mom-friendly meetup. Bring your kid, your stroller, and your favorite coffee — no pressure to stay the whole time.";

const FALLBACK_INSTRUCTIONS = [
  'Show up 5 min early — easier to spot the group.',
  'Wear something coral so other moms can find you.',
  'Strollers welcome. Bring water + a snack for your little one.',
  'Bail-out friendly — no pressure to stay the whole time.',
];

const DEFAULT_GOING_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop',
];

// Full-width primary CTA — "I'm going" sits alone on its own row so the
// commitment action stays unambiguous.
const PrimaryCTA = ({ active, onClick, accent, Icon, label, activeLabel }) => (
  <button
    onClick={onClick}
    className="w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
    style={{
      height: 52,
      background: active
        ? `linear-gradient(135deg, ${accent}, ${accent})`
        : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
      color: '#fff',
      border: 'none',
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14.5,
      boxShadow: `0 6px 16px -6px ${accent}99`,
    }}
  >
    <Icon size={16}/>
    {active ? (activeLabel || label) : label}
  </button>
);

// Secondary tile — small, equal-width icon button used in the row of 3
// (Interested / Join chat / Share).
const SecondaryTile = ({ active, onClick, accent, Icon, label }) => (
  <button
    onClick={onClick}
    className="flex-1 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[.97]"
    style={{
      height: 44,
      background: active ? accent : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12,
      cursor: 'pointer',
    }}
  >
    <Icon size={14}/>
    {label}
  </button>
);

export const EventDetailSheet = ({
  event,
  variant = 'event',                   // 'event' | 'meetup'
  joined = false,                      // I'm-going / RSVP flag
  interested = false,                  // lighter "Interested" flag
  onJoin, onInterested, onShare, onDiscuss,
  flash,                               // for the two inline message toasts
  onClose,
  fullScreen = false,
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  if (!event) return null;

  const isMeetup = variant === 'meetup';
  const description = event.description || FALLBACK_DESCRIPTION;
  const tags = event.tags || [];
  const instructions = event.instructions && event.instructions.length
    ? event.instructions
    : FALLBACK_INSTRUCTIONS;

  const isGoing = !!joined;
  // Join chat stays tappable in both states; the locked state just routes
  // to a flash toast instead of opening the thread.
  const chatLocked = !isGoing;

  const handleImGoing = () => {
    onJoin?.(event);
    // Nudge profile completion every time the RSVP is confirmed — keeps
    // the verified-badge incentive in the user's path.
    flash?.('Complete your profile & earn verified badge');
  };

  const handleJoinChat = () => {
    if (chatLocked) {
      flash?.('Only accessible for moms going to the event');
      return;
    }
    onDiscuss?.();
  };

  // Directions — available when the event (or its inherited place) has a point
  // or a street address. Opens the device's maps app in a new tab.
  const directionsHref = mapsUrl({
    lat: event.lat, lng: event.lng,
    address: event.address, label: event.place || event.title,
  });
  const openDirections = () => {
    if (!directionsHref) return;
    window.open(directionsHref, '_blank', 'noopener,noreferrer');
  };

  const goingCount = event.going != null ? event.going : 0;
  const avatars = (event.goingAvatars && event.goingAvatars.length
    ? event.goingAvatars
    : DEFAULT_GOING_AVATARS).slice(0, 5);

  return (
    <Sheet onClose={onClose} tall bleedTop fullScreen={fullScreen}>
      {/* All content lives inside Sheet's overflow-y-auto wrapper, so the
          whole detail view scrolls as one column — top hero to bottom CTA. */}
      <div className="pb-8">
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
              {event.kind || (isMeetup ? 'Meetup' : 'Event')}
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
            {(event.place || event.address) && (
              <MetaRow
                Icon={MapPin}
                text={(event.place || event.address) + (event.distance ? ` · ${event.distance}` : '')}
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

          {/* Get directions — only when the event has a point or address.
              Opens the device's maps app; neutral so the coral CTA below stays
              the single primary action. */}
          {directionsHref && (
            <button
              onClick={openDirections}
              aria-label="Get directions"
              className="mt-3 active:scale-[.98] transition-transform"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', height: 42, borderRadius: 12,
                background: C.paper, color: C.navy, border: `1px solid ${C.divider}`,
                fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Navigation size={14} color={C.coralDeep}/> Get directions
            </button>
          )}

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
            <SectionLabel>About this {isMeetup ? 'meetup' : 'event'}</SectionLabel>
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

          {/* Meetup-only: instructions block (appears right after the
              About section so the user knows what to expect on arrival). */}
          {isMeetup && (
            <div className="mt-5">
              <SectionLabel>Meetup instructions</SectionLabel>
              <ul style={{
                margin: 0, padding: 0, listStyle: 'none',
                background: C.paper, border: `1px solid ${C.divider}`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                {instructions.map((line, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px',
                    borderTop: i === 0 ? 'none' : `1px solid ${C.divider}`,
                  }}>
                    <ListChecks size={14} color={C.coralDeep} style={{ marginTop: 2, flexShrink: 0 }}/>
                    <span style={{
                      fontFamily: 'Albert Sans', fontSize: 12.5,
                      color: C.navySoft, lineHeight: 1.45,
                    }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blurred avatar preview of moms going. Shows whenever there's a
              going count — for events as well as meetups, since both now
              share the unified card behavior. Identity is fuzzy on purpose:
              this is social proof, not a roster. */}
          {goingCount > 0 && (
            <div
              className="mt-5 rounded-2xl flex items-center gap-3"
              style={{
                background: C.paper, border: `1px solid ${C.divider}`,
                padding: '12px 14px',
              }}
            >
              <div className="flex" style={{ flexShrink: 0 }}>
                {avatars.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundImage: `url('${src}')`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      border: '2px solid #fff',
                      marginLeft: i === 0 ? 0 : -12,
                      filter: 'blur(4px)',
                      boxShadow: '0 2px 6px -3px rgba(27,42,78,.25)',
                    }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy,
                  lineHeight: 1.15,
                }}>
                  {goingCount} mom{goingCount === 1 ? '' : 's'} going to this {isMeetup ? 'meetup' : 'event'}
                </div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 2,
                }}>
                  RSVP to see who's coming
                </div>
              </div>
            </div>
          )}

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

          {/* Action stack — full-width "I'm going" on its own row, then a
              row of three secondary buttons (Interested · Join chat · Share). */}
          <div className="mt-5">
            <PrimaryCTA
              active={isGoing}
              onClick={handleImGoing}
              accent={C.coralDeep}
              Icon={Check}
              label="I'm going"
              activeLabel="I'm going ✓"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <SecondaryTile
              active={interested}
              onClick={() => onInterested?.(event)}
              accent={C.saffron}
              Icon={Sparkles}
              label="Interested"
            />
            <SecondaryTile
              active={false}
              onClick={handleJoinChat}
              accent={C.sageDark}
              Icon={MessageCircle}
              label="Join chat"
            />
            <SecondaryTile
              active={false}
              onClick={() => onShare?.(event)}
              accent={C.navy}
              Icon={Share2}
              label="Share"
            />
          </div>
          {isGoing && (
            <div className="mt-1.5 text-center" style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
            }}>
              Group chat closes 2 days after the event.
            </div>
          )}
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
