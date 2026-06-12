// Referral reward model — the single source of truth for "bring a mom, earn a
// perk". Shared by the phone-app Profile section (`screens/MainApp/YouTab.jsx`)
// and the admin mom-profile Referrals tab (`screens/admin/.../MomProfilesSection`).
//
// A referral only COUNTS toward a reward once the invited mom is *verified* —
// the verified-only moat is the quality bar, so progress is keyed on the
// verified-invitee count, not raw signups. Server endpoints derive each
// invitee's status live from her `verified` flag (see `api/_lib/referrals.js`)
// and return `verifiedCount`; this module turns that number into tier progress.
//
// Tiers are intentionally a plain, ordered constant — tweak thresholds/perks
// here and both surfaces follow. `plusMonths` is the prototype Plus grant a
// tier represents (no real billing; mirrors the `isPremium`/`trialEndsAt` model).

export const REFERRAL_TIERS = [
  { count: 1,  title: 'First friend',    perk: "You're on the board",          kind: 'badge' },
  { count: 3,  title: 'Village starter', perk: '1 month of Go Mama Plus, free', kind: 'plus', plusMonths: 1 },
  { count: 5,  title: 'Village builder', perk: '“Village Builder” badge',       kind: 'badge' },
  { count: 10, title: 'Village leader',  perk: '3 months of Plus, free',        kind: 'plus', plusMonths: 3 },
];

// Highest verified-invitee count any tier requires — the top of the ladder.
export const REFERRAL_GOAL = REFERRAL_TIERS[REFERRAL_TIERS.length - 1].count;

// Turn a verified-invitee count into progress:
//   { verifiedCount, unlocked[], current, next, toNext, pctToNext, pctToGoal }
// `current` is the highest tier reached (null before the first), `next` is the
// tier still to earn (null once all are unlocked). `pctToNext` is progress
// within the current band; `pctToGoal` is progress across the whole ladder.
export const referralProgress = (verifiedCount = 0) => {
  const n = Math.max(0, Math.floor(Number(verifiedCount) || 0));
  const unlocked = REFERRAL_TIERS.filter((t) => n >= t.count);
  const next = REFERRAL_TIERS.find((t) => n < t.count) || null;
  const current = unlocked.length ? unlocked[unlocked.length - 1] : null;

  const prevCount = current ? current.count : 0;
  const span = next ? next.count - prevCount : 0;
  const into = next ? n - prevCount : 0;
  const pctToNext = next ? Math.min(100, Math.round((into / span) * 100)) : 100;
  const toNext = next ? Math.max(0, next.count - n) : 0;
  const pctToGoal = Math.min(100, Math.round((Math.min(n, REFERRAL_GOAL) / REFERRAL_GOAL) * 100));

  return { verifiedCount: n, unlocked, current, next, toNext, pctToNext, pctToGoal };
};
