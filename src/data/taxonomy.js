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

export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const TIME_WINDOWS = [
  { id: 'morning',   label: '6 AM–12 PM', emoji: '☀️' },
  { id: 'noon',      label: '12–2 PM',    emoji: '🌞' },
  { id: 'afternoon', label: '2–5 PM',     emoji: '🌤️' },
  { id: 'night-owl', label: '5 PM+',      emoji: '🦉' },
];

export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const DAYS_SHORT_BY_DOW = { Mon:'MON', Tue:'TUE', Wed:'WED', Thu:'THU', Fri:'FRI', Sat:'SAT', Sun:'SUN' };
