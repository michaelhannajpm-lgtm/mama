import { useState, useEffect } from 'react';
import {
  Heart, Briefcase, MapPin, Users,
  ChevronRight, Sparkles, Moon, Baby, Coffee, Smile, BookOpen,
  SlidersHorizontal, ShieldCheck, Home, Sprout, Calendar,
  User, MessageCircle, Crown, Check, UserPlus,
} from 'lucide-react';
import { C } from '../../theme';
import { MeetupsFilterSheet, MEETUPS_FILTER_DEFAULT } from '../../sheets/MeetupsFilterSheet';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { MomDetailSheet } from '../../sheets/MomDetailSheet';
import { SeeAllSheet } from '../../sheets/SeeAllSheet';
import { ShareSheet } from '../../sheets/ShareSheet';
import { GroupDiscussionSheet } from '../../sheets/GroupDiscussionSheet';
import { GROUP_DISCUSSIONS, TOP_DISCUSSIONS } from '../../data/discussions';
import { youngestStageLabel } from '../../data/taxonomy';

// ==========================================================================
// ConnectTab — V5 "Connect" surface.
//
//   • Search input + add-friend icon
//   • "Your best matches" — 3 round avatar cards + see-all link
//   • "Upcoming meetups" — 3 event cards
//   • "Popular topics" — coloured chip row
// ==========================================================================

const MEETUPS = [
  {
    id: 'um1', dow: 'SAT', day: 17, title: 'Stroller Walk + Coffee',
    place: 'Curtis Hixon Waterfront Park', meta: 'Sat, May 17 · 9:00 AM',
    going: 12,
    photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&auto=format&fit=crop',
  },
  {
    id: 'um2', dow: 'SUN', day: 18, title: 'Moms & Littles Playdate',
    place: 'The Yard · Tampa', meta: 'Sun, May 18 · 10:30 AM',
    going: 8,
    photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&auto=format&fit=crop',
  },
  {
    id: 'um3', dow: 'SUN', day: 21, title: 'Picnic in the Park',
    place: 'Al Lopez Park', meta: 'Sun, May 18 · 11:00 AM',
    going: 6,
    photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop',
  },
];

const MEETUPS_ALL = [
  ...MEETUPS,
  {
    id: 'um4', dow: 'MON', day: 19, title: 'Mom Coffee Chat',
    place: 'Buddy Brew Coffee · Hyde Park', meta: 'Mon, May 19 · 8:30 AM',
    going: 9,
    photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop',
  },
  {
    id: 'um5', dow: 'TUE', day: 20, title: 'Baby Sign Language Circle',
    place: 'Little Explorers Play Cafe', meta: 'Tue, May 20 · 10:00 AM',
    going: 5,
    photo: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop',
  },
  {
    id: 'um6', dow: 'WED', day: 21, title: 'Music Together Jam',
    place: 'Sunshine Studio', meta: 'Wed, May 21 · 9:30 AM',
    going: 11,
    photo: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&auto=format&fit=crop',
  },
  {
    id: 'um7', dow: 'THU', day: 22, title: 'Splash Pad Squad',
    place: 'Julian B. Lane Park', meta: 'Thu, May 22 · 10:30 AM',
    going: 14,
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
  },
  {
    id: 'um8', dow: 'FRI', day: 23, title: 'Mom Night Out',
    place: 'Armature Works', meta: 'Fri, May 23 · 7:00 PM',
    going: 16,
    photo: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&auto=format&fit=crop',
  },
  {
    id: 'um9', dow: 'SAT', day: 24, title: 'Library Storytime Crew',
    place: 'John F. Germany Library', meta: 'Sat, May 24 · 10:00 AM',
    going: 7,
    photo: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop',
  },
];

const TOPICS_ALL_EXTRA = [
  { id: 'feeding', label: 'Feeding',          icon: Heart,    bg: C.sage,    fg: C.sageDark  },
  { id: 'maternal',label: 'Maternal Health',  icon: ShieldCheck,bg: C.lilac, fg: '#5E4A8A'   },
  { id: 'screen',  label: 'Screen Time',      icon: BookOpen, bg: C.coralSoft, fg: C.coralDeep },
  { id: 'tantrum', label: 'Tantrums',         icon: Sparkles, bg: '#FFF4D6', fg: '#8A6610'   },
  { id: 'partner', label: 'Partner Support',  icon: Smile,    bg: C.sage,    fg: C.sageDark  },
  { id: 'school',  label: 'School Hunting',   icon: BookOpen, bg: C.lilac,   fg: '#5E4A8A'   },
];

const TOPICS = [
  { id: 'sleep',    label: 'Sleep',             icon: Moon,      bg: C.lilac,   fg: '#5E4A8A'   },
  { id: 'playd',    label: 'Playdates',         icon: Users,     bg: C.sage,    fg: C.sageDark  },
  { id: 'dayc',     label: 'Daycare',           icon: BookOpen,  bg: '#FFF4D6', fg: '#8A6610'   },
  { id: 'toddler',  label: 'Toddler Activities', icon: Sparkles, bg: C.coralSoft, fg: C.coralDeep },
  { id: 'working',  label: 'Working Moms',      icon: Briefcase, bg: C.lilac,   fg: '#5E4A8A'   },
  { id: 'potty',    label: 'Potty Training',    icon: Baby,      bg: C.sage,    fg: C.sageDark  },
  { id: 'coffee',   label: 'Coffee Meetups',    icon: Coffee,    bg: '#FFF4D6', fg: '#8A6610'   },
  { id: 'self',     label: 'Self-care',         icon: Smile,     bg: C.coralSoft, fg: C.coralDeep },
];

// -------------------------- shared --------------------------

const SectionHead = ({ title, link = 'See all', onLink }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 16, marginBottom: 10 }}>
    <div style={{
      fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700,
      color: C.navy, letterSpacing: '-.01em',
    }}>
      {title}
    </div>
    <button
      onClick={onLink}
      className="active:scale-[.98] transition-transform"
      style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 1,
        color: C.coralDeep,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {link} <ChevronRight size={11}/>
    </button>
  </div>
);

// Kid ages → "Mom of a toddler" (youngest child's life stage). Prefer raw
// buckets; fall back to parsing the preformatted "0–1 · 3–5 yrs" string.
const kidAgesLabel = (item) => {
  const buckets = Array.isArray(item.kidBuckets) && item.kidBuckets.length
    ? item.kidBuckets
    : (item.kids && item.kids !== 'Kids' ? item.kids.replace(/\s*yrs$/, '').split(' · ') : []);
  return youngestStageLabel(buckets);
};

const MomCard = ({ item, onClick }) => {
  const Icon = item.Icon;
  const ages = kidAgesLabel(item);
  return (
    <button onClick={onClick} className="active:scale-[.97] transition-transform" style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${C.line}`,
      boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)',
      padding: '12px 6px 10px',
      textAlign: 'center',
      cursor: 'pointer',
    }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {item.photo ? (
          <img src={item.photo} alt="" style={{
            width: 62, height: 62, borderRadius: 31, objectFit: 'cover',
            display: 'block',
          }}/>
        ) : (
          <div style={{
            width: 62, height: 62, borderRadius: 31,
            background: item.hue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'Fraunces', fontWeight: 600, fontSize: 22,
          }}>
            {(item.firstName || item.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        {/* Distance marker — sits on the avatar like a map pin, so it never
            wraps onto its own awkward line. Hidden when distance is unknown. */}
        {item.distanceMi != null && (
          <div style={{
            position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 2,
            boxShadow: '0 2px 6px -3px rgba(27,42,78,.3)', whiteSpace: 'nowrap',
          }}>
            <MapPin size={8} color={C.coralDeep} strokeWidth={2.4}/>
            <span style={{ fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800, color: C.navy }}>
              {item.distanceMi.toFixed(1)} mi
            </span>
          </div>
        )}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
        color: C.navy, marginTop: 11, lineHeight: 1.1,
      }}>
        {item.name}
      </div>
      {ages && (
        <div className="flex items-center justify-center" style={{
          gap: 3, marginTop: 3, fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 600, color: C.muted,
          whiteSpace: 'nowrap',
        }}>
          <Baby size={9}/> {ages}
        </div>
      )}
      <div style={{ marginTop: 6, display: 'inline-flex' }}>
        <span style={{
          background: item.tagBg, color: item.tagFg,
          fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700,
          padding: '2px 6px 2px 5px', borderRadius: 8,
          display: 'inline-flex', alignItems: 'center', gap: 3,
          whiteSpace: 'nowrap',
        }}>
          <Icon size={9}/>
          {item.tag}
        </span>
      </div>
    </button>
  );
};

// Richer per-mom row for the SeeAll "Your best matches" screen. Each row pairs
// a square hero photo, identity + tag, "shared ground" coral pill, a
// connection-request primary CTA, and three secondary CTAs:
//   • Profile       — opens MomDetailSheet (full bio gated behind Plus)
//   • Message       — 3 free per mom, then a coral Plus chip replaces it
//   • Auto-schedule — taps the calendar overlap heuristic. If a slot is
//                     already booked, renders the booked time + green tick.
// Connection status is "status-only" — never blocks the secondary row,
// just changes the primary CTA's label/color from coral "Send connection
// request" → saffron "Request sent · waiting" → sage "Connected ✓".
const MomListCard = ({
  item, sharedTags = ['Coffee dates', 'Same kid ages'],
  scheduledSlot,
  messagesUsed = 0, freeLimit = 3, isPremium = false,
  connectionStatus = 'none', // 'none' | 'pending' | 'accepted'
  onConnect,
  onProfile, onMessage, onSchedule, onPremium,
}) => {
  const TagIcon = item.Icon;
  const msgLimitHit = !isPremium && messagesUsed >= freeLimit;
  const msgRemaining = Math.max(0, freeLimit - messagesUsed);
  const booked = !!scheduledSlot;

  return (
    <div style={{
      background: '#fff', borderRadius: 18,
      border: `1px solid ${C.line}`,
      boxShadow: '0 4px 14px -10px rgba(27,42,78,.25)',
      padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Identity row */}
      <div className="flex items-start gap-3">
        <button
          onClick={onProfile}
          className="relative active:scale-[.97] transition-transform"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {item.photo ? (
            <img src={item.photo} alt="" style={{
              width: 68, height: 68, borderRadius: 16, objectFit: 'cover',
              display: 'block',
            }}/>
          ) : (
            <div style={{
              width: 68, height: 68, borderRadius: 16,
              background: item.hue,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'Fraunces', fontWeight: 600, fontSize: 26,
            }}>
              {(item.firstName || item.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: -3, right: -3,
            width: 22, height: 22, borderRadius: 11,
            background: C.sageDark, color: '#fff', border: '2.5px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={11}/>
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <div style={{
            fontFamily: 'Fraunces', fontSize: 17, fontWeight: 600,
            color: C.navy, letterSpacing: '-.01em', lineHeight: 1.1,
          }}>
            {item.name}
          </div>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
            marginTop: 3, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{item.kids}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9}/> {item.distance}
            </span>
          </div>
          {item.tag && (
            <div className="mt-2 inline-flex items-center gap-1.5" style={{
              background: item.tagBg, color: item.tagFg,
              fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 10,
            }}>
              {TagIcon ? <TagIcon size={10}/> : <Briefcase size={10}/>}
              {item.tag}
            </div>
          )}
        </div>
      </div>

      {/* Shared ground pill row */}
      <div className="flex flex-wrap gap-1.5" style={{
        background: `${C.coral}10`, border: `1px solid ${C.coral}26`,
        borderRadius: 12, padding: '6px 8px',
      }}>
        <div className="flex items-center gap-1.5" style={{
          color: C.coralDeep, fontFamily: 'Albert Sans', fontSize: 9.5,
          fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
        }}>
          <Heart size={9} fill={C.coralDeep}/> Shared
        </div>
        {sharedTags.slice(0, 3).map(t => (
          <span key={t} style={{
            background: '#fff', color: C.coralDeep,
            fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 600,
            padding: '2.5px 8px', borderRadius: 9,
            border: `1px solid ${C.coral}33`,
          }}>
            {t}
          </span>
        ))}
      </div>

      {/* Connection-request primary CTA — status-only, never blocks the
          row below. Cycles none → pending → accepted, each with a distinct
          color so the social signal reads at a glance. */}
      <button
        onClick={connectionStatus === 'none' ? onConnect : undefined}
        disabled={connectionStatus !== 'none'}
        className="rounded-2xl flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
        style={{
          height: 40,
          background:
            connectionStatus === 'accepted'
              ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
              : connectionStatus === 'pending'
                ? `${C.saffron}22`
                : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
          color:
            connectionStatus === 'accepted'
              ? '#fff'
              : connectionStatus === 'pending'
                ? '#8A6610'
                : '#fff',
          border: connectionStatus === 'pending' ? `1px solid ${C.saffron}` : 'none',
          fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
          cursor: connectionStatus === 'none' ? 'pointer' : 'default',
          boxShadow:
            connectionStatus === 'accepted'
              ? '0 5px 14px -8px rgba(94,122,59,.5)'
              : connectionStatus === 'pending'
                ? 'none'
                : '0 5px 14px -8px rgba(214,68,106,.55)',
        }}
      >
        {connectionStatus === 'accepted' ? (
          <><Check size={14}/> Connected with {item.name.split(' ')[0]}</>
        ) : connectionStatus === 'pending' ? (
          <><Sparkles size={13}/> Request sent · waiting</>
        ) : (
          <><UserPlus size={14}/> Send connection request</>
        )}
      </button>

      {/* 3-up CTA row */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Profile */}
        <button
          onClick={onProfile}
          className="rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-[.96] transition-transform"
          style={{
            padding: '8px 4px',
            background: C.paper, border: `1px solid ${C.divider}`,
            color: C.navy, cursor: 'pointer',
          }}
        >
          <User size={14}/>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, lineHeight: 1.1,
          }}>
            Profile
          </span>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 8.5, color: C.muted,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            {isPremium ? 'Full' : <><Crown size={8} color={C.saffron}/> Plus = full</>}
          </span>
        </button>

        {/* Message */}
        <button
          onClick={msgLimitHit ? onPremium : onMessage}
          className="rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-[.96] transition-transform"
          style={{
            padding: '8px 4px',
            background: msgLimitHit ? `${C.saffron}22` : C.paper,
            border: `1px solid ${msgLimitHit ? C.saffron : C.divider}`,
            color: C.navy, cursor: 'pointer',
          }}
        >
          {msgLimitHit ? <Crown size={14} color={C.saffron}/> : <MessageCircle size={14}/>}
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, lineHeight: 1.1,
          }}>
            {msgLimitHit ? 'Unlock' : 'Message'}
          </span>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 8.5,
            color: msgLimitHit ? '#8A6610' : C.muted,
          }}>
            {isPremium
              ? 'Unlimited'
              : msgLimitHit
                ? 'Plus required'
                : `${msgRemaining} free left`}
          </span>
        </button>

        {/* Auto-schedule */}
        <button
          onClick={onSchedule}
          className="rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-[.96] transition-transform"
          style={{
            padding: '8px 4px',
            background: booked ? C.sage : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            border: `1px solid ${booked ? C.sageDark : C.coralDeep}`,
            color: booked ? C.sageDark : '#fff',
            cursor: 'pointer',
            boxShadow: booked ? 'none' : '0 4px 10px -6px rgba(214,68,106,.55)',
          }}
        >
          {booked ? <Check size={14}/> : <Sparkles size={14}/>}
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800, lineHeight: 1.1,
          }}>
            {booked ? 'Booked' : 'Auto-schedule'}
          </span>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 8.5,
            opacity: booked ? 0.85 : 0.92,
          }}>
            {booked ? `${scheduledSlot.day} · ${scheduledSlot.time}` : 'Picks best slot'}
          </span>
        </button>
      </div>
    </div>
  );
};

const MeetupCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 70, objectFit: 'cover', display: 'block',
      }}/>
      <div style={{
        position: 'absolute', top: 6, left: 6,
        background: '#fff', borderRadius: 6,
        padding: '3px 5px', textAlign: 'center',
        boxShadow: '0 1px 3px rgba(27,42,78,.2)',
        minWidth: 28,
      }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 7.5, fontWeight: 800,
          color: C.coralDeep, letterSpacing: '.06em', lineHeight: 1,
        }}>
          {item.dow}
        </div>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 13, fontWeight: 700,
          color: C.navy, lineHeight: 1, marginTop: 1,
        }}>
          {item.day}
        </div>
      </div>
    </div>
    <div style={{ padding: '6px 7px 8px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 25,
      }}>
        {item.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
        marginTop: 3, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.place}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 5,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: 6,
              background: [C.coral, C.sage, C.lilac][i],
              border: '1.5px solid #fff',
              marginLeft: i === 0 ? 0 : -4,
            }}/>
          ))}
        </div>
        <span style={{
          fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700, color: C.sageDark,
        }}>
          {item.going} going
        </span>
      </div>
    </div>
  </button>
);

const TopicChip = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 12px', borderRadius: 18,
        background: item.bg, color: item.fg,
        border: 'none', cursor: 'pointer',
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
      }}
    >
      <Icon size={12}/>
      {item.label}
    </button>
  );
};

// Card surface for "Popular discussions nearby" — surfaces a topic, member
// count + online indicator, and a 1-line preview of the latest post. The
// whole card is a button that opens the GroupDiscussionSheet.
const DiscussionCard = ({ discussion, onOpen }) => {
  const Icon = discussion.Icon;
  const latest = discussion.posts?.[0];
  return (
    <button
      onClick={() => onOpen(discussion)}
      className="w-full text-left active:scale-[.99] transition-transform"
      style={{
        background: '#fff', borderRadius: 16,
        border: `1px solid ${C.line}`,
        boxShadow: '0 3px 10px -8px rgba(27,42,78,.2)',
        padding: 12, cursor: 'pointer',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: discussion.bg, color: discussion.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18}/>
      </div>
      <div className="flex-1 min-w-0">
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
          color: C.navy, lineHeight: 1.15,
        }}>
          {discussion.title}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
          marginTop: 2, lineHeight: 1.35,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Users size={10}/> {discussion.members.toLocaleString()}
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{
            color: C.sageDark, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 3, background: C.sageDark,
            }}/>
            {discussion.online} online
          </span>
        </div>
        {latest && (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.navySoft,
            marginTop: 6, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            <span style={{ fontWeight: 700, color: C.navy }}>{latest.authorName} · {latest.when}</span>
            {' — '}{latest.text}
          </div>
        )}
      </div>
      <ChevronRight size={14} color={C.muted} style={{ marginTop: 6, flexShrink: 0 }}/>
    </button>
  );
};

// -------------------------- screen --------------------------

export const ConnectTab = ({
  profile, prefs, openSchedule, openProfile, openMessage, openPremium,
  joinedEvents = [], setJoinedEvents,
  scheduled1to1 = {},
  savedItems = [], setSavedItems,
  account, requestAccount, flash,
  filterOpen, setFilterOpen,
  nearbyMoms = [], nearbyVerifiedOnly = true, onSetVerifiedOnly,
  initialSeeAll = null, onConsumeSeeAll,
}) => {
  void profile; void prefs;
  void openProfile;
  void requestAccount;

  // Live moms come decorated (Icon + resolved colors) from App. The 3-up grid
  // shows the top 3; the See-all list shows the full ranked set with filters.
  const gridMoms = nearbyMoms.slice(0, 3);

  // See-all quick-filter state (single-select chip). 'verified' re-fetches
  // server-side (verified is a DB filter); the rest filter the loaded list.
  const [momQuickFilter, setMomQuickFilter] = useState(null);

  // iconKey values ('new','working','home',…) are assigned by the server card
  // shaper (api/_lib/mom-card.js MOM_TYPE_PRESENTATION).
  const applyMomFilter = (list) => {
    switch (momQuickFilter) {
      case 'similar': return list.filter(m => (m.sharedTags || []).includes('Same kid ages'));
      case 'newmom':  return list.filter(m => m.iconKey === 'new');
      case 'working': return list.filter(m => m.iconKey === 'working');
      case 'stay':    return list.filter(m => m.iconKey === 'home');
      case 'near':    return [...list].sort((a, b) =>
        (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity));
      default:        return list;
    }
  };
  const seeAllMoms = applyMomFilter(nearbyMoms);

  // Detail-sheet state — only one open at a time.
  const [selectedMom, setSelectedMom] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  // Group-discussion sheet state: the selected discussion + a Set of joined
  // discussion ids (local to ConnectTab for the prototype).
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [joinedDiscussions, setJoinedDiscussions] = useState(new Set());
  const openDiscussion = (d) => setSelectedDiscussion(d);
  const toggleJoinDiscussion = () => {
    if (!selectedDiscussion) return;
    setJoinedDiscussions(prev => {
      const next = new Set(prev);
      if (next.has(selectedDiscussion.id)) {
        next.delete(selectedDiscussion.id);
        flash?.(`Left ${selectedDiscussion.title}`);
      } else {
        next.add(selectedDiscussion.id);
        flash?.(`✦ Joined ${selectedDiscussion.title}`);
      }
      return next;
    });
  };
  const [invited, setInvited] = useState({}); // {momId: true} — local prototype state

  const isSaved   = (id) => savedItems.includes(id);
  const isJoined  = (id) => joinedEvents.includes(id);
  const toggleSave   = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleJoined = (id) => setJoinedEvents?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openMomDetail = (mom) => setSelectedMom(mom);
  const openMeetupDetail = (m) => setSelectedEvent({
    id: m.id, title: m.title, photo: m.photo,
    when: m.meta, place: m.place, going: m.going,
    tags: ['Stroller-friendly', 'Free'], kind: 'Upcoming meetup',
  });

  // Advanced filters cover mom type, kid ages, interests, values,
  // calendar, distance, verified. Sheet opens via inline icon or via
  // the header sliders button (lifted state from MainApp).
  const [filters, setFilters] = useState(MEETUPS_FILTER_DEFAULT);
  const advCount =
    filters.momTypes.length + filters.kidAges.length +
    filters.interests.length + filters.values.length +
    (filters.calSameAsMe ? 1 : 0) +
    filters.calDays.length + filters.calTimes.length +
    (filters.distance != null ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0);

  // Which "See all" view is open (null = none).
  const [seeAll, setSeeAll] = useState(null);

  // Honor a cross-tab intent from Home ("See all moms / groups"): open the
  // requested drawer on mount, then clear it on the parent so a plain
  // nav-bar visit to Connect doesn't re-trigger it.
  useEffect(() => {
    if (initialSeeAll) {
      setSeeAll(initialSeeAll);
      onConsumeSeeAll?.();
    }
  }, [initialSeeAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local "Auto-scheduled" pool for prototype: tapping Auto-schedule on a
  // mom card flashes a confirmation and stamps a slot here so the button
  // flips to "Booked · Tue 9:30 AM" sage state without round-tripping
  // through the App-level scheduled1to1 (which only updates on signup).
  const [autoBooked, setAutoBooked] = useState({});

  // Pretend calendar overlap: rotates through a small slot pool so each
  // mom gets a deterministic best-match suggestion.
  const AUTOSCHEDULE_SLOTS = [
    { day: 'Tue', time: '9:30 AM',  place: 'Buddy Brew · Hyde Park' },
    { day: 'Thu', time: '10:00 AM', place: 'Curtis Hixon Park' },
    { day: 'Sat', time: '9:00 AM',  place: 'The Yard · Tampa' },
    { day: 'Wed', time: '10:30 AM', place: 'Bayshore Boulevard' },
  ];

  const slotForMom = (mom) => {
    // Deterministic hash so each mom always gets the same suggestion.
    const idx = (mom.id?.charCodeAt?.(mom.id.length - 1) || 0) % AUTOSCHEDULE_SLOTS.length;
    return AUTOSCHEDULE_SLOTS[idx];
  };

  // Compose the "scheduled?" lookup from both the App-level state and the
  // local auto-booked pool so both pathways flip the button to sage.
  const scheduledFor = (mom) =>
    scheduled1to1?.[mom.id] || autoBooked?.[mom.id] || null;

  const handleAutoSchedule = (mom) => {
    if (scheduledFor(mom)) return; // already booked — no-op
    const slot = slotForMom(mom);
    setAutoBooked(prev => ({ ...prev, [mom.id]: slot }));
    flash?.(`✦ Auto-scheduled with ${mom.name} · ${slot.day} ${slot.time}`);
  };

  const handleMessage = (mom) => {
    openMessage?.(mom);
  };

  // Connection-request state. Lives in ConnectTab so it persists across
  // SeeAll re-opens. Each request moves from 'none' → 'pending' on tap,
  // then to 'accepted' ~2.5s later to simulate the other mom replying.
  const [connections, setConnections] = useState({}); // { momId: 'pending' | 'accepted' }
  const handleConnect = (mom) => {
    const current = connections[mom.id];
    if (current && current !== 'none') return;
    setConnections(prev => ({ ...prev, [mom.id]: 'pending' }));
    flash?.(`✦ Connection request sent to ${mom.name}`);
    setTimeout(() => {
      setConnections(prev =>
        prev[mom.id] === 'pending' ? { ...prev, [mom.id]: 'accepted' } : prev,
      );
      flash?.(`✦ ${mom.name} accepted your connection`);
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Lone filter button — search row was removed; quick chips were removed earlier */}
      <div className="px-5" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="flex items-center justify-end">
          <ConnectFilterIconBtn
            count={advCount}
            onClick={() => setFilterOpen?.(true)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 16 }}>
        {/* Your best matches — ranked by shared ground (kids, interests,
            values, free slots) minus a distance penalty. */}
        <SectionHead title="Your best matches" onLink={() => setSeeAll('moms')}/>
        {gridMoms.length === 0 ? (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
            padding: '8px 2px',
          }}>
            No matches yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {gridMoms.map(item => (
              <MomCard key={item.id} item={item} onClick={() => openMomDetail(item)}/>
            ))}
          </div>
        )}
        {/* Upcoming meetups */}
        <SectionHead title="Upcoming meetups" onLink={() => setSeeAll('meetups')}/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {MEETUPS.map(item => (
            <MeetupCard key={item.id} item={item} onClick={() => openMeetupDetail(item)}/>
          ))}
        </div>

        {/* Popular discussions nearby */}
        <SectionHead title="Popular discussions nearby" onLink={() => setSeeAll('topics')}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TOP_DISCUSSIONS.map(d => (
            <DiscussionCard
              key={d.id}
              discussion={d}
              onOpen={openDiscussion}
            />
          ))}
        </div>
      </div>

      {seeAll === 'moms' && (
        <SeeAllSheet
          title="Your best matches"
          subtitle={`${seeAllMoms.length} moms${nearbyVerifiedOnly ? ' · verified only' : ''}`}
          items={seeAllMoms}
          renderItem={(item) => {
            return (
              <MomListCard
                key={item.id}
                item={item}
                sharedTags={item.sharedTags}
                scheduledSlot={scheduledFor(item)}
                messagesUsed={0}
                freeLimit={3}
                isPremium={!!account?.isPremium}
                connectionStatus={connections[item.id] || 'none'}
                onConnect={() => handleConnect(item)}
                onProfile={() => openMomDetail(item)}
                onMessage={() => handleMessage(item)}
                onSchedule={() => handleAutoSchedule(item)}
                onPremium={() => openPremium?.()}
              />
            );
          }}
          layout="list"
          gap={12}
          quickFilters={[
            { id: 'verified', label: 'Verified',     icon: ShieldCheck },
            { id: 'similar',  label: 'Similar kids',  icon: Heart },
            { id: 'newmom',   label: 'New mom',       icon: Baby },
            { id: 'working',  label: 'Working',       icon: Briefcase },
            { id: 'stay',     label: 'Stay-at-home',  icon: Home },
            { id: 'near',     label: 'Near me',       icon: MapPin },
          ]}
          activeQuickFilter={momQuickFilter ?? (nearbyVerifiedOnly ? 'verified' : null)}
          onQuickFilter={(id) => {
            if (id === 'verified') {
              onSetVerifiedOnly?.(!nearbyVerifiedOnly);
              setMomQuickFilter(null);
              return;
            }
            setMomQuickFilter(prev => (prev === id ? null : id));
          }}
          onOpenAdvancedFilter={() => setFilterOpen?.(true)}
          advancedFilterCount={advCount}
          onClose={() => { setSeeAll(null); setMomQuickFilter(null); }}
        />
      )}

      {seeAll === 'meetups' && (
        <SeeAllSheet
          title="Upcoming meetups"
          subtitle="Next 7 days"
          items={MEETUPS_ALL}
          renderItem={(item) => (
            <MeetupCard key={item.id} item={item} onClick={() => openMeetupDetail(item)}/>
          )}
          columns={2}
          quickFilters={[
            { id: 'thisweek',label: 'This week',  icon: Calendar },
            { id: 'weekend', label: 'Weekend',    icon: Calendar },
            { id: 'morning', label: 'Mornings',   icon: Coffee   },
            { id: 'kids',    label: 'Kid-friendly',icon: Baby    },
            { id: 'verified',label: 'Verified',   icon: ShieldCheck },
            { id: 'near',    label: 'Near me',    icon: MapPin   },
          ]}
          onOpenAdvancedFilter={() => setFilterOpen?.(true)}
          advancedFilterCount={advCount}
          onClose={() => setSeeAll(null)}
        />
      )}

      {seeAll === 'topics' && (
        <SeeAllSheet
          title="Popular discussions nearby"
          subtitle={`${GROUP_DISCUSSIONS.length} active threads · Tampa moms`}
          items={GROUP_DISCUSSIONS}
          renderItem={(d) => (
            <DiscussionCard
              key={d.id}
              discussion={d}
              onOpen={openDiscussion}
            />
          )}
          layout="list"
          gap={10}
          quickFilters={[
            { id: 'sleep',     label: 'Sleep',     icon: Moon       },
            { id: 'daycare',   label: 'Daycare',   icon: BookOpen   },
            { id: 'play',      label: 'Playdates', icon: Users      },
            { id: 'postpartum',label: 'Postpartum',icon: Heart      },
            { id: 'feeding',   label: 'Feeding',   icon: Coffee     },
            { id: 'working',   label: 'Working',   icon: Briefcase  },
          ]}
          onOpenAdvancedFilter={() => setFilterOpen?.(true)}
          advancedFilterCount={advCount}
          onClose={() => setSeeAll(null)}
        />
      )}

      {filterOpen && (
        <MeetupsFilterSheet
          filters={filters}
          setFilters={setFilters}
          userSlotsCount={prefs?.slots?.length || 0}
          onClose={() => setFilterOpen?.(false)}
        />
      )}

      {selectedMom && (
        <MomDetailSheet
          mom={selectedMom}
          saved={isSaved(`mom-${selectedMom.id}`)}
          invited={!!invited[selectedMom.id]}
          onInvite={() => {
            setInvited(i => ({ ...i, [selectedMom.id]: true }));
            flash?.(`✦ Invite sent to ${selectedMom.name}`);
          }}
          onMessage={() => {
            // MessageSheet renders from the mom's .id + .name; the live nearbyMoms
            // card shape carries both, so the basic chat renders fine.
            openMessage?.(selectedMom);
            setSelectedMom(null);
          }}
          onSave={() => {
            const key = `mom-${selectedMom.id}`;
            toggleSave(key);
            flash?.(isSaved(key) ? `Removed ${selectedMom.name} from saved` : `✦ Saved ${selectedMom.name}`);
          }}
          onShare={() => setShareItem({
            title: `${selectedMom.name}'s profile`,
            kind: 'Mom profile',
            place: selectedMom.distance,
            photo: selectedMom.photo,
          })}
          onClose={() => setSelectedMom(null)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          saved={isSaved(selectedEvent.id)}
          joined={isJoined(selectedEvent.id)}
          interested={isSaved(`int-${selectedEvent.id}`)}
          onJoin={() => {
            toggleJoined(selectedEvent.id);
            flash?.(isJoined(selectedEvent.id)
              ? `Removed RSVP · ${selectedEvent.title}`
              : `✦ You're going · ${selectedEvent.title}`);
          }}
          onInterested={() => {
            toggleSave(`int-${selectedEvent.id}`);
            flash?.(isSaved(`int-${selectedEvent.id}`) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onSave={() => {
            toggleSave(selectedEvent.id);
            flash?.(isSaved(selectedEvent.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onShare={() => setShareItem({
            title: selectedEvent.title,
            kind: selectedEvent.kind || 'Meetup',
            when: selectedEvent.when,
            place: selectedEvent.place,
            photo: selectedEvent.photo,
          })}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {shareItem && (
        <ShareSheet
          item={shareItem}
          flash={flash}
          onClose={() => setShareItem(null)}
        />
      )}

      {selectedDiscussion && (
        <GroupDiscussionSheet
          discussion={selectedDiscussion}
          joined={joinedDiscussions.has(selectedDiscussion.id)}
          onToggleJoin={toggleJoinDiscussion}
          onMessageMom={(mom) => { openMessage?.(mom); setSelectedDiscussion(null); }}
          onScheduleMom={(mom) => { openSchedule?.(mom); setSelectedDiscussion(null); }}
          flash={flash}
          onClose={() => setSelectedDiscussion(null)}
        />
      )}
    </div>
  );
};

// Round filter icon button. Coral accent when any filter is active.
const ConnectFilterIconBtn = ({ count = 0, onClick }) => (
  <button
    onClick={onClick}
    aria-label="Open advanced filters"
    className="relative flex-shrink-0 flex items-center justify-center rounded-full"
    style={{
      width: 34, height: 34,
      background: count > 0 ? C.coral : C.paper,
      color: count > 0 ? '#fff' : C.navy,
      border: `1px solid ${count > 0 ? C.coral : C.divider}`,
    }}
  >
    <SlidersHorizontal size={14}/>
    {count > 0 && (
      <span
        className="absolute"
        style={{
          top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8,
          background: C.coralDeep, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${C.cream}`,
        }}
      >
        {count > 9 ? '9+' : count}
      </span>
    )}
  </button>
);
