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
import { GroupsAdvancedFilterSheet, GROUPS_FILTER_DEFAULT } from '../../sheets/GroupsAdvancedFilterSheet';
import {
  MomsAdvancedFilterSheet, MOMS_FILTER_DEFAULT, momsFilterCount,
} from '../../sheets/MomsAdvancedFilterSheet';
import { InviteFriendButton } from '../../components/InviteFriendButton';
import {
  GROUP_DISCUSSIONS, TOP_DISCUSSIONS,
  GROUP_CATEGORIES_VISIBLE, matchesGroupFilters,
} from '../../data/discussions';
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

// Bump the Unsplash w= param so the rendered circle (~88px @ 2× = 176px)
// has enough pixels to look sharp instead of soft. Non-Unsplash URLs pass
// through unchanged.
const sharpenPhoto = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('images.unsplash.com')) return url;
  return url.replace(/([?&])w=\d+/, '$1w=320').replace(/([?&])q=\d+/, '$1q=85');
};

// MomCard — competitor-class profile card for the Connect "Recommended
// Moms for you" horizontal scroll. Modeled after Hinge / Peanut / Bumble
// BFF in 2026: a tall photo-hero card with overlays (match %, online dot,
// distance pill, verified shield), then identity + 2 shared-interest
// chips below the photo. Keeps the editorial Go Mama palette so it doesn't
// read like a swipe deck.
//
// Joins the kid age buckets ("0–1 · 3–5") if present, else falls back to
// parsing the preformatted "1–3 yrs" string. Always returns a trimmed
// label like "1–3 yrs" / "0–1 · 3–5 yrs" / null.
const kidAgesText = (item) => {
  if (Array.isArray(item.kidBuckets) && item.kidBuckets.length) {
    return `${item.kidBuckets.join(' · ')} yrs`;
  }
  if (item.kids && item.kids !== 'Kids') {
    const clean = String(item.kids).trim();
    return /\byrs?\b/i.test(clean) ? clean : `${clean} yrs`;
  }
  return null;
};

// Pluralizes the kid count line ("2 kids" / "1 kid"). Falls back to
// kidBuckets length, then the raw `kids` string when neither is shaped.
const kidsCountText = (item) => {
  const n = item.kidsCount
    || (Array.isArray(item.kidBuckets) ? item.kidBuckets.length : null);
  if (typeof n === 'number' && n > 0) return `${n} ${n === 1 ? 'kid' : 'kids'}`;
  // Some sources pass "1 kid" / "2 kids" already in `kids` instead of an age
  // string — surface that as-is, suppressing the duplicate age line.
  if (item.kids && /\bkid/i.test(item.kids)) return item.kids;
  return null;
};

// MomCard — small "preview" card used identically on Home, Connect, and the
// SeeAll moms screen. Single source of truth for how a mom reads in a list.
// Tap → MomDetailSheet (all deep actions live there).
//
// Exported so HomeTab can reuse the exact same component (parity is the
// product requirement, not a coincidence).
export const MomCard = ({ item, onClick, compact = false }) => {
  const kidsLine = kidsCountText(item);
  const ageLine = kidAgesText(item);
  const shared = (item.sharedTags && item.sharedTags.length)
    ? item.sharedTags.slice(0, 2)
    : [];

  const matchPct = item.overlap != null
    ? Math.round(item.overlap)
    : (80 + (((item.id || item.name || '').toString().charCodeAt(0) || 0) % 16));

  const isOnline = item.online !== false;
  const isVerified = item.verified !== false;

  // Compact = 3-up grid variant used in Connect's "Recommended Moms for you"
  // section: card stretches with its column and the hero is shorter.
  const heroHeight = compact ? 88 : 130;

  return (
    <button
      onClick={onClick}
      className="text-left active:scale-[.98] transition-transform"
      style={{
        width: compact ? '100%' : 150, flexShrink: 0,
        background: '#fff', borderRadius: 16,
        border: `1px solid ${C.line}`,
        boxShadow: '0 6px 16px -12px rgba(27,42,78,.3)',
        overflow: 'hidden', padding: 0, cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Hero photo — slimmed from 196→130 so the card feels like a preview
          rather than a swipe-deck portrait. Compact mode drops it further to
          88 so 3 cards fit on a single phone row. */}
      <div style={{ position: 'relative', width: '100%', height: heroHeight }}>
        {item.photo ? (
          <img
            src={sharpenPhoto(item.photo)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: item.hue || `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'Fraunces', fontWeight: 600, fontSize: 40,
          }}>
            {(item.firstName || item.name || '?').charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.4) 100%)',
          pointerEvents: 'none',
        }}/>

        {/* Top-left: match % */}
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff', borderRadius: 999,
          padding: '2px 6px',
          fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 2,
          boxShadow: '0 2px 6px -3px rgba(214,68,106,.55)',
        }}>
          <Sparkles size={8}/> {matchPct}%
        </div>

        {/* Top-right: verified shield over online dot */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
        }}>
          {isVerified && (
            <div
              aria-label="Verified"
              style={{
                width: 18, height: 18, borderRadius: 9,
                background: C.sageDark, color: '#fff', border: '1.5px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 4px -2px rgba(27,42,78,.4)',
              }}
            >
              <ShieldCheck size={9}/>
            </div>
          )}
          {isOnline && (
            <span style={{
              width: 8, height: 8, borderRadius: 4,
              background: C.sageDark, border: '1.5px solid #fff',
              boxShadow: '0 2px 4px -2px rgba(27,42,78,.4)',
            }}/>
          )}
        </div>

        {/* Bottom-left: distance pill */}
        {item.distanceMi != null && (
          <div style={{
            position: 'absolute', bottom: 6, left: 6,
            background: 'rgba(255,255,255,.95)',
            borderRadius: 999, padding: '2px 6px',
            display: 'flex', alignItems: 'center', gap: 2,
            boxShadow: '0 2px 5px -3px rgba(27,42,78,.4)',
          }}>
            <MapPin size={8} color={C.coralDeep} strokeWidth={2.4}/>
            <span style={{ fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800, color: C.navy }}>
              {item.distanceMi.toFixed(1)} mi
            </span>
          </div>
        )}
      </div>

      {/* Identity + kids info */}
      <div style={{ padding: '8px 9px 10px' }}>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 13.5, fontWeight: 600,
          color: C.navy, letterSpacing: '-.01em', lineHeight: 1.05,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.firstName || item.name}
        </div>

        {/* Kids count + kid age range — replaces the older "Mom of a toddler"
            stage label. Count comes first, ages stack below so each line
            answers a different question at a glance. */}
        {kidsLine && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3, marginTop: 3,
            fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700, color: C.navy,
            whiteSpace: 'nowrap',
          }}>
            <Baby size={9} color={C.coralDeep}/> {kidsLine}
          </div>
        )}
        {ageLine && (
          <div style={{
            marginTop: 1,
            paddingLeft: 14, // hangs under the Baby icon visually
            fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 600, color: C.muted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {ageLine}
          </div>
        )}

        {shared.length > 0 && (
          <div style={{
            marginTop: 7,
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {shared.map((tag, i) => (
              <span
                key={tag + i}
                style={{
                  background: i === 0 ? C.coralSoft : '#fff',
                  color: C.coralDeep,
                  border: `1px solid ${C.coral}33`,
                  fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  whiteSpace: 'nowrap', maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  alignSelf: 'flex-start',
                }}
              >
                {i === 0 && <Heart size={7} fill={C.coralDeep} color={C.coralDeep}/>}
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

// Hard-coded availability windows fall back when the server hasn't shaped
// `nextSlots`. Mirrors what the user might pick in onboarding.
const FALLBACK_AVAILABILITY = ['Tue mornings', 'Thu mornings', 'Sat mornings'];
const DAY_CHIPS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_CHIPS = [
  { id: 'morning',   label: 'Morning',   icon: Coffee },
  { id: 'midday',    label: 'Midday',    icon: Sparkles },
  { id: 'afternoon', label: 'Afternoon', icon: Smile },
  { id: 'evening',   label: 'Evening',   icon: Moon },
];

// Returns a 1-line "What you need to know" digest — first line of the bio,
// or a sensible fallback derived from kids + type.
const blurbFor = (item) => {
  if (item.bio) {
    const first = String(item.bio).split(/[.\n]/)[0].trim();
    if (first.length > 6) return first.length > 110 ? `${first.slice(0, 108)}…` : first;
  }
  const stage = (item.kids || '').trim();
  const type = (item.type || '').trim();
  if (stage && type) return `${type} · ${stage}`;
  return type || stage || 'Real-life mom friend, no chat penpals.';
};

// Richer per-mom card for the SeeAll "Recommended Moms for you" screen.
// Surfaces everything a mom actually needs to decide whether to match:
//   • Photo + verified badge
//   • Name, stage, distance, neighborhood
//   • 1-line bio / "what you need to know"
//   • Availability ("Free: Tue + Thu mornings")
//   • Kid count + ages
//   • Interests / shared ground
//   • Connection-request primary CTA
//   • 3-up: Profile · Message · Schedule
//   • "Propose first meetup" inline composer (collapsible)
const MomListCard = ({
  item, sharedTags = ['Coffee dates', 'Same kid ages'],
  scheduledSlot,
  proposal,
  messagesUsed = 0, freeLimit = 3, isPremium = false,
  connectionStatus = 'none',
  onConnect,
  onProfile, onMessage, onSchedule, onPropose, onPremium,
}) => {
  const TagIcon = item.Icon;
  const msgLimitHit = !isPremium && messagesUsed >= freeLimit;
  const msgRemaining = Math.max(0, freeLimit - messagesUsed);
  const booked = !!scheduledSlot;
  const blurb = blurbFor(item);
  const availability = Array.isArray(item.nextSlots) && item.nextSlots.length
    ? item.nextSlots.slice(0, 3)
    : FALLBACK_AVAILABILITY;
  const interests = Array.isArray(item.interests) && item.interests.length
    ? item.interests.slice(0, 4)
    : sharedTags.slice(0, 4);
  const neighborhood = item.neighborhood || item.area;
  const kidsCount = item.kidsCount
    || (Array.isArray(item.kidBuckets) ? item.kidBuckets.length : null);

  // Propose meetup composer — local draft state. Defaults to "Sat / Morning"
  // so a one-tap send is possible.
  const [proposeOpen, setProposeOpen] = useState(false);
  const [pday, setPday] = useState('Sat');
  const [ptime, setPtime] = useState('morning');
  const [pplace, setPplace] = useState('');
  const proposalSent = !!proposal;
  const sendProposal = () => {
    onPropose?.({
      day: pday,
      time: TIME_CHIPS.find(t => t.id === ptime)?.label || ptime,
      place: pplace.trim(),
    });
    setProposeOpen(false);
  };

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
            <img src={sharpenPhoto(item.photo)} alt="" style={{
              width: 72, height: 72, borderRadius: 16, objectFit: 'cover',
              display: 'block',
            }}/>
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 16,
              background: item.hue || `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'Fraunces', fontWeight: 600, fontSize: 28,
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
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 17, fontWeight: 600,
              color: C.navy, letterSpacing: '-.01em', lineHeight: 1.1,
            }}>
              {item.name}
            </div>
            {item.overlap != null && (
              <span style={{
                background: C.coralSoft, color: C.coralDeep,
                fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 800,
                padding: '2px 7px', borderRadius: 9,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <Sparkles size={9}/> {Math.round(item.overlap)}% match
              </span>
            )}
          </div>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
            marginTop: 3, display: 'flex', alignItems: 'center', gap: 5,
            flexWrap: 'wrap',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Baby size={10}/> {kidsCount ? `${kidsCount} ${kidsCount === 1 ? 'kid' : 'kids'} · ` : ''}{item.kids}
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9}/> {item.distance}{neighborhood ? ` · ${neighborhood}` : ''}
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

      {/* 1-line bio / what-you-need-to-know */}
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12, color: C.navySoft,
        lineHeight: 1.4, fontStyle: 'italic',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        “{blurb}”
      </div>

      {/* Availability + interests info rows */}
      <div style={{
        background: C.creamSoft, borderRadius: 12,
        padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div className="flex items-center gap-1.5" style={{
          fontFamily: 'Albert Sans', fontSize: 11, color: C.inkSoft, fontWeight: 600,
        }}>
          <Calendar size={10} color={C.coralDeep}/>
          <span style={{ color: C.muted, textTransform: 'uppercase', fontWeight: 800, fontSize: 9, letterSpacing: '.1em' }}>
            Free
          </span>
          <span>{availability.join(' · ')}</span>
        </div>
        {interests.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5" style={{
            fontFamily: 'Albert Sans', fontSize: 11, color: C.inkSoft, fontWeight: 600,
          }}>
            <Heart size={10} color={C.coralDeep} fill={C.coralDeep}/>
            <span style={{
              color: C.muted, textTransform: 'uppercase', fontWeight: 800, fontSize: 9, letterSpacing: '.1em',
            }}>
              Into
            </span>
            {interests.map(t => (
              <span key={t} style={{
                background: '#fff', color: C.navy,
                border: `1px solid ${C.divider}`,
                padding: '1.5px 6px', borderRadius: 7,
                fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Shared ground pill row — kept distinct from "interests" because it's
          the *intersection* with the user, not the mom's full profile. */}
      {sharedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" style={{
          background: `${C.coral}10`, border: `1px solid ${C.coral}26`,
          borderRadius: 12, padding: '6px 8px',
        }}>
          <div className="flex items-center gap-1.5" style={{
            color: C.coralDeep, fontFamily: 'Albert Sans', fontSize: 9.5,
            fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
          }}>
            <Sparkles size={9}/> Shared
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
      )}

      {/* Connection-request primary CTA */}
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
          <span style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, lineHeight: 1.1 }}>
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
          <span style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, lineHeight: 1.1 }}>
            {msgLimitHit ? 'Unlock' : 'Message'}
          </span>
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 8.5,
            color: msgLimitHit ? '#8A6610' : C.muted,
          }}>
            {isPremium ? 'Unlimited' : msgLimitHit ? 'Plus required' : `${msgRemaining} free left`}
          </span>
        </button>

        {/* Schedule — opens the ScheduleSheet so the user picks a slot */}
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
          {booked ? <Check size={14}/> : <Calendar size={14}/>}
          <span style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800, lineHeight: 1.1 }}>
            {booked ? 'Booked' : 'Schedule'}
          </span>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 8.5, opacity: booked ? 0.85 : 0.92 }}>
            {booked ? `${scheduledSlot.day} · ${scheduledSlot.time}` : 'Pick a slot'}
          </span>
        </button>
      </div>

      {/* Propose first meetup — collapsed by default. Lives below Schedule
          so it reads as the alternative to the standard slot flow. */}
      {proposalSent ? (
        <div style={{
          background: `${C.sageDark}12`,
          border: `1px solid ${C.sageDark}33`,
          borderRadius: 12, padding: '8px 10px',
          fontFamily: 'Albert Sans', fontSize: 11, color: C.sageDark,
          fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Check size={12}/> Proposal sent · {proposal.day} {proposal.time}
          {proposal.place ? ` @ ${proposal.place}` : ''}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setProposeOpen(v => !v)}
            className="active:scale-[.98] transition-transform"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent', border: `1px dashed ${C.coral}55`,
              borderRadius: 12, padding: '7px 10px',
              fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, color: C.coralDeep,
              cursor: 'pointer',
            }}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={11}/> Propose time & place for first meetup
            </span>
            <span style={{ fontFamily: 'Albert Sans', fontSize: 16, lineHeight: 1, color: C.coralDeep }}>
              {proposeOpen ? '−' : '+'}
            </span>
          </button>

          {proposeOpen && (
            <div style={{
              marginTop: 6,
              background: C.paper, border: `1px solid ${C.divider}`,
              borderRadius: 12, padding: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
                  color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase',
                  marginBottom: 5,
                }}>
                  Day
                </div>
                <div className="flex gap-1 flex-wrap">
                  {DAY_CHIPS.map(d => (
                    <button
                      key={d}
                      onClick={() => setPday(d)}
                      style={{
                        background: pday === d ? C.coralDeep : '#fff',
                        color: pday === d ? '#fff' : C.navy,
                        border: `1px solid ${pday === d ? C.coralDeep : C.divider}`,
                        padding: '3px 8px', borderRadius: 8,
                        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
                  color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase',
                  marginBottom: 5,
                }}>
                  Time
                </div>
                <div className="flex gap-1 flex-wrap">
                  {TIME_CHIPS.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setPtime(t.id)}
                        style={{
                          background: ptime === t.id ? C.coralDeep : '#fff',
                          color: ptime === t.id ? '#fff' : C.navy,
                          border: `1px solid ${ptime === t.id ? C.coralDeep : C.divider}`,
                          padding: '3px 8px', borderRadius: 8,
                          fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        <Icon size={10}/> {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800,
                  color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase',
                  marginBottom: 5,
                }}>
                  Place (optional)
                </div>
                <input
                  value={pplace}
                  onChange={(e) => setPplace(e.target.value.slice(0, 60))}
                  placeholder="Buddy Brew · Hyde Park"
                  style={{
                    width: '100%',
                    background: '#fff', border: `1px solid ${C.divider}`,
                    borderRadius: 9, padding: '7px 9px',
                    fontFamily: 'Albert Sans', fontSize: 11.5, color: C.navy,
                    outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={sendProposal}
                className="active:scale-[.99] transition-transform"
                style={{
                  marginTop: 2, height: 36, width: '100%',
                  background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  boxShadow: '0 4px 10px -6px rgba(214,68,106,.55)',
                }}
              >
                <Sparkles size={12}/> Send proposal to {item.name.split(' ')[0]}
              </button>
            </div>
          )}
        </div>
      )}
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
  goToExploreSeeAll,                   // (key) => switch to Explore tab and
                                       // open that section's SeeAllSheet.
  chatAuthor,
  myUserId,
  onDiscuss,
  requireVerify,                       // (action, name?) => boolean. False means
                                       // the verify-prompt sheet just opened.
}) => {
  void prefs;
  void openProfile;
  void requestAccount;

  // Live moms come decorated (Icon + resolved colors) from App. The
  // horizontal scroll surfaces the top 6 (~2.2 cards visible at a time);
  // the See-all list shows the full ranked set with filters.
  const gridMoms = nearbyMoms.slice(0, 6);

  // See-all quick-filter state (single-select chip). Only 3 visible chips
  // ride above the deck: Near me · Similar stage · Similar interests. The
  // rest of the criteria live behind the advanced filter (Plus-gated).
  const [momQuickFilter, setMomQuickFilter] = useState(null);

  // Plus-gated advanced filter for moms — distance, kid ages, mom stage,
  // interests, values, neighborhood, availability, verified-only. Free
  // users see the PremiumSheet instead of the drawer.
  const [momsAdvFilters, setMomsAdvFilters] = useState(MOMS_FILTER_DEFAULT);
  const [momsAdvOpen, setMomsAdvOpen] = useState(false);
  const momsAdvCount = momsFilterCount(momsAdvFilters);

  // Matches the user's own kidBuckets (if known) to surface "similar stage"
  // moms. Fall back to the most common bucket across nearbyMoms otherwise
  // so the chip still does *something* useful.
  const myKidBuckets = Array.isArray(profile?.kidBuckets) ? profile.kidBuckets
    : (profile?.stage ? [] : []);
  const stageMatch = (m) => {
    if (!Array.isArray(m.kidBuckets) || !myKidBuckets.length) {
      return (m.sharedTags || []).includes('Same kid ages');
    }
    return m.kidBuckets.some(b => myKidBuckets.includes(b));
  };
  const myInterests = (profile?.interests || []).map(s => String(s).toLowerCase());
  const interestMatch = (m) => {
    const tags = (m.sharedTags || []).map(s => String(s).toLowerCase());
    if (myInterests.length) return tags.some(t => myInterests.includes(t));
    // Fallback: any shared coffee / park / stroller signal counts
    return tags.some(t => t.includes('coffee') || t.includes('park') || t.includes('stroller'));
  };

  // iconKey values ('new','working','home',…) are assigned by the server card
  // shaper (api/_lib/mom-card.js MOM_TYPE_PRESENTATION).
  const applyMomFilter = (list) => {
    // Apply advanced filters first (distance + kid ages + stage + interests +
    // neighborhood + availability).
    const f = momsAdvFilters;
    let out = list;
    if (f.distanceMi != null) {
      out = out.filter(m => (m.distanceMi ?? Infinity) <= f.distanceMi);
    }
    if (f.kidAges?.length) {
      out = out.filter(m => Array.isArray(m.kidBuckets) && m.kidBuckets.some(b => f.kidAges.includes(b)));
    }
    if (f.momTypes?.length) {
      out = out.filter(m => f.momTypes.includes(m.iconKey) || f.momTypes.includes(m.type));
    }
    if (f.neighborhoods?.length) {
      out = out.filter(m => f.neighborhoods.includes(m.neighborhood) || f.neighborhoods.includes(m.area));
    }
    if (f.interests?.length) {
      out = out.filter(m => (m.sharedTags || []).some(t => f.interests.includes(t)));
    }
    if (f.values?.length) {
      out = out.filter(m => Array.isArray(m.values) && m.values.some(v => f.values.includes(v)));
    }

    // Visible quick filter narrows further.
    switch (momQuickFilter) {
      case 'similar':   out = out.filter(stageMatch); break;
      case 'interests': out = out.filter(interestMatch); break;
      case 'near':
        out = [...out].sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity));
        break;
      default: break;
    }
    return out;
  };
  const seeAllMoms = applyMomFilter(nearbyMoms);

  // Detail-sheet state — only one open at a time.
  const [selectedMom, setSelectedMom] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  // Group-discussion sheet state. Group join is now Plus-gated *and*
  // host-approved, so we track per-discussion status as
  // 'pending' (request sent) → 'accepted' (host approved). The accepted
  // simulation fires ~3s later so the prototype demonstrates the flow.
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [discussionJoinStatus, setDiscussionJoinStatus] = useState({}); // { id: 'pending'|'accepted' }
  const openDiscussion = (d) => setSelectedDiscussion(d);

  const requestJoinDiscussion = () => {
    if (!selectedDiscussion) return;
    const current = discussionJoinStatus[selectedDiscussion.id];
    if (current) return; // already pending or accepted
    if (requireVerify && !requireVerify('group', selectedDiscussion.title)) return;
    setDiscussionJoinStatus(prev => ({ ...prev, [selectedDiscussion.id]: 'pending' }));
    flash?.(`✦ Request sent to ${selectedDiscussion.hostName || 'the host'}`);
    const reviewedId = selectedDiscussion.id;
    setTimeout(() => {
      setDiscussionJoinStatus(prev =>
        prev[reviewedId] === 'pending' ? { ...prev, [reviewedId]: 'accepted' } : prev,
      );
      flash?.(`✦ You're in — welcome to ${selectedDiscussion.title}`);
    }, 3000);
  };

  const leaveDiscussion = () => {
    if (!selectedDiscussion) return;
    const id = selectedDiscussion.id;
    setDiscussionJoinStatus(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    flash?.(`Left ${selectedDiscussion.title}`);
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

  // Group-discussion filters. `groupQuickCategories` is a Set of visible
  // category ids toggled from the See-all chip row; `groupAdvanced` holds
  // the Plus-gated multi-facet filter (topics, kid ages, mom stages,
  // neighborhoods). They compose: a discussion must match both blocks.
  const [groupQuickCategories, setGroupQuickCategories] = useState(new Set());
  const [groupAdvanced, setGroupAdvanced] = useState(GROUPS_FILTER_DEFAULT);
  const [groupAdvancedOpen, setGroupAdvancedOpen] = useState(false);
  const groupAdvancedCount =
    groupAdvanced.topics.length + groupAdvanced.kidAges.length +
    groupAdvanced.momStages.length + groupAdvanced.neighborhoods.length;

  // Honor a cross-tab intent from Home ("See all moms / groups"): open the
  // requested drawer on mount, then clear it on the parent so a plain
  // nav-bar visit to Connect doesn't re-trigger it.
  useEffect(() => {
    if (initialSeeAll) {
      setSeeAll(initialSeeAll);
      onConsumeSeeAll?.();
    }
  }, [initialSeeAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advanced filters are Plus-only. If a non-premium user lands with the
  // sheet flagged open (from any future entry point), bounce them to the
  // PremiumSheet instead.
  useEffect(() => {
    if (filterOpen && !account?.isPremium) {
      setFilterOpen?.(false);
      openPremium?.();
    }
  }, [filterOpen, account?.isPremium]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // "Propose first meetup" composer in MomListCard hands its draft back
  // here. The proposal is a soft signal (no calendar mutation yet) — we
  // simulate sending an invite and stamp a `proposal` entry alongside any
  // existing booking so the card shows acknowledgment of the send.
  const [proposals, setProposals] = useState({});
  const handleProposeMeetup = (mom, { day, time, place }) => {
    if (requireVerify && !requireVerify('meetup', mom.name)) return;
    setProposals(prev => ({ ...prev, [mom.id]: { day, time, place } }));
    flash?.(`✦ Proposal sent to ${mom.name.split(' ')[0]} · ${day} ${time}${place ? ` @ ${place}` : ''}`);
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
    if (requireVerify && !requireVerify('connect', mom.name)) return;
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
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 16 }}>
        {/* Recommended Moms for you — ranked by shared ground (kids, interests,
            values, free slots) minus a distance penalty. */}
        <SectionHead title="Recommended Moms for you" onLink={() => setSeeAll('moms')}/>
        {gridMoms.length === 0 ? (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
            padding: '8px 2px',
          }}>
            No matches yet — check back soon.
          </div>
        ) : (
          // Three compact cards on a single phone row. Smaller hero photo
          // (88px) keeps the card readable at 1/3 of the viewport width.
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {gridMoms.slice(0, 3).map(item => (
              <MomCard
                key={item.id}
                item={item}
                compact
                onClick={() => openMomDetail(item)}
              />
            ))}
          </div>
        )}
        {/* Upcoming meetups */}
        <SectionHead title="Upcoming meetups" onLink={() => goToExploreSeeAll?.('meetups')}/>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {MEETUPS.map(item => (
            <MeetupCard key={item.id} item={item} onClick={() => openMeetupDetail(item)}/>
          ))}
        </div>

        {/* Popular Mom Groups */}
        <SectionHead title="Popular Mom Groups" onLink={() => setSeeAll('topics')}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TOP_DISCUSSIONS.map(d => (
            <DiscussionCard
              key={d.id}
              discussion={d}
              onOpen={openDiscussion}
            />
          ))}
        </div>

        <InviteFriendButton flash={flash}/>
      </div>

      {seeAll === 'moms' && (
        <SeeAllSheet
          title="Recommended Moms for you"
          subtitle={`${seeAllMoms.length} moms${nearbyVerifiedOnly ? ' · verified only' : ''}`}
          items={seeAllMoms}
          renderItem={(item) => (
            // Same MomCard preview used on the Connect + Home rows — taps
            // open MomDetailSheet which hosts every deep action.
            <MomCard key={item.id} item={item} onClick={() => openMomDetail(item)}/>
          )}
          columns={2}
          gap={10}
          // Only 3 visible quick filters; the rest are behind the (Plus-gated)
          // advanced filter button at the top-right of the SeeAllSheet.
          quickFilters={[
            { id: 'near',      label: 'Near me',          icon: MapPin },
            { id: 'similar',   label: 'Similar stage',    icon: Baby   },
            { id: 'interests', label: 'Similar interests',icon: Heart  },
          ]}
          activeQuickFilter={momQuickFilter}
          onQuickFilter={(id) => {
            setMomQuickFilter(prev => (prev === id ? null : id));
          }}
          onOpenAdvancedFilter={() => {
            if (!account?.isPremium) { openPremium?.(); return; }
            setMomsAdvOpen(true);
          }}
          advancedFilterCount={momsAdvCount}
          lockedPremium={!account?.isPremium}
          onClose={() => { setSeeAll(null); setMomQuickFilter(null); }}
        />
      )}

      {momsAdvOpen && (
        <MomsAdvancedFilterSheet
          filters={momsAdvFilters}
          setFilters={(next) => {
            setMomsAdvFilters(next);
            // The verified-only flag is also a server-side filter (controls
            // the next nearby-moms re-fetch). Mirror it on App-level state so
            // the cached list and the chip badge stay in sync.
            if (next.verifiedOnly !== nearbyVerifiedOnly) {
              onSetVerifiedOnly?.(next.verifiedOnly);
            }
          }}
          onClose={() => setMomsAdvOpen(false)}
        />
      )}

      {/* The 'meetups' See-all is owned by the Explore tab now — taps on
          "Upcoming meetups" route there via goToExploreSeeAll. */}

      {seeAll === 'topics' && (
        <SeeAllSheet
          title="Popular Mom Groups"
          subtitle={`${GROUP_DISCUSSIONS.length} active groups · Tampa moms`}
          items={GROUP_DISCUSSIONS.filter(d =>
            matchesGroupFilters(d, {
              categoryIds: [...groupQuickCategories],
              topics: groupAdvanced.topics,
              kidAges: groupAdvanced.kidAges,
              momStages: groupAdvanced.momStages,
              neighborhoods: groupAdvanced.neighborhoods,
            }),
          )}
          renderItem={(d) => (
            <DiscussionCard
              key={d.id}
              discussion={d}
              onOpen={openDiscussion}
            />
          )}
          layout="list"
          gap={10}
          quickFilters={GROUP_CATEGORIES_VISIBLE}
          activeQuickFilter={groupQuickCategories}
          onQuickFilter={(id) => {
            setGroupQuickCategories(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            });
          }}
          matchQuickFilter={(item) => {
            if (groupQuickCategories.size === 0) return true;
            return groupQuickCategories.has(item.categoryId);
          }}
          onOpenAdvancedFilter={() => {
            if (!account?.isPremium) {
              openPremium?.();
              flash?.('✦ Advanced filters are a Plus perk');
              return;
            }
            setGroupAdvancedOpen(true);
          }}
          advancedFilterCount={groupAdvancedCount}
          lockedPremium={!account?.isPremium}
          accent={C.sage}
          onClose={() => setSeeAll(null)}
        />
      )}

      {groupAdvancedOpen && (
        <GroupsAdvancedFilterSheet
          filters={groupAdvanced}
          setFilters={setGroupAdvanced}
          onClose={() => setGroupAdvancedOpen(false)}
        />
      )}

      {/* Advanced filters are Plus-only — non-premium taps redirect to the
          PremiumSheet via the effect below, so we never render the drawer. */}
      {filterOpen && !!account?.isPremium && (
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
          // All deep actions live here now (moved off the old SeeAll card).
          connectionStatus={connections[selectedMom.id] || 'none'}
          scheduledSlot={scheduledFor(selectedMom)}
          proposal={proposals[selectedMom.id]}
          isPremium={!!account?.isPremium}
          messagesUsed={(messageHistory?.[selectedMom.id] || []).filter(m => m.fromUser).length}
          freeLimit={3}
          onConnect={() => handleConnect(selectedMom)}
          onMessage={() => {
            handleMessage(selectedMom);
            setSelectedMom(null);
          }}
          onSchedule={() => {
            openSchedule?.(selectedMom);
            setSelectedMom(null);
          }}
          onPropose={(proposal) => handleProposeMeetup(selectedMom, proposal)}
          onPremium={() => openPremium?.()}
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
          variant="meetup"
          joined={isJoined(selectedEvent.id)}
          interested={isSaved(`int-${selectedEvent.id}`)}
          flash={flash}
          onJoin={() => {
            const alreadyJoined = isJoined(selectedEvent.id);
            if (!alreadyJoined && requireVerify && !requireVerify('meetup', selectedEvent.title)) return;
            toggleJoined(selectedEvent.id);
          }}
          onInterested={() => {
            toggleSave(`int-${selectedEvent.id}`);
          }}
          onShare={() => setShareItem({
            title: selectedEvent.title,
            kind: selectedEvent.kind || 'Meetup',
            when: selectedEvent.when,
            place: selectedEvent.place,
            photo: selectedEvent.photo,
          })}
          onDiscuss={() => onDiscuss?.({
            type: 'meetup-chat',
            id: `meetup-chat-${selectedEvent.id}`,
            title: `${selectedEvent.title} · moms going`,
            // Chat is intentionally short-lived: the group thread should
            // close 2 days after the meetup ends. The receiving handler
            // can use this hint to gate writes / show a banner.
            expiresHint: '2 days after meetup',
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
          joinStatus={discussionJoinStatus[selectedDiscussion.id] || 'none'}
          onRequestJoin={requestJoinDiscussion}
          onLeave={leaveDiscussion}
          isPremium={!!account?.isPremium}
          openPremium={openPremium}
          onMessageMom={(mom) => { openMessage?.(mom); setSelectedDiscussion(null); }}
          onScheduleMom={(mom) => { openSchedule?.(mom); setSelectedDiscussion(null); }}
          author={chatAuthor}
          myUserId={myUserId}
          flash={flash}
          onClose={() => setSelectedDiscussion(null)}
        />
      )}
    </div>
  );
};

