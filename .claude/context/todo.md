# TODO — UX improvements (prioritized)

Each item is a discrete, achievable task. Implement one at a time and commit between each.

## Top 3 (highest impact)

### 1. Persona-based onboarding

Replace the dense profile screen (kids + mom-types + values + interests) with one screen showing 4–5 picker cards:

> *Working mama · Stay-at-home · New mom · Toddler mom · Big-kid mom*

Each pre-fills sensible defaults for `profile.values`, `profile.interests`, `profile.momTypes`. **Keep the kids stepper** — that's specific enough to be worth asking.

**Goal:** cut onboarding completion friction by 50%+.

### 2. When-screen redesign — tap-once-per-day

Current Screen 6 is a 7×5 grid (35 toggles). Restructure:

- **Top row: 7 day pills.** Tap to enable that whole day with sensible default time windows.
- **Only enabled days expand** to show editable time windows below.

Power users can refine; everyone else taps 3–4 days and is done.

### 3. Live "X moms match" counter

Add a small persistent counter at the bottom of:

- The When screen
- The Where screen
- The persona picker (after #1)

Updates in real-time as preferences narrow:

> *"7 moms match your week."*

Confirms matching is real + creates dopamine pull forward. Computed by intersecting selected slots/places against `SAMPLE_MOMS`.

## Next round

### 4. Match overlap on group cards

Show *"Sara + 2 of your matches going"* on EventsTab cards. Compute overlap between event attendees (mock from `SAMPLE_MOMS`) and the user's matched moms.

### 5. Empty-state CTAs

Calendar's *"Nothing on the calendar yet"* should have a button:

> *"Schedule your first meetup →"*

…that jumps to Matches tab via `setTab('matches')` from MainApp. Same pattern for Chat (when added) and any other empty state.

### 6. Filter chips on Matches tab

Add a row of filter chips under the headline:

> *This week · Same kid ages · Weekends · Verified · < 1 mile*

Filter the displayed `SAMPLE_MOMS` accordingly. State lives locally in `MatchesTab`.

### 7. Confirm-before-paywall

When a free user taps Auto-schedule and `requestAccount` fires, the `CreateAccountSheet` pops with a one-line micro-confirmation above the form:

> *"Sign up to schedule Mon 9 AM with Sara K."*

Already partially implemented via the pending-action summary card — verify and improve copy.

## Polish

### 8. Bigger tab labels

Current 10px labels on 5 tabs feel cramped. Either bigger labels or icon-only with active label below (Instagram pattern).

### 9. Save + resume onboarding

Persist `step`, `profile`, `prefs`, `location`, `distance` to `localStorage` on each change. On Splash render, detect partial state → show:

> *"Welcome back, you're on step N"*

…and a *"Continue"* CTA alongside *"Start over"*.

### 10. Undo toast for destructive actions

When user removes a place / unjoins a group / cancels a meetup, show:

> *"Removed · Undo"*

…for 5s. The `Toast` component exists; add an `action` prop and an inverse-action callback.

### 11. Search bar in Places tab

Add a search input that filters across `PLACES` (and TOP_PICKS). Local state in `PlacesTab`.
