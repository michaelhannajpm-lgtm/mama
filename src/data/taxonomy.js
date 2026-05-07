import {
  Briefcase, Home, Sun, Flower2, Sparkles, Coffee, Lock,
  TreePine, Leaf, Palette, BookOpen, Music,
} from 'lucide-react';

export const MOM_TYPES = [
  { id: 'working', label: 'Working mom', icon: Briefcase },
  { id: 'sahm',    label: 'Stay-at-home', icon: Home },
  { id: 'solo',    label: 'Solo mom',     icon: Sun },
  { id: 'new',     label: 'New mom',      icon: Flower2 },
  { id: 'multi',   label: 'Multi-kid',    icon: Sparkles },
  { id: 'hybrid',  label: 'Hybrid / WFH', icon: Coffee },
  { id: 'prefer_not', label: 'Prefer not to say', icon: Lock },
];

export const VALUES = [
  'Gentle parenting','Outdoorsy','Bookworm','Honest & open',
  'Slow living','Playful','Adventurous','Multilingual home','Faith-based',
];
export const VALUE_NO_PREF = 'No preference';

export const INTERESTS = [
  { label: 'Coffee dates',      icon: Coffee },
  { label: 'Park hangs',        icon: TreePine },
  { label: 'Stroller walks',    icon: Leaf },
  { label: 'Art & craft',       icon: Palette },
  { label: 'Book club',         icon: BookOpen },
  { label: 'Yoga / fitness',    icon: Flower2 },
  { label: 'Music time',        icon: Music },
  { label: 'Markets',           icon: Sparkles },
];
export const INTEREST_NO_PREF = 'Surprise me';

export const KID_AGES = ['0–1','1–3','3–5','5–8','8–12','12–18'];

export const NEIGHBORHOODS = [
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

export const DISTANCES = [
  { val: 5,   label: '5 mi' },
  { val: 10,  label: '10 mi' },
  { val: 20,  label: '20 mi' },
  { val: 30,  label: '30 mi' },
  { val: 50,  label: '50 mi' },
  { val: 100, label: '100 mi' },
  { val: 150, label: '150+ mi' },
];

// Map TIME_WINDOWS → coarse bucket for matching events. With 4 windows
// the mapping is identity — kept for legacy callers that look up via this map.
export const WINDOW_TO_BUCKET = {
  'morning':   'morning',
  'noon':      'noon',
  'afternoon': 'afternoon',
  'night-owl': 'night-owl',
};

export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const DAY_LABELS = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday', Sun:'Sunday' };
export const TIME_WINDOWS = [
  { id: 'morning',   label: '6 AM–12 PM', emoji: '☀️' },
  { id: 'noon',      label: '12–2 PM',    emoji: '🌞' },
  { id: 'afternoon', label: '2–5 PM',     emoji: '🌤️' },
  { id: 'night-owl', label: '5 PM+',      emoji: '🦉' },
];

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const DAYS_SHORT_BY_DOW = { Mon:'MON', Tue:'TUE', Wed:'WED', Thu:'THU', Fri:'FRI', Sat:'SAT', Sun:'SUN' };
