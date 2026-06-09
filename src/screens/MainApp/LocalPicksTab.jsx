import { useMemo, useState } from 'react';
import {
  MapPin, School, Brain, Star,
  Music, Activity, Sparkles, ChevronRight,
  HeartHandshake, Stethoscope, Users,
  SlidersHorizontal, ShieldCheck, Palette, BookOpen,
  Tent, Trees,
} from 'lucide-react';
import { C } from '../../theme';
import { PlacesFilterSheet, PLACES_FILTER_DEFAULT } from '../../sheets/PlacesFilterSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';
import { SeeAllSheet } from '../../sheets/SeeAllSheet';
import { ShareSheet } from '../../sheets/ShareSheet';
import { TAMPA_BAY_AREAS } from '../../data/tampa-bay-areas';

// ==========================================================================
// LocalPicksTab — V5 "Local Picks" surface.
//
//   Sections (in order):
//     1. Top places nearby      — photo cards w/ rating + distance
//     2. Fun & entertainment    — photo cards (zoos, museums, attractions)
//     3. Schools & childcare    — photo cards w/ rating + tag
//     4. Extracurricular & camps — icon cards (classes, camps, programs)
//     5. Health & wellness       — photo cards (pediatric, mental, postpartum)
// ==========================================================================

// 1. Top places nearby — curated nearby family-friendly spots.
const TOP_PLACES_NEARBY = [
  {
    id: 'tp1', title: 'Tampa Riverwalk Splash Pad',
    rating: 4.8, distance: '0.4 mi away',
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp5', title: 'Curtis Hixon Waterfront Park',
    rating: 4.7, distance: '0.6 mi away',
    photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp6', title: 'Hyde Park Village',
    rating: 4.6, distance: '0.4 mi away',
    photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=400&auto=format&fit=crop',
  },
];

const TOP_PLACES_NEARBY_ALL = [
  ...TOP_PLACES_NEARBY,
  {
    id: 'tp7', title: 'Little Explorers Play Cafe',
    rating: 4.9, distance: '2.1 mi away',
    photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp9', title: 'The Yard · Tampa',
    rating: 4.5, distance: '0.7 mi away',
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp10', title: 'Davis Islands Dog & Kid Park',
    rating: 4.6, distance: '1.1 mi away',
    photo: 'https://images.unsplash.com/photo-1502301197179-65228ab57f78?w=400&auto=format&fit=crop',
  },
  {
    id: 'tp11', title: 'Armature Works Riverfront',
    rating: 4.7, distance: '0.8 mi away',
    photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop',
  },
];

// 2. Fun & entertainment — destinations for a fun day out.
const FUN_ENTERTAINMENT = [
  {
    id: 'fe1', title: 'ZooTampa at Lowry Park',
    rating: 4.7, distance: '2.1 mi away',
    photo: 'https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=400&auto=format&fit=crop',
  },
  {
    id: 'fe2', title: "Glazer Children's Museum",
    rating: 4.9, distance: '1.5 mi away',
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
  {
    id: 'fe3', title: 'Florida Aquarium',
    rating: 4.8, distance: '1.3 mi away',
    photo: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&auto=format&fit=crop',
  },
];

const FUN_ENTERTAINMENT_ALL = [
  ...FUN_ENTERTAINMENT,
  {
    id: 'fe4', title: 'Tampa Bay History Center',
    rating: 4.6, distance: '1.2 mi away',
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
  {
    id: 'fe5', title: 'Adventure Island Water Park',
    rating: 4.5, distance: '8.6 mi away',
    photo: 'https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=400&auto=format&fit=crop',
  },
  {
    id: 'fe6', title: 'Sky Zone Trampoline Park',
    rating: 4.4, distance: '3.4 mi away',
    photo: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=400&auto=format&fit=crop',
  },
  {
    id: 'fe7', title: 'Big Cat Rescue',
    rating: 4.7, distance: '10.2 mi away',
    photo: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400&auto=format&fit=crop',
  },
];

// 3. Schools & childcare — preschools, daycares, K-8.
const SCHOOLS_CHILDCARE = [
  {
    id: 's1', title: 'Bright Horizons at Harbour Island',
    rating: 4.7, distance: '0.7 mi away', tag: 'Open enrollment',
    tagBg: C.sage, tagFg: C.sageDark,
    photo: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&auto=format&fit=crop',
  },
  {
    id: 's2', title: 'Primrose School of South Tampa',
    rating: 4.8, distance: '2.1 mi away', tag: 'Availability varies',
    tagBg: '#FFF4D6', tagFg: '#8A6610',
    photo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&auto=format&fit=crop',
  },
  {
    id: 's3', title: 'Sunshine Preschool & VPK',
    rating: 4.6, distance: '1.5 mi away', tag: 'VPK',
    tagBg: C.lilac, tagFg: '#5E4A8A',
    photo: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=400&auto=format&fit=crop',
  },
];

const SCHOOLS_CHILDCARE_ALL = [
  ...SCHOOLS_CHILDCARE,
  {
    id: 's4', title: 'Goddard School Westshore',
    rating: 4.7, distance: '1.0 mi away', tag: 'Open enrollment',
    tagBg: C.sage, tagFg: C.sageDark,
    photo: 'https://images.unsplash.com/photo-1587653263995-422546a7a569?w=400&auto=format&fit=crop',
  },
  {
    id: 's5', title: 'Kiddie Academy of Tampa Palms',
    rating: 4.5, distance: '4.2 mi away', tag: 'Tour available',
    tagBg: C.lilac, tagFg: '#5E4A8A',
    photo: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&auto=format&fit=crop',
  },
  {
    id: 's6', title: 'KinderCare South Tampa',
    rating: 4.6, distance: '1.8 mi away', tag: 'Availability varies',
    tagBg: '#FFF4D6', tagFg: '#8A6610',
    photo: 'https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=400&auto=format&fit=crop',
  },
  {
    id: 's7', title: 'St. Mary\'s Episcopal Day School',
    rating: 4.9, distance: '0.9 mi away', tag: 'Open enrollment',
    tagBg: C.sage, tagFg: C.sageDark,
    photo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&auto=format&fit=crop',
  },
  {
    id: 's8', title: 'Children\'s Board Family Resource',
    rating: 4.7, distance: '1.4 mi away', tag: 'Subsidized',
    tagBg: C.coralSoft, tagFg: C.coralDeep,
    photo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&auto=format&fit=crop',
  },
  {
    id: 's9', title: 'Tampa Day School',
    rating: 4.8, distance: '2.6 mi away', tag: 'K-8',
    tagBg: C.lilac, tagFg: '#5E4A8A',
    photo: 'https://images.unsplash.com/photo-1581726690015-c9861fa5057f?w=400&auto=format&fit=crop',
  },
];

// 4. Extracurricular & camps — classes, camps, programs.
const EXTRACURRICULAR_CAMPS = [
  {
    id: 'pr1', title: 'Music Together', ages: 'Ages 0–5',
    distance: '0.6 mi away', Icon: Music,
    bg: C.coralSoft, fg: C.coralDeep,
  },
  {
    id: 'ec_camp1', title: 'Summer Adventure Camp', ages: 'Ages 5–12',
    distance: '1.2 mi away', Icon: Tent,
    bg: C.sage, fg: C.sageDark,
  },
  {
    id: 'pr4', title: 'Toddler Art Studio', ages: 'Ages 1–4',
    distance: '0.8 mi away', Icon: Palette,
    bg: '#FFF4D6', fg: '#8A6610',
  },
];

const EXTRACURRICULAR_CAMPS_ALL = [
  ...EXTRACURRICULAR_CAMPS,
  {
    id: 'pr6', title: 'Story Time Spanish', ages: 'Ages 2–5',
    distance: '1.0 mi away', Icon: BookOpen,
    bg: C.lilac, fg: '#5E4A8A',
  },
  {
    id: 'pr7', title: 'Mini Chefs Cooking', ages: 'Ages 4–8',
    distance: '1.6 mi away', Icon: Sparkles,
    bg: C.sage, fg: C.sageDark,
  },
  {
    id: 'pr8', title: 'Baby Sign Class', ages: 'Ages 0–2',
    distance: '0.7 mi away', Icon: HeartHandshake,
    bg: '#FFF4D6', fg: '#8A6610',
  },
  {
    id: 'pr9', title: 'STEM for Toddlers', ages: 'Ages 2–4',
    distance: '1.9 mi away', Icon: Brain,
    bg: C.coralSoft, fg: C.coralDeep,
  },
  {
    id: 'ec_camp2', title: 'Nature Day Camp', ages: 'Ages 4–10',
    distance: '2.4 mi away', Icon: Trees,
    bg: C.sage, fg: C.sageDark,
  },
  {
    id: 'ec_camp3', title: 'Coding Kids Camp', ages: 'Ages 6–12',
    distance: '2.0 mi away', Icon: Brain,
    bg: C.lilac, fg: '#5E4A8A',
  },
];

// 5. Health & wellness — pediatric, mental, postpartum, OT, sleep.
const HEALTH_WELLNESS = [
  {
    id: 'hw_ped', title: 'Tampa Pediatric Care',
    rating: 4.8, distance: '0.9 mi away',
    photo: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_men', title: 'Brightside Mental Health',
    rating: 4.7, distance: '1.2 mi away',
    photo: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_pp', title: 'Postpartum Wellness Center',
    rating: 4.9, distance: '1.6 mi away',
    photo: 'https://images.unsplash.com/photo-1556139943-4bdca53adf1e?w=400&auto=format&fit=crop',
  },
];

const HEALTH_WELLNESS_ALL = [
  ...HEALTH_WELLNESS,
  {
    id: 'hw_lac', title: 'Lactation Consultant Co.',
    rating: 4.9, distance: '0.8 mi away',
    photo: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_sle', title: 'Tampa Sleep Consultants',
    rating: 4.8, distance: '1.4 mi away',
    photo: 'https://images.unsplash.com/photo-1566275529824-cca6d008f3da?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_ot', title: 'OT & Speech Therapy Clinic',
    rating: 4.7, distance: '1.9 mi away',
    photo: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_doc', title: 'Bay Area Doula Collective',
    rating: 4.8, distance: '2.1 mi away',
    photo: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_yog', title: 'Mom & Baby Yoga Studio',
    rating: 4.7, distance: '1.0 mi away',
    photo: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&auto=format&fit=crop',
  },
  {
    id: 'hw_dent', title: 'Little Smiles Pediatric Dental',
    rating: 4.8, distance: '1.7 mi away',
    photo: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400&auto=format&fit=crop',
  },
];

// Section metadata — keeps the rendering loop declarative and lets the
// Category filter map titles to data sources without a giant switch.
const SECTIONS = [
  {
    key: 'places',
    title: 'Top places nearby',
    kind: 'photo',
    items: TOP_PLACES_NEARBY,
    allItems: TOP_PLACES_NEARBY_ALL,
    seeAllSubtitle: 'Curated near you',
  },
  {
    key: 'fun',
    title: 'Fun & entertainment',
    kind: 'photo',
    items: FUN_ENTERTAINMENT,
    allItems: FUN_ENTERTAINMENT_ALL,
    seeAllSubtitle: 'Days out, weekend ideas',
  },
  {
    key: 'schools',
    title: 'Schools & childcare',
    kind: 'school',
    items: SCHOOLS_CHILDCARE,
    allItems: SCHOOLS_CHILDCARE_ALL,
    seeAllSubtitle: `${SCHOOLS_CHILDCARE_ALL.length} options within 5 mi`,
  },
  {
    key: 'extras',
    title: 'Extracurricular & camps',
    kind: 'program',
    items: EXTRACURRICULAR_CAMPS,
    allItems: EXTRACURRICULAR_CAMPS_ALL,
    seeAllSubtitle: `${EXTRACURRICULAR_CAMPS_ALL.length} programs & camps`,
  },
  {
    key: 'health',
    title: 'Health & wellness',
    kind: 'photo',
    items: HEALTH_WELLNESS,
    allItems: HEALTH_WELLNESS_ALL,
    seeAllSubtitle: 'Pediatric, mental, postpartum',
  },
];

// Map section keys to filter Category labels for filtering visibility.
const SECTION_CATEGORY = {
  places:  'Top places nearby',
  fun:     'Fun & entertainment',
  schools: 'Schools & childcare',
  extras:  'Extracurricular & camps',
  health:  'Health & wellness',
};

// Only data-backed quick filters (wired in quickFilterMatch). Unbacked chips
// like Rainy day / Live events / Waitlist / Mental / Postpartum were removed.
const QUICK_FILTERS_BY_SECTION = {
  places: [
    { id: 'top',      label: 'Top rated',         icon: Star       },
    { id: 'near',     label: 'Near me',           icon: MapPin      },
    { id: 'free',     label: 'Free'                                 },
    { id: 'indoor',   label: 'Indoor'                               },
    { id: 'outdoor',  label: 'Outdoor'                              },
    { id: 'stroller', label: 'Stroller-friendly', icon: ShieldCheck },
  ],
  fun: [
    { id: 'top',     label: 'Top rated', icon: Star  },
    { id: 'near',    label: 'Near me',   icon: MapPin },
    { id: 'indoor',  label: 'Indoor'                  },
    { id: 'outdoor', label: 'Outdoor'                 },
    { id: 'free',    label: 'Free'                    },
  ],
  schools: [
    { id: 'top',  label: 'Top rated', icon: Star  },
    { id: 'near', label: 'Near me',   icon: MapPin },
  ],
  extras: [
    { id: 'baby', label: 'Baby (0–1)',    icon: Sparkles },
    { id: 'tod',  label: 'Toddler (1–3)', icon: Activity },
    { id: 'pre',  label: 'Pre-K (3–5)',   icon: BookOpen },
    { id: 'kid',  label: 'Kid (5+)',      icon: Users    },
    { id: 'top',  label: 'Top rated',     icon: Star     },
  ],
  health: [
    { id: 'top',  label: 'Top rated', icon: Star  },
    { id: 'near', label: 'Near me',   icon: MapPin },
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


const PhotoCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
  }}>
    <img src={item.photo} alt="" style={{
      width: '100%', height: 62, objectFit: 'cover', display: 'block',
    }}/>
    <div style={{ padding: '6px 7px 8px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 24,
      }}>
        {item.title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, marginTop: 4,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, color: C.navy,
      }}>
        {item.rating != null && (
          <>
            <Star size={9} fill={C.saffron} color={C.saffron}/>
            {item.rating}
          </>
        )}
        <span style={{
          fontWeight: 500, color: C.muted, marginLeft: item.rating != null ? 4 : 0,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={8}/> {item.distance}
        </span>
      </div>
    </div>
  </button>
);

const ProgramCard = ({ item, onClick }) => {
  const Icon = item.Icon;
  return (
    <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
      background: '#fff', borderRadius: 12,
      border: `1px solid ${C.line}`,
      boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
      overflow: 'hidden',
      padding: 0, cursor: 'pointer',
    }}>
      <div style={{
        height: 62, background: item.bg, color: item.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={26}/>
      </div>
      <div style={{ padding: '6px 7px 8px' }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
          color: C.navy, lineHeight: 1.2,
        }}>
          {item.title}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 3,
        }}>
          {item.ages}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2, marginTop: 3,
          fontFamily: 'Albert Sans', fontSize: 9, color: C.muted,
        }}>
          <MapPin size={8}/> {item.distance}
        </div>
      </div>
    </button>
  );
};

const SchoolCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`,
    boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden',
    padding: 0, cursor: 'pointer',
  }}>
    <img src={item.photo} alt="" style={{
      width: '100%', height: 60, objectFit: 'cover', display: 'block',
    }}/>
    <div style={{ padding: '6px 7px 8px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 24,
      }}>
        {item.title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, marginTop: 3,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, color: C.navy,
      }}>
        {item.rating != null && (
          <>
            <Star size={9} fill={C.saffron} color={C.saffron}/>
            {item.rating}
          </>
        )}
        <span style={{
          fontWeight: 500, color: C.muted, marginLeft: item.rating != null ? 3 : 0,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <MapPin size={8}/> {item.distance}
        </span>
      </div>
      <div style={{
        marginTop: 4, display: 'inline-block',
        background: item.tagBg, color: item.tagFg,
        fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700,
        padding: '1.5px 5px', borderRadius: 4,
      }}>
        {item.tag}
      </div>
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

// Build per-section card lists from the grouped live payload, applying the
// advanced (non-category) filters to each row first.
const buildLiveSections = (places, filters, userCoords) => {
  const f = filters || {};
  const g = (k) => (Array.isArray(places?.[k]) ? places[k] : []).filter(r => matchesFilters(r, f, userCoords));
  const everything = [
    ...g('fun'), ...g('sports'), ...g('wellness'), ...g('schools'),
    ...g('childcare'), ...g('extracurricular'), ...g('camps'), ...g('health'),
  ];
  const topNearby = [...everything].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return {
    places:  topNearby.map(r => livePhotoCard(r, userCoords)),
    fun:     g('fun').map(r => livePhotoCard(r, userCoords)),
    schools: [...g('schools'), ...g('childcare')].map(r => liveSchoolCard(r, userCoords)),
    extras:  [...g('extracurricular'), ...g('camps')].map(r => liveProgramCard(r, userCoords)),
    health:  [...g('health'), ...g('wellness')].map(r => livePhotoCard(r, userCoords)),
  };
};

// ---- "See all" quick-filter chips (only data-backed ones) ----
const QUICK_AGE = { baby: [0, 1], tod: [1, 3], pre: [3, 5], kid: [5, 18] };
// (item, activeIds[]) => boolean. Age buckets OR together; the rest AND.
// Hardcoded (non-live) items can't be filtered, so they always pass.
const quickFilterMatch = (item, ids, userCoords) => {
  const row = item._live;
  if (!row) return true;
  const ageIds = ids.filter(id => QUICK_AGE[id]);
  const ageOk = ageIds.length === 0 || ageIds.some(id => {
    const [lo, hi] = QUICK_AGE[id]; const rmin = row.age_min ?? 0, rmax = row.age_max ?? 18;
    return rmax >= lo && rmin <= hi;
  });
  const otherOk = ids.filter(id => !QUICK_AGE[id]).every(id => {
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
  return ageOk && otherOk;
};

// -------------------------- screen --------------------------

export const LocalPicksTab = ({
  places,
  location, locationGeo,
  savedItems = [], setSavedItems, flash,
  filterOpen, setFilterOpen,
}) => {
  const [filters, setFilters] = useState(PLACES_FILTER_DEFAULT);
  // Prefer the user's captured coords (onboarding geo); fall back to the
  // centroid of their selected area.
  const userCoords = useMemo(
    () => (locationGeo?.lat != null && locationGeo?.lng != null
      ? { lat: locationGeo.lat, lng: locationGeo.lng }
      : resolveUserCoords(location)),
    [locationGeo, location]
  );

  // Live-or-curated sections. With live data, show live (filtered) rows; a
  // section with no live results falls back to its curated list ONLY when no
  // advanced filter is active (a filter may legitimately empty a section).
  const effectiveSections = useMemo(() => {
    if (!anyLive(places)) return SECTIONS;
    const live = buildLiveSections(places, filters, userCoords);
    const filtersOn = advancedFiltersActive(filters);
    return SECTIONS.map(s => {
      const items = live[s.key] || [];
      if (items.length) {
        return { ...s, items: items.slice(0, 3), allItems: items, seeAllSubtitle: liveSubtitle(s.key, items.length) || s.seeAllSubtitle };
      }
      return filtersOn ? { ...s, items: [], allItems: [] } : s;
    });
  }, [places, filters, userCoords]);

  // Detail-sheet state — PlaceDetailSheet handles places, programs, and schools.
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [shareItem, setShareItem] = useState(null);

  const isSaved = (id) => savedItems.includes(id);
  const isInterested = (id) => savedItems.includes(`int-${id}`);
  const toggleSave = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

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

  // Advanced filter badge count (category + the live-backed filters).
  const advCount =
    (filters.categories?.length || 0) +
    (filters.distance != null ? 1 : 0) + filters.cost.length +
    filters.amenities.length + filters.parking.length + filters.ages.length;

  // When category chips are picked, hide non-matching sections. Empty = show all.
  const activeCats = filters.categories || [];
  const visibleSections = activeCats.length
    ? effectiveSections.filter(s => activeCats.includes(SECTION_CATEGORY[s.key]))
    : effectiveSections;

  // Which "See all" view is open (null = none).
  const [seeAll, setSeeAll] = useState(null);
  const seeAllSection = effectiveSections.find(s => s.key === seeAll);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Lone filter button — replaces the old quick-tiles jump row */}
      <div className="px-5" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <div className="flex items-center justify-end">
          <LocalPicksFilterIconBtn
            count={advCount}
            onClick={() => setFilterOpen?.(true)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 16 }}>
        {visibleSections.map(section => (
          <div key={section.key} id={`localpicks-section-${section.key}`}>
            <SectionHead title={section.title} onLink={() => setSeeAll(section.key)}/>
            <div className="grid grid-cols-3" style={{ gap: 8 }}>
              {section.items.map(item => {
                if (section.kind === 'program') {
                  return <ProgramCard key={item.id} item={item} onClick={() => openProgram(item)}/>;
                }
                if (section.kind === 'school') {
                  return <SchoolCard key={item.id} item={item} onClick={() => openSchool(item)}/>;
                }
                return <PhotoCard key={item.id} item={item} onClick={() => openTopPlace(item)}/>;
              })}
            </div>
          </div>
        ))}

        {visibleSections.length === 0 && (
          <div style={{
            marginTop: 28, textAlign: 'center',
            fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
          }}>
            No categories selected · clear filters to see everything
          </div>
        )}
      </div>

      {seeAllSection && (
        <SeeAllSheet
          title={seeAllSection.title}
          subtitle={seeAllSection.seeAllSubtitle}
          items={seeAllSection.allItems}
          renderItem={(item) => {
            if (seeAllSection.kind === 'program') {
              return <ProgramCard key={item.id} item={item} onClick={() => openProgram(item)}/>;
            }
            if (seeAllSection.kind === 'school') {
              return <SchoolCard key={item.id} item={item} onClick={() => openSchool(item)}/>;
            }
            return <PhotoCard key={item.id} item={item} onClick={() => openTopPlace(item)}/>;
          }}
          columns={2}
          quickFilters={QUICK_FILTERS_BY_SECTION[seeAllSection.key]}
          matchQuickFilter={(item, ids) => quickFilterMatch(item, ids, userCoords)}
          onOpenAdvancedFilter={() => setFilterOpen?.(true)}
          advancedFilterCount={advCount}
          onClose={() => setSeeAll(null)}
        />
      )}

      {filterOpen && (
        <PlacesFilterSheet
          filters={filters}
          setFilters={setFilters}
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
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {shareItem && (
        <ShareSheet
          item={shareItem}
          flash={flash}
          onClose={() => setShareItem(null)}
        />
      )}
    </div>
  );
};

// Round filter icon button. Coral accent + count badge when any filter
// is active. Matches the pattern in ThisWeekTab / ConnectTab.
const LocalPicksFilterIconBtn = ({ count = 0, onClick }) => (
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
