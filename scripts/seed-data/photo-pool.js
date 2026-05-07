// Verified Unsplash mom-portrait URLs. Each was checked to return HTTP 200
// at the time the seed script was authored. If any 404s in the future, swap
// the photo ID — the URL pattern is stable.

const id = (photoId) => `https://images.unsplash.com/photo-${photoId}?w=600&auto=format&fit=crop`;

export const PHOTOS = [
  id('1494790108377-be9c29b29330'),
  id('1607746882042-944635dfe10e'),
  id('1573496359142-b8d87734a5a2'),
  id('1548142813-c348350df52b'),
  id('1517841905240-472988babdf9'),
  id('1544005313-94ddf0286df2'),
  id('1531123897727-8f129e1688ce'),
  id('1487412720507-e7ab37603c6f'),
  id('1500917293891-ef795e70e1f6'),
  id('1438761681033-6461ffad8d80'),
];

// Pick 1–3 photos for a mom; deterministic by index so re-runs match.
export const photosForMom = (idx) => {
  const count = 1 + (idx % 3);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(PHOTOS[(idx + i) % PHOTOS.length]);
  }
  return out;
};
