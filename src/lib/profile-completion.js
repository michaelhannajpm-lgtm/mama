// Profile completion — the single source of truth for "how done is this
// mom's profile". Used by YouTab (the inline progress bar + per-section
// "Set up" nudges) and HomeTab (the "Complete your profile" pull card).
//
// Five self-filled sections count toward completion. `location` is the
// app-level location string (lives outside the profile object), so it's
// passed in separately.

export const profileCompletionItems = (profile, location) => [
  { key: 'photo',    done: (profile?.photos?.length || 0) > 0 },
  // "Done" only when mom type, values, and interests are all answered.
  { key: 'prefs',    done: (profile?.momTypes?.length || 0) > 0 && (profile?.values?.length || 0) > 0 && (profile?.interests?.length || 0) > 0 },
  { key: 'location', done: !!location },
  { key: 'kids',     done: Object.values(profile?.kidsAges || {}).reduce((s, n) => s + n, 0) > 0 },
  { key: 'bio',      done: !!(profile?.bio && profile.bio.trim()) },
];

export const profileCompletion = (profile, location) => {
  const items = profileCompletionItems(profile, location);
  const done = items.filter(c => c.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  return { items, done, total, pct };
};
