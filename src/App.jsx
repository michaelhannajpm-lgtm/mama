import { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight, ArrowLeft, MapPin, Calendar as CalendarIcon, Shield,
  Coffee, TreePine, Sparkles, Lock, Check, ChevronRight, ChevronDown, ChevronUp,
  Search, MessageCircle, X, Crown, Star, Plus, Minus, Heart,
  Compass, CalendarDays, Bell, User, Users, ShieldCheck, Quote,
  Briefcase, Home, Flower2, Music, BookOpen, Palette,
  Leaf, Sun, Building2, Library, Trees,
  PawPrint, Waves, Droplets, Flame, Award,
  Mail, Eye, EyeOff, Phone
} from 'lucide-react';

// ---------- Design Tokens ----------
const C = {
  cream: '#F6EFE2',
  creamSoft: '#FBF6EC',
  paper: '#FFFEFA',
  ink: '#2A1E22',
  inkSoft: '#5C4A4F',
  inkMuted: '#8C7A7E',
  terracotta: '#C8553D',
  terracottaDark: '#A8412C',
  sage: '#7E9678',
  sageDark: '#5E7A5A',
  saffron: '#D9A441',
  rose: '#E8B4A0',
  divider: '#E8DECB',
  premium: '#1B1517',
};

// ---------- Data ----------
const MOM_TYPES = [
  { id: 'working', label: 'Working mom', icon: Briefcase },
  { id: 'sahm',    label: 'Stay-at-home', icon: Home },
  { id: 'solo',    label: 'Solo mom',     icon: Sun },
  { id: 'new',     label: 'New mom',      icon: Flower2 },
  { id: 'multi',   label: 'Multi-kid',    icon: Sparkles },
  { id: 'hybrid',  label: 'Hybrid / WFH', icon: Coffee },
  { id: 'prefer_not', label: 'Prefer not to say', icon: Lock },
];

const VALUES = [
  'Gentle parenting','Outdoorsy','Bookworm','Honest & open',
  'Slow living','Playful','Adventurous','Multilingual home','Faith-based',
];
const VALUE_NO_PREF = 'No preference';

const INTERESTS = [
  { label: 'Coffee dates',      icon: Coffee },
  { label: 'Park hangs',        icon: TreePine },
  { label: 'Stroller walks',    icon: Leaf },
  { label: 'Art & craft',       icon: Palette },
  { label: 'Book club',         icon: BookOpen },
  { label: 'Yoga / fitness',    icon: Flower2 },
  { label: 'Music time',        icon: Music },
  { label: 'Markets',           icon: Sparkles },
];
const INTEREST_NO_PREF = 'Surprise me';

const KID_AGES = ['0–1','1–3','3–5','5–8','8–12','12–18'];

const NEIGHBORHOODS = [
  // SF Bay Area
  'Mission, SF', 'Bernal Heights, SF', 'Noe Valley, SF', 'Castro, SF',
  'Hayes Valley, SF', 'Pacific Heights, SF', 'Marina, SF', 'North Beach, SF',
  'Outer Sunset, SF', 'Glen Park, SF', 'Potrero Hill, SF', 'Inner Richmond, SF',
  'Cole Valley, SF', 'Dogpatch, SF', 'Russian Hill, SF',
  'Oakland, CA', 'Berkeley, CA', 'Sausalito, CA',
  // LA
  'Silver Lake, LA', 'Echo Park, LA', 'Pasadena, CA', 'Santa Monica, CA',
  'Manhattan Beach, CA', 'Venice, CA', 'Culver City, CA',
  // NYC
  'Brooklyn, NY', 'Park Slope, Brooklyn', 'Williamsburg, Brooklyn',
  'Cobble Hill, Brooklyn', 'Upper West Side, NYC', 'Astoria, Queens',
  // Chicago
  'Lincoln Park, Chicago', 'Lakeview, Chicago', 'Logan Square, Chicago',
  'Wicker Park, Chicago',
  // Boston
  'Cambridge, MA', 'Brookline, MA', 'Somerville, MA', 'Boston, MA',
  // Pacific NW
  'Capitol Hill, Seattle', 'Ballard, Seattle', 'Seattle, WA',
  'Portland, OR', 'Beaverton, OR',
  // Texas
  'Austin, TX', 'South Congress, Austin', 'Dallas, TX', 'Houston, TX',
  // Florida
  'Tampa, FL', 'Hyde Park, Tampa', 'South Tampa, FL', 'Seminole Heights, Tampa',
  'St. Petersburg, FL', 'Clearwater, FL',
  'Miami, FL', 'Miami Beach, FL', 'Coconut Grove, Miami', 'Orlando, FL',
  // Mountain & SW
  'Denver, CO', 'Boulder, CO', 'Phoenix, AZ', 'Scottsdale, AZ', 'Salt Lake City, UT',
  // Southeast
  'Atlanta, GA', 'Decatur, GA', 'Nashville, TN', 'Charlotte, NC',
  'Raleigh, NC', 'Asheville, NC', 'Charleston, SC',
  // Midwest & East
  'Minneapolis, MN', 'Madison, WI', 'Detroit, MI',
  'Washington, DC', 'Bethesda, MD', 'Arlington, VA', 'Philadelphia, PA',
];

const DISTANCES = [
  { val: 5,   label: '5 mi' },
  { val: 10,  label: '10 mi' },
  { val: 20,  label: '20 mi' },
  { val: 50,  label: '50 mi' },
  { val: 100, label: '100 mi' },
  { val: 150, label: '150+ mi' },
];

// Real places organized by category (San Francisco area)
const PLACES = {
  cafes: [
    { id:'bb-mission',   name:'Blue Bottle',     area:'Mission',      dist: 0.3,
      desc:'Bright, oat milk fans, fast WiFi',
      tags:['Stroller','Highchairs','Street parking'] },
    { id:'sg-7th',       name:'Sightglass',      area:'SoMa',         dist: 1.1,
      desc:'Industrial chic, espresso forward',
      tags:['Stroller-OK','Quiet','Paid lot'] },
    { id:'mill',         name:'The Mill',        area:'NoPa',         dist: 2.2,
      desc:'Famous toast, light bites, kid-loved',
      tags:['Stroller','Kids menu','Street parking'] },
    { id:'reveille',     name:'Reveille',        area:'Castro',       dist: 0.9,
      desc:'Sunny patio, wide aisles for strollers',
      tags:['Stroller','Patio','Street parking'] },
    { id:'andytown',     name:'Andytown',        area:'Outer Sunset', dist: 4.4,
      desc:'Beach vibe, Snowy Plover signature',
      tags:['Stroller','Outdoor','Free parking'] },
    { id:'jane',         name:'Jane',            area:'Polk Gulch',   dist: 2.1,
      desc:'Healthy bowls, juices, quick bites',
      tags:['Highchairs','Quick','Metered'] },
    { id:'ritual',       name:'Ritual',          area:'Mission',      dist: 0.4,
      desc:"Classic SF coffee, locals' regular",
      tags:['Stroller','WiFi','Street parking'] },
    { id:'fourbarrel',   name:'Four Barrel',     area:'Mission',      dist: 0.5,
      desc:'Hip, slow-brewed coffee specialists',
      tags:['Stroller','Outdoor','Street parking'] },
  ],
  parks: [
    { id:'dolores',      name:'Dolores Park',    area:'Mission',     dist: 0.2,
      desc:'Iconic hangout, picnic energy',
      tags:['Stroller paths','Restrooms','Street parking'] },
    { id:'crissy',       name:'Crissy Field',    area:'Marina',      dist: 3.3,
      desc:'Bay views, runs, beach access',
      tags:['Beach','Restrooms','Free lot'] },
    { id:'altaplaza',    name:'Alta Plaza',      area:'Pac Heights', dist: 2.4,
      desc:'Hilltop, dog-friendly, sweeping views',
      tags:['Playground','Steep paths','Street parking'] },
    { id:'goldengate',   name:'Golden Gate Park',area:'Inner Sunset',dist: 3.1,
      desc:'Massive — lakes, gardens, museums',
      tags:['Vast','Restrooms','Paid lot'] },
    { id:'lafayette',    name:'Lafayette Park',  area:'Pac Heights', dist: 2.3,
      desc:'Quiet, dog park, calm vibe',
      tags:['Playground','Restrooms','Street parking'] },
    { id:'bernal',       name:'Bernal Heights Pk',area:'Bernal',      dist: 1.0,
      desc:'Killer 360° views, off-leash zone',
      tags:['Hilly','Off-leash','Street parking'] },
    { id:'presidio',     name:'Presidio',        area:'Presidio',    dist: 4.0,
      desc:'Forest paths, cafés tucked inside',
      tags:['Stroller paths','Cafés','Free lot'] },
    { id:'fortmason',    name:'Fort Mason',      area:'Marina',      dist: 3.0,
      desc:'Waterfront, big lawns, food trucks',
      tags:['Lawns','Restrooms','Free lot'] },
  ],
  playgrounds: [
    { id:'helendiller',  name:'Helen Diller',    area:'Dolores Park', dist: 0.2,
      desc:'Newest design, splash pad in summer',
      tags:['Splash pad','Restrooms','Street parking'] },
    { id:'koret',        name:"Koret Children's",area:'Golden Gate Pk',dist: 3.2,
      desc:'Carousel, big climbs, classic SF',
      tags:['Carousel','Restrooms','Paid lot'] },
    { id:'yerbabuena',   name:'Yerba Buena',     area:'SoMa',         dist: 1.6,
      desc:'Indoor option, bowling + ice rink nearby',
      tags:['Indoor','Restrooms','Paid lot'] },
    { id:'huntington',   name:'Huntington',      area:'Nob Hill',     dist: 2.0,
      desc:'Quiet, fountains, smaller scale',
      tags:['Quiet','Restrooms','Street parking'] },
    { id:'mountainlake', name:'Mountain Lake',   area:'Inner Richmond',dist: 4.0,
      desc:'Lake-side, ducks, picnic tables',
      tags:['Picnic','Restrooms','Free lot'] },
  ],
  museums: [
    { id:'calacademy',   name:'CA Academy of Sciences',area:'Golden Gate Pk',dist: 3.3,
      desc:'Aquarium + planetarium + rainforest',
      tags:['All-day','Café','Paid lot'] },
    { id:'badm',         name:'Bay Area Discovery',     area:'Sausalito',    dist: 8.0,
      desc:'Hands-on, outdoor exhibits, water play',
      tags:['Hands-on','Outdoor','Free lot'] },
    { id:'ccm',          name:"Children's Creativity",  area:'SoMa',         dist: 1.5,
      desc:'Tinker labs, art, animation studio',
      tags:['Hands-on','Café','Paid lot'] },
    { id:'deyoung',      name:'de Young',               area:'Golden Gate Pk',dist: 3.4,
      desc:'Family Sundays free, art + workshops',
      tags:['Stroller','Café','Paid lot'] },
    { id:'disney',       name:'Walt Disney Family',     area:'Presidio',     dist: 4.2,
      desc:'Animation history, calm pace',
      tags:['Quiet','Stroller','Free lot'] },
    { id:'exploratorium',name:'Exploratorium',          area:'Embarcadero',  dist: 2.5,
      desc:'Hands-on science wonderland',
      tags:['Hands-on','Café','Paid lot'] },
  ],
  indoor: [
    { id:'recess',       name:'Recess SF',       area:'Dogpatch',       dist: 1.8,
      desc:'Drop-in play, café for parents',
      tags:['Hands-on','Café','Paid lot'] },
    { id:'tumbletea',    name:'Tumble + Tea',    area:'Inner Richmond', dist: 3.8,
      desc:'Tumble class + tea bar',
      tags:['Indoor','Café','Street parking'] },
    { id:'habitot',      name:'Habitot',         area:'Berkeley',       dist: 13.0,
      desc:'Hands-on for under-5s, dress-up',
      tags:['Toddlers','Restrooms','Paid lot'] },
    { id:'mrsdoubtfire', name:'Cosmic Kids',     area:'Mission',        dist: 0.6,
      desc:'Yoga + play classes for tots',
      tags:['Classes','Stroller','Street parking'] },
  ],
  libraries: [
    { id:'lib-mission',  name:'Mission Branch',     area:'Mission',     dist: 0.4,
      desc:'Story time Wed mornings',
      tags:['Story time','Restrooms','Street parking'] },
    { id:'lib-glen',     name:'Glen Park Branch',   area:'Glen Park',   dist: 1.7,
      desc:"Modern, kids' floor, near BART",
      tags:['Story time','Restrooms','Free lot'] },
    { id:'lib-bernal',   name:'Bernal Branch',      area:'Bernal',      dist: 1.1,
      desc:'Charming, friendly staff, garden',
      tags:['Quiet','Restrooms','Street parking'] },
    { id:'lib-northbeach',name:'North Beach Branch',area:'North Beach', dist: 2.7,
      desc:'Beautiful new building, light-filled',
      tags:['Story time','Restrooms','Street parking'] },
    { id:'lib-noe',      name:'Noe Valley Branch',  area:'Noe Valley',  dist: 1.3,
      desc:'Story Tue + Fri, popular with locals',
      tags:['Story time','Restrooms','Street parking'] },
  ],
  homes: [
    { id:'home-yours',   name:'Your place',         area:'Hosted by you',     dist: 0,
      desc:'Cozy, no driving, kids in their space',
      tags:['Comfort','Snacks ready','No driving'] },
    { id:'home-hers',    name:'Her place',          area:'Hosted by her',     dist: 0,
      desc:'New scene, less prep on your side',
      tags:['Less prep','New space','Light driving'] },
    { id:'home-flex',    name:'Either home',        area:'Whatever works',    dist: 0,
      desc:'Trade off, whoever has the easier day',
      tags:['Flexible','Easy','Easy'] },
  ],
  zoos: [
    { id:'sfzoo',        name:'SF Zoo',             area:'Outer Sunset',      dist: 5.5,
      desc:'Classic, lots of walking, train ride',
      tags:['Stroller','Café','Paid lot'] },
    { id:'oakzoo',       name:'Oakland Zoo',        area:'Oakland Hills',     dist: 12.0,
      desc:'Newer, gondola ride, California Trail',
      tags:['Stroller','Café','Paid lot'] },
    { id:'aqbay',        name:'Aquarium of the Bay',area:'Embarcadero',       dist: 2.8,
      desc:'Marine life, smaller, central spot',
      tags:['Stroller','Café','Paid lot'] },
  ],
  water: [
    { id:'baker',        name:'Baker Beach',        area:'Presidio',          dist: 4.5,
      desc:'GG Bridge views, calm waves',
      tags:['Bring towels','Restrooms','Free lot'] },
    { id:'ocean',        name:'Ocean Beach',        area:'Outer Sunset',      dist: 5.0,
      desc:'Wide, windy, dramatic surf',
      tags:['Bring layers','Restrooms','Free lot'] },
    { id:'crissy-bch',   name:'Crissy Beach',       area:'Marina',            dist: 3.4,
      desc:'Calmer water, bridge views, wide',
      tags:['Stroller','Restrooms','Free lot'] },
    { id:'stow',         name:'Stow Lake',          area:'Golden Gate Pk',    dist: 3.5,
      desc:'Pedal boats, ducks, easy loop',
      tags:['Boats','Restrooms','Free lot'] },
    { id:'aquatic-park', name:'Aquatic Park Lagoon',area:'North Beach',       dist: 3.2,
      desc:'Calm bay swimming, sandy beach',
      tags:['Calm water','Restrooms','Paid lot'] },
    { id:'mountain-lake',name:'Mountain Lake',      area:'Inner Richmond',    dist: 4.0,
      desc:'Tiny lake, easy stroll, ducks',
      tags:['Easy','Restrooms','Free lot'] },
  ],
  pools: [
    { id:'mission-pool', name:'Mission Pool',       area:'Mission',           dist: 0.5,
      desc:'Outdoor, summer only, family hours',
      tags:['Outdoor','Family swim','Street parking'] },
    { id:'hamilton',     name:'Hamilton Rec Pool',  area:'Pac Heights',       dist: 2.5,
      desc:'Year-round indoor, swim lessons',
      tags:['Indoor','Lessons','Street parking'] },
    { id:'northbeach-p', name:'North Beach Pool',   area:'North Beach',       dist: 2.7,
      desc:'Indoor, drop-in classes',
      tags:['Indoor','Classes','Street parking'] },
    { id:'rossi',        name:'Rossi Pool',         area:'Inner Richmond',    dist: 3.6,
      desc:'Outdoor, less crowded, neighborhood gem',
      tags:['Outdoor','Family swim','Free lot'] },
    { id:'sava',         name:'Sava Pool',          area:'Outer Sunset',      dist: 4.8,
      desc:'Newer, popular for kids, slide',
      tags:['Indoor','Lessons','Free lot'] },
  ],
};

const PLACE_CATEGORIES = [
  { id:'cafes',       label:'Cafés',       icon: Coffee },
  { id:'parks',       label:'Parks',       icon: TreePine },
  { id:'playgrounds', label:'Playgrounds', icon: Sparkles },
  { id:'museums',     label:'Museums',     icon: Building2 },
  { id:'indoor',      label:'Indoor play', icon: Home },
  { id:'libraries',   label:'Libraries',   icon: Library },
  { id:'homes',       label:'Home meetups',icon: Users },
  { id:'zoos',        label:'Zoos',        icon: PawPrint },
  { id:'water',       label:'Beaches',     icon: Waves },
  { id:'pools',       label:'Pools',       icon: Droplets },
];
const PLACES_NO_PREF = 'any';

// Helper to look up a place across all categories
const findPlace = (id) => {
  for (const cat of Object.keys(PLACES)) {
    const p = PLACES[cat].find(x => x.id === id);
    if (p) return { ...p, category: cat };
  }
  return null;
};

// Suggested group events — surfaced when user picks calendar slots that match
// `bucket` maps each event to a rough time-of-day so we can match to TIME_WINDOWS
const SUGGESTED_EVENTS = [
  { id:'e-stroller-run', day:'Tue', bucket:'morning', time:'9:00 AM',  name:'Stroller Run',
    place:'Dolores Park · north end',  going: 8,  recurring:'Weekly',  tags:['Stroller','Free','All paces'],
    hue:'linear-gradient(135deg, #C8553D 0%, #D9A441 100%)' },
  { id:'e-coffee-mom',   day:'Thu', bucket:'morning', time:'10:00 AM', name:'Mom Coffee Hour',
    place:'Blue Bottle · Mission',     going: 5,  recurring:'Weekly',  tags:['Toddlers OK','Highchairs'],
    hue:'linear-gradient(135deg, #7E9678 0%, #B5C9AB 100%)' },
  { id:'e-helen-play',   day:'Sat', bucket:'morning', time:'10:30 AM', name:'Saturday Playgroup',
    place:'Helen Diller Playground',   going: 12, recurring:'Weekly',  tags:['Ages 1–4','Splash pad'],
    hue:'linear-gradient(135deg, #D9A441 0%, #C8553D 100%)' },
  { id:'e-storytime',    day:'Wed', bucket:'morning', time:'10:00 AM', name:'Storytime + Coffee',
    place:'Mission Library',           going: 6,  recurring:'Weekly',  tags:['Free','Ages 0–3'],
    hue:'linear-gradient(135deg, #B98EB6 0%, #C8553D 100%)' },
  { id:'e-yoga',         day:'Fri', bucket:'morning', time:'9:30 AM',  name:'Mom + Baby Yoga',
    place:'Cosmic Kids · Mission',     going: 4,  recurring:'Weekly',  tags:['Bring mat','45 min'],
    hue:'linear-gradient(135deg, #D7997D 0%, #D9A441 100%)' },
  { id:'e-sat-brunch',   day:'Sat', bucket:'midday', time:'12:30 PM',  name:'Sat Mom Brunch',
    place:"Reveille · Castro",         going: 7,  recurring:'Weekly',  tags:['Patio','Kids menu'],
    hue:'linear-gradient(135deg, #5A7E55 0%, #7E9678 100%)' },
  { id:'e-park-pic',     day:'Sun', bucket:'midday', time:'1:00 PM',   name:'Sunday Park Picnic',
    place:'Bernal Heights · summit',   going: 9,  recurring:'Weekly',  tags:['Bring blanket','Kids run free'],
    hue:'linear-gradient(135deg, #C8553D 0%, #B98EB6 100%)' },
  { id:'e-evening-walk', day:'Mon', bucket:'evening',time:'6:00 PM',   name:'Sunset Stroll',
    place:'Crissy Field',              going: 5,  recurring:'Weekly',  tags:['Stroller','Bay views'],
    hue:'linear-gradient(135deg, #7E9678 0%, #D9A441 100%)' },
];

// Map TIME_WINDOWS → coarse bucket for matching events
const WINDOW_TO_BUCKET = {
  'early':     'morning',   // 6–9 AM
  'morning':   'morning',   // 9 AM–12 PM
  'lunch':     'midday',    // 12–2 PM
  'afternoon': 'midday',    // 2–5 PM
  'evening':   'evening',   // 5–8 PM
  'night':     'evening',   // 8 PM+
};

// Top picks — hand-curated best-reviewed places, with rating + review count
const TOP_PICKS = [
  { placeId:'dolores',     rating: 4.9, reviews: 247, badge:'Mom favorite' },
  { placeId:'helendiller', rating: 4.9, reviews: 156, badge:'Trending'     },
  { placeId:'bb-mission',  rating: 4.8, reviews: 189, badge:'Top rated'    },
  { placeId:'calacademy',  rating: 4.8, reviews: 312, badge:'Best for kids'},
  { placeId:'recess',      rating: 4.7, reviews: 134, badge:'Editor pick'  },
];

// Refined editorial badge metadata — semantic icon + tinted color per badge
const BADGE_META = {
  'Mom favorite':  { icon: Heart,    color: '#C8553D', fill: true  },  // terracotta, filled
  'Trending':      { icon: Flame,    color: '#B85A3D', fill: false },  // warm orange
  'Top rated':     { icon: Star,     color: '#A0791E', fill: true  },  // dark amber (saffron deepened)
  'Best for kids': { icon: Sparkles, color: '#5E7A5A', fill: false },  // sageDark
  'Editor pick':   { icon: Award,    color: '#2A1E22', fill: false },  // ink
  'Yours':         { icon: Sparkles, color: '#5E7A5A', fill: false },  // sageDark — user-added places
};

const PLACE_CATEGORIES_ALL_DATA = PLACE_CATEGORIES; // alias kept for clarity

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_LABELS = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday', Sun:'Sunday' };
const TIME_WINDOWS = [
  { id: 'early',     label: '6–9 AM' },
  { id: 'morning',   label: '9 AM–12 PM' },
  { id: 'lunch',     label: '12–2 PM' },
  { id: 'afternoon', label: '2–5 PM' },
  { id: 'evening',   label: '5–8 PM' },
  { id: 'night',     label: '8 PM+' },
];

const SAMPLE_MOMS = [
  {
    id: 1, name: 'Sara K.', age: 32, kids: '2y · 4y', type: 'Working mom',
    overlap: 87, distance: '0.6 mi',
    tags: ['Coffee dates','Same kid ages','Tue mornings'],
    nextSlot: 'Tue · 9:30 AM',
    nextPlace: 'Blue Bottle, Mission',
    hue: 'linear-gradient(135deg,#E8B4A0,#C8553D)',
    bio: 'Lawyer turned half-time. Toddler tantrum survivor. Always down for an iced oat latte and a stroller loop.',
    values: ['Gentle parenting','Honest & open','Slow living'],
    interests: ['Coffee dates','Park hangs','Book club'],
    freeSlots: ['Tue-morning','Thu-morning','Sat-morning','Sat-afternoon','Sun-afternoon'],
    verified: true,
  },
  {
    id: 2, name: 'Mei L.', age: 35, kids: '1y',  type: 'New mom',
    overlap: 74, distance: '1.2 mi',
    tags: ['Stroller walks','New mom','Wed afternoons'],
    nextSlot: 'Wed · 3:00 PM',
    nextPlace: 'Dolores Park',
    hue: 'linear-gradient(135deg,#D9A441,#C8553D)',
    bio: 'First-time mom finding her rhythm. Loves slow walks, slow mornings, and warm pastries.',
    values: ['Slow living','Bookworm','Honest & open'],
    interests: ['Stroller walks','Coffee dates','Markets'],
    freeSlots: ['Mon-morning','Tue-morning','Wed-morning','Tue-afternoon','Wed-afternoon','Thu-morning'],
    verified: true,
  },
  {
    id: 3, name: 'Aisha R.', age: 30, kids: '3y · 5y', type: 'Stay-at-home',
    overlap: 82, distance: '0.9 mi',
    tags: ['Park hangs','Outdoorsy','Sat mornings'],
    nextSlot: 'Sat · 10:00 AM',
    nextPlace: 'Alta Plaza Park',
    hue: 'linear-gradient(135deg,#7E9678,#5E7A5A)',
    bio: 'Two boys, one ridiculous dog. We live at the park. Bring snacks and we are friends.',
    values: ['Outdoorsy','Playful','Adventurous'],
    interests: ['Park hangs','Art & craft','Music time'],
    freeSlots: ['Mon-early','Tue-early','Wed-early','Sat-morning','Sat-afternoon','Sun-morning','Sun-afternoon'],
    verified: false,
  },
  {
    id: 4, name: 'Priya N.', age: 33, kids: '2y',     type: 'Hybrid / WFH',
    overlap: 79, distance: '1.6 mi',
    tags: ['Yoga','Bookworm','Thu mornings'],
    nextSlot: 'Thu · 9:00 AM',
    nextPlace: 'Yoga Tree, Hayes',
    hue: 'linear-gradient(135deg,#E8B4A0,#D9A441)',
    bio: 'WFH PM by day, toddler-chasing yogi by everything else. Looking for someone to actually finish a sentence with.',
    values: ['Bookworm','Slow living','Multilingual home'],
    interests: ['Yoga / fitness','Coffee dates','Book club'],
    freeSlots: ['Mon-morning','Tue-morning','Wed-morning','Thu-morning','Fri-morning','Sat-morning'],
    verified: true,
  },
];

// Larger pool of moms for "how many available" count + face stack — initials only,
// no full profile (those live in SAMPLE_MOMS). Realistic varied schedules so the
// count feels honest as the user toggles their calendar.
const MOM_POOL = [
  { id:'p1',  init:'EM', hue:'linear-gradient(135deg,#E8B4A0,#C8553D)', freeSlots:['Mon-morning','Tue-morning','Wed-morning'] },
  { id:'p2',  init:'JL', hue:'linear-gradient(135deg,#D9A441,#C8553D)', freeSlots:['Tue-morning','Thu-morning','Sat-morning'] },
  { id:'p3',  init:'NK', hue:'linear-gradient(135deg,#7E9678,#5E7A5A)', freeSlots:['Mon-afternoon','Wed-afternoon','Fri-afternoon'] },
  { id:'p4',  init:'AM', hue:'linear-gradient(135deg,#B98EB6,#C8553D)', freeSlots:['Sat-morning','Sat-afternoon','Sun-morning'] },
  { id:'p5',  init:'TR', hue:'linear-gradient(135deg,#E8B4A0,#D9A441)', freeSlots:['Tue-evening','Wed-evening','Thu-evening'] },
  { id:'p6',  init:'CH', hue:'linear-gradient(135deg,#D7997D,#D9A441)', freeSlots:['Mon-morning','Wed-morning','Fri-morning','Sat-morning'] },
  { id:'p7',  init:'JR', hue:'linear-gradient(135deg,#5A7E55,#7E9678)', freeSlots:['Wed-afternoon','Fri-afternoon','Sat-lunch'] },
  { id:'p8',  init:'MK', hue:'linear-gradient(135deg,#C8553D,#B98EB6)', freeSlots:['Tue-morning','Thu-morning','Sat-morning','Sun-morning'] },
  { id:'p9',  init:'SR', hue:'linear-gradient(135deg,#7E9678,#D9A441)', freeSlots:['Mon-evening','Wed-evening','Sun-afternoon'] },
  { id:'p10', init:'BL', hue:'linear-gradient(135deg,#E8B4A0,#D9A441)', freeSlots:['Tue-afternoon','Thu-afternoon','Sat-afternoon'] },
  { id:'p11', init:'KP', hue:'linear-gradient(135deg,#9CB397,#7E9678)', freeSlots:['Mon-morning','Tue-morning','Wed-morning','Thu-morning','Fri-morning'] },
  { id:'p12', init:'OW', hue:'linear-gradient(135deg,#D9A441,#7E9678)', freeSlots:['Sat-early','Sun-early','Sat-morning'] },
  { id:'p13', init:'AC', hue:'linear-gradient(135deg,#E8B4A0,#B98EB6)', freeSlots:['Mon-lunch','Wed-lunch','Fri-lunch'] },
  { id:'p14', init:'IK', hue:'linear-gradient(135deg,#C8553D,#7E9678)', freeSlots:['Tue-morning','Tue-afternoon','Thu-morning'] },
];

// Combine all moms (with full profile + pool) for matching count
const ALL_AVAILABLE_MOMS = [
  ...SAMPLE_MOMS.map(m => ({ id:`s${m.id}`, init: m.name.split(' ').map(s=>s[0]).join(''), hue: m.hue, freeSlots: m.freeSlots })),
  ...MOM_POOL,
];

const matchingMoms = (userSlots) => {
  if (!userSlots || !userSlots.length) return [];
  return ALL_AVAILABLE_MOMS.filter(m => m.freeSlots.some(s => userSlots.includes(s)));
};

const EVENTS = [
  { title: 'Toddler music circle', when: 'Thu · 10 AM', where: 'Bernal Heights Library', going: 12, hue: 'linear-gradient(135deg,#D9A441,#E8B4A0)' },
  { title: 'Stroller walk + matcha', when: 'Sat · 9 AM',  where: 'Crissy Field',           going: 24, hue: 'linear-gradient(135deg,#7E9678,#9CB397)' },
  { title: 'New-mom slow morning',   when: 'Wed · 11 AM', where: 'The Mill',                going: 8,  hue: 'linear-gradient(135deg,#C8553D,#E8B4A0)' },
];

// ---------- Tiny SVG ornaments ----------
const Sprig = ({ className='', style={}, color=C.sage }) => (
  <svg viewBox="0 0 60 60" className={className} style={style} fill="none">
    <path d="M30 8 C30 28, 30 40, 30 54" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M30 18 C24 14, 18 14, 14 18 C20 22, 26 22, 30 20"   fill={color} opacity=".55"/>
    <path d="M30 26 C36 22, 42 22, 46 26 C40 30, 34 30, 30 28"  fill={color} opacity=".55"/>
    <path d="M30 36 C25 33, 20 33, 16 37 C22 40, 27 40, 30 38"  fill={color} opacity=".55"/>
  </svg>
);

// MamaLogo — round seal mark · two leaves form a heart, terracotta + sage
const MamaLogo = ({ size = 84, className = '', style = {} }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style}>
    {/* Outer dotted ring — wax-seal feel */}
    <circle cx="50" cy="50" r="48" fill="none" stroke={C.ink} strokeWidth="0.5"
            strokeDasharray="0.6 2.6" opacity="0.4"/>
    {/* Inner thin ring */}
    <circle cx="50" cy="50" r="44" fill="none" stroke={C.ink} strokeWidth="0.4" opacity="0.22"/>
    {/* Cream interior */}
    <circle cx="50" cy="50" r="42" fill={C.creamSoft}/>

    {/* Two leaves curling inward to form a heart */}
    {/* Left leaf — terracotta */}
    <path d="M 50 76 C 38 70 25 60 23 45 C 22 33 31 26 40 30 C 47 33 50 41 50 50 Z"
          fill={C.terracotta} opacity="0.92"/>
    {/* Right leaf — sage */}
    <path d="M 50 76 C 62 70 75 60 77 45 C 78 33 69 26 60 30 C 53 33 50 41 50 50 Z"
          fill={C.sageDark} opacity="0.92"/>
    {/* Center vein down the middle */}
    <line x1="50" y1="32" x2="50" y2="74" stroke={C.cream} strokeWidth="0.7" opacity="0.55"/>
    {/* Stem rising at the top */}
    <path d="M 50 32 L 50 22" stroke={C.ink} strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    {/* Saffron berry/dot at top of stem */}
    <circle cx="50" cy="20" r="2" fill={C.saffron}/>
  </svg>
);

const Sun3 = ({ className='', style={}, color=C.saffron }) => (
  <svg viewBox="0 0 80 80" className={className} style={style} fill="none">
    <circle cx="40" cy="40" r="14" fill={color} opacity=".85"/>
    {Array.from({length:12}).map((_,i)=>{
      const a = (i/12)*Math.PI*2;
      const x1 = 40+Math.cos(a)*22, y1 = 40+Math.sin(a)*22;
      const x2 = 40+Math.cos(a)*30, y2 = 40+Math.sin(a)*30;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    })}
  </svg>
);

// ---------- Layout: Phone Frame ----------
const PhoneFrame = ({ children }) => (
  <div className="relative" style={{
    width: 'min(390px, calc(100vw - 16px))',
    height: 'min(820px, calc(100vh - 24px))',
    maxHeight: 820,
    borderRadius: 54, padding: 12,
    background: '#1B1517',
    boxShadow: '0 40px 80px -20px rgba(42,30,34,.45), 0 0 0 1px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.06)',
  }}>
    <div className="relative w-full h-full overflow-hidden" style={{
      borderRadius: 42, background: C.cream,
    }}>
      {/* Notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-50" style={{
        top: 10, width: 110, height: 30, borderRadius: 20, background: '#1B1517'
      }}/>
      {children}
    </div>
  </div>
);

// ---------- Status Bar ----------
const StatusBar = ({ light=false }) => (
  <div className="flex items-center justify-between px-7 pt-3" style={{ height: 44, color: light ? '#fff' : C.ink }}>
    <span className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>9:41</span>
    <div className="flex items-center gap-1">
      <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><path d="M8 8.5c.7 0 1.3.6 1.3 1.3M5.4 6.1a3.5 3.5 0 0 1 5.2 0M2.8 3.5a7 7 0 0 1 10.4 0"/></svg>
      <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="3" width="2" height="5" rx="1"/><rect x="3" y="2" width="2" height="6" rx="1"/><rect x="6" y="1" width="2" height="7" rx="1"/><rect x="9" y="0" width="2" height="8" rx="1"/></svg>
      <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="18" height="10" rx="2.5" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="20" y="3.5" width="1.2" height="4" rx=".5" fill="currentColor"/></svg>
    </div>
  </div>
);

// ---------- Reusable Bits ----------
const Pill = ({ active, children, onClick, size='md' }) => (
  <button onClick={onClick}
    className="transition-all"
    style={{
      padding: size==='sm' ? '7px 12px' : '10px 16px',
      borderRadius: 999, fontSize: size==='sm' ? 12.5 : 14,
      fontFamily: 'Albert Sans', fontWeight: 500,
      border: `1px solid ${active ? C.ink : C.divider}`,
      background: active ? C.ink : C.paper,
      color: active ? C.cream : C.ink,
    }}>
    {children}
  </button>
);

const Dot = ({ on }) => (
  <div className="transition-all" style={{
    width: on ? 22 : 6, height: 6, borderRadius: 4,
    background: on ? C.terracotta : C.divider,
  }}/>
);

const StepHeader = ({ step, total, onBack, onSkip }) => (
  <div className="flex items-center justify-between px-6 pt-2 pb-4">
    <button onClick={onBack} disabled={step===0} className="w-9 h-9 flex items-center justify-center rounded-full"
      style={{ background: step===0 ? 'transparent' : C.paper, color: step===0 ? 'transparent' : C.ink, border: step===0?'none':`1px solid ${C.divider}` }}>
      <ArrowLeft size={16}/>
    </button>
    <div className="flex gap-1.5">
      {Array.from({length: total}).map((_,i)=> <Dot key={i} on={i===step}/>)}
    </div>
    <button onClick={onSkip} className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
      {step < total-1 ? 'Skip' : ''}
    </button>
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled, variant='dark' }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full transition-all active:scale-[.98]"
    style={{
      height: 56, borderRadius: 18,
      background: disabled ? '#D8CCB6' : (variant==='dark' ? C.ink : C.terracotta),
      color: variant==='dark' ? C.cream : '#fff',
      fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 15.5,
      letterSpacing: '.02em',
      boxShadow: disabled ? 'none' : '0 12px 24px -10px rgba(42,30,34,.45)',
      display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
    }}>
    {children}
  </button>
);

// ====================================================================
// SCREEN 1 — Loneliness + market insight (editorial cover)
// ====================================================================
// ====================================================================
// SPLASH — first thing you see · magazine cover treatment
// ====================================================================
const Splash = ({ onBegin }) => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ background: C.cream }}>
    {/* Atmosphere — same washes as Screen 1, turned up so it dominates */}
    <div className="absolute pointer-events-none" style={{
      top: -160, right: -120, width: 420, height: 420, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.rose}CC 0%, transparent 60%)`, zIndex: 0,
    }}/>
    <div className="absolute pointer-events-none" style={{
      bottom: -140, left: -140, width: 380, height: 380, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.sage}66 0%, transparent 60%)`, zIndex: 0,
    }}/>
    <div className="absolute pointer-events-none" style={{
      top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 280, height: 280, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.saffron}22 0%, transparent 70%)`, zIndex: 0,
    }}/>
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity: .35, mixBlendMode: 'multiply', zIndex: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .15 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}/>

    <div style={{ position:'relative', zIndex: 1 }}>
      <StatusBar/>
    </div>

    {/* Masthead — top */}
    <div className="px-7 pt-4" style={{ position:'relative', zIndex: 1, animation: 'fadeInUp .7s ease both' }}>
      <div className="flex items-center gap-2.5">
        <div className="h-px flex-1" style={{ background: C.ink, opacity:.3 }}/>
        <div className="text-[9.5px] tracking-[.34em] uppercase" style={{ color: C.ink, fontFamily:'Albert Sans', fontWeight:700 }}>
          The Mama Report · Issue 01
        </div>
        <div className="h-px flex-1" style={{ background: C.ink, opacity:.3 }}/>
      </div>
    </div>

    {/* Hero — logo + wordmark + moto, vertically centered */}
    <div className="flex-1 flex flex-col items-center justify-center px-7" style={{ position:'relative', zIndex: 1 }}>
      {/* Logo mark */}
      <div style={{ animation: 'fadeInUp .8s .1s ease both' }}>
        <MamaLogo size={88}/>
      </div>

      {/* Wordmark — smaller than before, sits under the logo */}
      <div className="relative mt-3" style={{ animation: 'fadeInUp .8s .2s ease both' }}>
        <h1 className="text-center" style={{
          fontFamily:'Fraunces', fontWeight: 400, fontSize: 64, lineHeight: 1,
          letterSpacing:'-.04em', color: C.ink,
        }}>
          Mam<span style={{ fontStyle:'italic', color: C.terracotta, fontWeight: 500 }}>a</span>
        </h1>
      </div>

      {/* Em-dash divider */}
      <div className="flex items-center justify-center gap-3 mt-4" style={{ animation: 'fadeInUp .7s .35s ease both' }}>
        <div className="h-px w-10" style={{ background: C.ink, opacity:.3 }}/>
        <div style={{ color: C.inkMuted, fontFamily:'Fraunces', fontSize: 14, lineHeight: 1 }}>⸻</div>
        <div className="h-px w-10" style={{ background: C.ink, opacity:.3 }}/>
      </div>

      {/* Moto — primary line */}
      <div className="mt-3 text-center" style={{ animation: 'fadeInUp .7s .45s ease both' }}>
        <div style={{
          fontFamily:'Fraunces', fontSize: 19, fontWeight: 400, fontStyle:'italic',
          color: C.ink, letterSpacing:'-.01em', lineHeight: 1.3,
        }}>
          Your kids need <span style={{ color: C.sageDark, fontWeight: 500 }}>friends</span>,<br/>
          and so do <span style={{ color: C.terracotta, fontWeight: 500 }}>you</span>.
        </div>
      </div>

      {/* Moto — promise line */}
      <div className="mt-3 text-center" style={{ animation: 'fadeInUp .7s .55s ease both' }}>
        <div style={{
          fontFamily:'Fraunces', fontSize: 14, fontWeight: 400,
          color: C.inkSoft, letterSpacing:'-.005em', lineHeight: 1.4,
        }}>
          <span style={{ fontStyle:'italic', color: C.terracotta, fontWeight: 500 }}>Mama</span> will make it happen.
        </div>
      </div>
    </div>

    {/* Bottom — cover-lines + CTA */}
    <div className="px-7 pb-6" style={{ position:'relative', zIndex: 1, animation: 'fadeInUp .7s .65s ease both' }}>
      {/* Cover-line strip */}
      <div className="flex items-center justify-center gap-2 mb-4 text-[9px] tracking-[.32em] uppercase" style={{
        fontFamily:'Albert Sans', color: C.inkMuted, fontWeight: 600,
      }}>
        <span>Friendship</span>
        <span style={{ opacity:.4 }}>·</span>
        <span>Time</span>
        <span style={{ opacity:.4 }}>·</span>
        <span>Place</span>
        <span style={{ opacity:.4 }}>·</span>
        <span>Match</span>
      </div>

      <PrimaryBtn onClick={onBegin}>Begin <ArrowRight size={18}/></PrimaryBtn>

      <div className="mt-3 text-center text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
        Already a Mama? <span style={{ color: C.terracotta, fontWeight: 600, textDecoration: 'underline' }}>Sign in</span>
      </div>
    </div>
  </div>
);

const Screen1 = ({ onNext }) => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ background: C.cream }}>
    {/* Background atmosphere — z:0, never blocks pointer events */}
    <div className="absolute pointer-events-none" style={{
      top: -140, right: -100, width: 360, height: 360, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.rose}AA 0%, transparent 65%)`, zIndex: 0,
    }}/>
    <div className="absolute pointer-events-none" style={{
      bottom: -120, left: -120, width: 320, height: 320, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.sage}55 0%, transparent 65%)`, zIndex: 0,
    }}/>
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity: .35, mixBlendMode: 'multiply', zIndex: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .15 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}/>

    {/* Foreground */}
    <div style={{ position:'relative', zIndex: 1 }}>
      <StatusBar/>
    </div>
    <div style={{ position:'relative', zIndex: 1 }}>
      <StepHeader step={0} total={8} onBack={()=>{}} onSkip={onNext}/>
    </div>

    {/* Content — no scroll, justify-between pins social proof above CTA */}
    <div className="flex-1 px-7 overflow-hidden flex flex-col justify-between" style={{ position:'relative', zIndex: 1 }}>
      <div>
        {/* Masthead */}
        <div className="flex items-center gap-2.5 mb-3.5" style={{ animation: 'fadeInUp .6s ease both' }}>
          <div className="h-px flex-1" style={{ background: C.ink, opacity:.25 }}/>
          <div className="text-[9px] tracking-[.32em] uppercase" style={{ color: C.ink, fontFamily:'Albert Sans', fontWeight:700 }}>
            The Mama Report · No. 1
          </div>
          <div className="h-px flex-1" style={{ background: C.ink, opacity:.25 }}/>
        </div>

        {/* Hero headline — 34px, tighter */}
        <div className="relative" style={{ animation: 'fadeInUp .7s .1s ease both' }}>
          <h1 style={{ fontFamily:'Fraunces', fontWeight: 400, fontSize: 34, lineHeight: 1.02, letterSpacing:'-.02em', color: C.ink }}>
            Motherhood<br/>
            <span style={{ fontStyle:'italic', color: C.terracotta, fontWeight: 500, letterSpacing: 0 }}>shouldn't</span> feel<br/>
            this lonely.
          </h1>
          <Sprig style={{ position:'absolute', width: 38, top: -6, right: -6, opacity: .55 }} color={C.sageDark}/>
        </div>

        {/* Italic subtitle */}
        <p className="mt-2 text-[13px]" style={{ fontFamily:'Fraunces', fontStyle:'italic', color: C.inkSoft, lineHeight:1.4, fontWeight:400 }}>
          — and it doesn't have to.
        </p>

        {/* Two-stat editorial strip */}
        <div className="mt-3 grid grid-cols-2 gap-2" style={{ animation: 'fadeInUp .7s .25s ease both' }}>
          <div className="rounded-[14px] p-2.5" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            <div className="flex items-baseline gap-1">
              <div style={{ fontFamily:'Fraunces', fontSize: 28, fontWeight:500, color: C.terracotta, lineHeight:.9, letterSpacing:'-.04em' }}>9</div>
              <div style={{ fontFamily:'Fraunces', fontSize: 11, fontStyle:'italic', color: C.terracotta, fontWeight:400 }}>of 10 moms</div>
            </div>
            <div className="mt-1 text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.3 }}>
              feel lonely after kids
            </div>
          </div>
          <div className="rounded-[14px] p-2.5" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            <div className="flex items-baseline gap-1">
              <div style={{ fontFamily:'Fraunces', fontSize: 28, fontWeight:500, color: C.sageDark, lineHeight:.9, letterSpacing:'-.04em' }}>7</div>
              <div style={{ fontFamily:'Fraunces', fontSize: 11, fontStyle:'italic', color: C.sageDark, fontWeight:400 }}>of 10 moms</div>
            </div>
            <div className="mt-1 text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.3 }}>
              haven't made a mom friend since baby
            </div>
          </div>
        </div>

        {/* Empathy box — full problem description */}
        <div className="mt-3 rounded-2xl p-3.5 relative overflow-hidden" style={{
          background: C.paper, border: `1px solid ${C.divider}`, animation: 'fadeInUp .7s .35s ease both',
        }}>
          <div className="absolute pointer-events-none" style={{
            top: -30, right: -30, width: 70, height: 70, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.terracotta}1F 0%, transparent 70%)`,
          }}/>
          <div className="relative">
            <div style={{
              fontFamily:'Fraunces', fontSize: 15, fontWeight: 500,
              color: C.ink, letterSpacing:'-.01em', lineHeight: 1.3,
            }}>
              You love your kids deeply.
            </div>
            <div className="mt-1" style={{
              fontFamily:'Fraunces', fontStyle:'italic', fontSize: 13.5, fontWeight: 400,
              color: C.ink, lineHeight: 1.4,
            }}>
              But motherhood can still feel <span style={{ color: C.terracotta, fontWeight: 500 }}>isolating</span>.
            </div>
            <div className="mt-1.5 text-[11.5px]" style={{
              fontFamily:'Albert Sans', color: C.inkSoft, lineHeight: 1.45,
            }}>
              Days get busy. Texts go unanswered. Making real mom friends somehow feels harder than it should.
            </div>
          </div>
        </div>

        {/* Marketing line — Mama's promise. Sage-accented paper card */}
        <div className="mt-2.5 rounded-2xl p-3.5 relative overflow-hidden" style={{
          background: C.paper, border: `1px solid ${C.divider}`, animation: 'fadeInUp .7s .42s ease both',
        }}>
          <div className="absolute pointer-events-none" style={{
            top: -30, left: -30, width: 70, height: 70, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.sageDark}1F 0%, transparent 70%)`,
          }}/>
          <div className="relative" style={{
            fontFamily:'Fraunces', fontSize: 14.5, fontWeight: 500,
            color: C.ink, letterSpacing:'-.01em', lineHeight: 1.4,
          }}>
            <span style={{ fontStyle:'italic', color: C.sageDark }}>Mama</span> is built to make meetups <span style={{ color: C.terracotta }}>tailored</span> to mom's busy calendars.
          </div>
        </div>
      </div>

      {/* Social proof strip — pinned to bottom of content area */}
      <div className="flex items-center justify-center gap-2.5 pb-2" style={{ animation: 'fadeInUp .7s .5s ease both' }}>
        <div className="flex">
          {[
            'linear-gradient(135deg, #C8553D 0%, #D9A441 100%)',
            'linear-gradient(135deg, #7E9678 0%, #B5C9AB 100%)',
            'linear-gradient(135deg, #D9A441 0%, #C8553D 100%)',
            'linear-gradient(135deg, #B98EB6 0%, #C8553D 100%)',
            'linear-gradient(135deg, #5A7E55 0%, #7E9678 100%)',
          ].map((g, i) => (
            <div key={i} className="rounded-full" style={{
              width: 20, height: 20,
              background: g,
              marginLeft: i > 0 ? -6 : 0,
              border: `2px solid ${C.cream}`,
              zIndex: 5 - i,
            }}/>
          ))}
        </div>
        <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight: 500, lineHeight:1.35 }}>
          <span style={{ fontWeight:700, color: C.ink, fontFamily:'Fraunces' }}>12,847</span> moms joined this month
        </div>
      </div>
    </div>

    {/* Pinned bottom CTA */}
    <div className="px-7 pt-2 pb-6" style={{ position:'relative', zIndex: 1, background: C.cream, animation: 'fadeInUp .7s .55s ease both' }}>
      <PrimaryBtn onClick={onNext}>Begin <ArrowRight size={18}/></PrimaryBtn>
    </div>
  </div>
);

// ====================================================================
// SCREEN 2 — Pick place, match time, sync
// ====================================================================
const Screen2 = ({ onNext, onBack }) => (
  <div className="h-full flex flex-col" style={{ background: C.cream }}>
    <StatusBar/>
    <StepHeader step={1} total={8} onBack={onBack} onSkip={onNext}/>

    <div className="flex-1 px-7 flex flex-col">
      <div className="mt-1">
        <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
          How Mama works
        </div>
        <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
          You. Time. Place. <span style={{ fontStyle:'italic', color: C.sageDark }}>Match.</span>
        </h2>
      </div>

      {/* 4-step illustrated rows */}
      <div className="mt-5 space-y-2.5">
        {[
          { n:'01', icon: User,         title:'Tell us about you',    body:'Kid ages, mom type, values, interests — so matches actually fit.',         tone: C.terracotta },
          { n:'02', icon: CalendarIcon, title:'Pick a time',          body:'Tap your free hours based on your weekly calendar availability.',          tone: C.sageDark    },
          { n:'03', icon: MapPin,       title:'Pick a place',         body:'Choose from suggested cafés, parks & playgrounds — or add your own spot.', tone: C.saffron     },
          { n:'04', icon: Users,        title:'Match — 1:1 or group', body:'Auto-schedule a one-on-one with another mama, or RSVP to a group meetup.', tone: C.terracotta  },
        ].map((s, i)=>(
          <div key={i} className="flex items-stretch gap-3 rounded-[18px] p-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            <div className="flex flex-col items-center" style={{ width: 44 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.tone}1A`, color: s.tone }}>
                <s.icon size={17}/>
              </div>
              <div className="mt-1 text-[9px] tracking-[.2em]" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>{s.n}</div>
            </div>
            <div className="flex-1 pt-0.5">
              <div style={{ fontFamily:'Fraunces', fontSize: 16, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{s.title}</div>
              <div className="mt-0.5 text-[12px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.4 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-8">
        <PrimaryBtn onClick={onNext}>Continue <ArrowRight size={18}/></PrimaryBtn>
      </div>
    </div>
  </div>
);

// ====================================================================
// SCREEN 3 — Location + distance preference (required)
// ====================================================================
const Screen3 = ({ onNext, onBack, location, setLocation, distance, setDistance }) => {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? NEIGHBORHOODS.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const missing = [];
  if (!location) missing.push('location');
  if (distance == null) missing.push('distance');
  const canContinue = missing.length === 0;
  const missingText = missing.length === 1 ? missing[0] : missing.join(' & ');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={2} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Your neighborhood
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 32, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Where are <span style={{ fontStyle:'italic', color: C.terracotta }}>you</span>, mama?
          </h2>
          <p className="mt-2 text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            We'll match you with moms close enough to actually meet up.
          </p>
        </div>

        {/* Location picker */}
        <div className="mt-5">
          <div className="text-[11.5px] mb-2" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            YOUR LOCATION
          </div>

          {!location ? (
            <>
              <button onClick={()=>setLocation('Mission, SF')}
                className="w-full rounded-2xl flex items-center gap-3 px-4 mb-2.5 transition-all active:scale-[.99]"
                style={{ height: 50, background: C.ink, color: C.cream, fontFamily:'Albert Sans', fontWeight:500, fontSize: 13.5 }}>
                <Compass size={16} style={{ color: C.saffron }}/>
                Use my current location
              </button>

              <div className="rounded-2xl flex items-center gap-2.5 px-4" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
                <Search size={15} style={{ color: C.inkMuted }}/>
                <input value={query} onChange={e=>setQuery(e.target.value)}
                  placeholder="Search neighborhood…"
                  className="flex-1 bg-transparent outline-none text-[13.5px]"
                  style={{ fontFamily:'Albert Sans', color: C.ink }}/>
              </div>

              <div className="mt-2 space-y-1.5">
                {query.trim() && !filtered.some(n => n.toLowerCase() === query.trim().toLowerCase()) && (
                  <button onClick={()=>setLocation(query.trim())}
                    className="w-full text-left rounded-xl px-4 py-2.5 flex items-center gap-2.5 transition-all"
                    style={{ background: C.terracotta, color:'#fff', border:`1px solid ${C.terracotta}` }}>
                    <Plus size={13}/>
                    <span className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>Use "{query.trim()}"</span>
                  </button>
                )}
                {filtered.map(n => (
                  <button key={n} onClick={()=>setLocation(n)}
                    className="w-full text-left rounded-xl px-4 py-2.5 flex items-center gap-2.5 transition-all"
                    style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
                    <MapPin size={13} style={{ color: C.inkMuted }}/>
                    <span className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>{n}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: C.paper, border:`1.5px solid ${C.terracotta}` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.terracotta, color:'#fff' }}>
                <MapPin size={17}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{location}</div>
                <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>Your exact address stays private.</div>
              </div>
              <button onClick={()=>{ setLocation(null); setQuery(''); }} className="text-[12px] px-2 py-1" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
                Change
              </button>
            </div>
          )}
        </div>

        {/* Distance preference */}
        <div className="mt-5">
          <div className="text-[11.5px] mb-2" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            HOW FAR WILL YOU GO?
          </div>
          <div className="flex flex-wrap gap-2">
            {DISTANCES.map(d => (
              <Pill key={d.val} active={distance === d.val} onClick={()=>setDistance(d.val)}>
                {d.label}
              </Pill>
            ))}
          </div>
        </div>

        {/* Safety note */}
        <div className="mt-5 mb-4 rounded-[16px] p-3.5 flex items-center gap-3" style={{ background: C.ink, color: C.cream }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.saffron, color: C.ink }}>
            <ShieldCheck size={15}/>
          </div>
          <div className="flex-1">
            <div className="text-[13px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>Verified phone &amp; social media.</div>
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.7, lineHeight:1.4 }}>
              Your neighborhood — never your address — is shared with matched moms.
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {!canContinue && (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick {missingText} to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>Continue <ArrowRight size={18}/></PrimaryBtn>
      </div>
    </div>
  );
};

// ====================================================================
// SCREEN 4 — Profile setup (auth deferred)
// ====================================================================
const Screen4 = ({ onNext, onBack, profile, setProfile }) => {
  const incrementKid = (age) => {
    setProfile(p => {
      const cur = p.kidsAges[age] || 0;
      if (cur >= 5) return p; // realistic cap
      return { ...p, kidsAges: { ...p.kidsAges, [age]: cur + 1 } };
    });
  };
  // Tap badge = remove one kid (decrement by 1, allowing fine-grained deselection)
  const decrementKid = (age) => {
    setProfile(p => {
      const next = { ...p.kidsAges };
      const c = (next[age] || 0) - 1;
      if (c <= 0) delete next[age]; else next[age] = c;
      return { ...p, kidsAges: next };
    });
  };

  const toggleMomType = (id) => {
    setProfile(p => ({
      ...p,
      momTypes: p.momTypes.includes(id) ? p.momTypes.filter(x=>x!==id) : [...p.momTypes, id]
    }));
  };

  const toggleValue = (v) => {
    setProfile(p => {
      const has = p.values.includes(v);
      if (has) return { ...p, values: p.values.filter(x => x !== v) };
      if (v === VALUE_NO_PREF) return { ...p, values: [VALUE_NO_PREF] };
      const cleaned = p.values.filter(x => x !== VALUE_NO_PREF);
      if (cleaned.length >= 3) return p;
      return { ...p, values: [...cleaned, v] };
    });
  };

  const toggleInterest = (v) => {
    setProfile(p => {
      const has = p.interests.includes(v);
      if (has) return { ...p, interests: p.interests.filter(x => x !== v) };
      if (v === INTEREST_NO_PREF) return { ...p, interests: [INTEREST_NO_PREF] };
      const cleaned = p.interests.filter(x => x !== INTEREST_NO_PREF);
      return { ...p, interests: [...cleaned, v] };
    });
  };

  const totalKids = Object.values(profile.kidsAges || {}).reduce((a,b)=>a+b, 0);

  const missing = [];
  if (totalKids === 0)             missing.push('kids');
  if (!profile.momTypes.length)    missing.push('mom type');
  if (!profile.values.length)      missing.push('values');
  if (!profile.interests.length)   missing.push('interests');
  const canContinue = missing.length === 0;
  const missingText = missing.length === 1
    ? missing[0]
    : missing.length === 2
      ? missing.join(' & ')
      : missing.slice(0,-1).join(', ') + ' & ' + missing[missing.length-1];

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={3} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Quick start · no signup yet
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Tell us about <span style={{ fontStyle:'italic', color: C.terracotta }}>you</span>.
          </h2>
        </div>

        {/* Kids — explicit stepper UI: +/− buttons appear when an age is active */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
              YOUR KIDS <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· tap an age to add</span>
            </div>
            {totalKids > 0 && (
              <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
                {totalKids} {totalKids===1 ? 'kid' : 'kids'}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {KID_AGES.map(age => {
              const count = profile.kidsAges[age] || 0;
              const active = count > 0;

              if (!active) {
                // Inactive — whole chip is one big add button
                return (
                  <button key={age} onClick={()=>incrementKid(age)}
                    className="rounded-2xl flex flex-col items-center justify-center transition-all active:scale-[.96]"
                    style={{
                      background: C.paper, color: C.ink,
                      border: `1px solid ${C.divider}`,
                      minHeight: 64, padding: '8px 4px',
                    }}>
                    <div className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
                      {age}
                    </div>
                    <div className="mt-0.5 flex items-center gap-0.5 text-[9.5px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:500 }}>
                      <Plus size={8} strokeWidth={2.5}/>
                      add
                    </div>
                  </button>
                );
              }

              // Active — stepper with explicit +/− buttons
              return (
                <div key={age} className="rounded-2xl flex flex-col items-center justify-center"
                  style={{
                    background: C.terracotta, color: '#fff',
                    border: `1px solid ${C.terracotta}`,
                    minHeight: 64, padding: '6px 4px',
                  }}>
                  <div className="text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight:600, opacity:.95, letterSpacing:'-.01em' }}>
                    {age}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <button onClick={()=>decrementKid(age)}
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{ background:'rgba(255,255,255,.22)' }}
                      aria-label={`Remove one kid age ${age}`}>
                      <Minus size={13} color="#fff" strokeWidth={2.8}/>
                    </button>
                    <div key={`count-${age}-${count}`} className="min-w-[18px] text-center"
                      style={{
                        fontFamily:'Fraunces', fontSize: 17, fontWeight:500, lineHeight:1, color:'#fff',
                        animation: 'popBadge .28s cubic-bezier(.34,1.56,.64,1)',
                      }}>
                      {count}
                    </div>
                    <button onClick={()=>incrementKid(age)} disabled={count >= 5}
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{
                        background: count >= 5 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.22)',
                        opacity: count >= 5 ? .5 : 1,
                      }}
                      aria-label={`Add a kid age ${age}`}>
                      <Plus size={13} color="#fff" strokeWidth={2.8}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mom type — multi-select */}
        <div className="mt-6">
          <div className="text-[12.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            MOM TYPE <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· pick any that fit</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MOM_TYPES.map(m => {
              const active = profile.momTypes.includes(m.id);
              const isOptOut = m.id === 'prefer_not';
              return (
                <button key={m.id} onClick={()=>toggleMomType(m.id)}
                  className="rounded-2xl p-2.5 flex flex-col items-center gap-1 transition-all"
                  style={{
                    background: active ? (isOptOut ? C.inkSoft : C.ink) : C.paper,
                    color: active ? C.cream : C.ink,
                    border: `1px solid ${active ? (isOptOut ? C.inkSoft : C.ink) : C.divider}`,
                    minHeight: 64,
                  }}>
                  <m.icon size={16} style={{ color: active ? C.saffron : (isOptOut ? C.inkMuted : C.terracotta) }}/>
                  <span className="text-[11.5px] text-center leading-tight" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Values — pick up to 3 OR no preference */}
        <div className="mt-6">
          <div className="text-[12.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            VALUES <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· pick up to 3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {VALUES.map(v => (
              <Pill key={v} size="sm" active={profile.values.includes(v)} onClick={()=>toggleValue(v)}>{v}</Pill>
            ))}
            <Pill size="sm" active={profile.values.includes(VALUE_NO_PREF)} onClick={()=>toggleValue(VALUE_NO_PREF)}>
              ✦ {VALUE_NO_PREF}
            </Pill>
          </div>
        </div>

        {/* Interests */}
        <div className="mt-6 mb-4">
          <div className="text-[12.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
            INTERESTS <span style={{ color: C.inkMuted, fontWeight:400, letterSpacing:0 }}>· anything that sounds nice</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {INTERESTS.map(i => {
              const active = profile.interests.includes(i.label);
              return (
                <button key={i.label} onClick={()=>toggleInterest(i.label)}
                  className="rounded-2xl px-3 py-2.5 flex items-center gap-2 transition-all"
                  style={{
                    background: active ? C.terracotta : C.paper,
                    color: active ? '#fff' : C.ink,
                    border: `1px solid ${active ? C.terracotta : C.divider}`,
                  }}>
                  <i.icon size={15}/>
                  <span className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{i.label}</span>
                </button>
              );
            })}
            <button onClick={()=>toggleInterest(INTEREST_NO_PREF)}
              className="col-span-2 rounded-2xl px-3 py-2.5 flex items-center justify-center gap-2 transition-all"
              style={{
                background: profile.interests.includes(INTEREST_NO_PREF) ? C.inkSoft : C.paper,
                color: profile.interests.includes(INTEREST_NO_PREF) ? '#fff' : C.inkSoft,
                border: `1px dashed ${profile.interests.includes(INTEREST_NO_PREF) ? C.inkSoft : C.divider}`,
              }}>
              <Sparkles size={14}/>
              <span className="text-[12.5px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>{INTEREST_NO_PREF}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {canContinue ? (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
            <Lock size={11}/> No account needed yet — try Mama first.
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick {missingText} to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>Continue <ArrowRight size={18}/></PrimaryBtn>
      </div>
    </div>
  );
};

// ====================================================================
// SCREEN 5 — WHEN you're free (calendar only — focused, no other concerns)
// ====================================================================
const Screen5 = ({ onNext, onBack, prefs, setPrefs }) => {
  const dayHasSlots = (day) => prefs.slots.some(s => s.startsWith(`${day}-`));
  const selectedDays = DAYS.filter(d => dayHasSlots(d));

  const toggleDay = (day) => {
    if (dayHasSlots(day)) {
      setPrefs(p => ({ ...p, slots: p.slots.filter(s => !s.startsWith(`${day}-`)) }));
    } else {
      setPrefs(p => ({ ...p, slots: [...p.slots, `${day}-morning`] }));
    }
  };

  const toggleSlot = (day, winId) => {
    const key = `${day}-${winId}`;
    setPrefs(p => ({
      ...p,
      slots: p.slots.includes(key) ? p.slots.filter(x=>x!==key) : [...p.slots, key]
    }));
  };

  const matched = matchingMoms(prefs.slots);
  const matchedFaces = matched.slice(0, 6);
  const totalSlots = prefs.slots.length;
  const canContinue = totalSlots > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={4} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Step 4 · When you're free
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            When can you <span style={{ fontStyle:'italic', color: C.terracotta }}>meet?</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Pick the days that usually work. Then pick time windows for each.
          </p>
        </div>

        <div className="mt-5">
          <div className="text-[11px] mb-2 tracking-[.04em]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600 }}>
            DAYS
          </div>
          <div className="flex gap-1.5">
            {DAYS.map(day => {
              const isSel = dayHasSlots(day);
              return (
                <button key={day} onClick={()=>toggleDay(day)}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    background: isSel ? C.terracotta : C.paper,
                    color: isSel ? '#fff' : C.ink,
                    border: `1px solid ${isSel ? C.terracotta : C.divider}`,
                    padding: '8px 0',
                    fontFamily: 'Albert Sans',
                    fontSize: 12, fontWeight: 500,
                  }}>
                  {day[0]}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDays.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-[11px] tracking-[.04em]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600 }}>
              TIME WINDOWS
            </div>
            {selectedDays.map(day => (
              <div key={day} className="rounded-xl px-3 py-2" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div style={{ fontFamily:'Fraunces', fontSize: 13.5, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>
                    {DAY_LABELS[day]}
                  </div>
                  <button onClick={()=>toggleDay(day)} className="text-[10px]" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
                    Remove
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {TIME_WINDOWS.map(win => {
                    const on = prefs.slots.includes(`${day}-${win.id}`);
                    return (
                      <button key={win.id} onClick={()=>toggleSlot(day, win.id)}
                        className="rounded-full px-2.5 py-1 transition-all"
                        style={{
                          background: on ? C.terracotta : C.creamSoft,
                          color: on ? '#fff' : C.ink,
                          border: `1px solid ${on ? C.terracotta : C.divider}`,
                          fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 500,
                        }}>
                        {win.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl p-3.5 text-center" style={{ background: C.creamSoft, border: `1px dashed ${C.divider}` }}>
            <div className="text-[11.5px]" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
              Tap a day above to set your time windows.
            </div>
          </div>
        )}

        {totalSlots > 0 && matched.length > 0 && (
          <div className="mt-5 rounded-2xl p-3.5 relative overflow-hidden" style={{
            background: C.ink, color: C.cream, animation: 'fadeInUp .5s ease both',
          }}>
            <div className="text-[10px] tracking-[.18em] uppercase mb-2" style={{ fontFamily:'Albert Sans', fontWeight:700, opacity:.6 }}>
              ✦ Free at your times
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-shrink-0">
                {matchedFaces.map((m, i) => (
                  <div key={m.id} className="w-9 h-9 rounded-full flex items-center justify-center text-[10.5px]"
                    style={{
                      background: m.hue, color:'#fff',
                      fontFamily:'Fraunces', fontWeight:500,
                      marginLeft: i ? -10 : 0,
                      border: `2px solid ${C.ink}`,
                    }}>
                    {m.init}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <div style={{ fontFamily:'Fraunces', fontSize: 26, fontWeight:500, color: C.cream, lineHeight:1, letterSpacing:'-.02em' }}>
                    {matched.length}
                  </div>
                  <div className="text-[12px]" style={{ fontFamily:'Albert Sans', opacity:.85 }}>
                    moms free then
                  </div>
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ fontFamily:'Albert Sans', opacity:.55, lineHeight:1.3 }}>
                  Add more times to widen the pool
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        {!canContinue && (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11.5px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:500 }}>
            <Plus size={11}/> Pick at least one time to continue
          </div>
        )}
        <PrimaryBtn onClick={onNext} disabled={!canContinue}>
          Continue <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};

// ====================================================================
// SCREEN 6 — WHERE you like to meet (places only: top picks + browse)
// ====================================================================
const Screen6 = ({ onNext, onBack, prefs, setPrefs, location }) => {
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

// ====================================================================
// SCREEN 7 — Match with moms (1:1) — rich stats + 3 actions per card
// Auto-schedule / Pick time / View profile. Conflict-aware.
// ====================================================================
const Screen7 = ({ onNext, onBack, profile, prefs, location, openProfile, scheduled1to1, setScheduled1to1, account, requestAccount, flash }) => {
  const [pickingFor, setPickingFor] = useState(null);

  // Match 1:1 moms by overlap with user's slots
  const matchedMoms = [...SAMPLE_MOMS]
    .map(m => {
      const overlapSlots = m.freeSlots ? m.freeSlots.filter(s => prefs.slots.includes(s)) : [];
      // Compute commonality stats
      const commonValues = (m.values || []).filter(v => (profile.values || []).includes(v));
      const commonInterests = (m.interests || []).filter(i => (profile.interests || []).includes(i));
      const userKidAges = Object.keys(profile.kidsAges || {});
      const momKidAges = (m.kids || '').split('·').flatMap(k => {
        // Try to map "2y" or "2y · 4y" to age buckets
        const num = parseInt(k.trim().replace('y', ''), 10);
        if (isNaN(num)) return [];
        if (num <= 1) return ['0–1'];
        if (num <= 3) return ['1–3'];
        if (num <= 5) return ['3–5'];
        if (num <= 8) return ['5–8'];
        if (num <= 12) return ['8–12'];
        return ['12–18'];
      });
      const commonKidAges = userKidAges.filter(a => momKidAges.includes(a));
      // Type alignment — does mom.type label match any of user's selected MOM_TYPES?
      const userTypeLabels = (profile.momTypes || [])
        .map(id => MOM_TYPES.find(mt => mt.id === id)?.label)
        .filter(Boolean);
      const sameType = userTypeLabels.includes(m.type);
      return { ...m, _overlapSlots: overlapSlots, _commonValues: commonValues, _commonInterests: commonInterests, _commonKidAges: commonKidAges, _sameType: sameType };
    })
    .filter(m => m._overlapSlots.length > 0 || prefs.slots.length === 0)
    .sort((a, b) => b.overlap - a.overlap);

  const userPlaceName = (() => {
    const picks = prefs.places.filter(x => x !== PLACES_NO_PREF);
    if (!picks.length) return null;
    const place = findPlace(picks[0]);
    return place ? place.name : null;
  })();

  // committedSlots from scheduled1to1
  const committedSlots = new Set();
  Object.values(scheduled1to1).forEach(s => committedSlots.add(`${s.day}|${s.time}`));
  const isCommittedSlot = (day, time) => committedSlots.has(`${day}|${time}`);
  const slotConflicts = (slotStr) => {
    const [day, ...winParts] = slotStr.split('-');
    const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
    if (!win) return false;
    return isCommittedSlot(day, win.label);
  };

  const autoSchedule = (mom) => {
    const slot = mom._overlapSlots.find(s => !slotConflicts(s));
    if (!slot) {
      flash && flash(`✗ All ${mom.name.split(' ')[0]}'s times taken — pick manually`);
      return;
    }
    if (!account && requestAccount) {
      requestAccount({ type: '1to1', mom, slot });
      return;
    }
    commitSlot(mom, slot);
  };

  const commitSlot = (mom, slotStr) => {
    if (!account && requestAccount) {
      requestAccount({ type: '1to1', mom, slot: slotStr });
      setPickingFor(null);
      return;
    }
    const [day, ...winParts] = slotStr.split('-');
    const win = TIME_WINDOWS.find(w => w.id === winParts.join('-')) || TIME_WINDOWS[1];
    const placeName = userPlaceName || mom.nextPlace;
    setScheduled1to1(s => ({ ...s, [mom.id]: { day, time: win.label, place: placeName } }));
    setPickingFor(null);
    flash && flash(`✦ Scheduled with ${mom.name.split(' ')[0]} · ${day} ${win.label}`);
  };

  // Render a small stat row inside the mom card
  const StatRow = ({ icon: Icon, label, items, accent, sched }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="flex items-start gap-1.5 text-[10px]" style={{ fontFamily:'Albert Sans' }}>
        <Icon size={10} style={{ color: sched ? '#fff' : accent, flexShrink: 0, marginTop: 1.5, opacity: sched ? .9 : 1 }}/>
        <div className="flex-1 min-w-0">
          <span style={{ fontWeight: 700, color: sched ? '#fff' : accent, opacity: sched ? .9 : 1, letterSpacing:'.04em', textTransform:'uppercase', fontSize: 8.5 }}>{label}</span>
          <span className="ml-1.5" style={{ color: sched ? '#fff' : C.ink, opacity: sched ? .92 : .85, fontWeight: 500 }}>
            {items.join(' · ')}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={6} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3 flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            <Heart size={11} fill={C.terracotta}/>
            Step 6 · Match with moms
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Moms who match <span style={{ fontStyle:'italic', color: C.terracotta }}>your week.</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Auto-schedule the best time, pick one yourself, or read her profile first.
          </p>
        </div>

        {Object.keys(scheduled1to1).length > 0 && (
          <div className="mt-3 text-[10.5px] flex items-center gap-1.5" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
            <Check size={11}/> {Object.keys(scheduled1to1).length} scheduled · we'll never double-book
          </div>
        )}

        <div className="mt-4 space-y-2 pb-3">
          {matchedMoms.map(m => {
            const sched = scheduled1to1[m.id];
            const isPicking = pickingFor === m.id;
            return (
              <div key={m.id} className="rounded-2xl overflow-hidden" style={{
                background: sched ? C.terracotta : C.paper,
                color: sched ? '#fff' : C.ink,
                border: `1px solid ${sched ? C.terracotta : C.divider}`,
              }}>
                {/* Top: identity + match % (BIG) */}
                <div className="px-3.5 pt-3 pb-2 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] flex-shrink-0"
                    style={{ background: m.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500, marginTop: 2 }}>
                    {m.name.split(' ').map(s=>s[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <div className="text-[15px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
                        {m.name}
                      </div>
                      {m.verified && <ShieldCheck size={12} style={{ color: sched ? '#fff' : C.sageDark, flexShrink: 0, opacity: sched ? .9 : 1 }}/>}
                    </div>
                    <div className="text-[10.5px] mt-0.5 truncate" style={{ fontFamily:'Albert Sans', opacity: sched ? .9 : .65 }}>
                      {m.type} · Kids {m.kids} · {m.distance}
                    </div>
                  </div>
                  {/* BIG match percentage */}
                  <div className="text-right flex-shrink-0 pt-0.5">
                    <div style={{ fontFamily:'Fraunces', fontSize: 26, fontWeight:500, color: sched ? '#fff' : C.terracotta, lineHeight:1, letterSpacing:'-.02em' }}>
                      {m.overlap}<span className="text-[12px]" style={{ opacity:.65 }}>%</span>
                    </div>
                    <div className="text-[8.5px] tracking-[.14em] uppercase mt-0.5" style={{
                      fontFamily:'Albert Sans', fontWeight: 700,
                      color: sched ? '#fff' : C.inkMuted, opacity: sched ? .85 : 1,
                    }}>match</div>
                  </div>
                </div>

                {/* Stats panel — common values, interests, kid ages, type */}
                <div className="mx-3 mb-2.5 rounded-lg px-2.5 py-2 space-y-1" style={{
                  background: sched ? 'rgba(255,255,255,.12)' : C.creamSoft,
                  border: `1px solid ${sched ? 'rgba(255,255,255,.2)' : C.divider}`,
                }}>
                  {m._sameType && (
                    <StatRow icon={Briefcase} label="TYPE" items={[`Both ${m.type.toLowerCase()}`]} accent={C.terracotta} sched={sched}/>
                  )}
                  {m._commonKidAges.length > 0 && (
                    <StatRow icon={Sun} label="KIDS" items={[`Both have ${m._commonKidAges.join(', ')} year olds`]} accent={C.saffron} sched={sched}/>
                  )}
                  {m._commonValues.length > 0 ? (
                    <StatRow icon={Heart} label="VALUES" items={m._commonValues} accent={C.terracotta} sched={sched}/>
                  ) : (
                    <StatRow icon={Heart} label="HER VALUES" items={(m.values || []).slice(0, 3)} accent={C.inkMuted} sched={sched}/>
                  )}
                  {m._commonInterests.length > 0 ? (
                    <StatRow icon={Sparkles} label="INTERESTS" items={m._commonInterests} accent={C.sageDark} sched={sched}/>
                  ) : (
                    <StatRow icon={Sparkles} label="HER INTERESTS" items={(m.interests || []).slice(0, 3)} accent={C.inkMuted} sched={sched}/>
                  )}
                  {m._overlapSlots.length > 0 && (
                    <StatRow icon={CalendarIcon} label="FREE" items={[[...new Set(m._overlapSlots.map(s => s.split('-')[0]))].join(', ')]} accent={C.sageDark} sched={sched}/>
                  )}
                </div>

                {/* Action area — scheduled summary | inline picker | three buttons */}
                {sched ? (
                  <div className="px-3 pb-3 pt-1">
                    <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{
                      background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)',
                    }}>
                      <Check size={13} style={{ color: C.saffron }}/>
                      <div className="flex-1 text-[11px]" style={{ fontFamily:'Albert Sans', color:'#fff', fontWeight:600 }}>
                        {sched.day} · {sched.time} · {sched.place}
                      </div>
                    </div>
                  </div>
                ) : isPicking ? (
                  <div className="px-3 pb-3 pt-1">
                    <div className="text-[9.5px] tracking-[.16em] uppercase mb-1.5" style={{
                      color: C.inkMuted, fontFamily:'Albert Sans', fontWeight: 700,
                    }}>
                      Pick a time you both have free
                    </div>
                    {m._overlapSlots.length === 0 ? (
                      <div className="text-[11px] py-2 text-center" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
                        No overlap yet — try widening your availability
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {m._overlapSlots.map(slotStr => {
                          const [day, ...winParts] = slotStr.split('-');
                          const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
                          if (!win) return null;
                          const conflict = isCommittedSlot(day, win.label);
                          return (
                            <button key={slotStr}
                              onClick={()=>!conflict && commitSlot(m, slotStr)}
                              disabled={conflict}
                              className="w-full rounded-lg px-3 py-2 flex items-center gap-2 transition-all active:scale-[.99]"
                              style={{
                                background: conflict ? C.creamSoft : C.paper,
                                border: `1px solid ${conflict ? C.divider : `${C.terracotta}55`}`,
                                opacity: conflict ? .55 : 1,
                              }}>
                              <CalendarIcon size={11} style={{ color: conflict ? C.inkMuted : C.terracotta, flexShrink: 0 }}/>
                              <div className="flex-1 text-left">
                                <span className="text-[11.5px]" style={{ fontFamily:'Albert Sans', fontWeight:600, color: conflict ? C.inkMuted : C.ink }}>{day}</span>
                                <span className="text-[11.5px] ml-1.5" style={{ fontFamily:'Albert Sans', color: conflict ? C.inkMuted : C.inkSoft }}>· {win.label}</span>
                              </div>
                              {conflict
                                ? <span className="text-[9px] flex items-center gap-0.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:600 }}><X size={9}/> taken</span>
                                : <ArrowRight size={11} style={{ color: C.terracotta }}/>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={()=>setPickingFor(null)}
                      className="w-full text-[11px] py-1.5 mt-1.5"
                      style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight: 500 }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="px-3 pb-3 pt-1 grid grid-cols-3 gap-1.5">
                    <button onClick={()=>autoSchedule(m)}
                      className="rounded-lg flex items-center justify-center gap-1 transition-all active:scale-[.98]"
                      style={{
                        height: 36,
                        background: C.terracotta, color: '#fff',
                        fontFamily:'Albert Sans', fontSize: 11, fontWeight: 600,
                        letterSpacing:'.02em',
                      }}>
                      <Sparkles size={11}/> Auto
                    </button>
                    <button onClick={()=>setPickingFor(m.id)}
                      className="rounded-lg flex items-center justify-center gap-1 transition-all active:scale-[.98]"
                      style={{
                        height: 36,
                        background: C.paper, color: C.terracotta,
                        border: `1px solid ${C.terracotta}55`,
                        fontFamily:'Albert Sans', fontSize: 11, fontWeight: 600,
                      }}>
                      <CalendarIcon size={11}/> Pick time
                    </button>
                    <button onClick={()=>openProfile && openProfile(m)}
                      className="rounded-lg flex items-center justify-center gap-1 transition-all active:scale-[.98]"
                      style={{
                        height: 36,
                        background: C.paper, color: C.ink,
                        border: `1px solid ${C.divider}`,
                        fontFamily:'Albert Sans', fontSize: 11, fontWeight: 600,
                      }}>
                      <User size={11}/> Profile
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {matchedMoms.length === 0 && (
            <div className="rounded-xl p-4 text-center" style={{ background: C.creamSoft, border:`1px dashed ${C.divider}` }}>
              <div className="text-[12px]" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
                No matches at your selected times — widen availability to see more.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={onNext} variant="terracotta">
          Continue <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};

// ====================================================================
// SCREEN 8 — Group meetups (optional bonus, lightweight RSVP)
// Conflict-aware against 1:1 schedules from Screen 7.
// ====================================================================
const Screen8 = ({ onNext, onBack, prefs, scheduled1to1, joinedEvents, setJoinedEvents, account, requestAccount, flash }) => {
  const selectedDays = [...new Set(prefs.slots.map(s => s.split('-')[0]))];
  const matchedEvents = (() => {
    if (!selectedDays.length) return SUGGESTED_EVENTS.slice(0, 5);
    const userBucketsByDay = {};
    prefs.slots.forEach(s => {
      const [day, ...winParts] = s.split('-');
      const winId = winParts.join('-');
      const bucket = WINDOW_TO_BUCKET[winId];
      if (bucket) (userBucketsByDay[day] = userBucketsByDay[day] || new Set()).add(bucket);
    });
    return SUGGESTED_EVENTS
      .filter(e => selectedDays.includes(e.day))
      .map(e => {
        const buckets = userBucketsByDay[e.day];
        const matches = buckets && buckets.has(e.bucket);
        return { ...e, _matches: !!matches };
      })
      .sort((a, b) => Number(b._matches) - Number(a._matches))
      .slice(0, 5);
  })();

  // Build conflict set from 1:1s + already-joined groups
  const committedSlots = new Set();
  Object.values(scheduled1to1).forEach(s => committedSlots.add(`${s.day}|${s.time}`));
  joinedEvents.forEach(eid => {
    const e = matchedEvents.find(x => x.id === eid);
    if (e) committedSlots.add(`${e.day}|${e.time}`);
  });
  const isCommittedSlot = (day, time) => committedSlots.has(`${day}|${time}`);

  const joinGroup = (e) => {
    if (isCommittedSlot(e.day, e.time)) {
      flash && flash(`✗ Conflicts with another meetup at ${e.day} ${e.time}`);
      return;
    }
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name} · ${e.day} ${e.time}`);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <StepHeader step={7} total={8} onBack={onBack} onSkip={onNext}/>

      <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth:'none' }}>
        <div className="mt-1">
          <div className="text-[11px] tracking-[.2em] uppercase mb-3 flex items-center gap-1.5" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:600 }}>
            <Users size={11}/>
            Step 7 · Join groups (optional)
          </div>
          <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
            Show up to a <span style={{ fontStyle:'italic', color: C.sageDark }}>group walk?</span>
          </h2>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.45 }}>
            Lower pressure than 1:1 — just show up. Skip if you'd rather start with one-on-ones.
          </p>
        </div>

        <div className="mt-5 space-y-1.5">
          {matchedEvents.map(e => {
            const joined = joinedEvents.includes(e.id);
            const conflict = !joined && isCommittedSlot(e.day, e.time);
            const meta = e._matches
              ? { icon: Star,         color: '#A0791E', fill: true,  label: 'Match for you' }
              : { icon: CalendarIcon, color: C.sageDark, fill: false, label: e.recurring || 'Group meetup' };
            const Icon = meta.icon;
            return (
              <div key={e.id} className="rounded-xl overflow-hidden" style={{
                background: joined ? C.sageDark : C.paper,
                color: joined ? '#fff' : C.ink,
                border: `1px solid ${joined ? C.sageDark : conflict ? `${C.terracotta}55` : C.divider}`,
                opacity: conflict ? .75 : 1,
              }}>
                <div className="px-3.5 pt-2.5 pb-2 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md mb-1.5" style={{
                      background: joined ? 'rgba(255,255,255,.18)' : `${meta.color}10`,
                      border: `1px solid ${joined ? 'rgba(255,255,255,.32)' : `${meta.color}33`}`,
                    }}>
                      <Icon size={9.5} strokeWidth={2}
                        style={{ color: joined ? '#fff' : meta.color, flexShrink: 0 }}
                        fill={meta.fill ? (joined ? '#fff' : meta.color) : 'none'}/>
                      <span className="text-[9px] tracking-[.14em] uppercase" style={{
                        fontFamily:'Albert Sans', fontWeight: 700,
                        color: joined ? '#fff' : meta.color,
                      }}>{meta.label}</span>
                    </div>
                    <div className="text-[13.5px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'-.01em' }}>
                      {e.name}
                    </div>
                    <div className="text-[10.5px] mt-0.5 flex items-center gap-1 truncate" style={{ fontFamily:'Albert Sans', opacity: joined ? .92 : .65 }}>
                      <MapPin size={9} className="flex-shrink-0"/>
                      <span className="truncate">{e.place}</span>
                    </div>
                    <div className="text-[10.5px] mt-1 flex items-center gap-1" style={{ fontFamily:'Albert Sans' }}>
                      <Users size={10} style={{ color: joined ? '#fff' : C.terracotta }}/>
                      <span style={{ color: joined ? '#fff' : C.terracotta, fontWeight: 700 }}>{e.going}</span>
                      <span style={{ opacity: joined ? .8 : .55 }}>going</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pt-0.5">
                    <div className="text-[8.5px] tracking-[.14em]" style={{
                      fontFamily:'Albert Sans', fontWeight: 700,
                      color: joined ? '#fff' : C.inkMuted, opacity: joined ? .85 : 1,
                    }}>{e.day.toUpperCase()}</div>
                    <div style={{
                      fontFamily:'Fraunces', fontSize: 14, fontWeight:500,
                      color: joined ? '#fff' : C.terracotta, lineHeight:1,
                    }}>{e.time.split(' ')[0]}</div>
                  </div>
                </div>
                <div className="px-3 pb-2.5 pt-1">
                  <button onClick={()=>!joined && !conflict && joinGroup(e)}
                    disabled={joined || conflict}
                    className="w-full rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[.98]"
                    style={{
                      height: 34,
                      background: joined ? 'rgba(255,255,255,.15)' : conflict ? C.creamSoft : C.sageDark,
                      color: joined ? '#fff' : conflict ? C.inkMuted : '#fff',
                      fontFamily:'Albert Sans', fontSize: 12, fontWeight: 600,
                      letterSpacing:'.02em',
                      border: joined ? '1px solid rgba(255,255,255,.25)' : conflict ? `1px solid ${C.divider}` : 'none',
                    }}>
                    {joined ? <><Check size={13}/> RSVP'd</>
                      : conflict ? <><X size={12}/> Time taken</>
                      : <><Plus size={12}/> Join group</>}
                  </button>
                </div>
              </div>
            );
          })}
          {matchedEvents.length === 0 && (
            <div className="rounded-xl p-4 text-center" style={{ background: C.creamSoft, border:`1px dashed ${C.divider}` }}>
              <div className="text-[12px]" style={{ color: C.inkSoft, fontFamily:'Albert Sans' }}>
                No groups at your selected times — that's okay, you can join later from the app.
              </div>
            </div>
          )}
        </div>
        <div className="h-4"/>
      </div>

      <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
        <PrimaryBtn onClick={onNext} variant="terracotta">
          Open the app <ArrowRight size={18}/>
        </PrimaryBtn>
      </div>
    </div>
  );
};

const MiniMatchCard = ({ mom }) => (
  <div className="rounded-[18px] p-3 flex items-center gap-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px]" style={{
      background: mom.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500
    }}>{mom.name.split(' ').map(s=>s[0]).join('')}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink }}>{mom.name}</div>
        {mom.verified && <ShieldCheck size={12} style={{ color: C.sageDark }}/>}
      </div>
      <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
        Kids {mom.kids} · {mom.distance}
      </div>
    </div>
    <div className="text-right">
      <div style={{ fontFamily:'Fraunces', fontSize: 18, fontWeight:500, color: C.terracotta }}>{mom.overlap}<span className="text-[11px]" style={{ color: C.inkMuted }}>%</span></div>
      <div className="text-[9.5px] tracking-[.1em] uppercase" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>match</div>
    </div>
  </div>
);

// ====================================================================
// MAIN APP
// ====================================================================
// ====================================================================
// MAIN APP — 5 tabs: Calendar · Places · Events · Matches · Profile
// ====================================================================
const MainApp = ({ profile, prefs, setPrefs, location, distance, scheduled1to1, joinedEvents, setJoinedEvents, openSchedule, openProfile, openMessage, openPremium, account, requestAccount, restart, flash }) => {
  const [tab, setTab] = useState('calendar');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {tab==='calendar' && <CalendarTab
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        prefs={prefs} setPrefs={setPrefs}
        openSchedule={openSchedule}
        goToMatches={()=>setTab('matches')}
        flash={flash}/>}
      {tab==='places'   && <PlacesTab prefs={prefs} setPrefs={setPrefs} location={location} goToMatches={()=>setTab('matches')} flash={flash}/>}
      {tab==='events'   && <EventsTab joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents} account={account} requestAccount={requestAccount} openPremium={openPremium} flash={flash}/>}
      {tab==='matches'  && <MatchesTab openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}/>}
      {tab==='profile'  && <YouTab profile={profile} prefs={prefs} location={location} distance={distance} restart={restart}/>}

      {/* Tab Bar — 5 buttons */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.divider, background: C.creamSoft }}>
        <div className="flex justify-between items-center">
          {[
            { id:'calendar', icon: CalendarIcon,  label:'Calendar' },
            { id:'places',   icon: MapPin,        label:'Places'   },
            { id:'events',   icon: Users,         label:'Events'   },
            { id:'matches',  icon: Heart,         label:'Matches'  },
            { id:'profile',  icon: User,          label:'Profile'  },
          ].map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className="flex flex-col items-center gap-0.5 py-1.5 flex-1">
                <t.icon size={19} style={{ color: active ? C.terracotta : C.inkMuted, strokeWidth: active ? 2.2 : 1.7 }}/>
                <span className="text-[10px]" style={{ fontFamily:'Albert Sans', fontWeight: active?600:500, color: active ? C.ink : C.inkMuted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// CALENDAR TAB — month grid · scheduled meetups · edit availability
// ====================================================================
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CalendarTab = ({ scheduled1to1, joinedEvents, prefs, setPrefs, openSchedule, goToMatches, flash }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Convert JS Sun-start (0..6) to Mon-start (0=Mon..6=Sun)
  const firstDowMonStart = (new Date(year, month, 1).getDay() + 6) % 7;

  const dowOf = (d) => DAYS[(new Date(year, month, d).getDay() + 6) % 7];
  const selectedDow = dowOf(selectedDate);

  // Build grid cells (with leading null padding)
  const cells = [];
  for (let i = 0; i < firstDowMonStart; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Per-day flags
  const has1to1OnDow = (dow) => Object.values(scheduled1to1 || {}).some(s => s.day === dow);
  const hasGroupOnDow = (dow) => (joinedEvents || []).some(eid => {
    const e = SUGGESTED_EVENTS.find(ev => ev.id === eid);
    return e && e.day === dow;
  });
  const hasAvailOnDow = (dow) => (prefs.slots || []).some(s => s.startsWith(`${dow}-`));

  // Selected day data
  const meetupsToday = Object.entries(scheduled1to1 || {})
    .filter(([_, s]) => s.day === selectedDow)
    .map(([momId, s]) => ({ mom: SAMPLE_MOMS.find(m => m.id === momId), ...s }));
  const groupsToday = (joinedEvents || [])
    .map(eid => SUGGESTED_EVENTS.find(e => e.id === eid))
    .filter(e => e && e.day === selectedDow);

  const isAvailable = (winId) => (prefs.slots || []).includes(`${selectedDow}-${winId}`);
  const toggleSlot = (winId) => {
    const slotKey = `${selectedDow}-${winId}`;
    setPrefs(p => ({
      ...p,
      slots: (p.slots || []).includes(slotKey)
        ? p.slots.filter(s => s !== slotKey)
        : [...(p.slots || []), slotKey],
    }));
  };

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const totalAvail = (prefs.slots || []).length;
  const totalScheduled = Object.keys(scheduled1to1 || {}).length + (joinedEvents || []).length;

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
          Your month
        </div>
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 26, color: C.ink, letterSpacing:'-.02em' }}>
          {monthLabel}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: C.terracotta }}/> {Object.keys(scheduled1to1 || {}).length} 1:1</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: C.sageDark }}/> {(joinedEvents || []).length} groups</span>
          <span style={{ color: C.inkMuted }}>· {totalAvail} time slot{totalAvail===1?'':'s'} set</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl p-3" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[9px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:600, letterSpacing:'.06em' }}>
              {d.toUpperCase().slice(0,1)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square"/>;
            const dow = dowOf(d);
            const isToday = d === today.getDate();
            const isSelected = d === selectedDate;
            const hasAvail = hasAvailOnDow(dow);
            const has1to1 = has1to1OnDow(dow);
            const hasGroup = hasGroupOnDow(dow);
            return (
              <button key={i} onClick={()=>setSelectedDate(d)}
                className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all active:scale-95"
                style={{
                  background: isSelected ? C.terracotta : (hasAvail ? `${C.terracotta}10` : 'transparent'),
                  color: isSelected ? '#fff' : C.ink,
                  border: isToday && !isSelected ? `1.5px solid ${C.terracotta}` : `1px solid transparent`,
                }}>
                <span className="text-[12.5px]" style={{
                  fontFamily: 'Fraunces',
                  fontWeight: isToday || isSelected ? 600 : 400,
                  lineHeight: 1,
                }}>{d}</span>
                {(has1to1 || hasGroup) && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {has1to1 && <div className="w-1 h-1 rounded-full" style={{ background: isSelected ? '#fff' : C.terracotta }}/>}
                    {hasGroup && <div className="w-1 h-1 rounded-full" style={{ background: isSelected ? '#fff' : C.sageDark }}/>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="mt-4">
        <div className="text-[10.5px] tracking-[.16em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
          {DAY_LABELS[selectedDow]}, {MONTH_NAMES[month]} {selectedDate}
          {selectedDate === today.getDate() && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px]" style={{ background: C.saffron, color: C.ink }}>TODAY</span>}
        </div>

        {/* Meetups for the day */}
        {(meetupsToday.length > 0 || groupsToday.length > 0) ? (
          <div className="mt-2 space-y-2">
            {meetupsToday.map((m, i) => (
              <div key={`o${i}`} onClick={()=>m.mom && openSchedule && openSchedule(m.mom)}
                className="rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all active:scale-[.99]"
                style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] flex-shrink-0" style={{
                  background: m.mom?.hue || C.terracotta, color:'#fff', fontFamily:'Fraunces', fontWeight:500,
                }}>
                  {m.mom ? m.mom.name.split(' ').map(s=>s[0]).join('') : '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>
                    {m.mom ? m.mom.name : 'Meetup'}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                    {m.time}{m.place ? ` · ${m.place}` : ''}
                  </div>
                </div>
                <div className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.terracotta}18`, color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.06em' }}>1:1</div>
              </div>
            ))}
            {groupsToday.map((e, i) => (
              <div key={`g${i}`} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                  background: e.hue || `linear-gradient(135deg,${C.sageDark},${C.saffron})`, color:'#fff',
                }}>
                  <Users size={14}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>
                    {e.name}
                  </div>
                  <div className="text-[11px] truncate mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                    {e.time} · {e.place}
                  </div>
                </div>
                <div className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.sageDark}22`, color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.06em' }}>GROUP</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-xl p-3 text-center" style={{ background: C.creamSoft, border:`1px dashed ${C.divider}` }}>
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
              No meetups on {DAY_LABELS[selectedDow]}s yet.
            </div>
          </div>
        )}

        {/* Update availability */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10.5px] tracking-[.16em] uppercase flex items-center gap-1.5" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700 }}>
              <Sparkles size={11}/> Your {selectedDow} availability
            </div>
            {(prefs.slots || []).filter(s => s.startsWith(`${selectedDow}-`)).length > 0 && (
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                Tap to toggle
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIME_WINDOWS.map(w => {
              const active = isAvailable(w.id);
              return (
                <button key={w.id} onClick={()=>toggleSlot(w.id)}
                  className="rounded-full px-3 py-1.5 transition-all active:scale-[.97]"
                  style={{
                    background: active ? C.sageDark : C.paper,
                    color: active ? '#fff' : C.inkSoft,
                    border: `1px solid ${active ? C.sageDark : C.divider}`,
                    fontFamily:'Albert Sans', fontSize: 12, fontWeight: active ? 600 : 500,
                  }}>
                  {active && <Check size={10} style={{ display:'inline-block', marginRight: 4, marginTop:-2 }}/>}
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Find new matches CTA */}
        <button onClick={()=>{ flash && flash('✦ Looking for new matches with your availability'); goToMatches && goToMatches(); }}
          className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
          style={{
            height: 48,
            background: C.terracotta, color:'#fff',
            fontFamily:'Albert Sans', fontWeight: 600, fontSize: 14,
          }}>
          <Heart size={14}/> Find new matches with this week
        </button>

        <div className="h-3"/>
      </div>
    </div>
  );
};

// ====================================================================
// PLACES TAB — editable place picker (mirrors Screen 6 + match CTA)
// ====================================================================
const PlacesTab = ({ prefs, setPrefs, location, goToMatches, flash }) => {
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

const MatchCard = ({ mom, onSchedule, onProfile, onMessage }) => (
  <div className="rounded-[22px] overflow-hidden" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
    {/* Top: identity + match */}
    <div className="p-4 pb-3 flex items-start gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
        background: mom.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500, fontSize: 18,
      }}>{mom.name.split(' ').map(s=>s[0]).join('')}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div style={{ fontFamily:'Fraunces', fontSize: 17, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{mom.name}</div>
          {mom.verified && <ShieldCheck size={13} style={{ color: C.sageDark }}/>}
        </div>
        <div className="text-[12px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          {mom.type} · Kids {mom.kids} · {mom.distance}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mom.tags.map(t => (
            <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-full"
              style={{ background: C.creamSoft, color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:500, border:`1px solid ${C.divider}` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right">
        <div style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500, color: C.terracotta, lineHeight:1 }}>{mom.overlap}<span className="text-[11px]" style={{ color: C.inkMuted }}>%</span></div>
        <div className="text-[9px] tracking-[.12em] uppercase mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:600 }}>match</div>
      </div>
    </div>

    {/* Suggested slot strip */}
    <div className="mx-4 rounded-[14px] p-3 flex items-center gap-2.5" style={{ background: C.creamSoft, border: `1px dashed ${C.terracotta}55` }}>
      <CalendarIcon size={15} style={{ color: C.terracotta }}/>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.ink, fontWeight:600 }}>
          Both free · {mom.nextSlot}
        </div>
        <div className="text-[11px] truncate" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          {mom.nextPlace}
        </div>
      </div>
    </div>

    {/* Action stack — schedule first, profile second, message third */}
    <div className="p-4 pt-3 space-y-2">
      <button onClick={onSchedule} className="w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.98]"
        style={{ height: 48, background: C.terracotta, color:'#fff', fontFamily:'Albert Sans', fontWeight:600, fontSize: 14.5, letterSpacing:'.02em' }}>
        <CalendarIcon size={16}/> Schedule meetup
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onProfile} className="rounded-xl flex items-center justify-center gap-1.5 transition-all"
          style={{ height: 40, background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500 }}>
          <User size={14}/> View profile
        </button>
        <button onClick={onMessage} className="rounded-xl flex items-center justify-center gap-1.5 transition-all"
          style={{ height: 40, background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500 }}>
          <MessageCircle size={14}/> Message
        </button>
      </div>
    </div>
  </div>
);

// -- Events --
// ====================================================================
// EVENTS TAB — group events scheduled this month
// ====================================================================
const EventsTab = ({ joinedEvents, setJoinedEvents, account, requestAccount, openPremium, flash }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // For each suggested event, compute all dates this month matching its weekday
  // (treating events as recurring weekly), then take just the next upcoming one.
  const dowToIdx = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 };
  const occurrencesThisMonth = (dow) => {
    const targetIdx = dowToIdx[dow];
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === targetIdx) result.push(d);
    }
    return result;
  };

  // Build events list — one card per (event, next upcoming date) pair
  const eventsThisMonth = SUGGESTED_EVENTS
    .map(e => {
      const dates = occurrencesThisMonth(e.day);
      const upcoming = dates.filter(d => d >= today.getDate());
      const nextDate = upcoming[0] || dates[dates.length - 1]; // fall back to last if none upcoming
      const moreCount = upcoming.length > 1 ? upcoming.length - 1 : 0;
      return { ...e, _date: nextDate, _moreCount: moreCount, _isPast: !upcoming.length };
    })
    .filter(e => e._date)
    .sort((a, b) => {
      // Upcoming first, then past (shouldn't happen mid-month), sorted by date
      if (a._isPast !== b._isPast) return a._isPast ? 1 : -1;
      return a._date - b._date;
    });

  const handleJoin = (e) => {
    if ((joinedEvents || []).includes(e.id)) return;
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name}`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 26, color: C.ink, letterSpacing:'-.02em' }}>
          Events this <span style={{ fontStyle:'italic', color: C.terracotta }}>month</span>.
        </h1>
        <div className="mt-1 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          {eventsThisMonth.length} group meetups · tap to RSVP.
        </div>
      </div>

      <div className="space-y-2.5">
        {eventsThisMonth.map(e => {
          const joined = (joinedEvents || []).includes(e.id);
          return (
            <div key={e.id} className="rounded-2xl overflow-hidden" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
              {/* Hero band */}
              <div style={{ height: 78, background: e.hue, position:'relative' }}>
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                  <div className="text-[10px] px-2 py-1 rounded-full" style={{ background:'rgba(255,255,255,.92)', color: C.ink, fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.04em' }}>
                    {DAYS_SHORT_BY_DOW[e.day]} · {MONTH_NAMES[month].slice(0,3)} {e._date}
                  </div>
                  {e._moreCount > 0 && (
                    <div className="text-[10px] px-2 py-1 rounded-full" style={{ background:'rgba(0,0,0,.32)', color:'#fff', fontFamily:'Albert Sans', fontWeight:500 }}>
                      +{e._moreCount} more
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2.5 right-3 text-[10.5px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background:'rgba(0,0,0,.32)', color:'#fff', fontFamily:'Albert Sans', fontWeight:500 }}>
                  <Users size={10}/> {e.going} going
                </div>
              </div>
              {/* Body */}
              <div className="p-3.5">
                <div style={{ fontFamily:'Fraunces', fontSize: 16, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{e.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                  <CalendarIcon size={11}/> {e.time}
                  <span style={{ color: C.divider }}>·</span>
                  <MapPin size={11}/> <span className="truncate">{e.place}</span>
                </div>

                {/* Tags */}
                {e.tags && e.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.tags.slice(0,3).map((t, i) => (
                      <div key={i} className="text-[9.5px] px-1.5 py-0.5 rounded" style={{
                        background: `${C.saffron}25`, color: C.ink, fontFamily:'Albert Sans', fontWeight:600,
                      }}>{t}</div>
                    ))}
                  </div>
                )}

                {/* Attendee preview — partial free, full Plus */}
                {(() => {
                  const isPlus = !!account?.isPremium;
                  // Generate stable attendee subset from SAMPLE_MOMS based on event id hash
                  const seed = (e.id.charCodeAt(2) + e.id.charCodeAt(3)) % SAMPLE_MOMS.length;
                  const ordered = [...SAMPLE_MOMS.slice(seed), ...SAMPLE_MOMS.slice(0, seed)];
                  const visible = isPlus ? ordered : ordered.slice(0, 3);
                  const hidden = Math.max(0, e.going - visible.length);
                  return (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {visible.map((m, i) => (
                          <div key={m.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px]" style={{
                            background: m.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500,
                            border: `2px solid ${C.paper}`, zIndex: 10 - i,
                          }}>
                            {m.name.split(' ').map(s=>s[0]).join('')}
                          </div>
                        ))}
                        {hidden > 0 && !isPlus && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9.5px]" style={{
                            background: C.creamSoft, color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:700,
                            border: `2px solid ${C.paper}`, filter: 'blur(.5px)',
                          }}>
                            +{hidden}
                          </div>
                        )}
                      </div>
                      {isPlus ? (
                        <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.sageDark, fontWeight:600 }}>
                          All {e.going} visible
                        </div>
                      ) : (
                        <button onClick={(ev)=>{ ev.stopPropagation(); openPremium && openPremium(); }}
                          className="text-[10.5px] flex items-center gap-1" style={{ fontFamily:'Albert Sans', color: C.terracotta, fontWeight:600 }}>
                          <Lock size={9}/> See all {e.going}
                        </button>
                      )}
                    </div>
                  );
                })()}

                <button onClick={()=>handleJoin(e)}
                  className="mt-3 w-full rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    height: 38,
                    background: joined ? C.sageDark : C.ink,
                    color: joined ? '#fff' : C.cream,
                    fontFamily:'Albert Sans', fontWeight:600, fontSize: 12.5,
                  }}>
                  {joined ? <><Check size={12}/> Going</> : <><Plus size={12}/> I'm in</>}
                </button>
              </div>
            </div>
          );
        })}

        {!account?.isPremium && (
          <button onClick={openPremium} className="w-full rounded-[18px] p-4 flex items-center gap-3 mt-1" style={{
            background: C.creamSoft, border:`1px dashed ${C.divider}`, color: C.ink, textAlign:'left',
          }}>
            <Crown size={17} style={{ color: C.saffron }}/>
            <div className="flex-1">
              <div className="text-[12.5px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>See who else is going</div>
              <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>Full attendee profiles · Mama Plus</div>
            </div>
            <ChevronRight size={15}/>
          </button>
        )}
      </div>
    </div>
  );
};

const DAYS_SHORT_BY_DOW = { Mon:'MON', Tue:'TUE', Wed:'WED', Thu:'THU', Fri:'FRI', Sat:'SAT', Sun:'SUN' };

const MatchesTab = ({ openSchedule, openProfile, openMessage }) => (
  <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
    <div className="mb-4">
      <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
        Your <span style={{ fontStyle:'italic', color: C.terracotta }}>matches</span>
      </h1>
    </div>
    <div className="space-y-2.5">
      {SAMPLE_MOMS.map(m => (
        <button key={m.id} onClick={()=>openProfile(m)} className="w-full text-left">
          <MiniMatchCard mom={m}/>
        </button>
      ))}
    </div>
  </div>
);

// -- You --
const YouTab = ({ profile, prefs, location, distance, restart }) => {
  const momTypeLabel = profile.momTypes
    .filter(id => id !== 'prefer_not')
    .map(id => MOM_TYPES.find(m=>m.id===id)?.label)
    .filter(Boolean)
    .slice(0,2)
    .join(' & ') || 'Mom';

  const kidsLabel = Object.entries(profile.kidsAges || {})
    .map(([age, count]) => `${count} × ${age}`)
    .join(', ') || '—';

  const distanceLabel = distance === 'any' ? 'anywhere' : distance ? `within ${distance} mi` : '';

  return (
  <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
    <div className="mb-4">
      <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
        You
      </h1>
    </div>

    <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#E8B4A0,#C8553D)', color:'#fff' }}>
      <Sprig style={{ position:'absolute', width: 60, top: 8, right: 8, opacity: .4 }} color="#fff"/>
      <div className="text-[10.5px] tracking-[.18em] uppercase opacity-80" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>You · preview mode</div>
      <div className="mt-1" style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500 }}>
        {momTypeLabel}
      </div>
      <div className="mt-0.5 text-[12.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
        Kids: {kidsLabel}
      </div>
      {location && (
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
          <MapPin size={11}/> {location}{distanceLabel ? ` · ${distanceLabel}` : ''}
        </div>
      )}
      <div className="mt-1 text-[12px] opacity-85" style={{ fontFamily:'Albert Sans' }}>
        {profile.values.slice(0,3).join(' · ') || 'Set your values'}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.92 }}>
        <Lock size={11}/> Sign up to save · keep using free
      </div>
    </div>

    <div className="rounded-[18px] divide-y" style={{ background: C.paper, border:`1px solid ${C.divider}`, borderColor: C.divider }}>
      {[
        { l:'Verified · phone & social media', tag:'Plus', icon: ShieldCheck },
        { l:'Full profile in groups',    tag:'Plus', icon: Star },
        { l:'Unlimited messages',        tag:'Plus', icon: MessageCircle },
        { l:'Calendar & places',         tag:'Free', icon: CalendarIcon },
      ].map((r,i)=>(
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <r.icon size={16} style={{ color: C.ink }}/>
          <div className="flex-1 text-[13.5px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>{r.l}</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
            background: r.tag==='Plus' ? C.ink : C.creamSoft,
            color: r.tag==='Plus' ? C.saffron : C.inkSoft,
            fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'.06em'
          }}>{r.tag.toUpperCase()}</span>
        </div>
      ))}
    </div>

    <button onClick={restart} className="mt-4 w-full text-[12.5px] py-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
      ↺ Restart prototype tour
    </button>
  </div>
  );
};

// ====================================================================
// SHEETS / MODALS
// ====================================================================
const ScheduleSheet = ({ mom, onClose, onContinue, hasAccount }) => {
  const [chosen, setChosen] = useState(0);
  const slots = [
    { day:'Tue', time:'9:30 AM', place: mom.nextPlace },
    { day:'Thu', time:'10:00 AM', place: 'Sightglass · 7th St' },
    { day:'Sat', time:'9:00 AM',  place: 'Dolores Park · north end' },
  ];
  return (
    <Sheet onClose={onClose}>
      <div className="px-6 pt-2 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
          Schedule with {mom.name.split(' ')[0]}
        </div>
        <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 24, fontWeight:500, color: C.ink, letterSpacing:'-.02em' }}>
          You're <span style={{ fontStyle:'italic', color: C.terracotta }}>both</span> free…
        </h3>
        <div className="mt-4 space-y-2">
          {slots.map((s,i)=>(
            <button key={i} onClick={()=>setChosen(i)}
              className="w-full rounded-[16px] p-3.5 flex items-center gap-3 transition-all text-left"
              style={{
                background: chosen===i ? C.ink : C.paper,
                color: chosen===i ? C.cream : C.ink,
                border: `1px solid ${chosen===i ? C.ink : C.divider}`,
              }}>
              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center"
                style={{ background: chosen===i ? C.saffron : C.creamSoft, color: C.ink }}>
                <div className="text-[9px] tracking-[.1em]" style={{ fontFamily:'Albert Sans', fontWeight:700 }}>{s.day.toUpperCase()}</div>
                <div className="text-[11px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>{s.time.split(' ')[0]}</div>
              </div>
              <div className="flex-1">
                <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>{s.day} · {s.time}</div>
                <div className="text-[12px] mt-0.5" style={{ fontFamily:'Albert Sans', opacity: chosen===i ? .8 : .65 }}>{s.place}</div>
              </div>
              {chosen===i && <Check size={18} style={{ color: C.saffron }}/>}
            </button>
          ))}
        </div>
        <button onClick={()=>onContinue(slots[chosen])} className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2"
          style={{ height: 52, background: C.terracotta, color:'#fff', fontFamily:'Albert Sans', fontWeight:600, fontSize: 15 }}>
          {hasAccount ? 'Send invite' : 'Continue'}
          <ArrowRight size={16}/>
        </button>
        <div className="mt-2.5 text-center text-[11.5px] flex items-center justify-center gap-1" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
          {!hasAccount && <ShieldCheck size={11}/>}
          {hasAccount ? 'Adds to your calendar when she accepts.' : 'Quick verify next — keeps Mama trustworthy.'}
        </div>
      </div>
    </Sheet>
  );
};

const ProfileSheet = ({ mom, profile, isPremium, onClose, openPremium }) => {
  // Compute shared ground (works for both partial and full)
  const sharedValues = (mom.values || []).filter(v => (profile?.values || []).includes(v));
  const sharedInterests = (mom.interests || []).filter(i => (profile?.interests || []).includes(i));
  const sharedCount = sharedValues.length + sharedInterests.length;

  // Partial view obscures last name → "Sara K."
  const displayName = isPremium ? mom.name : `${mom.name.split(' ')[0]} ${mom.name.split(' ')[1]?.[0] || ''}.`;
  // Partial obscures specific kid ages — broaden them
  const broadKids = (() => {
    const parts = (mom.kids || '').split(' · ');
    const broaden = (k) => {
      const num = parseInt(k.trim().replace('y',''), 10);
      if (isNaN(num)) return k;
      if (num <= 1) return 'baby';
      if (num <= 3) return 'toddler';
      if (num <= 5) return 'preschool';
      if (num <= 12) return 'school-age';
      return 'teen';
    };
    return parts.map(broaden).join(' & ');
  })();

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6">
        {/* Hero card */}
        <div className="rounded-[20px] p-5" style={{ background: mom.hue, color:'#fff' }}>
          <div className="text-[10.5px] tracking-[.18em] uppercase opacity-80" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>
            {isPremium ? 'Profile · full' : 'Profile · partial'}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div style={{ fontFamily:'Fraunces', fontSize: 32, fontWeight:500, letterSpacing:'-.02em' }}>{displayName}</div>
            {mom.verified && <ShieldCheck size={16} style={{ opacity:.95 }}/>}
          </div>
          <div className="text-[12.5px] mt-0.5 opacity-90" style={{ fontFamily:'Albert Sans' }}>
            {mom.type} · Kids {isPremium ? mom.kids : broadKids} · {mom.distance}
          </div>
        </div>

        {/* Shared ground — always free, this is the hook */}
        {sharedCount > 0 && (
          <div className="mt-4 rounded-[16px] p-3.5" style={{ background: `${C.terracotta}10`, border:`1px solid ${C.terracotta}33` }}>
            <div className="text-[10px] tracking-[.16em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
              <Heart size={10} fill={C.terracotta}/> You both share · {sharedCount}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sharedValues.map(v => (
                <span key={v} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: C.terracotta, color:'#fff', fontFamily:'Albert Sans', fontWeight:600 }}>
                  {v}
                </span>
              ))}
              {sharedInterests.map(it => (
                <span key={it} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: `${C.sageDark}`, color:'#fff', fontFamily:'Albert Sans', fontWeight:600 }}>
                  {it}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Partial values/interests — show 2 of each only */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
              VALUES
            </div>
            {!isPremium && mom.values.length > 2 && (
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                +{mom.values.length - 2} more in Plus
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(isPremium ? mom.values : mom.values.slice(0, 2)).map(v => (
              <span key={v} className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans' }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
              INTERESTS
            </div>
            {!isPremium && mom.interests.length > 2 && (
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                +{mom.interests.length - 2} more in Plus
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(isPremium ? mom.interests : mom.interests.slice(0, 2)).map(v => (
              <span key={v} className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans' }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Premium-only sections — bio, social proof, all slots */}
        {isPremium ? (
          <>
            {mom.bio && (
              <div className="mt-4 rounded-[16px] p-4" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
                <Quote size={14} style={{ color: C.terracotta }}/>
                <div className="mt-1 text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:400, color: C.ink, fontStyle:'italic', lineHeight:1.45 }}>
                  {mom.bio}
                </div>
              </div>
            )}
            {mom.freeSlots && (
              <div className="mt-4">
                <div className="text-[11.5px] mb-2" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
                  FREE TIMES
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mom.freeSlots.map(s => {
                    const [day, ...winParts] = s.split('-');
                    const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
                    return (
                      <span key={s} className="text-[11px] px-2 py-1 rounded-md" style={{ background: `${C.saffron}25`, color: C.ink, fontFamily:'Albert Sans', fontWeight:600 }}>
                        {day} · {win ? win.label : winParts.join('-')}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 rounded-[16px] p-3 flex items-center gap-2.5" style={{ background: `${C.sageDark}10`, border:`1px solid ${C.sageDark}33` }}>
              <Users size={14} style={{ color: C.sageDark }}/>
              <div className="text-[12px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>
                Met up with <strong style={{ color: C.sageDark }}>7 moms</strong> this month · super active
              </div>
            </div>
          </>
        ) : (
          /* Locked premium preview — blurred teaser */
          <div className="mt-5 rounded-[16px] overflow-hidden relative" style={{ background: C.creamSoft, border:`1px solid ${C.divider}` }}>
            {/* Blurred fake content underneath */}
            <div className="p-4" style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
              <Quote size={14} style={{ color: C.terracotta }}/>
              <div className="mt-1 text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:400, color: C.ink, fontStyle:'italic', lineHeight:1.45 }}>
                {mom.bio || 'Looking for a slow morning kind of friend who gets that some days are just survival mode...'}
              </div>
              <div className="mt-3 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
                FREE TIMES
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <span className="text-[11px] px-2 py-1 rounded-md" style={{ background: `${C.saffron}25`, color: C.ink }}>Mon · 9–12 AM</span>
                <span className="text-[11px] px-2 py-1 rounded-md" style={{ background: `${C.saffron}25`, color: C.ink }}>Wed · 2–5 PM</span>
              </div>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4" style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(246,239,226,.92) 40%, rgba(246,239,226,.98) 100%)',
            }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lock size={13} style={{ color: C.inkSoft }}/>
                <div className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:700 }}>
                  Plus reveals
                </div>
              </div>
              <div className="text-[12px] mb-3 text-center" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight: 1.4, maxWidth: 220 }}>
                Bio, all her free times, full values & interests, and her meetup history
              </div>
              <button onClick={openPremium} className="rounded-xl flex items-center justify-center gap-1.5 px-5"
                style={{ height: 40, background: C.ink, color: C.saffron, fontFamily:'Albert Sans', fontWeight:600, fontSize: 13 }}>
                <Crown size={13}/> See full profile
              </button>
              <div className="mt-1.5 text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                7 days free · then $7.99/mo
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};

const MessageSheet = ({ mom, history, onSend, isPremium, onClose, openPremium }) => {
  const FREE_LIMIT = 3;
  const userMessages = history.filter(m => m.fromUser);
  const used = userMessages.length;
  const remaining = FREE_LIMIT - used;
  const limitReached = !isPremium && remaining <= 0;

  const [text, setText] = useState(history.length === 0
    ? `Hi ${mom.name.split(' ')[0]}! Saw we both have a ${mom.kids.split(' · ')[0]} kid and free ${mom.nextSlot ? mom.nextSlot.split(' ')[0] : 'Tue'} mornings. Want to grab coffee?`
    : '');

  const canSend = text.trim().length > 0 && !limitReached;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6 flex flex-col" style={{ minHeight: 540 }}>
        {/* Header */}
        <div>
          <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Message {mom.name.split(' ')[0]}
          </div>
          <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500, color: C.ink, letterSpacing:'-.02em' }}>
            {isPremium
              ? <>Chat <span style={{ fontStyle:'italic', color: C.terracotta }}>unlimited</span>.</>
              : <>Your first <span style={{ fontStyle:'italic', color: C.terracotta }}>3 messages</span> are free.</>}
          </h3>
        </div>

        {/* Free counter — only for non-Plus */}
        {!isPremium && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-full" style={{
                  width: 18, height: 6,
                  background: i < used ? C.terracotta : C.divider,
                  opacity: i < used ? 1 : .6,
                }}/>
              ))}
            </div>
            <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: limitReached ? C.terracotta : C.inkSoft, fontWeight: limitReached ? 600 : 500 }}>
              {limitReached ? 'Free messages used' : `${remaining} free message${remaining === 1 ? '' : 's'} left`}
            </div>
          </div>
        )}

        {/* Plus badge */}
        {isPremium && (
          <div className="mt-3 inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-md" style={{
            background: `${C.saffron}25`, border: `1px solid ${C.saffron}55`,
          }}>
            <Crown size={11} style={{ color: C.saffron }}/>
            <span className="text-[10px] tracking-[.12em] uppercase" style={{ fontFamily:'Albert Sans', fontWeight:700, color: C.ink }}>
              Plus · unlimited
            </span>
          </div>
        )}

        {/* Thread — show prior sent messages */}
        {history.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth:'none' }}>
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.fromUser ? 'justify-end' : 'justify-start'}`}>
                <div className="rounded-2xl px-3.5 py-2 max-w-[85%]" style={{
                  background: m.fromUser ? C.terracotta : C.paper,
                  color: m.fromUser ? '#fff' : C.ink,
                  border: m.fromUser ? 'none' : `1px solid ${C.divider}`,
                  borderBottomRightRadius: m.fromUser ? 6 : 16,
                  borderBottomLeftRadius: m.fromUser ? 16 : 6,
                }}>
                  <div className="text-[13px]" style={{ fontFamily:'Albert Sans', lineHeight: 1.4 }}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input OR upsell */}
        {limitReached ? (
          <div className="mt-4 rounded-2xl p-4" style={{ background: C.ink, color: C.cream }}>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} style={{ color: C.saffron }}/>
              <div style={{ fontFamily:'Fraunces', fontSize: 15.5, fontWeight: 500 }}>
                Keep the conversation going
              </div>
            </div>
            <div className="text-[12px] mb-3" style={{ fontFamily:'Albert Sans', opacity: .8, lineHeight: 1.4 }}>
              You've used your 3 free messages with {mom.name.split(' ')[0]}. Plus unlocks unlimited chat with every match.
            </div>
            <button onClick={openPremium} className="w-full rounded-xl flex items-center justify-center gap-2"
              style={{
                height: 44, background: C.saffron, color: C.ink,
                fontFamily:'Albert Sans', fontWeight: 600, fontSize: 13.5,
              }}>
              <Crown size={14}/> Try Plus · 7 days free
            </button>
            <div className="mt-1.5 text-center text-[10.5px]" style={{ fontFamily:'Albert Sans', opacity: .55 }}>
              Then $7.99/mo · cancel anytime
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-2xl p-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
              <textarea
                value={text}
                onChange={(e)=>setText(e.target.value.slice(0, 180))}
                placeholder={`Write a message to ${mom.name.split(' ')[0]}…`}
                rows={3}
                className="w-full text-[13.5px] resize-none outline-none"
                style={{
                  fontFamily:'Albert Sans', color: C.ink, lineHeight: 1.5,
                  background: 'transparent',
                }}
              />
              <div className="mt-1 flex items-center justify-between text-[10.5px]" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
                <span>{text.length} / 180 chars</span>
                {!isPremium && <span>· message {used + 1} of {FREE_LIMIT}</span>}
              </div>
            </div>

            <button onClick={handleSend} disabled={!canSend}
              className="mt-3 w-full rounded-2xl flex items-center justify-center gap-2"
              style={{
                height: 50,
                background: canSend ? C.terracotta : C.creamSoft,
                color: canSend ? '#fff' : C.inkMuted,
                border: canSend ? 'none' : `1px solid ${C.divider}`,
                fontFamily:'Albert Sans', fontWeight: 600, fontSize: 14.5,
              }}>
              <MessageCircle size={15}/> Send
            </button>

            {!isPremium && remaining === 1 && (
              <div className="mt-2 text-center text-[11px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight: 500 }}>
                Last free message — make it count ✦
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};
const CreateAccountSheet = ({ pendingAction, onClose, onComplete }) => {
  const [method, setMethod] = useState('phone'); // 'phone' or 'email'
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  // Format phone as (XXX) XXX-XXXX while typing
  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const passwordOk = password.length >= 8;
  const canSubmit = firstName.trim().length >= 2 && contactOk && passwordOk && agreed;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      firstName,
      method,
      phone: method === 'phone' ? phone : null,
      email: method === 'email' ? email : null,
    });
  };

  // Pending action determines the summary card at the top
  const action = pendingAction || {};
  const isGroup = action.type === 'group';
  const isOneOnOne = action.type === '1to1' || action.type === 'invite';

  // Parse 1:1 slot string ("Mon-morning") into display-friendly day/time
  const slotDisplay = (() => {
    if (!isOneOnOne || !action.slot) return null;
    if (typeof action.slot === 'string') {
      const [day, ...winParts] = action.slot.split('-');
      const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
      return { day, time: win ? win.label : '' };
    }
    return action.slot; // already an object {day, time, place}
  })();

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6 flex flex-col" style={{ minHeight: 540 }}>
        {/* Header — title */}
        <div>
          <div className="text-[10.5px] tracking-[.2em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
            {isGroup ? 'Joining a group' : isOneOnOne ? 'Almost matched' : 'Almost there'}
          </div>
          <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 26, fontWeight:500, color: C.ink, letterSpacing:'-.02em', lineHeight:1.1 }}>
            Create your <span style={{ fontStyle:'italic', color: C.terracotta }}>account</span>
          </h3>
          <p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
            {isGroup ? "We'll save your RSVP and let the group know you're in." :
             isOneOnOne ? "We'll save your match and send an intro for you." :
             "Verified moms only — quick sign-up, your details stay private."}
          </p>
        </div>

        {/* Pending-action summary card */}
        {(isOneOnOne || isGroup) && (
          <div className="mt-4 rounded-[14px] p-3 flex items-center gap-3" style={{ background: C.creamSoft, border:`1px solid ${C.divider}` }}>
            {isOneOnOne && action.mom && (
              <>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: action.mom.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500, fontSize: 14 }}>
                  {action.mom.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[.16em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
                    1:1 with
                  </div>
                  <div className="text-[13px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, color: C.ink }}>
                    {action.mom.name}{slotDisplay ? ` · ${slotDisplay.day} ${slotDisplay.time}` : ''}
                  </div>
                  {action.mom.nextPlace && (
                    <div className="text-[10.5px] truncate" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                      {action.mom.nextPlace}
                    </div>
                  )}
                </div>
              </>
            )}
            {isGroup && action.event && (
              <>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: action.event.hue || `linear-gradient(135deg,${C.sageDark},${C.saffron})`, color:'#fff' }}>
                  <Users size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[.16em] uppercase" style={{ color: C.sageDark, fontFamily:'Albert Sans', fontWeight:700 }}>
                    Joining
                  </div>
                  <div className="text-[13px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:600, color: C.ink }}>
                    {action.event.name}
                  </div>
                  <div className="text-[10.5px] truncate" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                    {action.event.day} {action.event.time} · {action.event.place}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* First name */}
        <div className="mt-4">
          <label className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            First name
          </label>
          <div className="mt-1 rounded-2xl px-4 flex items-center" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
            <input value={firstName} onChange={e=>setFirstName(e.target.value)}
              placeholder="What should other moms call you?"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ fontFamily:'Albert Sans', color: C.ink }}/>
          </div>
        </div>

        {/* Phone | Email toggle */}
        <div className="mt-3.5">
          <label className="text-[10.5px] tracking-[.14em] uppercase mb-1.5 block" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Sign up with
          </label>
          <div className="rounded-2xl p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
            <button onClick={()=>setMethod('phone')}
              className="flex-1 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              style={{
                height: 36,
                background: method === 'phone' ? C.paper : 'transparent',
                color: method === 'phone' ? C.ink : C.inkMuted,
                fontFamily:'Albert Sans', fontSize: 12.5, fontWeight: 600,
                boxShadow: method === 'phone' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
              }}>
              <Phone size={12}/> Phone
            </button>
            <button onClick={()=>setMethod('email')}
              className="flex-1 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              style={{
                height: 36,
                background: method === 'email' ? C.paper : 'transparent',
                color: method === 'email' ? C.ink : C.inkMuted,
                fontFamily:'Albert Sans', fontSize: 12.5, fontWeight: 600,
                boxShadow: method === 'email' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
              }}>
              <Mail size={12}/> Email
            </button>
          </div>

          {/* Conditional input based on method */}
          {method === 'phone' ? (
            <div className="mt-2 rounded-2xl px-4 flex items-center gap-2" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
              <span className="text-[13.5px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>+1</span>
              <input value={phone} onChange={e=>setPhone(formatPhone(e.target.value))}
                inputMode="tel" type="tel"
                placeholder="(555) 123-4567"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                style={{ fontFamily:'Albert Sans', color: C.ink, letterSpacing:'.02em' }}/>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl px-4 flex items-center gap-2" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
              <Mail size={14} style={{ color: C.inkMuted }}/>
              <input value={email} onChange={e=>setEmail(e.target.value)}
                inputMode="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                style={{ fontFamily:'Albert Sans', color: C.ink }}/>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="mt-3.5">
          <label className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Password
          </label>
          <div className="mt-1 rounded-2xl px-4 flex items-center gap-2" style={{ background: C.paper, border:`1px solid ${C.divider}`, height: 46 }}>
            <Lock size={13} style={{ color: C.inkMuted }}/>
            <input value={password} onChange={e=>setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              placeholder="At least 8 characters"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
              style={{ fontFamily:'Albert Sans', color: C.ink }}/>
            <button onClick={()=>setShowPassword(s=>!s)} className="flex items-center justify-center" style={{ color: C.inkMuted }}>
              {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          {password.length > 0 && password.length < 8 && (
            <div className="mt-1 text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.terracotta }}>
              {8 - password.length} more character{8 - password.length === 1 ? '' : 's'}
            </div>
          )}
        </div>

        {/* Terms */}
        <button onClick={()=>setAgreed(a=>!a)}
          className="w-full text-left flex items-start gap-2.5 pt-3 mt-1">
          <div className="mt-0.5 w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0" style={{
            background: agreed ? C.terracotta : 'transparent',
            border: `1.5px solid ${agreed ? C.terracotta : C.inkMuted}`,
          }}>
            {agreed && <Check size={12} color="#fff" strokeWidth={3}/>}
          </div>
          <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.4 }}>
            I agree to Mama's <span style={{ color: C.terracotta, textDecoration:'underline' }}>Terms</span> and <span style={{ color: C.terracotta, textDecoration:'underline' }}>Community Pact</span>.
          </div>
        </button>

        {/* CTA */}
        <div className="mt-4">
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              height: 52,
              background: canSubmit ? C.terracotta : C.divider,
              color: canSubmit ? '#fff' : C.inkMuted,
              fontFamily:'Albert Sans', fontWeight:600, fontSize: 15,
            }}>
            {isGroup ? 'Create account & join' : isOneOnOne ? 'Create account & match' : 'Create account'}
            <ArrowRight size={16}/>
          </button>
          <div className="mt-2.5 text-center text-[10.5px] flex items-center justify-center gap-1" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
            <Lock size={10}/>
            Your {method} is never shown to other moms.
          </div>
        </div>
      </div>
    </Sheet>
  );
};


const PremiumSheet = ({ onClose, onActivate }) => (
  <Sheet onClose={onClose} dark>
    <div className="px-6 pt-2 pb-7" style={{ color: C.cream }}>
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.saffron, color: C.ink }}>
          <Crown size={20}/>
        </div>
      </div>
      <h3 className="text-center" style={{ fontFamily:'Fraunces', fontSize: 28, fontWeight:500, letterSpacing:'-.02em' }}>
        Mama <span style={{ fontStyle:'italic', color: C.saffron }}>Plus</span>
      </h3>
      <div className="mt-1 text-center text-[13px]" style={{ fontFamily:'Albert Sans', opacity:.75 }}>
        Stay close to the moms you click with.
      </div>

      <div className="mt-5 space-y-2.5">
        {[
          ['Unlimited messages', 'Beyond the first 3 — ongoing chat with every match'],
          ['Full profiles', 'Bio, all values & interests, every free time slot'],
          ['Full group attendees', "See exactly who's going · DM them ahead"],
          ['Met-up history', "Social proof — how active each mom is"],
        ].map(([t,s],i)=>(
          <div key={i} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)' }}>
            <Check size={16} style={{ color: C.saffron }}/>
            <div>
              <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>{t}</div>
              <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.7 }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={()=>{ onActivate && onActivate(); onClose(); }} className="mt-5 w-full rounded-2xl"
        style={{ height: 54, background: C.saffron, color: C.ink, fontFamily:'Albert Sans', fontWeight:600, fontSize: 15 }}>
        Try free for 7 days
      </button>
      <div className="mt-2 text-center text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.55 }}>
        Then $7.99/mo · cancel anytime
      </div>
    </div>
  </Sheet>
);

const Sheet = ({ children, onClose, tall, dark }) => (
  <div className="absolute inset-0 z-40" style={{ background:'rgba(20,14,16,.45)' }} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} className="absolute left-0 right-0 bottom-0 overflow-hidden"
      style={{
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: dark ? C.ink : C.cream,
        maxHeight: tall ? '88%' : '78%',
        animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)'
      }}>
      <div className="flex justify-center pt-3 pb-2">
        <div style={{ width: 38, height: 4, borderRadius: 4, background: dark ? '#3a2f33' : C.divider }}/>
      </div>
      <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: dark ? '#2f2528' : C.paper, color: dark ? C.cream : C.ink, border: `1px solid ${dark ? '#3a2f33' : C.divider}` }}>
        <X size={14}/>
      </button>
      <div className="overflow-y-auto" style={{ maxHeight: tall ? 'calc(88vh - 50px)' : 'calc(78vh - 50px)', scrollbarWidth:'none' }}>
        {children}
      </div>
    </div>
  </div>
);

const Toast = ({ msg }) => (
  <div className="absolute left-1/2 -translate-x-1/2 z-50" style={{
    bottom: 100, padding: '12px 18px', borderRadius: 999,
    background: C.ink, color: C.cream, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500,
    boxShadow:'0 16px 36px -10px rgba(0,0,0,.45)',
    animation: 'fadeIn .3s ease',
  }}>
    {msg}
  </div>
);

// ====================================================================
// ROOT
// ====================================================================
export default function App() {
  const [step, setStep] = useState(0);
  const [splashShown, setSplashShown] = useState(false);
  const [profile, setProfile] = useState({ kidsAges:{}, momTypes:[], values:[], interests:[] });
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [prefs, setPrefs] = useState({ slots:[], places:[] });
  const [scheduleMom, setScheduleMom] = useState(null);
  const [profileMom, setProfileMom] = useState(null);
  const [messageMom, setMessageMom] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [account, setAccount] = useState(null); // { firstName, method, phone, email } after signup
  const [pendingAction, setPendingAction] = useState(null); // generic gate: { type, mom?, slot?, event? }
  const [toast, setToast] = useState(null);
  // Lifted state — shared across Screen 7 (1:1) and Screen 8 (groups) for conflict awareness
  const [scheduled1to1, setScheduled1to1] = useState({});
  const [joinedEvents, setJoinedEvents] = useState([]);
  // Message history per mom: { [momId]: [{ text, fromUser, ts }, ...] }
  const [messageHistory, setMessageHistory] = useState({});

  // Load fonts once
  useEffect(() => {
    const id = 'mama-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Albert+Sans:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'mama-anim';
    style.textContent = `
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes fadeIn { from { opacity:0; transform:translate(-50%,8px);} to { opacity:1; transform:translate(-50%,0);} }
      @keyframes fadeInUp { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0);} }
      @keyframes popBadge { 0% { transform: scale(.4); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }, []);

  const flash = (m) => { setToast(m); setTimeout(()=>setToast(null), 1900); };

  const restart = () => {
    setStep(0);
    setProfile({ kidsAges:{}, momTypes:[], values:[], interests:[] });
    setLocation(null);
    setDistance(null);
    setPrefs({ slots:[], places:[] });
    setAccount(null);
    setScheduled1to1({});
    setJoinedEvents([]);
    setPendingAction(null);
    setMessageHistory({});
    setSplashShown(false);
  };

  // Generic gate: if no account yet, queue the action and open CreateAccountSheet
  const requestAccount = (action) => setPendingAction(action);

  // Replay the queued action after account creation completes
  const handleAccountComplete = (acct) => {
    setAccount(acct);
    const a = pendingAction;
    if (a) {
      if (a.type === '1to1' && a.mom && a.slot) {
        // Parse slot string into {day, time}
        let day, time, place;
        if (typeof a.slot === 'string') {
          const [d, ...winParts] = a.slot.split('-');
          const win = TIME_WINDOWS.find(w => w.id === winParts.join('-')) || TIME_WINDOWS[1];
          day = d; time = win.label; place = a.mom.nextPlace;
        } else {
          day = a.slot.day; time = a.slot.time; place = a.slot.place || a.mom.nextPlace;
        }
        setScheduled1to1(s => ({ ...s, [a.mom.id]: { day, time, place } }));
        flash(`✦ Welcome ${acct.firstName} · scheduled with ${a.mom.name.split(' ')[0]}`);
      } else if (a.type === 'group' && a.event) {
        setJoinedEvents(j => j.includes(a.event.id) ? j : [...j, a.event.id]);
        flash(`✦ Welcome ${acct.firstName} · joined ${a.event.name}`);
      } else if (a.type === 'invite' && a.mom) {
        flash(`Welcome, ${acct.firstName}. Invite sent to ${a.mom.name.split(' ')[0]} ✦`);
      } else {
        flash(`Welcome, ${acct.firstName} ✦`);
      }
    } else {
      flash(`Welcome, ${acct.firstName} ✦`);
    }
    setPendingAction(null);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8" style={{
      background: `radial-gradient(ellipse at top left, ${C.rose}33, transparent 50%), radial-gradient(ellipse at bottom right, ${C.sage}22, transparent 50%), ${C.creamSoft}`,
    }}>
      <PhoneFrame>
        <div className="w-full h-full relative">
          {!splashShown ? (
            <Splash onBegin={()=>setSplashShown(true)}/>
          ) : (<>
          {step===0 && <Screen1 onNext={()=>setStep(1)}/>}
          {step===1 && <Screen2 onNext={()=>setStep(2)} onBack={()=>setStep(0)}/>}
          {step===2 && <Screen3 onNext={()=>setStep(3)} onBack={()=>setStep(1)} location={location} setLocation={setLocation} distance={distance} setDistance={setDistance}/>}
          {step===3 && <Screen4 onNext={()=>setStep(4)} onBack={()=>setStep(2)} profile={profile} setProfile={setProfile}/>}
          {step===4 && <Screen5 onNext={()=>setStep(5)} onBack={()=>setStep(3)} prefs={prefs} setPrefs={setPrefs}/>}
          {step===5 && <Screen6 onNext={()=>setStep(6)} onBack={()=>setStep(4)} prefs={prefs} setPrefs={setPrefs} location={location}/>}
          {step===6 && <Screen7 onNext={()=>setStep(7)} onBack={()=>setStep(5)}
            profile={profile} prefs={prefs} location={location}
            openProfile={setProfileMom}
            scheduled1to1={scheduled1to1} setScheduled1to1={setScheduled1to1}
            account={account} requestAccount={requestAccount}
            flash={flash}/>}
          {step===7 && <Screen8 onNext={()=>setStep(8)} onBack={()=>setStep(6)}
            prefs={prefs}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            account={account} requestAccount={requestAccount}
            flash={flash}/>}
          {step===8 && <MainApp
            profile={profile} prefs={prefs} setPrefs={setPrefs}
            location={location} distance={distance}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            account={account} requestAccount={requestAccount}
            openSchedule={setScheduleMom}
            openProfile={setProfileMom}
            openMessage={setMessageMom}
            openPremium={()=>setPremiumOpen(true)}
            restart={restart}
            flash={flash}
          />}

          {scheduleMom && <ScheduleSheet mom={scheduleMom}
            hasAccount={!!account}
            onClose={()=>setScheduleMom(null)}
            onContinue={(slot)=>{
              if (account) {
                setScheduleMom(null);
                flash(`Invite sent to ${scheduleMom.name.split(' ')[0]} ✦`);
              } else {
                setPendingAction({ type: 'invite', mom: scheduleMom, slot });
                setScheduleMom(null);
              }
            }}/>}
          {pendingAction && <CreateAccountSheet pendingAction={pendingAction}
            onClose={()=>setPendingAction(null)}
            onComplete={handleAccountComplete}/>}
          {profileMom && <ProfileSheet mom={profileMom}
            profile={profile}
            isPremium={!!account?.isPremium}
            onClose={()=>setProfileMom(null)}
            openPremium={()=>{ setProfileMom(null); setPremiumOpen(true); }}/>}
          {messageMom && <MessageSheet mom={messageMom}
            history={messageHistory[messageMom.id] || []}
            isPremium={!!account?.isPremium}
            onSend={(text)=>{
              setMessageHistory(h => ({
                ...h,
                [messageMom.id]: [...(h[messageMom.id] || []), { text, fromUser: true, ts: Date.now() }],
              }));
              flash(`Sent to ${messageMom.name.split(' ')[0]}`);
            }}
            onClose={()=>setMessageMom(null)}
            openPremium={()=>{ setMessageMom(null); setPremiumOpen(true); }}/>}
          {premiumOpen && <PremiumSheet
            onClose={()=>setPremiumOpen(false)}
            onActivate={()=>{
              setAccount(a => ({ ...(a || { firstName: 'Mama' }), isPremium: true, trialEndsAt: Date.now() + 7*24*3600*1000 }));
              flash('✦ Welcome to Mama Plus · 7-day trial started');
            }}/>}
          </>)}

          {toast && <Toast msg={toast}/>}
        </div>
      </PhoneFrame>
    </div>
  );
}
