# Landing screen — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/screens/Landing.jsx` (new); `src/screens/Splash.jsx` legacy, no longer routed.

## Problem

The old `Splash` screen was an animated cream-cover with "9 of 10 moms feel lonely" stats and a `Begin →` CTA. The GoMama Expo prototype's first screen is a magazine-cover treatment with a hero image, the tagline *"Your kid needs a friend, so do you,"* a 4-button feature grid, and a coral gradient CTA. The user wants the latter.

## Goals

1. Replace the old Splash with a hero-image landing.
2. Preserve sign-in entry point (returning users → `Login` screen).
3. Match GoMama prototype's visual treatment: photo at top, headline + feature grid + CTA stacked below in a cream card.
4. Keep the existing `splashShown` boolean as the gate — Landing renders when `!splashShown`.

## Non-goals

- Animated entry (the old Splash had cascading `fadeInUp` delays). New Landing is static — the image carries the visual weight.
- Verification framing in the hero — that's now part of the Profile tab post-signup.

## Layout

```
[Hero image — Unsplash family-at-park photo, 260px tall, object-cover]

[Cream card body, flex-col, padding 20px]

  H1 (Fraunces 28px, navy 600, italic-colored "friend," and "you.")
  "Your kid needs a friend,
   so do you."

  [Feature grid — flex-wrap, 4 buttons in 2×2]
  · Users   "Local Moms Meetups"        coralDeep / coralSoft bg
  · Cal     "Kids Activities nearby"     #C46B3A / peach bg
  · MapPin  "Places to go with kids"     #7B4FA8 / lilac bg
  · Heart   "Local Support & Resources"  #5E7A3B / sage bg

  [Spacer]

  [Coral gradient CTA — `linear-gradient(90deg, coral, coralDeep)`]
  ♥ Let's Go Mama

  [Sign-in link, muted text]
  Already have an account? Log in
```

## Hero image

```
https://images.unsplash.com/photo-1542884748-2b87b36c6b90?w=900&auto=format&fit=crop
```

Object-position `center 35%` so faces aren't crop-truncated. Picked at port time; swap freely.

## Feature buttons

Background colors deliberately diverge from the standard palette:
- `coralSoft` (`#F8D7DD`) for meetups
- `peach` (`#FDE2D4`) for activities
- `lilac` (`#EDE4F4`) for places
- `sage` (`#E2EBD8`) for support

These are the only places in the app where `lilac` and `peach` show up — they're decorative-only on Landing.

## Component shape

```jsx
<Landing
  onBegin={() => setSplashShown(true)}
  onSignIn={() => setLoginOpen(true)}
/>
```

Renders by `App.jsx` when `splashShown === false && !loginOpen`.

## Risks

- **Unsplash dependency.** Hero image is a hotlinked Unsplash URL. If Unsplash blocks hotlinking or the image goes away, the hero breaks silently. Mitigation: move to a hosted asset before launch.
- **Image alt text.** Currently "Moms and kids at the park" — short and accurate. Don't downgrade to empty alt.

## Testing

- Render at `/prototype` confirms the hero card and CTA gradient.
- Sign-in link opens the existing `Login` screen.
- The `Begin` keyword from the old design is intentionally retired in favor of "Let's Go Mama" — the GoMama tagline.
