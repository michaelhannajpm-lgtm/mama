import {
  Briefcase, Home, Sun, Flower2, Sparkles, Coffee, Lock,
  Globe, Compass,
} from 'lucide-react';
import { VALUE_LABELS, ACTIVITIES } from './matching-vocab.js';

export const MOM_TYPES = [
  { id: 'working',      label: 'Working mom',       icon: Briefcase },
  { id: 'sahm',         label: 'Stay-at-home',      icon: Home },
  { id: 'solo',         label: 'Solo mom',          icon: Sun },
  { id: 'new',          label: 'New mom',           icon: Flower2 },
  { id: 'multi',        label: 'Multi-kid',         icon: Sparkles },
  { id: 'hybrid',       label: 'Hybrid / WFH',      icon: Coffee },
  { id: 'multicultural',label: 'Multicultural mom', icon: Globe },
  { id: 'new_to_area',  label: 'New to area',       icon: Compass },
  { id: 'prefer_not',   label: 'Prefer not to say', icon: Lock },
];

// The curated "What describes you?" set shown in onboarding (AboutYou Q3) and
// the profile's Interests & Preferences → Mom type. Single source of truth so
// both surfaces always offer the exact same options. `id` matches MOM_TYPES so
// selections persist to mom_types consistently.
export const MOM_DESCRIBES = [
  { id: 'new_to_area',   emoji: '🧭', label: 'New to area',       sub: 'Recently moved here' },
  { id: 'working',       emoji: '💼', label: 'Working Mom',       sub: 'Balancing career'    },
  { id: 'sahm',          emoji: '🏠', label: 'Stay at home',      sub: 'Home with kids'      },
  { id: 'solo',          emoji: '💪', label: 'Solo Mom',          sub: 'Single parent'       },
  { id: 'multicultural', emoji: '🌎', label: 'Multicultural',     sub: 'Diverse background'  },
  { id: 'prefer_not',    emoji: '🤐', label: 'Prefer not to say', sub: null                  },
];

// Single source of truth for values + activities lives in matching-vocab.js so
// the profile UI, the seeded moms, and the filter sheets all share one set.
export const VALUES = VALUE_LABELS;
export const VALUE_NO_PREF = 'No preference';

export const INTERESTS = ACTIVITIES; // [{ label, emoji }]
export const INTEREST_NO_PREF = 'Surprise me';

export const KID_AGES = ['0–1','1–3','3–5','5–8','8–12','12–18'];

// Friendly life-stage noun per kid-age bucket. Chosen so each reads naturally
// after "Mom of a …" (e.g. "Mom of a big kid").
export const KID_STAGE = {
  '0–1': 'baby',
  '1–3': 'toddler',
  '3–5': 'preschooler',
  '5–8': 'big kid',
  '8–12': 'tween',
  '12–18': 'teen',
};

// "Mom of a toddler" from a set of age buckets — keys off the YOUNGEST kid so
// the label stays one short, never-wrapping phrase on compact cards. Returns ''
// when no recognizable bucket is present.
export const youngestStageLabel = (buckets = []) => {
  const youngest = KID_AGES.find((b) => buckets.includes(b));
  return youngest ? `Mom of a ${KID_STAGE[youngest]}` : '';
};

export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const TIME_WINDOWS = [
  { id: 'morning',   label: '6 AM–12 PM', emoji: '☀️' },
  { id: 'noon',      label: '12–2 PM',    emoji: '🌞' },
  { id: 'afternoon', label: '2–5 PM',     emoji: '🌤️' },
  { id: 'night-owl', label: '5 PM+',      emoji: '🦉' },
];

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const DAYS_SHORT_BY_DOW = { Mon:'MON', Tue:'TUE', Wed:'WED', Thu:'THU', Fri:'FRI', Sat:'SAT', Sun:'SUN' };
