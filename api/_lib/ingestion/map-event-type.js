// Map an event's title+description to a primary event_type + secondary categories.
// Ordered so the most specific keyword wins as the primary. Always returns a
// value (defaults to 'other') so event_type is never null.
const RULES = [
  ['storytime',        ['storytime', 'story time', 'story hour']],
  // Camp is a program FORMAT — a "STEM camp"/"soccer camp" is primarily a camp,
  // with the subject captured as a secondary category. Keep these above the
  // subject rules (stem/art/music/...) so format wins as the primary type.
  ['break-camp',       ['spring break camp', 'winter break camp', 'holiday camp', 'break camp']],
  ['camp',             ['camp']],
  ['stem',             ['stem', 'coding', 'robotics', 'science lab', 'engineering']],
  ['art-class',        ['art class', 'painting', 'pottery', 'ceramics', 'drawing', 'craft']],
  ['music-class',      ['music class', 'music together', 'sing', 'instrument', 'piano', 'violin']],
  ['dance-class',      ['dance', 'ballet', 'hip hop', 'tap class']],
  ['cooking-class',    ['cooking', 'baking', 'culinary']],
  ['language-class',   ['spanish', 'french', 'mandarin', 'language class', 'immersion']],
  ['tutoring',         ['tutoring', 'tutor', 'reading help', 'math help', 'homework']],
  ['swim',             ['swim', 'aquatic', 'water safety']],
  ['gymnastics',       ['gymnastics', 'tumbling']],
  ['martial-arts',     ['karate', 'taekwondo', 'jiu jitsu', 'martial arts', 'judo']],
  ['family-yoga',      ['yoga']],
  ['kids-fitness',     ['fitness', 'ninja', 'obstacle', 'workout']],
  ['playgroup',        ['playgroup', 'play group', 'mommy and me', 'baby group']],
  ['open-play',        ['open play', 'open gym', 'free play', 'drop-in play']],
  ['parent-meetup',    ['meetup', 'mom meet', 'parent social', 'coffee with', 'moms group']],
  ['support-group',    ['support group', 'postpartum support', 'grief']],
  ['breastfeeding',    ['breastfeeding', 'lactation', 'nursing']],
  ['prenatal-class',   ['prenatal', 'childbirth', 'birthing', 'lamaze']],
  ['new-parent',       ['new parent', 'newborn care', 'baby care basics']],
  ['parenting-class',  ['parenting class', 'positive discipline', 'parent education']],
  ['performance',      ['theater', 'theatre', 'puppet', 'play ', 'show', 'magician']],
  ['movie',            ['movie', 'film screening', 'cinema']],
  ['concert',          ['concert', 'live music', 'symphony']],
  ['museum-program',   ['museum', 'exhibit', 'gallery']],
  ['library-program',  ['library']],
  ['animal-encounter', ['zoo', 'aquarium', 'petting', 'animal encounter', 'wildlife']],
  ['festival',         ['festival', 'fest', 'celebration']],
  ['fair',             ['fair', 'carnival', 'expo']],
  ['farmers-market',   ['farmers market', "farmer's market", 'market day']],
  ['seasonal',         ['halloween', 'trick or treat', 'santa', 'holiday lights', 'easter', 'pumpkin']],
  ['outdoor-adventure',['hike', 'nature walk', 'kayak', 'trail', 'outdoor adventure', 'fishing']],
  ['community-event',  ['community', 'neighborhood', 'cleanup', 'parade']],
  ['sensory-friendly', ['sensory friendly', 'sensory-friendly', 'low sensory', 'autism friendly']],
  ['special-needs',    ['special needs', 'adaptive', 'inclusive', 'disabilities']],
  ['fundraiser',       ['fundraiser', 'charity', 'benefit', 'donation drive']],
  ['religious',        ['vbs', 'vacation bible', 'church', 'sunday school', 'faith']],
  ['workshop',         ['workshop', 'class', 'lesson', 'clinic']],
  ['sports-event',     ['soccer', 'baseball', 'basketball', 'tennis', 'sports', 'league', 'tournament']],
];

export const mapEventType = (title = '', description = '') => {
  const hay = `${title} ${description}`.toLowerCase();
  const matched = [];
  for (const [type, kws] of RULES) {
    if (kws.some(k => hay.includes(k))) matched.push(type);
  }
  if (matched.length === 0) return { type: 'other', categories: ['other'] };
  return { type: matched[0], categories: [...new Set(matched)].slice(0, 4) };
};
