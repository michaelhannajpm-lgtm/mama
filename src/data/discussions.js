// ==========================================================================
// Group discussions — Tampa-mom topic threads surfaced in ConnectTab and
// opened in the GroupDiscussionSheet. Each discussion has a small seed
// feed (3-4 posts) so the sheet feels alive on first open; local sheet
// state appends new posts / likes / comments on top of these.
// ==========================================================================

import {
  Moon, Baby, Coffee, BookOpen, HeartHandshake, Briefcase,
  Stethoscope, Sparkles,
} from 'lucide-react';
import { C } from '../theme';

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

export const GROUP_DISCUSSIONS = [
  {
    id: 'd-sleep',
    title: 'Sleep training in South Tampa',
    blurb: 'Sharing wins, fails, and what finally worked',
    members: 142,
    online: 8,
    Icon: Moon,
    bg: C.lilac, fg: '#5E4A8A',
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
    id: 'd-playdates',
    title: 'Toddler playdates · Hyde Park',
    blurb: 'Park hangs + indoor backup plans',
    members: 187,
    online: 11,
    Icon: Baby,
    bg: '#FFF4D6', fg: '#8A6610',
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
    posts: [
      post('p1', 'emily', 'Emily B.', AVATARS.emily, '4h',
        "Started seeing a perinatal therapist at 18mo postpartum. Wish I'd done it sooner. DM if you want her info.",
        22, []),
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
