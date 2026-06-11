// src/screens/MainApp/HomeTab.jsx
import { useState } from 'react';
import {
  MapPin, ChevronRight, ChevronDown, Star, Users, Bookmark,
  Music, Calendar,
} from 'lucide-react';
import { C } from '../../theme';
import { Skeleton } from '../../components/Skeleton';
import { PresenceDot } from '../../components/PresenceDot';
import { bucketActivities, pickTrendingPlaces } from '../../lib/home-feed';
import { buildAgeRail, childList } from '../../lib/age-rail';
import { profileCompletion } from '../../lib/profile-completion';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';
import { MomDetailSheet } from '../../sheets/MomDetailSheet';
import { ShareSheet } from '../../sheets/ShareSheet';

// ==========================================================================
// HomeTab — editorial landing feed.
//
//   • Greeting + "Here's what's happening near you"
//   • Local Events Nearby (horizontal scroll of 3 cards)
//   • Moms You May Want To Meet (horizontal preview cards)
//   • Upcoming Meetups (cards with host avatar overlay)
//   • Based On Your Child's Age (age-personalized programs)
//   • Continue Planning (2x2 saved-items grid)
//   • Local Favorite This Week (featured card)
//   • Verify banner (only when not verified)
// ==========================================================================

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Label a single activity — dated events show their day, recurring ones
// show their cadence.
const whenLabel = (item) => {
  if (item.startsAt) {
    const d = new Date(item.startsAt);
    return `${DOW[d.getDay()]} ${d.getDate()}${item.time ? ` · ${item.time}` : ''}`;
  }
  return item.recurring || item.time || 'Ongoing';
};

const longDateLabel = (item) => {
  if (item.startsAt) {
    const d = new Date(item.startsAt);
    return `${DOW[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}${item.time ? ` · ${item.time}` : ''}`;
  }
  return item.recurring || item.time || 'Ongoing';
};

const placePhoto = (p) => p.hero_photo || p.blob_url || p.url || null;

// -------------------------- loading skeletons --------------------------
// Each mirrors the exact footprint of the real card it stands in for, so live
// data swaps in with zero layout shift. Neutral by design (see Skeleton).

// Matches MeetupCard (width 168, 100px media + text block).
const MeetupCardSkeleton = () => (
  <div style={{
    flexShrink: 0, width: 168, background: '#fff', borderRadius: 14,
    border: `1px solid ${C.line}`, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  }}>
    <Skeleton w="100%" h={100} radius={0}/>
    <div style={{ padding: '12px 10px 10px' }}>
      <Skeleton w="85%" h={12} radius={6}/>
      <Skeleton w="55%" h={9} radius={5} style={{ marginTop: 7 }}/>
      <Skeleton w="70%" h={9} radius={5} style={{ marginTop: 7 }}/>
    </div>
  </div>
);

// Matches MomMeetCard (3-up grid cell: 72px avatar + name + sub).
const MomMeetCardSkeleton = () => (
  <div style={{
    flex: 1, minWidth: 0, background: '#fff', borderRadius: 14,
    border: `1px solid ${C.line}`, padding: '12px 8px 12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  }}>
    <Skeleton w={72} h={72} radius={36}/>
    <Skeleton w="62%" h={12} radius={6} style={{ marginTop: 8 }}/>
    <Skeleton w="84%" h={9} radius={5} style={{ marginTop: 7 }}/>
  </div>
);

// -------------------------- shared bits --------------------------

const SectionHead = ({ title, subtitle, link = 'See all', onLink }) => (
  <div style={{ marginTop: 18, marginBottom: 10 }}>
    <div className="flex items-center justify-between">
      <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700, color: C.navy, letterSpacing: '-.01em' }}>
        {title}
      </div>
      {onLink && (
        <button
          onClick={onLink}
          className="active:scale-[.98] transition-transform"
          style={{
            background: 'transparent', border: 'none', padding: 0,
            display: 'flex', alignItems: 'center', gap: 1,
            color: C.coralDeep, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {link} <ChevronRight size={11}/>
        </button>
      )}
    </div>
    {subtitle && (
      <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, marginTop: 2 }}>
        {subtitle}
      </div>
    )}
  </div>
);

// -------------------------- Mom preview card --------------------------

const MomMeetCard = ({ item, onClick }) => {
  const distance = item.distanceMi != null
    ? `${item.distanceMi.toFixed(1)} mile${item.distanceMi === 1 ? '' : 's'} away`
    : 'Near you';
  // sub-line: "16 month old · Working Mom" style. Fall back to sharedTags
  // or a short stage label.
  const subParts = [];
  if (item.kids) subParts.push(item.kids);
  else if (item.kidLabel) subParts.push(item.kidLabel);
  const tag = item.tag || item.type || (item.sharedTags && item.sharedTags[0]) || null;
  if (tag) subParts.push(tag);

  return (
    <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
      flex: 1, minWidth: 0, background: '#fff', borderRadius: 14,
      border: `1px solid ${C.line}`, boxShadow: '0 4px 12px -8px rgba(27,42,78,.25)',
      padding: '12px 8px 12px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    }}>
      <div style={{
        position: 'relative',
        width: 72, height: 72, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        border: `2px solid ${C.coralSoft}`,
        boxShadow: '0 4px 10px -6px rgba(214,68,106,.45)',
      }}>
        {item.photo
          ? <img src={item.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          : <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
            }}>{(item.firstName || item.name || '?').charAt(0).toUpperCase()}</div>}
        <PresenceDot status={item.presence} size={12} style={{ top: 0, right: 0, bottom: 'auto' }}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 800,
        color: C.navy, lineHeight: 1.1, marginTop: 8,
      }}>
        {item.firstName || (item.name || '').split(' ')[0]}
      </div>
      {subParts.length > 0 && (
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, color: C.inkSoft, marginTop: 3,
          lineHeight: 1.2,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: 22,
        }}>
          {subParts.join(' · ')}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, marginTop: 4,
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
      }}>
        {item.distanceMi != null && (
          <MapPin size={8} color={C.coralDeep} strokeWidth={2.4}/>
        )}
        <span>{distance}</span>
      </div>
    </button>
  );
};

// -------------------------- Meetup card (with host avatar) --------------------------

const MeetupCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    flexShrink: 0, width: 168, background: '#fff', borderRadius: 14,
    border: `1px solid ${C.line}`, boxShadow: '0 4px 12px -8px rgba(27,42,78,.25)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ position: 'relative', height: 100 }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: 100, background: `linear-gradient(135deg, ${C.coral}, ${C.saffron})` }}/>}
      {/* Host avatar — small circle bottom-left */}
      {item.hostPhoto && (
        <div style={{
          position: 'absolute', bottom: -8, left: 8,
          width: 26, height: 26, borderRadius: 13,
          border: '2px solid #fff', overflow: 'hidden',
          boxShadow: '0 2px 6px -3px rgba(27,42,78,.4)',
        }}>
          <img src={item.hostPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        </div>
      )}
    </div>
    <div style={{ padding: '12px 10px 10px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 800,
        color: C.navy, lineHeight: 1.15,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, color: C.inkSoft, marginTop: 3 }}>
        {item.when}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 5,
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Users size={9} color={C.coralDeep}/> {item.going} going
        </span>
        {item.mi != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MapPin size={9} color={C.muted}/> {item.mi} mi away
          </span>
        )}
      </div>
    </div>
  </button>
);

// -------------------------- Age program card --------------------------

const AgeProgramCard = ({ item, onClick }) => {
  const isEvent = item.type === 'event';
  return (
    <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
      flexShrink: 0, width: 142, background: '#fff', borderRadius: 14,
      border: `1px solid ${C.line}`, boxShadow: '0 4px 12px -8px rgba(27,42,78,.25)',
      overflow: 'hidden', padding: 0, cursor: 'pointer',
    }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: '100%', height: 88, objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: 88, background: C.lilac }}/>}
      <div style={{ padding: '8px 10px 10px' }}>
        <span style={{
          display: 'inline-block', fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
          letterSpacing: '.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 6,
          background: isEvent ? C.coralSoft : C.sage,
          color: isEvent ? C.coralDeep : C.sageDark, marginBottom: 5,
        }}>
          {isEvent ? 'Event' : 'Place'}
        </span>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800,
          color: C.navy, lineHeight: 1.15,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.name}
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 3 }}>
          {item.reason || (isEvent ? item.when : item.ageLabel)}
        </div>
        {(isEvent ? item.when : item.distance) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, marginTop: 4,
            fontFamily: 'Albert Sans', fontSize: 9, color: C.inkSoft,
          }}>
            <MapPin size={9} color={C.muted}/> {isEvent ? item.when : item.distance}
          </div>
        )}
      </div>
    </button>
  );
};

// -------------------------- Continue Planning tile --------------------------

const CONTINUE_TYPE_META = {
  meetup:  { Icon: Calendar,       bg: C.coralSoft, fg: C.coralDeep, label: 'Saved Meetup' },
  place:   { Icon: MapPin,         bg: '#D6E6F4',   fg: '#2F6DA8',   label: 'Saved Place'  },
  mom:     { Icon: Users,          bg: C.sage,      fg: C.sageDark,  label: 'Saved Mom'    },
  program: { Icon: Music,          bg: '#FBE2C7',   fg: '#B36A1D',   label: 'Saved Program'},
};

const ContinuePlanTile = ({ item, onClick }) => {
  const meta = CONTINUE_TYPE_META[item.type] || CONTINUE_TYPE_META.place;
  const { Icon, bg, fg, label } = meta;
  return (
    <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
      flex: 1, background: '#fff', border: `1px solid ${C.line}`,
      borderRadius: 12, padding: '10px 11px',
      display: 'flex', alignItems: 'center', gap: 9,
      boxShadow: '0 3px 9px -7px rgba(27,42,78,.25)', cursor: 'pointer',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14}/>
      </div>
      <div style={{ minWidth: 0, textAlign: 'left' }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 800,
          color: C.muted, letterSpacing: '.02em', lineHeight: 1,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800,
          color: C.navy, marginTop: 3, lineHeight: 1.1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title}
        </div>
      </div>
    </button>
  );
};

// -------------------------- Local Favorite featured card --------------------------

const LocalFavoriteCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    width: '100%', background: '#fff', border: `1px solid ${C.line}`,
    borderRadius: 16, padding: 0, overflow: 'hidden', cursor: 'pointer',
    display: 'flex', alignItems: 'stretch', gap: 0,
    boxShadow: '0 6px 16px -10px rgba(27,42,78,.3)',
  }}>
    <div style={{
      width: 108, flexShrink: 0,
      background: placePhoto(item) ? `url(${placePhoto(item)})` : C.lilac,
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}/>
    <div style={{ flex: 1, padding: '12px 12px 12px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 14, fontWeight: 700,
          color: C.navy, letterSpacing: '-.01em', lineHeight: 1.15,
        }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
          {item.rating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700, color: C.navy }}>
              <Star size={10} fill={C.saffron} color={C.saffron}/>
              {item.rating}
              {item.review_count != null && <span style={{ fontWeight: 500, color: C.muted }}>({item.review_count})</span>}
            </div>
          )}
          {item.when && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700, color: C.sageDark }}>
              {item.when}
            </div>
          )}
          {item.distance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'Albert Sans', fontSize: 10, color: C.muted }}>
              <MapPin size={10}/> {item.distance}
            </div>
          )}
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.inkSoft, marginTop: 6, lineHeight: 1.3 }}>
          {item.tagline || 'Most loved place by Tampa moms this week'}
        </div>
      </div>
      <div style={{
        display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 2,
        background: C.coralDeep, color: '#fff',
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
        padding: '5px 11px', borderRadius: 999, marginTop: 8,
      }}>
        Learn More <ChevronRight size={11}/>
      </div>
    </div>
  </button>
);

// -------------------------- screen --------------------------

export const HomeTab = ({
  thisWeek = [], events = [],
  places = null, nearbyMoms = [],
  nearbyLoading = false, eventsLoading = false,
  savedItems = [], goingItems = [], setGoingItems,
  joinedEvents = [], setJoinedEvents, setSavedItems,
  profile, flash, openMessage, openSchedule,
  goToPlaces, goToActivities, goToMeetups, goToKidsPrograms,
  goToConnectMoms, onVerify, openVillage,
  location,
  city = 'Tampa',
  locationLabel, openLocation,
  localFavorite = null,
  onDiscuss,
}) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedMom, setSelectedMom] = useState(null);
  const [invited, setInvited] = useState({});
  const [shareItem, setShareItem] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [proposals, setProposals] = useState({});
  const [ageChild, setAgeChild] = useState(null); // null = All

  void invited; void setInvited;

  // ---- data assembly ----

  // Activities — dated + recurring, deduped. Used by hero + meetup data.
  const buckets = bucketActivities(thisWeek, events, new Date(), profile);
  const seenActivity = new Set();
  const activities = [...buckets.month, ...buckets.others].filter((a) => {
    if (seenActivity.has(a.id)) return false;
    seenActivity.add(a.id);
    return true;
  });

  // "3 fun things happening near you" — exactly 3 horizontally-scrolling
  // cards, same MeetupCard shape as the Upcoming Meetups row below. Live
  // activities when available, else synthetic fallbacks so the surface
  // always reads complete.
  const FUN_THINGS_FALLBACK = [
    {
      id: 'ft-1', title: 'Saturday Splash Pad Meetup',
      when: 'Sat, May 27 · 9:30 AM', going: 12, mi: 0.5,
      photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
    },
    {
      id: 'ft-2', title: 'Music Together Class',
      when: 'Tue, May 30 · 10:00 AM', going: 8, mi: 1.2,
      photo: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&auto=format&fit=crop',
    },
    {
      id: 'ft-3', title: 'Zoo Tampa Family Day',
      when: 'Sun, May 25 · 11:00 AM', going: 22, mi: 2.0,
      photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
    },
  ];
  const funThings = activities.length >= 3
    ? activities.slice(0, 3).map((a, i) => ({
        id: a.id,
        title: a.name,
        when: longDateLabel(a),
        going: a.going ?? FUN_THINGS_FALLBACK[i].going,
        mi: a.mi,
        photo: a.photo || FUN_THINGS_FALLBACK[i].photo,
        place: a.place,
      }))
    : FUN_THINGS_FALLBACK;

  // Moms You May Want To Meet — already match-ranked by the API
  // (/api/mom-profiles/nearby → scoreMom). Render in that order; do NOT re-sort
  // by distance (that discarded the match ranking).
  const moms = [...nearbyMoms];

  // Upcoming meetups — synthesized for the home preview. Real list lives in
  // Explore → Meetups; "See all" routes there.
  const UPCOMING_MEETUPS = [
    {
      id: 'um-1', title: 'Coffee Walk',
      when: 'Sat, May 25 · 9:30 AM', going: 5, mi: 0.4,
      photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop',
      hostPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop',
      place: 'Buddy Brew · Hyde Park',
    },
    {
      id: 'um-2', title: 'Stroller Walk',
      when: 'Wed, May 28 · 10:00 AM', going: 8, mi: 1.2,
      photo: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&auto=format&fit=crop',
      hostPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop',
      place: 'Bayshore Boulevard',
    },
    {
      id: 'um-3', title: 'Splash Pad Meetup',
      when: 'Sat, May 31 · 11:00 AM', going: 12, mi: 0.5,
      photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
      hostPhoto: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&auto=format&fit=crop',
      place: 'Curtis Hixon Park',
    },
  ];

  // Based On Your Child's Age — real, kid-age-ranked places + events.
  const ageKids = childList(profile);
  const ageRailAll = buildAgeRail(profile, places, { thisWeek, events }, { limit: 12 });
  const ageRail = ageChild == null
    ? ageRailAll
    : ageRailAll.filter((it) => it.forChild.includes(ageChild));

  // Continue Planning — 4 slots: meetup, place, mom, program. Real saved
  // items from the App would populate this; we synthesize for the home preview.
  const CONTINUE = [
    { id: 'cp-1', type: 'meetup',  title: 'Coffee Walk' },
    { id: 'cp-2', type: 'place',   title: "Glazer Children's Museum" },
    { id: 'cp-3', type: 'mom',     title: 'Sarah' },
    { id: 'cp-4', type: 'program', title: 'Music Together' },
  ];

  // Feature this week — admin-curated for the week (via /api/local-favorite).
  // The favorite can be either a place OR an event — `localFavorite.kind` tells
  // us which, and we shape the rendered card + click handler accordingly.
  // Falls back to the top trending place when no admin pick exists.
  const liveTrending = pickTrendingPlaces(places, 8, profile);
  const LOCAL_FAVORITE_FALLBACK = {
    id: 'lf-1', name: "Glazer Children's Museum",
    rating: 4.8, review_count: 450, distance: '1.4 miles',
    hero_photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=600&auto=format&fit=crop',
    tagline: `Most loved place by ${city || 'Tampa'} moms this week`,
    kind: 'place',
  };
  const favoriteCard = (() => {
    if (localFavorite?.kind === 'event') {
      return {
        kind: 'event',
        id: `wf-event-${localFavorite.event_id}`,
        event_id: localFavorite.event_id,
        name: localFavorite.name,
        hero_photo: localFavorite.hero_photo,
        distance: localFavorite.place_name || localFavorite.area || '',
        when: [localFavorite.day_of_week, localFavorite.time_label].filter(Boolean).join(' · '),
        tagline: `Featured ${localFavorite.event_type || 'event'} in ${localFavorite.city || city || 'Tampa'} this week`,
      };
    }
    if (localFavorite) {
      return {
        kind: 'place',
        id: `wf-${localFavorite.place_id}`,
        place_id: localFavorite.place_id,
        name: localFavorite.name,
        rating: localFavorite.rating,
        review_count: localFavorite.review_count,
        hero_photo: localFavorite.hero_photo,
        distance: localFavorite.area || '',
        tagline: `Most loved place by ${localFavorite.city || city || 'Tampa'} moms this week`,
      };
    }
    if (liveTrending[0]) {
      return { ...liveTrending[0], kind: 'place', distance: liveTrending[0].distance || '1.4 miles',
        tagline: `Most loved place by ${city || 'Tampa'} moms this week` };
    }
    return LOCAL_FAVORITE_FALLBACK;
  })();

  const isSaved      = (id) => savedItems.includes(id);
  const isGoing      = (id) => goingItems.includes(id);
  const isJoined     = (id) => joinedEvents.includes(id);
  const toggleSave   = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleGoing  = (id) => setGoingItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleJoined = (id) => setJoinedEvents?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openMeetup = (m) => setSelectedEvent({
    id: m.id, title: m.title, photo: m.photo,
    when: m.when, place: m.place,
    distance: m.mi != null ? `${m.mi} mi away` : 'Near you',
    tags: [], kind: 'Meetup',
  });
  const openPlace = (p) => setSelectedPlace({
    id: p.id, title: p.name, photo: placePhoto(p),
    rating: p.rating, reviews: p.review_count,
    tag: p.area || p.city, distance: p.distance || 'Near you', kind: 'Place',
  });
  const continueRoute = (item) => {
    if (item.type === 'meetup' && goToMeetups)       goToMeetups();
    else if (item.type === 'place' && goToPlaces)    goToPlaces();
    else if (item.type === 'mom' && goToConnectMoms) goToConnectMoms();
    else if (item.type === 'program' && (goToKidsPrograms || goToPlaces)) {
      (goToKidsPrograms || goToPlaces)();
    } else if (openVillage) {
      openVillage();
    }
  };

  // Profile completion — same source of truth as YouTab's progress bar.
  const completion = profileCompletion(profile, location);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 4, paddingBottom: 16 }}>

        {/* Location row — Eventbrite-style. Full-width rounded field with a
            pin, the city label in medium-weight gray, and a chevron. The
            border + paper fill make it read as a tappable input. Anchors
            the whole feed — tapping it opens LocationSheet. */}
        <button
          onClick={openLocation}
          aria-label="Change your location"
          className="active:scale-[.99] transition-transform"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: C.paper, border: `1px solid ${C.divider}`,
            borderRadius: 12, padding: '10px 14px',
            marginTop: 4, cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)',
          }}
        >
          <MapPin size={17} color={C.inkSoft} strokeWidth={2}/>
          <span style={{
            flex: 1, minWidth: 0,
            fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 500,
            color: C.inkSoft, letterSpacing: '-.005em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {locationLabel || `${city || 'Tampa'}, FL`}
          </span>
          <ChevronDown size={17} color={C.inkSoft} strokeWidth={2}/>
        </button>

        {/* Complete-your-profile pull card — only while there's something
            left to finish. Tapping jumps to the Profile tab to finish.
            Shares the completion source of truth with YouTab's bar. */}
        {completion.pct < 100 && (
          <button
            onClick={onVerify}
            className="active:scale-[.99] transition-transform"
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              marginTop: 10, background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 16, padding: 14,
            }}
          >
            <div className="flex items-center justify-between">
              <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800, color: C.navy }}>
                Complete your profile
              </div>
              <div className="flex items-center" style={{ gap: 4 }}>
                <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 800, color: C.coralDeep }}>
                  {completion.pct}%
                </span>
                <ChevronRight size={15} color={C.coralDeep}/>
              </div>
            </div>
            <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: C.coralSoft, overflow: 'hidden' }}>
              <div style={{
                width: `${completion.pct}%`, height: '100%', borderRadius: 999,
                background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`, transition: 'width .3s ease-out',
              }}/>
            </div>
            <div style={{ marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11, color: C.muted }}>
              {completion.done} of {completion.total} done · finish so moms can find you.
            </div>
          </button>
        )}

        {/* Local Events Nearby — live dated events (fallback only when empty);
            same MeetupCard shape as the Upcoming Meetups row below. */}
        <SectionHead title="Local Events Nearby" onLink={goToActivities}/>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 6 }}>
          {eventsLoading
            ? [0, 1, 2].map(i => <MeetupCardSkeleton key={i}/>)
            : funThings.map(it => (
                <MeetupCard key={it.id} item={it} onClick={() => openMeetup(it)}/>
              ))}
        </div>

        {/* Moms You May Want To Meet — 3-up grid, match-ranked */}
        <SectionHead title="Moms You May Want To Meet" onLink={goToConnectMoms}/>
        {nearbyLoading ? (
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {[0, 1, 2].map(i => <MomMeetCardSkeleton key={i}/>)}
          </div>
        ) : moms.length > 0 ? (
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {moms.slice(0, 3).map(m => (
              <MomMeetCard key={m.id} item={m} onClick={() => setSelectedMom(m)}/>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14,
            padding: '18px 16px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: C.navy }}>
              Your <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>village</span> is forming
            </div>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.35 }}>
              Finishing your profile helps nearby moms find you.
            </div>
            <button onClick={onVerify} className="active:scale-[.98] transition-transform" style={{
              marginTop: 10, background: C.coralDeep, color: '#fff', border: 'none',
              borderRadius: 999, padding: '7px 16px', fontFamily: 'Albert Sans',
              fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
            }}>
              Complete profile
            </button>
          </div>
        )}

        {/* Upcoming Meetups */}
        <SectionHead title="Upcoming Meetups" onLink={goToMeetups || goToActivities}/>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 6 }}>
          {UPCOMING_MEETUPS.map(m => (
            <MeetupCard key={m.id} item={m} onClick={() => openMeetup(m)}/>
          ))}
        </div>

        {/* Based On Your Child's Age — per-child filterable, places + events */}
        {ageKids.length > 0 && ageRailAll.length > 0 && (
          <>
            <SectionHead
              title="Based On Your Child's Age"
              onLink={goToKidsPrograms || goToPlaces}
            />
            {ageKids.length > 1 && (
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 8 }}>
                {[{ label: 'All', idx: null }, ...ageKids.map((k, i) => ({ label: k.label, idx: i }))].map((chip) => {
                  const active = ageChild === chip.idx;
                  return (
                    <button key={`${chip.label}-${chip.idx}`} onClick={() => setAgeChild(chip.idx)}
                      className="active:scale-[.97] transition-transform"
                      style={{
                        flexShrink: 0, padding: '6px 13px', borderRadius: 999,
                        background: active ? C.coral : C.paper,
                        color: active ? '#fff' : C.navy,
                        border: `1px solid ${active ? C.coral : C.divider}`,
                        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                        whiteSpace: 'nowrap', cursor: 'pointer',
                      }}>
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {ageRail.map((p) => (
                <AgeProgramCard key={`${p.type}-${p.id}`} item={p}
                  onClick={() => (p.type === 'event'
                    ? openMeetup({ id: p.id, title: p.name, photo: p.photo, when: p.when, mi: null })
                    : openPlace({ ...p, hero_photo: p.photo }))}/>
              ))}
            </div>
          </>
        )}

        {/* Continue Planning — 2x2 grid */}
        <SectionHead title="Continue Planning"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CONTINUE.map(it => (
            <ContinuePlanTile key={it.id} item={it} onClick={() => continueRoute(it)}/>
          ))}
        </div>

        {/* Feature this week — smart: opens place or event detail depending
            on what the admin pinned. */}
        <SectionHead title="Feature this week"/>
        <LocalFavoriteCard item={favoriteCard} onClick={() => {
          if (favoriteCard.kind === 'event') {
            openMeetup({
              id: favoriteCard.event_id || favoriteCard.id,
              title: favoriteCard.name,
              photo: favoriteCard.hero_photo,
              when: favoriteCard.when,
              mi: null,
              place: favoriteCard.distance,
            });
          } else {
            openPlace(favoriteCard);
          }
        }}/>

        {/* Saved-spots summary — only when something is saved */}
        {savedItems.length > 0 && (
          <>
            <SectionHead title="Your saved spots" link="My Village" onLink={openVillage}/>
            <button
              onClick={openVillage}
              className="active:scale-[.99] transition-transform"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: C.coralSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bookmark size={16} color={C.coralDeep}/>
              </div>
              <div style={{ flex: 1, textAlign: 'left', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, color: C.navy }}>
                {savedItems.length} saved {savedItems.length === 1 ? 'item' : 'items'}
                <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, marginTop: 1 }}>Open My Village to view them all</div>
              </div>
              <ChevronRight size={16} color={C.muted}/>
            </button>
          </>
        )}

      </div>

      {selectedEvent && (
        <EventDetailSheet
          fullScreen
          event={selectedEvent}
          variant="event"
          joined={isJoined(selectedEvent.id)}
          interested={isGoing(selectedEvent.id)}
          flash={flash}
          onJoin={() => toggleJoined(selectedEvent.id)}
          onInterested={() => toggleGoing(selectedEvent.id)}
          onShare={() => setShareItem({
            title: selectedEvent.title, kind: selectedEvent.kind || 'Event',
            when: selectedEvent.when, place: selectedEvent.place, photo: selectedEvent.photo,
          })}
          onDiscuss={() => onDiscuss?.({
            type: 'event-chat',
            id: `event-chat-${selectedEvent.id}`,
            title: `${selectedEvent.title} · moms going`,
            expiresHint: '2 days after the event',
          })}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedPlace && (
        <PlaceDetailSheet
          fullScreen
          place={selectedPlace}
          saved={isSaved(selectedPlace.id)}
          interested={isGoing(selectedPlace.id)}
          onSave={() => {
            toggleSave(selectedPlace.id);
            flash?.(isSaved(selectedPlace.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onInterested={() => {
            toggleGoing(selectedPlace.id);
            flash?.(isGoing(selectedPlace.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onShare={() => setShareItem({
            title: selectedPlace.title, kind: selectedPlace.kind || 'Place',
            place: selectedPlace.distance, photo: selectedPlace.photo,
          })}
          onDirections={() => flash?.('Opening directions…')}
          onDiscuss={() => onDiscuss?.({ type: 'place', id: selectedPlace.id, title: selectedPlace.title })}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {selectedMom && (
        <MomDetailSheet
          fullScreen
          mom={selectedMom}
          saved={isSaved(`mom-${selectedMom.id}`)}
          invited={!!invited[selectedMom.id]}
          connectionStatus={connectionStatus[selectedMom.id] || 'none'}
          onConnect={() => {
            const id = selectedMom.id;
            if (connectionStatus[id] && connectionStatus[id] !== 'none') return;
            setConnectionStatus(s => ({ ...s, [id]: 'pending' }));
            flash?.(`✦ Connection request sent to ${selectedMom.name}`);
            setTimeout(() => {
              setConnectionStatus(s =>
                s[id] === 'pending' ? { ...s, [id]: 'accepted' } : s,
              );
              flash?.(`✦ ${selectedMom.name} accepted your connection`);
            }, 2500);
          }}
          onMessage={() => { openMessage?.(selectedMom); setSelectedMom(null); }}
          onSchedule={() => { openSchedule?.(selectedMom); setSelectedMom(null); }}
          proposal={proposals[selectedMom.id]}
          onPropose={(p) => {
            setProposals(prev => ({ ...prev, [selectedMom.id]: p }));
            flash?.(`✦ Proposal sent to ${selectedMom.name.split(' ')[0]} · ${p.day} ${p.time}${p.place ? ` @ ${p.place}` : ''}`);
          }}
          onSave={() => {
            const key = `mom-${selectedMom.id}`;
            toggleSave(key);
            flash?.(isSaved(key) ? `Removed ${selectedMom.name} from saved` : `✦ Saved ${selectedMom.name}`);
          }}
          onShare={() => setShareItem({
            title: `${selectedMom.name}'s profile`, kind: 'Mom profile',
            place: selectedMom.distance, photo: selectedMom.photo,
          })}
          onClose={() => setSelectedMom(null)}
        />
      )}

      {shareItem && (
        <ShareSheet item={shareItem} flash={flash} onClose={() => setShareItem(null)}/>
      )}
    </div>
  );
};
