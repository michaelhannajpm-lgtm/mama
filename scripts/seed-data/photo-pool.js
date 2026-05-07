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
  id('1535713875002-d1d0cf377fde'),
  id('1534528741775-53994a69daeb'),
  id('1499952127939-9bbf5af6c51c'),
  id('1521146764736-56c929d59c83'),
  id('1488161628813-04466f872be2'),
  id('1504703395950-b89145a5425b'),
  id('1502685104226-ee32379fefbe'),
  id('1530785602389-07594beb8b73'),
  id('1503185912284-5271ff81b9a8'),
  id('1485875437342-9b39470b3d95'),
  id('1532074205216-d0e1f4b87368'),
  id('1492288991661-058aa541ff43'),
  id('1554151228-14d9def656e4'),
  id('1564564321837-a57b7070ac4f'),
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
