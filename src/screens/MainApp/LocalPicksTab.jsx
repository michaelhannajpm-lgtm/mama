import { useEffect, useMemo, useState } from 'react';
import {
  MapPin, School, Brain, Star,
  Music, Activity, Sparkles, ChevronRight,
  HeartHandshake, Stethoscope, Users,
  ShieldCheck, Palette, BookOpen,
  Tent, Trees, CalendarDays, Clock,
  Bookmark, Check,
  Search, Calendar, GraduationCap, Heart, Backpack,
} from 'lucide-react';
import { C } from '../../theme';
import { Skeleton } from '../../components/Skeleton';
import { PlacesFilterSheet, PLACES_FILTER_DEFAULT } from '../../sheets/PlacesFilterSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { SeeAllSheet } from '../../sheets/SeeAllSheet';
import { ShareSheet } from '../../sheets/ShareSheet';
import { RateSheet } from '../../sheets/RateSheet';
import { GroupDiscussionSheet } from '../../sheets/GroupDiscussionSheet';
import { TAMPA_BAY_AREAS } from '../../data/tampa-bay-areas';
import { GROUP_DISCUSSIONS } from '../../data/discussions';
import { eventToExploreCard, rankEvents } from '../../lib/event-cards';
import { scorePlace } from '../../lib/content-score';

// ==========================================================================
// LocalPicksTab — the "Explore" surface (file kept, exported as
// LocalPicksTab and rendered when the Explore tab is active).
//
//   Sections (in order):
//     1. Events                  — recurring + one-off group activities
//     2. Meetups                 — small mom-led playdates
//     3. Top local picks         — curated nearby spots
//     4. Kids programs           — classes + camps
//     5. Schools & childcare     — preschools, daycares, K-8
//     6. Health & wellness       — pediatric, mental, postpartum
//
//   Each section shows ~2.2 cards horizontally (peek of the next card to
//   hint scrollability). A coral "Explore more using advanced filters"
//   CTA at the bottom opens PlacesFilterSheet.
// ==========================================================================

// Section metadata — declarative list driving the render loop and the Category
// filter. `items`/`allItems` are filled at render time from LIVE data only
// (events from /api/events, places from /api/places). No hardcoded catalogs.
const SECTIONS = [
  { key: 'events',  title: 'Events',              kind: 'event',   seeAllSubtitle: 'Events + meetups · this week' },
  { key: 'meetups', title: 'Meetups',             kind: 'event',   seeAllSubtitle: 'Small, informal, mom-led' },
  { key: 'places',  title: 'Top local picks',     kind: 'photo',   seeAllSubtitle: 'Top rated near you' },
  { key: 'kids',    title: 'Kids programs',       kind: 'program', seeAllSubtitle: 'Programs & camps' },
  { key: 'schools', title: 'Schools & childcare', kind: 'school',  seeAllSubtitle: 'Options within 5 mi' },
  { key: 'health',  title: 'Health & wellness',   kind: 'photo',   seeAllSubtitle: 'Pediatric, mental, postpartum' },
];

// Section key → the key buildLiveSections() returns its rows under. Kids
// programs live under `extras` (extracurricular + camps); the rest match 1:1.
// Events/meetups are sourced separately (from /api/events), not from here.
const LIVE_SECTION_KEY = {
  places:  'places',
  kids:    'extras',
  schools: 'schools',
  health:  'health',
};

// Map section keys to filter Category labels for filtering visibility.
const SECTION_CATEGORY = {
  events:  'Events',
  meetups: 'Meetups',
  places:  'Top local picks',
  kids:    'Kids programs',
  schools: 'Schools & childcare',
  health:  'Health & wellness',
};

// Only data-backed quick filters (wired in quickFilterMatch). Unbacked chips
// like Rainy day / Live events / Waitlist / Mental / Postpartum were removed.
const QUICK_FILTERS_BY_SECTION = {
  events: [
    { id: 'thisweek',    label: 'This week',    icon: CalendarDays },
    { id: 'thisweekend', label: 'This weekend'                      },
    { id: 'free',        label: 'Free'                               },
    { id: 'meetups',     label: 'Meetups',      icon: Users          },
  ],
  meetups: [
    { id: 'small',       label: 'Small (≤6)',   icon: Users   },
    { id: 'thisweek',    label: 'This week',    icon: Clock   },
    { id: 'thisweekend', label: 'This weekend'                 },
    { id: 'near5',       label: '< 5 mi',       icon: MapPin  },
  ],
  places: [
    { id: 'free',     label: 'Free'                                 },
    { id: 'indoor',   label: 'Indoor'                               },
    { id: 'outdoor',  label: 'Outdoor'                              },
    { id: 'stroller', label: 'Stroller-friendly', icon: ShieldCheck },
  ],
  // Mirrors the last 3 stages from onboarding's "What stage are you in?".
  kids: [
    { id: 'schoolage', label: 'School-age', icon: BookOpen },
    { id: 'tween',     label: 'Tween',      icon: Users    },
    { id: 'teen',      label: 'Teen',       icon: Sparkles },
  ],
  schools: [
    { id: 'top',  label: 'Top rated', icon: Star  },
    { id: 'near', label: 'Near me',   icon: MapPin },
  ],
  // Each chip maps to a single _health sub-category.
  health: [
    { id: 'wellness',     label: 'Wellness',      icon: HeartHandshake },
    { id: 'pediatricians',label: 'Pediatricians', icon: Stethoscope    },
    { id: 'therapists',   label: 'Therapists',    icon: Brain          },
    { id: 'dentists',     label: 'Dentists',      icon: Sparkles       },
  ],
};

// -------------------------- shared --------------------------

const SectionHead = ({ title, link = 'See all', onLink }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 14, marginBottom: 10 }}>
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

// Loading shell for one Explore section: a title bar + a horizontal row of card
// placeholders sized like the real 45%-width cards (≈96px media + 2 text lines),
// so live picks swap in without the layout jumping.
const LpCardSkeleton = () => (
  <div style={{
    background: '#fff', borderRadius: 12, border: `1px solid ${C.line}`,
    overflow: 'hidden', width: '100%',
  }}>
    <Skeleton w="100%" h={96} radius={0}/>
    <div style={{ padding: '8px 10px 10px' }}>
      <Skeleton w="90%" h={11} radius={5}/>
      <Skeleton w="60%" h={10} radius={5} style={{ marginTop: 7 }}/>
    </div>
  </div>
);

const SectionSkeleton = () => (
  <div className="px-5">
    <div style={{ marginTop: 14, marginBottom: 10 }}>
      <Skeleton w={150} h={15} radius={7}/>
    </div>
    <div className="flex" style={{ gap: 10, overflow: 'hidden', paddingBottom: 4 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ flex: '0 0 45%', display: 'flex' }}>
          <LpCardSkeleton/>
        </div>
      ))}
    </div>
  </div>
);


// SaveBadge — bookmark overlay on the photo. Rendered when the parent
// supplies onSave; outer card stays a <button> for keyboard a11y, so the
// badge is a <div role="button"> (no nested <button>) with stopPropagation
// so a tap doesn't also open the detail sheet.
const SaveBadge = ({ saved, onClick }) => (
  <div
    role="button"
    aria-label={saved ? 'Remove from saved' : 'Save'}
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    style={{
      position: 'absolute', top: 6, right: 6,
      width: 28, height: 28, borderRadius: 14,
      background: 'rgba(255,255,255,.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(27,42,78,.2)',
    }}
  >
    <Bookmark
      size={14}
      color={saved ? C.coralDeep : C.navy}
      fill={saved ? C.coralDeep : 'none'}
      strokeWidth={2}
    />
  </div>
);

// GoingButton — "I'm going" CTA at the bottom of Event / Meetup cards in
// SeeAll views. Flips to a sage "Going" state once tapped. Same stop-prop
// trick as SaveBadge.
const GoingButton = ({ going, onClick }) => (
  <div
    role="button"
    aria-label={going ? 'Cancel RSVP' : 'I am going'}
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    style={{
      marginTop: 8, height: 32, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      background: going ? C.sage : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
      color: going ? C.sageDark : '#fff',
      border: going ? `1px solid ${C.sageDark}` : 'none',
      cursor: 'pointer',
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11.5,
    }}
  >
    {going ? <><Check size={12}/> I'm going</> : "I'm going"}
  </div>
);

// RateButton — "Rate" CTA at the bottom of Place / Program / School cards
// in SeeAll views. Shows the user's current rating when they've rated.
const RateButton = ({ rating, onClick }) => (
  <div
    role="button"
    aria-label="Rate this place"
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    style={{
      marginTop: 8, height: 32, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      background: rating > 0 ? C.saffron : C.paper,
      color: rating > 0 ? '#fff' : C.navy,
      border: rating > 0 ? 'none' : `1px solid ${C.divider}`,
      cursor: 'pointer',
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11.5,
    }}
  >
    {rating > 0
      ? <><Star size={12} fill="#fff" color="#fff"/> {rating} / 5</>
      : <><Star size={12} color={C.saffron} fill={C.saffron}/> Rate</>}
  </div>
);

// Event card — photo + name + when + going count + distance. Used for
// both Events and Meetups (same shape, different data sets).
const EventCard = ({ item, onClick, saved, onSave, going, onGoing }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
    width: '100%', height: '100%',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 96, objectFit: 'cover', display: 'block',
      }}/>
      {onSave && <SaveBadge saved={saved} onClick={onSave}/>}
    </div>
    <div style={{ padding: '8px 10px 10px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.25,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: 31,
      }}>
        {item.title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginTop: 5,
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, color: C.coralDeep,
      }}>
        <Clock size={10}/> {item.when}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
        fontFamily: 'Albert Sans', fontSize: 10, color: C.muted,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Users size={10}/> {item.going} going
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MapPin size={10}/> {item.distance}
        </span>
      </div>
      {onGoing && <GoingButton going={going} onClick={onGoing}/>}
    </div>
  </button>
);

const PhotoCard = ({ item, onClick, saved, onSave, myRating, onRate }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
    width: '100%', height: '100%',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 96, objectFit: 'cover', display: 'block',
      }}/>
      {onSave && <SaveBadge saved={saved} onClick={onSave}/>}
    </div>
    <div style={{ padding: '8px 10px 10px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.25,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 31,
      }}>
        {item.title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginTop: 5,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy,
      }}>
        {item.rating != null && (
          <>
            <Star size={11} fill={C.saffron} color={C.saffron}/>
            {item.rating}
          </>
        )}
        <span style={{
          fontWeight: 500, color: C.muted, marginLeft: item.rating != null ? 4 : 0,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={10}/> {item.distance}
        </span>
      </div>
      {onRate && <RateButton rating={myRating} onClick={onRate}/>}
    </div>
  </button>
);

const ProgramCard = ({ item, onClick, saved, onSave, myRating, onRate }) => {
  const Icon = item.Icon;
  return (
    <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
      background: '#fff', borderRadius: 12,
      border: `1px solid ${C.line}`,
      boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
      overflow: 'hidden',
      padding: 0, cursor: 'pointer',
      width: '100%', height: '100%',
    }}>
      <div style={{ position: 'relative' }}>
        {item.photo ? (
          <img src={item.photo} alt="" style={{
            width: '100%', height: 96, objectFit: 'cover', display: 'block',
          }}/>
        ) : (
          <div style={{
            height: 96, background: item.bg, color: item.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={36}/>
          </div>
        )}
        {onSave && <SaveBadge saved={saved} onClick={onSave}/>}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
          color: C.navy, lineHeight: 1.25,
        }}>
          {item.title}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 4,
        }}>
          {item.ages}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, marginTop: 4,
          fontFamily: 'Albert Sans', fontSize: 11, color: C.muted,
        }}>
          <MapPin size={10}/> {item.distance}
        </div>
        {onRate && <RateButton rating={myRating} onClick={onRate}/>}
      </div>
    </button>
  );
};

const SchoolCard = ({ item, onClick, saved, onSave, myRating, onRate }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
    width: '100%', height: '100%',
  }}>
    <div style={{ position: 'relative' }}>
      <img src={item.photo} alt="" style={{
        width: '100%', height: 96, objectFit: 'cover', display: 'block',
      }}/>
      {onSave && <SaveBadge saved={saved} onClick={onSave}/>}
    </div>
    <div style={{ padding: '8px 10px 10px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.25,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 31,
      }}>
        {item.title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginTop: 5,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy,
      }}>
        {item.rating != null && (
          <>
            <Star size={11} fill={C.saffron} color={C.saffron}/>
            {item.rating}
          </>
        )}
        <span style={{
          fontWeight: 500, color: C.muted, marginLeft: item.rating != null ? 4 : 0,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={10}/> {item.distance}
        </span>
      </div>
      <div style={{
        marginTop: 6, display: 'inline-block',
        background: item.tagBg, color: item.tagFg,
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
        padding: '2px 7px', borderRadius: 5,
      }}>
        {item.tag}
      </div>
      {onRate && <RateButton rating={myRating} onClick={onRate}/>}
    </div>
  </button>
);

// ---------------------- live data adapter ----------------------
// Map live DB place rows (from /api/places, grouped by category) into the card
// shapes this tab renders, AND carry the source row (`_live`) so the detail
// sheet can show the enriched data (description, amenities, hours, address,
// age, tags, …). Photos use the real hero_photo (Google/blob) with a
// per-category stock image only as a fallback when hero_photo is null.

const LIVE_FALLBACK_PHOTO = {
  fun:       'https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=400&auto=format&fit=crop',
  sports:    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&auto=format&fit=crop',
  schools:   'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&auto=format&fit=crop',
  childcare: 'https://images.unsplash.com/photo-1587653263995-422546a7a569?w=400&auto=format&fit=crop',
  health:    'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=400&auto=format&fit=crop',
  wellness:  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&auto=format&fit=crop',
};

const LIVE_PROGRAM_STYLE = {
  extracurricular: { Icon: Palette, bg: C.coralSoft, fg: C.coralDeep },
  camps:           { Icon: Tent,    bg: C.sage,      fg: C.sageDark  },
};

const liveAgeLabel = (min, max) => {
  if (min == null && max == null) return 'All ages';
  if (min != null && max != null) return `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  return `Ages 0–${max}`;
};

const cardId = (row) => row.slug || row.id;
const livePhoto = (row) => row.hero_photo || LIVE_FALLBACK_PHOTO[row.category] || LIVE_FALLBACK_PHOTO.fun;

// Distance label: real miles from the user's coords when available, else area.
const cardDistanceStr = (row, userCoords) => {
  if (userCoords && row.lat != null && row.lng != null) {
    const mi = haversineMi(userCoords.lat, userCoords.lng, row.lat, row.lng);
    return mi < 0.1 ? 'Nearby' : `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
  }
  return row.area || row.city || 'Tampa';
};

// Resolve a place_photos row to a usable URL: durable blob → stored url →
// key-safe Google proxy.
const resolvePhotoUrl = (p) =>
  p.blob_url || p.url || (p.google_ref ? `/api/places/photo?ref=${encodeURIComponent(p.google_ref)}` : null);

// All photos for a place, hero first then sort_order; falls back to hero_photo.
const livePhotos = (row) => {
  const list = (row.place_photos || []).slice()
    .sort((a, b) => (b.is_hero ? 1 : 0) - (a.is_hero ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0));
  const urls = list.map(resolvePhotoUrl).filter(Boolean);
  if (urls.length) return urls;
  return row.hero_photo ? [row.hero_photo] : [];
};

const livePhotoCard = (row, userCoords) => ({
  id: cardId(row), title: row.name,
  rating: typeof row.rating === 'number' && row.rating > 0 ? row.rating : undefined,
  distance: cardDistanceStr(row, userCoords),
  photo: livePhoto(row),
  _live: row,
});

const liveSchoolCard = (row, userCoords) => ({
  ...livePhotoCard(row, userCoords),
  tag: (Array.isArray(row.tags) && row.tags[0]) || 'Enrolling',
  tagBg: C.sage, tagFg: C.sageDark,
});

const liveProgramCard = (row, userCoords) => {
  const style = LIVE_PROGRAM_STYLE[row.category] || LIVE_PROGRAM_STYLE.extracurricular;
  return {
    id: cardId(row), title: row.name,
    ages: liveAgeLabel(row.age_min, row.age_max),
    distance: cardDistanceStr(row, userCoords),
    photo: livePhoto(row),
    Icon: style.Icon, bg: style.bg, fg: style.fg,
    _live: row,
  };
};

// amenities jsonb { parking:true, … } → labeled array for PlaceDetailSheet.
const AMENITY_LABELS = {
  parking: 'Parking', restrooms: 'Restrooms', stroller_friendly: 'Stroller-friendly',
  nursing_room: 'Nursing room', food: 'Café', indoor: 'Indoor', outdoor: 'Outdoor',
};
const amenitiesToArray = (am) =>
  am && typeof am === 'object' ? Object.keys(AMENITY_LABELS).filter(k => am[k] === true).map(k => AMENITY_LABELS[k]) : [];

// Rich PlaceDetailSheet input built from a live row (+ kind-specific extras).
const liveDetail = (row, kind, extra = {}, userCoords) => {
  const amen = amenitiesToArray(row.amenities);
  const photos = livePhotos(row);
  return {
    id: cardId(row), title: row.name, kind,
    photo: photos[0] || livePhoto(row),
    photos,
    rating: typeof row.rating === 'number' && row.rating > 0 ? row.rating : undefined,
    reviews: row.review_count || undefined,
    distance: cardDistanceStr(row, userCoords),
    address: row.address || undefined,
    description: row.description || undefined,
    ages: liveAgeLabel(row.age_min, row.age_max),
    amenities: amen.length ? amen : undefined,
    website: row.website || undefined,
    phone: row.phone || undefined,
    lat: row.lat, lng: row.lng,
    ...extra,
  };
};

// Subtitle override so "See all" counts reflect the live list.
const liveSubtitle = (key, n) => {
  if (key === 'schools') return `${n} options within 5 mi`;
  if (key === 'extras')  return `${n} programs & camps`;
  return null;
};

// ---- advanced filters applied to live rows ----
const AGE_BUCKETS = { 'Under 1': [0, 1], '1–3': [1, 3], '3–5': [3, 5], '5–8': [5, 8], '8+': [8, 18] };
const AMENITY_FILTER_KEY = {
  'Stroller-friendly': 'stroller_friendly', 'Nursing room': 'nursing_room', 'Restrooms': 'restrooms',
  'Café': 'food', 'Indoor': 'indoor', 'Outdoor': 'outdoor',
};

const haversineMi = (la1, lo1, la2, lo2) => {
  const R = 3958.8, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(la2 - la1), dLng = toRad(lo2 - lo1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Resolve the user's coordinates from their selected area (for distance filter).
const resolveUserCoords = (location) => {
  if (!location) return null;
  const key = String(location).trim().toLowerCase();
  const a = TAMPA_BAY_AREAS.find(x =>
    x.id === key || x.label.toLowerCase() === key || (x.neighborhood || '').toLowerCase() === key);
  return a ? { lat: a.lat, lng: a.lng } : null;
};

// True when any non-category advanced filter is set (category is section-level).
export const advancedFiltersActive = (f) =>
  !!(f && ((f.ages?.length) || (f.amenities?.length) || (f.parking?.length) || (f.cost?.length) || (f.distance != null)));

const matchesFilters = (row, f, userCoords) => {
  if (f.ages?.length) {
    const rmin = row.age_min ?? 0, rmax = row.age_max ?? 18;
    if (!f.ages.some(b => { const [lo, hi] = AGE_BUCKETS[b] || [0, 18]; return rmax >= lo && rmin <= hi; })) return false;
  }
  if (f.amenities?.length) {
    const am = row.amenities || {};
    if (!f.amenities.every(label => { const k = AMENITY_FILTER_KEY[label]; return !k || am[k] === true; })) return false;
  }
  if (f.parking?.length && !(row.amenities && row.amenities.parking === true)) return false;
  if (f.cost?.length) {
    const pl = row.price_level;
    // Unknown price (null) is not excluded.
    if (pl != null && !f.cost.some(c => (c === 'Free' && pl === 0) || (c === 'Paid' && pl >= 1))) return false;
  }
  if (f.distance != null && userCoords && row.lat != null && row.lng != null) {
    if (haversineMi(userCoords.lat, userCoords.lng, row.lat, row.lng) > f.distance) return false;
  }
  return true;
};

export const anyLive = (places) =>
  !!places && typeof places === 'object' && Object.values(places).some(v => Array.isArray(v) && v.length);

// Count of distinct live places matching the advanced filters — drives the
// filter sheet's live "Show N places" CTA. Returns null when there's no live
// data (so the sheet falls back to a plain "Done" rather than a misleading 0).
export const countMatchingPlaces = (places, filters, userCoords) => {
  if (!anyLive(places)) return null;
  const f = filters || {};
  const keys = ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];
  const seen = new Set();
  let n = 0;
  for (const k of keys) {
    for (const r of (Array.isArray(places?.[k]) ? places[k] : [])) {
      if (r?.id != null) { if (seen.has(r.id)) continue; seen.add(r.id); }
      if (matchesFilters(r, f, userCoords)) n++;
    }
  }
  return n;
};

// Popularity score for the auto-top tier: quality weighted by review volume.
const topScore = (r) => (r.rating || 0) * Math.log10((r.review_count || 0) + 1);

// "Top places": admin-featured (by top_rank) first, then auto-top (rating ≥ 4.3
// & ≥ 50 reviews), all within `radiusMiles` of the user (when known). The
// auto-top tier is ordered by relevance to the user's kids/interests (scorePlace,
// same engine as Home) when a profile is supplied, falling back to quality ×
// review-volume — featured/top_rank rows stay pinned regardless.
const topPlacesFrom = (rows, userCoords, radiusMiles, profile = null) => {
  const within = (userCoords && radiusMiles)
    ? rows.filter(r => r.lat != null && r.lng != null &&
        haversineMi(userCoords.lat, userCoords.lng, r.lat, r.lng) <= radiusMiles)
    : rows;
  const featured = within.filter(r => r.is_featured)
    .sort((a, b) => (a.top_rank ?? 1e9) - (b.top_rank ?? 1e9) || (b.rating || 0) - (a.rating || 0));
  const featuredIds = new Set(featured.map(r => r.id));
  const autoTop = within
    .filter(r => !featuredIds.has(r.id) && (r.rating || 0) >= 4.3 && (r.review_count || 0) >= 50)
    .sort(profile
      ? (a, b) => (scorePlace(profile, b).score - scorePlace(profile, a).score) || (topScore(b) - topScore(a))
      : (a, b) => topScore(b) - topScore(a));
  return [...featured, ...autoTop];
};

// Build per-section card lists from the grouped live payload, applying the
// advanced (non-category) filters to each row first.
const buildLiveSections = (places, filters, userCoords, radiusMiles, profile = null) => {
  const f = filters || {};
  const g = (k) => (Array.isArray(places?.[k]) ? places[k] : []).filter(r => matchesFilters(r, f, userCoords));
  const everything = [
    ...g('fun'), ...g('sports'), ...g('wellness'), ...g('schools'),
    ...g('childcare'), ...g('extracurricular'), ...g('camps'), ...g('health'),
  ];
  return {
    places:  topPlacesFrom(everything, userCoords, radiusMiles, profile).map(r => livePhotoCard(r, userCoords)),
    fun:     g('fun').map(r => livePhotoCard(r, userCoords)),
    schools: [...g('schools'), ...g('childcare')].map(r => liveSchoolCard(r, userCoords)),
    extras:  [...g('extracurricular'), ...g('camps')].map(r => liveProgramCard(r, userCoords)),
    health:  [...g('health'), ...g('wellness')].map(r => livePhotoCard(r, userCoords)),
  };
};

// ---- "See all" quick-filter chips (only data-backed ones) ----
const QUICK_AGE = { baby: [0, 1], tod: [1, 3], pre: [3, 5], kid: [5, 18] };

// Stage chips → age ranges, mirroring AboutYou's STAGE_OPTS last 3 options.
const STAGE_AGE = {
  schoolage: [5, 9],
  tween:     [9, 12],
  teen:      [13, 18],
};

// Event/meetup quick-filter helpers — parse the hardcoded `when` and
// `distance` strings ("Sat · 12:30 PM", "1.6 mi away").
const startsWithDay = (when, prefixes) =>
  typeof when === 'string' && prefixes.some(p => when.startsWith(p));
const parseMiles = (distance) => {
  const m = typeof distance === 'string' && distance.match(/([\d.]+)\s*mi/i);
  return m ? Number(m[1]) : null;
};
// Parse "Ages 5–12" / "Ages 0–2" / "Ages 5+" → [min, max]. "All ages" → [0,18].
const parseAgeRange = (ages) => {
  if (!ages || typeof ages !== 'string') return [0, 18];
  const range = ages.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return [Number(range[1]), Number(range[2])];
  const plus = ages.match(/(\d+)\s*\+/);
  if (plus) return [Number(plus[1]), 18];
  return [0, 18];
};
const rangesOverlap = (aMin, aMax, bMin, bMax) => aMax >= bMin && aMin <= bMax;

// True when a live API event falls on a weekend — dated rows by startsAt,
// recurring rows by their day-of-week label.
const isWeekendEvent = (ev) => {
  if (ev?.kind === 'dated' && ev.startsAt) {
    const g = new Date(ev.startsAt).getDay();
    return g === 0 || g === 6;
  }
  return typeof ev?.day === 'string' && ['sat', 'sun'].includes(ev.day.slice(0, 3).toLowerCase());
};

// (item, activeIds[]) => boolean. Age buckets OR together; the rest AND.
const quickFilterMatch = (item, ids, userCoords) => {
  // Event / meetup cards carry _source + the live API event in `_live` — match
  // on real fields (going / mi / startsAt / eventType), never display strings.
  if (item._source === 'event' || item._source === 'meetup') {
    const ev = item._live || {};
    return ids.every(id => {
      switch (id) {
        case 'thisweek':    return true; // already inside the API's upcoming window
        case 'thisweekend': return isWeekendEvent(ev) || startsWithDay(item.when, ['Sat', 'Sun']);
        case 'free':        return true; // events carry no price signal yet
        case 'meetups':     return item._source === 'meetup';
        case 'small':       return (ev.going ?? item.going ?? 99) <= 6;
        case 'near5': {
          const mi = typeof ev.mi === 'number' ? ev.mi : parseMiles(item.distance);
          return mi == null || mi <= 5;
        }
        default: return true;
      }
    });
  }

  const row = item._live;

  // Defensive: a place/program/school card without a live row. Stage chips OR
  // together against item.ages; health chips map to the _health sub-category.
  if (!row) {
    if (item.ages) {
      const stageIds = ids.filter(id => STAGE_AGE[id]);
      if (stageIds.length) {
        const [aMin, aMax] = parseAgeRange(item.ages);
        const stageOk = stageIds.some(id => {
          const [bMin, bMax] = STAGE_AGE[id];
          return rangesOverlap(aMin, aMax, bMin, bMax);
        });
        if (!stageOk) return false;
      }
      return true;
    }

    // Health & wellness — chips map to the item's _health sub-category (OR).
    if (item._health) {
      const healthIds = ids.filter(id => ['wellness', 'pediatricians', 'therapists', 'dentists'].includes(id));
      if (healthIds.length && !healthIds.includes(item._health)) return false;
      return true;
    }

    return true;
  }

  const ageIds = ids.filter(id => QUICK_AGE[id]);
  const ageOk = ageIds.length === 0 || ageIds.some(id => {
    const [lo, hi] = QUICK_AGE[id]; const rmin = row.age_min ?? 0, rmax = row.age_max ?? 18;
    return rmax >= lo && rmin <= hi;
  });
  // Kids stage chips (school-age / tween / teen) OR together against the live
  // row's age range, mirroring the bucket-age handling above.
  const stageIds = ids.filter(id => STAGE_AGE[id]);
  const stageOk = stageIds.length === 0 || stageIds.some(id => {
    const [lo, hi] = STAGE_AGE[id]; const rmin = row.age_min ?? 0, rmax = row.age_max ?? 18;
    return rangesOverlap(rmin, rmax, lo, hi);
  });
  const otherOk = ids.filter(id => !QUICK_AGE[id] && !STAGE_AGE[id]).every(id => {
    switch (id) {
      case 'top': return (row.rating || 0) >= 4.5;
      case 'free': return row.price_level === 0;
      case 'indoor': return row.amenities?.indoor === true;
      case 'outdoor': return row.amenities?.outdoor === true;
      case 'stroller': return row.amenities?.stroller_friendly === true;
      case 'near':
        if (!userCoords || row.lat == null || row.lng == null) return true;
        return haversineMi(userCoords.lat, userCoords.lng, row.lat, row.lng) <= 3;
      default: return true;
    }
  });
  return ageOk && stageOk && otherOk;
};

// -------------------------- explore-only data --------------------------

// Browse-by-category grid. Each entry tap opens the SeeAllSheet for the
// matching SECTIONS key, so the grid is the primary navigation surface for
// every category that isn't pinned to the main scroll. `color` drives the
// filled circle behind a white icon — Mindbody/Classpass-style polished
// chips. `fillIcon` is set when the icon is a shape (Heart, Star) that
// looks better as a solid than an outline.
const CATEGORIES = [
  { key: 'events',   label: 'Events',              Icon: Calendar,      color: '#E96B7D' },
  { key: 'meetups',  label: 'Meetups',             Icon: Users,         color: '#8E63CC' },
  { key: 'kids',     label: 'Kids Activities',     Icon: Backpack,      color: '#F09142' },
  { key: 'schools',  label: 'Schools & Childcare', Icon: GraduationCap, color: '#4A8A7A' },
  { key: 'health',   label: 'Wellness & Health',   Icon: Heart,         color: '#D6446A', fillIcon: true },
  { key: 'places',   label: 'Fun & Entertainment', Icon: Star,          color: '#D9A441', fillIcon: true },
];

// Trending group chats — surfaced on the Explore tab between the events
// feed and the places feed. Pulled from the GROUP_DISCUSSIONS catalog so
// taps open the same GroupDiscussionSheet used by Connect + Mama Hub. We
// pick the four most-popular groups by member count.
const TRENDING_GROUPS = [...GROUP_DISCUSSIONS]
  .sort((a, b) => (b.members || 0) - (a.members || 0))
  .slice(0, 4);

// -------------------------- explore-only leaf components --------------------------

const CategoryCard = ({ item, onClick }) => {
  const Icon = item.Icon;
  return (
    <button
      onClick={onClick}
      className="active:scale-[.97] transition-transform"
      style={{
        background: '#fff', borderRadius: 14,
        border: `1px solid ${C.line}`,
        padding: '10px 8px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600, color: C.navy,
        lineHeight: 1.2, letterSpacing: '-.005em',
      }}
    >
      <Icon
        size={18}
        color={item.color}
        strokeWidth={2.2}
        fill={item.fillIcon ? item.color : 'none'}
      />
      {item.label}
    </button>
  );
};

const GroupChatCard = ({ item, onClick }) => {
  const Icon = item.Icon || Users;
  return (
    <button
      onClick={onClick}
      className="text-left active:scale-[.98] transition-transform"
      style={{
        flexShrink: 0, width: 168,
        background: '#fff', borderRadius: 12,
        border: `1px solid ${C.line}`,
        boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
        padding: '10px 11px',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 999,
        background: item.bg || C.sage, color: item.fg || C.sageDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16}/>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800, color: C.navy,
        lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: 28,
      }}>
        {item.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 600, color: C.muted,
      }}>
        {item.members} members
      </div>
    </button>
  );
};

// -------------------------- screen --------------------------

export const LocalPicksTab = ({
  places,
  events = [], thisWeek = [], profile = null,
  placesLoading = false, eventsLoading = false,
  location, locationGeo,
  placesRadius = 50,
  savedItems = [], setSavedItems, flash,
  joinedEvents = [], setJoinedEvents,
  ratings = {}, setRatings,
  requireVerify,
  filterOpen, setFilterOpen,
  account, openPremium,
  initialSeeAll = null, onConsumeSeeAll,
  goToConnectGroups,
  chatAuthor, myUserId,
  onDiscuss,
}) => {
  void chatAuthor; void myUserId;
  const isPremium = !!account?.isPremium;
  // SeeAll-card action helpers — save, RSVP, rate. Save & rate are direct;
  // RSVP gates through requireVerify so unverified moms see the prompt.
  const isSaved   = (id) => savedItems.includes(id);
  const toggleSave = (id, label) => {
    const next = isSaved(id) ? savedItems.filter(x => x !== id) : [...savedItems, id];
    setSavedItems?.(next);
    flash?.(isSaved(id) ? 'Removed from saved' : `✦ Saved · ${label || 'item'}`);
  };
  const isGoing = (id) => joinedEvents.includes(id);
  const toggleGoing = (item) => {
    const already = isGoing(item.id);
    if (!already && requireVerify && !requireVerify('meetup', item.title)) return;
    const next = already ? joinedEvents.filter(x => x !== item.id) : [...joinedEvents, item.id];
    setJoinedEvents?.(next);
    // Detail sheet handles its own flash on I'm-going; here we only toast
    // when the user backs out of an RSVP, so the inline button stays quiet.
    if (already) flash?.(`Removed RSVP · ${item.title}`);
  };
  const myRating = (id) => ratings?.[id]?.stars || 0;
  const [rateTarget, setRateTarget] = useState(null); // { item, kind } | null
  const openRate = (item, kind) => setRateTarget({ item, kind });
  const saveRating = (stars, note) => {
    if (!rateTarget) return;
    setRatings?.({
      ...ratings,
      [rateTarget.item.id]: { stars, note, when: Date.now() },
    });
    flash?.(`✦ Rated ${stars}/5 · ${rateTarget.item.title}`);
  };
  // Advanced filters are premium-only — non-Plus users see the PremiumSheet
  // instead of the filter drawer when they tap any "advanced filter" entry.
  const openAdvancedFilter = () => {
    if (!isPremium) { openPremium?.(); return; }
    setFilterOpen?.(true);
  };
  const [filters, setFilters] = useState(PLACES_FILTER_DEFAULT);
  // Prefer the user's captured coords (onboarding geo); fall back to the
  // centroid of their selected area.
  const userCoords = useMemo(
    () => (locationGeo?.lat != null && locationGeo?.lng != null
      ? { lat: locationGeo.lat, lng: locationGeo.lng }
      : resolveUserCoords(location)),
    [locationGeo, location]
  );

  // Live events (recurring + this-week dated) → Explore card shape, ranked
  // through the recommendation engine (relevance to the user's kids/interests,
  // then soonest/nearest). Split into the Events feed and the Meetups feed by
  // the API's event type. No hardcoded events anywhere.
  const liveEventCards = useMemo(() => {
    const now = new Date();
    return rankEvents([...thisWeek, ...events], profile).map(ev => eventToExploreCard(ev, now));
  }, [thisWeek, events, profile]);
  const eventOnly  = useMemo(() => liveEventCards.filter(c => c._source !== 'meetup'), [liveEventCards]);
  const meetupOnly = useMemo(() => liveEventCards.filter(c => c._source === 'meetup'), [liveEventCards]);

  // Per-section card lists, built ENTIRELY from live data (events from
  // /api/events, places from /api/places). A section with no live rows renders
  // empty (the row is hidden + an empty state shows) — never a static fallback.
  // The "Top places" section is radius-bounded (featured + relevance-ranked).
  const effectiveSections = useMemo(() => {
    const live = anyLive(places)
      ? buildLiveSections(places, filters, userCoords, placesRadius, profile)
      : null;
    return SECTIONS.map(s => {
      // Events pinned row shows events-only; the combined "See all" surfaces
      // events + meetups (preserving the prior behavior). Meetups is its own feed.
      if (s.key === 'events') {
        return { ...s, items: eventOnly.slice(0, 4), allItems: [...eventOnly, ...meetupOnly] };
      }
      if (s.key === 'meetups') {
        return { ...s, items: meetupOnly.slice(0, 4), allItems: meetupOnly };
      }
      const liveKey = LIVE_SECTION_KEY[s.key] || s.key;
      const items = live?.[liveKey] || [];
      const subtitle = s.key === 'places'
        ? `Top rated within ${placesRadius} mi`
        : (liveSubtitle(liveKey, items.length) || s.seeAllSubtitle);
      return { ...s, items: items.slice(0, 4), allItems: items, seeAllSubtitle: subtitle };
    });
  }, [places, filters, userCoords, placesRadius, profile, eventOnly, meetupOnly]);

  // Live count for the filter sheet's "Show N places" CTA.
  const placeMatchCount = useMemo(
    () => countMatchingPlaces(places, filters, userCoords),
    [places, filters, userCoords],
  );

  // Detail-sheet state — PlaceDetailSheet handles places, programs, and
  // schools; EventDetailSheet handles events and meetups (the latter via
  // the meetup variant).
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [shareItem, setShareItem] = useState(null);

  // `isSaved` + `toggleSave` are already declared above (with flash hooks).
  // `isInterested` is the only fresh helper this block contributes.
  const isInterested = (id) => savedItems.includes(`int-${id}`);

  // Build the PlaceDetailSheet input — rich live detail when the card came from
  // /api/places (it carries `_live`), else the minimal hardcoded card fields.
  const openTopPlace = (item) => setSelectedPlace(item._live
    ? liveDetail(item._live, 'Place', {}, userCoords)
    : { id: item.id, title: item.title, photo: item.photo, rating: item.rating, distance: item.distance, kind: 'Place' });
  const openProgram = (item) => setSelectedPlace(item._live
    ? liveDetail(item._live, 'Program', { Icon: item.Icon, iconBg: item.bg, iconFg: item.fg }, userCoords)
    : { id: item.id, title: item.title, Icon: item.Icon, iconBg: item.bg, iconFg: item.fg, ages: item.ages, distance: item.distance, kind: 'Program' });
  const openSchool = (item) => setSelectedPlace(item._live
    ? liveDetail(item._live, 'School', { tag: item.tag, tagBg: item.tagBg, tagFg: item.tagFg }, userCoords)
    : { id: item.id, title: item.title, photo: item.photo, rating: item.rating, distance: item.distance, tag: item.tag, tagBg: item.tagBg, tagFg: item.tagFg, kind: 'School' });
  // Events and meetups both open in EventDetailSheet. The meetup variant
  // adds the blurred-going avatars, "Meetup instructions" section, and
  // "Chat with moms going" CTA — gated on item._source === 'meetup'.
  const openEvent = (item) => {
    const isMeetupItem = item._source === 'meetup';
    setSelectedEvent({
      id: item.id, title: item.title, photo: item.photo,
      when: item.when, going: item.going, distance: item.distance,
      place: item.place,
      kind: isMeetupItem ? 'Meetup' : 'Event',
      _variant: isMeetupItem ? 'meetup' : 'event',
    });
  };

  // Advanced filter badge count (category + the live-backed filters).
  const advCount =
    (filters.categories?.length || 0) +
    (filters.distance != null ? 1 : 0) + filters.cost.length +
    filters.amenities.length + filters.parking.length + filters.ages.length;

  // When category chips are picked, hide non-matching sections. Empty = show all.
  const activeCats = filters.categories || [];
  const visibleSections = (activeCats.length
    ? effectiveSections.filter(s => activeCats.includes(SECTION_CATEGORY[s.key]))
    : effectiveSections)
    // Hide any category that has no places to show (e.g. emptied by a filter).
    .filter(s => s.items.length > 0);

  // Which "See all" view is open (null = none).
  const [seeAll, setSeeAll] = useState(null);
  const seeAllSection = effectiveSections.find(s => s.key === seeAll);

  // Search query — filters card titles across the visible sections. Kept
  // simple (substring match) so the box is useful without a backend search.
  const [searchQuery, setSearchQuery] = useState('');
  const matchesSearch = (title) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return String(title || '').toLowerCase().includes(q);
  };

  // Trending group chats — group sheet state. Premium-gated request-join
  // flow mirrors ConnectTab so the sheet behaves the same on Explore.
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [discussionJoinStatus, setDiscussionJoinStatus] = useState({}); // { id: 'pending'|'accepted' }
  const requestJoinDiscussion = () => {
    if (!selectedDiscussion) return;
    const id = selectedDiscussion.id;
    if (discussionJoinStatus[id]) return;
    if (requireVerify && !requireVerify('group', selectedDiscussion.title)) return;
    setDiscussionJoinStatus(prev => ({ ...prev, [id]: 'pending' }));
    flash?.(`✦ Request to join ${selectedDiscussion.title} sent`);
    setTimeout(() => {
      setDiscussionJoinStatus(prev =>
        prev[id] === 'pending' ? { ...prev, [id]: 'accepted' } : prev);
      flash?.(`✦ You were accepted into ${selectedDiscussion.title}`);
    }, 2500);
  };
  const leaveDiscussion = () => {
    if (!selectedDiscussion) return;
    const id = selectedDiscussion.id;
    setDiscussionJoinStatus(prev => {
      const next = { ...prev }; delete next[id]; return next;
    });
    flash?.(`Left ${selectedDiscussion.title}`);
  };

  // Cross-tab intent: HomeTab and ConnectTab route their "See all" links
  // here so every "see all" lands on the same Explore SeeAllSheet (same
  // section, same quick filters, same advanced sheet). We accept the key
  // only if it matches a known section so a stale key doesn't open a blank
  // sheet, then clear the parent so a plain nav-bar visit is unaffected.
  useEffect(() => {
    if (!initialSeeAll) return;
    if (SECTIONS.some(s => s.key === initialSeeAll)) {
      setSeeAll(initialSeeAll);
    }
    onConsumeSeeAll?.();
  }, [initialSeeAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // The three sections pinned to the main scroll, mirroring the design:
  //   • Popular right now (events feed)
  //   • Trending group chats (new — uses TRENDING_GROUPS)
  //   • Top local picks (places feed)
  // Every other category is reachable through the Browse-by-category grid
  // (each tap opens the matching SeeAllSheet).
  const eventsSection = effectiveSections.find(s => s.key === 'events');
  const placesSection = effectiveSections.find(s => s.key === 'places');
  const eventsItems = (eventsSection?.items || []).filter(i => matchesSearch(i.title));
  const placesItems = (placesSection?.items || []).filter(i => matchesSearch(i.title));
  const trendingGroups = TRENDING_GROUPS.filter(g => matchesSearch(g.title));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', paddingTop: 6, paddingBottom: 16 }}>

        {/* "Explore" title — the location pill lives in MainApp's shared
            header (it anchors the whole feed). Title sits just below it. */}
        <div className="px-5" style={{ marginBottom: 10 }}>
          <div style={{
            fontFamily: 'Fraunces', fontSize: 32, fontWeight: 700,
            color: C.navy, letterSpacing: '-.02em', lineHeight: 1,
          }}>
            Explore
          </div>
        </div>

        {/* Search bar — no Filters button per spec; the search field spans
            the row. Substring-matches event / group / place titles in the
            three pinned sections (the SeeAllSheet has its own filters). */}
        <div className="px-5" style={{ marginBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.paper, border: `1px solid ${C.divider}`,
            borderRadius: 12, padding: '8px 12px',
          }}>
            <Search size={15} color={C.muted} strokeWidth={2.2}/>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, meetups, places and more"
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy,
              }}
            />
          </div>
        </div>

        {/* Browse by category — 2x3 grid. Each tile opens the SeeAllSheet
            for that section so the grid is the primary nav for every
            category that isn't pinned to the main scroll. */}
        <div className="px-5" style={{ marginBottom: 6 }}>
          <div style={{
            fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700,
            color: C.navy, letterSpacing: '-.01em', marginBottom: 10,
          }}>
            Browse by category
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {CATEGORIES.map(cat => (
              <CategoryCard key={cat.key} item={cat} onClick={() => setSeeAll(cat.key)}/>
            ))}
          </div>
        </div>

        {/* Loading skeletons — placeholder rows while live data resolves. */}
        {(placesLoading || eventsLoading) && (
          [0, 1, 2].map(i => <SectionSkeleton key={`sk-${i}`}/>)
        )}

        {/* Popular right now — events feed */}
        {!(placesLoading || eventsLoading) && eventsItems.length > 0 && (
          <div className="px-5" id="explore-section-events">
            <SectionHead title="Popular right now" onLink={() => setSeeAll('events')}/>
            <div
              className="flex"
              style={{
                overflowX: 'auto', overflowY: 'hidden',
                scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
                gap: 10, paddingBottom: 4,
              }}
            >
              {eventsItems.map(item => (
                <div key={item.id} style={{ flex: '0 0 45%', scrollSnapAlign: 'start', display: 'flex' }}>
                  <EventCard item={item} onClick={() => openEvent(item)}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending group chats — uses GROUP_DISCUSSIONS via TRENDING_GROUPS.
            Tap → opens the same GroupDiscussionSheet used elsewhere; "See
            all" routes to Connect's groups SeeAll so we don't fork the
            discovery experience. */}
        {!(placesLoading || eventsLoading) && trendingGroups.length > 0 && (
          <div className="px-5">
            <SectionHead title="Trending group chats" onLink={goToConnectGroups}/>
            <div
              className="flex"
              style={{
                overflowX: 'auto', overflowY: 'hidden',
                scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
                gap: 10, paddingBottom: 4,
              }}
            >
              {trendingGroups.map(g => (
                <GroupChatCard key={g.id} item={g} onClick={() => setSelectedDiscussion(g)}/>
              ))}
            </div>
          </div>
        )}

        {/* Top local picks — places feed */}
        {!(placesLoading || eventsLoading) && placesItems.length > 0 && (
          <div className="px-5" id="explore-section-places">
            <SectionHead title="Top local picks" onLink={() => setSeeAll('places')}/>
            <div
              className="flex"
              style={{
                overflowX: 'auto', overflowY: 'hidden',
                scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
                gap: 10, paddingBottom: 4,
              }}
            >
              {placesItems.map(item => (
                <div key={item.id} style={{ flex: '0 0 45%', scrollSnapAlign: 'start', display: 'flex' }}>
                  <PhotoCard item={item} onClick={() => openTopPlace(item)}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {!(placesLoading || eventsLoading) && eventsItems.length === 0 && placesItems.length === 0 && trendingGroups.length === 0 && (
          <div className="px-5" style={{
            marginTop: 40, textAlign: 'center',
            fontFamily: 'Albert Sans', fontSize: 13, color: C.muted,
            lineHeight: 1.5,
          }}>
            {searchQuery.trim()
              ? `No matches for "${searchQuery.trim()}" · try a different search`
              : (activeCats.length
                ? 'No places match your filters right now · try clearing them'
                : 'No local picks to show here yet · check back soon')}
          </div>
        )}

      </div>

      {seeAllSection && (
        <SeeAllSheet
          title={seeAllSection.title}
          subtitle={seeAllSection.seeAllSubtitle}
          items={seeAllSection.allItems}
          renderItem={(item) => {
            if (seeAllSection.kind === 'event') {
              // Events & meetups intentionally drop the inline Save badge —
              // the only save-style action moms see on these cards lives in
              // the detail sheet, and the spec asked for it to be removed
              // there too. We keep the inline "I'm going" CTA.
              return (
                <EventCard
                  key={item.id}
                  item={item}
                  onClick={() => openEvent(item)}
                  going={isGoing(item.id)}
                  onGoing={() => toggleGoing(item)}
                />
              );
            }
            if (seeAllSection.kind === 'program') {
              return (
                <ProgramCard
                  key={item.id}
                  item={item}
                  onClick={() => openProgram(item)}
                  saved={isSaved(item.id)}
                  onSave={() => toggleSave(item.id, item.title)}
                  myRating={myRating(item.id)}
                  onRate={() => openRate(item, 'place')}
                />
              );
            }
            if (seeAllSection.kind === 'school') {
              return (
                <SchoolCard
                  key={item.id}
                  item={item}
                  onClick={() => openSchool(item)}
                  saved={isSaved(item.id)}
                  onSave={() => toggleSave(item.id, item.title)}
                  myRating={myRating(item.id)}
                  onRate={() => openRate(item, 'place')}
                />
              );
            }
            return (
              <PhotoCard
                key={item.id}
                item={item}
                onClick={() => openTopPlace(item)}
                saved={isSaved(item.id)}
                onSave={() => toggleSave(item.id, item.title)}
                myRating={myRating(item.id)}
                onRate={() => openRate(item, 'place')}
              />
            );
          }}
          columns={2}
          quickFilters={QUICK_FILTERS_BY_SECTION[seeAllSection.key]}
          matchQuickFilter={(item, ids) => quickFilterMatch(item, ids, userCoords)}
          onOpenAdvancedFilter={openAdvancedFilter}
          advancedFilterCount={advCount}
          lockedPremium={!isPremium}
          onClose={() => setSeeAll(null)}
        />
      )}

      {filterOpen && isPremium && (
        <PlacesFilterSheet
          filters={filters}
          setFilters={setFilters}
          resultCount={placeMatchCount}
          onClose={() => setFilterOpen?.(false)}
        />
      )}

      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          saved={isSaved(selectedPlace.id)}
          interested={isInterested(selectedPlace.id)}
          onSave={() => {
            toggleSave(selectedPlace.id);
            flash?.(isSaved(selectedPlace.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onInterested={() => {
            toggleSave(`int-${selectedPlace.id}`);
            flash?.(isInterested(selectedPlace.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onShare={(p, action) => {
            if (action === 'call') {
              if (p.phone) window.location.href = `tel:${String(p.phone).replace(/[^\d+]/g, '')}`;
              else flash?.('No phone number listed');
            } else if (action === 'web') {
              if (p.website) window.open(p.website, '_blank', 'noopener');
              else flash?.('No website listed');
            } else {
              setShareItem({
                title: p.title, kind: p.kind || 'Place',
                place: p.distance, photo: p.photo,
              });
            }
          }}
          onDirections={(p) => {
            const dest = (p.lat != null && p.lng != null)
              ? `${p.lat},${p.lng}`
              : encodeURIComponent(p.address || p.title || '');
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank', 'noopener');
          }}
          onDiscuss={() => onDiscuss?.({ type: 'place', id: selectedPlace.id, title: selectedPlace.title })}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          variant={selectedEvent._variant || 'event'}
          joined={isGoing(selectedEvent.id)}
          interested={isInterested(selectedEvent.id)}
          flash={flash}
          onJoin={() => toggleGoing(selectedEvent)}
          onInterested={() => toggleSave(`int-${selectedEvent.id}`)}
          onShare={() => setShareItem({
            title: selectedEvent.title,
            kind: selectedEvent.kind || 'Event',
            when: selectedEvent.when,
            place: selectedEvent.place,
            photo: selectedEvent.photo,
          })}
          onDiscuss={() => {
            const isMeetupItem = selectedEvent._variant === 'meetup';
            const chatType = isMeetupItem ? 'meetup-chat' : 'event-chat';
            onDiscuss?.({
              type: chatType,
              id: `${chatType}-${selectedEvent.id}`,
              title: `${selectedEvent.title} · moms going`,
              expiresHint: `2 days after the ${isMeetupItem ? 'meetup' : 'event'}`,
            });
          }}
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

      {rateTarget && (
        <RateSheet
          item={{
            name: rateTarget.item.title,
            area: rateTarget.item.distance,
            dist: rateTarget.item.distance,
          }}
          kind={rateTarget.kind}
          current={myRating(rateTarget.item.id)}
          onSave={saveRating}
          onClose={() => setRateTarget(null)}
        />
      )}

      {selectedDiscussion && (
        <GroupDiscussionSheet
          discussion={selectedDiscussion}
          joinStatus={discussionJoinStatus[selectedDiscussion.id] || 'none'}
          onRequestJoin={requestJoinDiscussion}
          onLeave={leaveDiscussion}
          isPremium={isPremium}
          openPremium={openPremium}
          author={chatAuthor}
          myUserId={myUserId}
          flash={flash}
          onClose={() => setSelectedDiscussion(null)}
        />
      )}
    </div>
  );
};

