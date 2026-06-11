// ==========================================================================
// Group discussions — Tampa-mom topic threads surfaced in ConnectTab and
// opened in the GroupDiscussionSheet. Each discussion has a small seed
// feed (3-4 posts) so the sheet feels alive on first open; local sheet
// state appends new posts / likes / comments on top of these.
//
// Filter facets (categoryId, topics, kidAges, momStages, neighborhoods)
// power the Connect → "Popular Mom Groups" See-all chip row + advanced
// filter sheet. `categoryId` matches one of GROUP_CATEGORIES below; the
// four "visible" categories drive the quick-filter chips, while every
// other facet is reachable through GroupsAdvancedFilterSheet.
// ==========================================================================

import {
  Moon, Baby, Coffee, BookOpen, HeartHandshake, Briefcase,
  Stethoscope, Sparkles, Sun, GraduationCap, Brain,
} from 'lucide-react';
import { C } from '../theme';

// ----- filter taxonomies ---------------------------------------------------

// The four categories surfaced as visible chip filters on the See-all view.
// Everything else lives in the advanced filter.
export const GROUP_CATEGORIES_VISIBLE = [
  { id: 'daycare',    label: 'Daycare picks',      icon: BookOpen     },
  { id: 'postpartum', label: 'Postpartum support', icon: HeartHandshake },
  { id: 'solo',       label: 'Solo moms',          icon: Sun          },
  { id: 'teen',       label: 'Teen parenting',     icon: GraduationCap },
];

// Full topic vocabulary surfaced in the advanced filter sheet. The four
// visible categories are *included* here so a Plus user can keep them in
// view alongside the rest of the catalog.
export const GROUP_TOPICS = [
  { id: 'sleep',          label: 'Sleep training' },
  { id: 'daycare',        label: 'Daycare picks' },
  { id: 'postpartum',     label: 'Postpartum support' },
  { id: 'solo',           label: 'Solo moms' },
  { id: 'teen',           label: 'Teen parenting' },
  { id: 'playdates',      label: 'Playdates' },
  { id: 'feeding',        label: 'Feeding + picky eaters' },
  { id: 'working',        label: 'Working moms' },
  { id: 'mom-mental',     label: 'Mom mental health' },
  { id: 'kids-mental',    label: 'Kids mental health' },
  { id: 'pediatrics',     label: 'Pediatrics + healthcare' },
  { id: 'school',         label: 'School hunting' },
  { id: 'tweens',         label: 'Tween parenting' },
  { id: 'special-needs',  label: 'Special needs' },
];

// Mom-stage filter — what stage of motherhood the group is for. Keyed off
// the youngest child's life stage so it composes naturally with kidAges.
export const GROUP_MOM_STAGES = [
  { id: 'expecting', label: 'Expecting' },
  { id: 'new',       label: 'New mom' },
  { id: 'toddler',   label: 'Toddler years' },
  { id: 'preschool', label: 'Preschool years' },
  { id: 'school',    label: 'School-age' },
  { id: 'tween',     label: 'Tween mom' },
  { id: 'teen',      label: 'Teen mom' },
];

// Tampa-area neighborhoods most likely to be tagged on a group. Mirrors the
// dataset in src/data/tampa-bay-areas.js but trimmed to the highest-density
// mom communities so the chip row stays scannable.
export const GROUP_NEIGHBORHOODS = [
  'South Tampa',
  'Hyde Park',
  'Westshore',
  'Bayshore',
  'Seminole Heights',
  'Carrollwood',
  'New Tampa',
  'Brandon',
  'Riverview',
  'Westchase',
];

// ----- seed posts ----------------------------------------------------------

const AVATARS = {
  sarah:   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop',
  amanda:  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop',
  jessica: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=160&auto=format&fit=crop',
  priya:   'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop',
  emily:   'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=160&auto=format&fit=crop',
  mia:     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&auto=format&fit=crop',
  olivia:  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=160&auto=format&fit=crop',
  ava:     'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&auto=format&fit=crop',
  sophia:  'https://images.unsplash.com/photo-1542596594-649edbc13630?w=160&auto=format&fit=crop',
  hannah:  'https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=160&auto=format&fit=crop',
  zoe:     'https://images.unsplash.com/photo-1546961342-1e3258dc9ce5?w=160&auto=format&fit=crop',
  maya:    'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=160&auto=format&fit=crop',
};

const post = (id, authorId, authorName, photo, when, text, likes = 0, comments = []) =>
  ({ id, authorId, authorName, photo, when, text, likes, comments });

const reply = (id, authorName, photo, when, text) => ({ id, authorName, photo, when, text });

// ----- discussions ---------------------------------------------------------

export const GROUP_DISCUSSIONS = [
  {
    id: 'd-sleep',
    title: 'Sleep training in South Tampa',
    blurb: 'Sharing wins, fails, and what finally worked',
    members: 142,
    online: 8,
    Icon: Moon,
    bg: C.lilac, fg: '#5E4A8A',
    // facets
    categoryId: null,
    topics: ['sleep'],
    kidAges: ['0–1', '1–3'],
    momStages: ['new', 'toddler'],
    neighborhoods: ['South Tampa', 'Hyde Park'],
    hostName: 'Sarah K.',
    posts: [
      post('p1', 'sarah', 'Sarah K.', AVATARS.sarah, '2h',
        'Three nights of Ferber and our 14-month-old slept through 🙏 Took longer than I expected — week 1 was rough. Anyone else hit the sleep regression around 15 months?',
        12, [
          reply('c1', 'Amanda R.', AVATARS.amanda, '1h', 'Yes!! We had the exact same window. It passes I promise.'),
          reply('c2', 'Jessica T.', AVATARS.jessica, '40m', 'What worked for us was earlier bedtime by 30min.'),
        ]),
      post('p2', 'priya', 'Priya N.', AVATARS.priya, '5h',
        "Sleep consultant rec? Tried gentle methods but our toddler still wakes 3-4x a night. South Tampa pediatrician didn't have suggestions.",
        4, [
          reply('c3', 'Mia L.', AVATARS.mia, '4h', 'DM me — I have someone amazing who works on Bayshore.'),
        ]),
      post('p3', 'emily', 'Emily B.', AVATARS.emily, '1d',
        "Hot take: white noise is the only hill I'll die on. We use the Hatch Rest and it's a game changer 🙌",
        21, []),
    ],
  },
  {
    id: 'd-daycare',
    title: 'Daycare picks · South Tampa',
    blurb: 'Openings, prices, what tours are actually like',
    members: 218,
    online: 12,
    Icon: BookOpen,
    bg: C.sage, fg: C.sageDark,
    categoryId: 'daycare',
    topics: ['daycare'],
    kidAges: ['0–1', '1–3', '3–5'],
    momStages: ['new', 'toddler', 'preschool'],
    neighborhoods: ['South Tampa', 'Hyde Park', 'Westshore'],
    hostName: 'Amanda R.',
    posts: [
      post('p1', 'amanda', 'Amanda R.', AVATARS.amanda, '1h',
        'Just toured Primrose South Tampa — bright, clean, but openings are limited 😬 Anyone with experience there?',
        9, [
          reply('c1', 'Hannah F.', AVATARS.hannah, '50m', 'We pulled our daughter for ratio reasons. Happy to chat offline.'),
          reply('c2', 'Sophia M.', AVATARS.sophia, '30m', 'Loved Primrose for our oldest. Honest answer: it gets better past 18mo.'),
        ]),
      post('p2', 'ava', 'Ava S.', AVATARS.ava, '4h',
        'Goddard Westshore opened a new infant room — enrollment moved quickly for us. Reach out if you want a referral.',
        15, []),
      post('p3', 'maya', 'Maya P.', AVATARS.maya, '8h',
        "Anyone using a nanny-share in Hyde Park? Cost / nanny rec / how y'all handle sick days?",
        6, [
          reply('c3', 'Olivia D.', AVATARS.olivia, '6h', 'We did one for a year. So worth it, hardest part was scheduling.'),
        ]),
    ],
  },
  {
    id: 'd-postpartum',
    title: 'Postpartum support circle',
    blurb: 'No judgment, just real talk',
    members: 96,
    online: 4,
    Icon: HeartHandshake,
    bg: C.coralSoft, fg: C.coralDeep,
    categoryId: 'postpartum',
    topics: ['postpartum', 'mom-mental'],
    kidAges: ['0–1'],
    momStages: ['new'],
    neighborhoods: ['South Tampa', 'Hyde Park', 'Seminole Heights'],
    hostName: 'Jessica T.',
    posts: [
      post('p1', 'jessica', 'Jessica T.', AVATARS.jessica, '3h',
        "Week 6 and I'm just now realizing I haven't left the house alone in 40 days. Going for coffee tomorrow morning. Anyone want to join?",
        18, [
          reply('c1', 'Sarah K.', AVATARS.sarah, '2h', 'YES. Buddy Brew at 9? Bring the babes or come solo.'),
          reply('c2', 'Mia L.', AVATARS.mia, '1h', "I'm in if it's stroller-friendly."),
        ]),
      post('p2', 'olivia', 'Olivia D.', AVATARS.olivia, '12h',
        "PSA: Tampa General has free postpartum support group Wednesdays 10am. No registration needed. They have childcare 🫶",
        24, []),
    ],
  },
  {
    id: 'd-solo',
    title: 'Solo moms · Tampa Bay',
    blurb: 'Co-parenting, schedules, finding our village',
    members: 78,
    online: 5,
    Icon: Sun,
    bg: '#FDE2D4', fg: '#8A4410',
    categoryId: 'solo',
    topics: ['solo'],
    kidAges: ['1–3', '3–5', '5–8'],
    momStages: ['toddler', 'preschool', 'school'],
    neighborhoods: ['South Tampa', 'Carrollwood', 'Brandon', 'Riverview'],
    hostName: 'Olivia D.',
    posts: [
      post('p1', 'olivia', 'Olivia D.', AVATARS.olivia, '2h',
        'Solo mom of 2 here. Anyone else find weekends harder than weekdays? Looking for moms who get it — no judgment, no fixing.',
        16, [
          reply('c1', 'Maya P.', AVATARS.maya, '1h', "Saturday mornings are my hardest. Down for a park hang anytime."),
          reply('c2', 'Zoe G.', AVATARS.zoe, '40m', "I host a solo-mom coffee at Oxford Exchange every other Sat. DM me."),
        ]),
      post('p2', 'ava', 'Ava S.', AVATARS.ava, '7h',
        "Court-approved parenting coordinator rec in Hillsborough? Ours retired and the search is brutal.",
        4, []),
    ],
  },
  {
    id: 'd-teen',
    title: 'Teen parenting · what nobody warned us about',
    blurb: 'Phones, friends, boundaries, the long game',
    members: 134,
    online: 7,
    Icon: GraduationCap,
    bg: C.lilac, fg: '#5E4A8A',
    categoryId: 'teen',
    topics: ['teen', 'kids-mental'],
    kidAges: ['12–18'],
    momStages: ['teen'],
    neighborhoods: ['South Tampa', 'New Tampa', 'Westchase', 'Carrollwood'],
    hostName: 'Hannah F.',
    posts: [
      post('p1', 'hannah', 'Hannah F.', AVATARS.hannah, '3h',
        "My 14yo just asked for her own phone plan and I'm spiraling. Anyone navigated this without it becoming a whole-house thing?",
        19, [
          reply('c1', 'Emily B.', AVATARS.emily, '2h', "We did the 'family contract' route — boundaries on paper, no surprises. Worked for us."),
          reply('c2', 'Sophia M.', AVATARS.sophia, '1h', "BARK app changed my life. Not for spying, for sleeping at night."),
        ]),
      post('p2', 'sophia', 'Sophia M.', AVATARS.sophia, '9h',
        "Anxiety in teens — my 13yo started skipping lunch with friends. Therapist hunt is real. Recs welcome.",
        11, []),
    ],
  },
  {
    id: 'd-playdates',
    title: 'Toddler playdates · Hyde Park',
    blurb: 'Park hangs + indoor backup plans',
    members: 187,
    online: 11,
    Icon: Baby,
    bg: '#FFF4D6', fg: '#8A6610',
    categoryId: null,
    topics: ['playdates'],
    kidAges: ['1–3', '3–5'],
    momStages: ['toddler', 'preschool'],
    neighborhoods: ['Hyde Park', 'South Tampa'],
    hostName: 'Mia L.',
    posts: [
      post('p1', 'mia', 'Mia L.', AVATARS.mia, '45m',
        'Hyde Park Village playground tomorrow 10am if anyone wants to come! 18mo-3yr crew. Bringing snacks 🥨',
        7, [
          reply('c1', 'Sarah K.', AVATARS.sarah, '30m', 'Adding to calendar!'),
        ]),
      post('p2', 'zoe', 'Zoe G.', AVATARS.zoe, '6h',
        "Rainy day this Saturday — anyone open to a Little Explorers Play Cafe meetup? They've got the new sensory bins.",
        11, []),
    ],
  },
  {
    id: 'd-feeding',
    title: 'Feeding + picky eaters',
    blurb: 'BLW, purees, what worked at month 18',
    members: 124,
    online: 5,
    Icon: Coffee,
    bg: C.sage, fg: C.sageDark,
    categoryId: null,
    topics: ['feeding'],
    kidAges: ['0–1', '1–3', '3–5'],
    momStages: ['new', 'toddler', 'preschool'],
    neighborhoods: ['South Tampa', 'Westshore'],
    hostName: 'Priya N.',
    posts: [
      post('p1', 'priya', 'Priya N.', AVATARS.priya, '2h',
        "My 2yr old will only eat 5 things. Pediatrician says she'll grow out of it but I'm losing my mind. Anyone been through this?",
        9, [
          reply('c1', 'Hannah F.', AVATARS.hannah, '1h', "Three of mine. They all expand around 3-4. Hang in there ❤️"),
        ]),
    ],
  },
  {
    id: 'd-working',
    title: 'Working moms · WFH + childcare',
    blurb: "Logistics, schedules, surviving 5pm",
    members: 168,
    online: 9,
    Icon: Briefcase,
    bg: C.lilac, fg: '#5E4A8A',
    categoryId: null,
    topics: ['working'],
    kidAges: ['0–1', '1–3', '3–5', '5–8'],
    momStages: ['new', 'toddler', 'preschool', 'school'],
    neighborhoods: ['Westshore', 'South Tampa', 'New Tampa'],
    hostName: 'Sophia M.',
    posts: [
      post('p1', 'sophia', 'Sophia M.', AVATARS.sophia, '1h',
        "How are y'all handling daycare drop-off + 9am standups? I'm losing my mind on Mondays.",
        14, [
          reply('c1', 'Ava S.', AVATARS.ava, '45m', 'My partner does drop-off Mon/Wed, I do Tue/Thu. Game changer.'),
        ]),
    ],
  },
  {
    id: 'd-mental',
    title: "Mom mental health",
    blurb: 'Therapists, books, self-care that actually works',
    members: 87,
    online: 3,
    Icon: Sparkles,
    bg: C.coralSoft, fg: C.coralDeep,
    categoryId: null,
    topics: ['mom-mental'],
    kidAges: ['0–1', '1–3', '3–5', '5–8', '8–12', '12–18'],
    momStages: ['new', 'toddler', 'preschool', 'school', 'tween', 'teen'],
    neighborhoods: ['South Tampa', 'Hyde Park', 'Seminole Heights'],
    hostName: 'Emily B.',
    posts: [
      post('p1', 'emily', 'Emily B.', AVATARS.emily, '4h',
        "Started seeing a perinatal therapist at 18mo postpartum. Wish I'd done it sooner. DM if you want her info.",
        22, []),
    ],
  },
  {
    id: 'd-kids-mental',
    title: "Kids mental health",
    blurb: 'Anxiety, big feelings, therapists who actually help',
    members: 102,
    online: 6,
    Icon: Brain,
    bg: C.coralSoft, fg: C.coralDeep,
    categoryId: null,
    topics: ['kids-mental'],
    kidAges: ['3–5', '5–8', '8–12', '12–18'],
    momStages: ['preschool', 'school', 'tween', 'teen'],
    neighborhoods: ['South Tampa', 'Carrollwood', 'New Tampa', 'Brandon'],
    hostName: 'Maya P.',
    posts: [
      post('p1', 'maya', 'Maya P.', AVATARS.maya, '3h',
        "Looking for a child therapist in South Tampa who actually gets sensory kids. We've tried 3 — anyone had luck?",
        13, [
          reply('c1', 'Hannah F.', AVATARS.hannah, '2h', 'Dr. Reyes at Bayshore Behavioral Health was a game-changer for us.'),
        ]),
      post('p2', 'sophia', 'Sophia M.', AVATARS.sophia, '10h',
        "How do you talk to a 7yo about school anxiety without making it worse? Pediatrician was kind but vague.",
        8, []),
    ],
  },
  {
    id: 'd-pediatrics',
    title: 'Pediatrician + healthcare picks',
    blurb: 'Tampa pediatricians, specialists, ER stories',
    members: 153,
    online: 6,
    Icon: Stethoscope,
    bg: C.sage, fg: C.sageDark,
    categoryId: null,
    topics: ['pediatrics'],
    kidAges: ['0–1', '1–3', '3–5', '5–8', '8–12', '12–18'],
    momStages: ['new', 'toddler', 'preschool', 'school', 'tween', 'teen'],
    neighborhoods: ['South Tampa', 'Bayshore', 'Westshore'],
    hostName: 'Hannah F.',
    posts: [
      post('p1', 'hannah', 'Hannah F.', AVATARS.hannah, '6h',
        "Pediatrician rec in South Tampa that takes our insurance — anyone with kids 3+ recently switched?",
        5, [
          reply('c1', 'Jessica T.', AVATARS.jessica, '5h', 'We love Dr. Patel at Bayshore Pediatrics.'),
        ]),
    ],
  },
];

// Featured order for ConnectTab's "Popular discussions nearby" — top N
// most-active threads.
export const TOP_DISCUSSIONS = GROUP_DISCUSSIONS.slice(0, 4);

// Predicate used by the See-all sheet to filter discussions by the
// combined active facets. Quick-filter chips populate `categoryIds`;
// the advanced filter sheet populates the rest. All arrays act as ORs;
// each non-empty array must produce at least one match.
export const matchesGroupFilters = (d, {
  categoryIds = [],
  topics = [],
  kidAges = [],
  momStages = [],
  neighborhoods = [],
} = {}) => {
  if (categoryIds.length && !categoryIds.includes(d.categoryId)) return false;
  if (topics.length && !topics.some(t => (d.topics || []).includes(t))) return false;
  if (kidAges.length && !kidAges.some(a => (d.kidAges || []).includes(a))) return false;
  if (momStages.length && !momStages.some(s => (d.momStages || []).includes(s))) return false;
  if (neighborhoods.length && !neighborhoods.some(n => (d.neighborhoods || []).includes(n))) return false;
  return true;
};
