export const SAMPLE_MOMS = [
  {
    id: 1, name: 'Sara K.', age: 32, kids: '2y · 4y', type: 'Working mom',
    overlap: 87, distance: '0.6 mi',
    tags: ['Coffee dates','Same kid ages','Tue mornings'],
    nextSlot: 'Tue · 9:30 AM',
    nextPlace: 'Blue Bottle, Mission',
    hue: 'linear-gradient(135deg,#E8B4A0,#C8553D)',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop',
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
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&auto=format&fit=crop',
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
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop',
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
    photo: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=600&auto=format&fit=crop',
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
export const MOM_POOL = [
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
export const ALL_AVAILABLE_MOMS = [
  ...SAMPLE_MOMS.map(m => ({ id:`s${m.id}`, init: m.name.split(' ').map(s=>s[0]).join(''), hue: m.hue, freeSlots: m.freeSlots })),
  ...MOM_POOL,
];

export const matchingMoms = (userSlots) => {
  if (!userSlots || !userSlots.length) return [];
  return ALL_AVAILABLE_MOMS.filter(m => m.freeSlots.some(s => userSlots.includes(s)));
};
