# HeroCarousel — `src/components/HeroCarousel.jsx`

- **Props / API:** None (fully self-contained; slide data is hardcoded in `SLIDES` array at line 13)
- **Used by:** `src/screens/Landing.jsx:4,138` (1 call site)
- **Purpose:** Auto-advancing swipeable story carousel on the Landing screen. Four slides (Connect, This Week, Programs, Trusted Picks), each a full-bleed cover photo with scrim, eyebrow, title, subtitle, and an animated badge mark. Auto-advances every 3.8s; supports touch/mouse drag and tap-to-advance.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — carousel ARIA | High | `HeroCarousel.jsx:110-205` — the carousel container has no `role="region"` or `aria-label` to identify it as a navigable region. Screen readers will traverse the slide images as a flat sequence without understanding that this is a rotator. The ARIA Authoring Practices Guide (APG) carousel pattern requires `role="region"` on the outer container, `aria-roledescription="carousel"` on the rotator, and `aria-roledescription="slide"` on each slide. | Add `role="region" aria-label="App features" aria-roledescription="carousel"` to the outer div. Add `role="group" aria-roledescription="slide" aria-label={s.title}` to each slide div. |
| 2 | Accessibility — auto-play no pause | High | `HeroCarousel.jsx:78-83` — the carousel auto-advances every 3800ms. WCAG 2.2.2 (Pause, Stop, Hide) requires that auto-updating content can be paused, stopped, or hidden. There is no pause control, and the only way to stop auto-advance is to interact with it (which temporarily pauses for 4s — `HeroCarousel.jsx:107`). | Add a pause/play toggle button (`aria-label="Pause carousel"` / `"Play carousel"`), or respect `prefers-reduced-motion` by disabling auto-advance when the user has requested reduced motion. |
| 3 | Accessibility — reduced motion | High | `HeroCarousel.jsx:131` — the slide `transition: 'transform .5s cubic-bezier(.2,.8,.2,1)'` and `HeroCarousel.jsx:52` `animation: 'livePulse 1.4s ease-in-out infinite'` both run regardless of `prefers-reduced-motion`. Users who are sensitive to motion (vestibular disorders) will experience continuous animation with no way to disable it. | Wrap both transitions/animations in `@media (prefers-reduced-motion: no-preference)` at the CSS level, or detect `window.matchMedia('(prefers-reduced-motion: reduce)')` in JS and conditionally remove the transition/animation. |
| 4 | Accessibility — dot indicator hit targets | High | `HeroCarousel.jsx:186-198` — each dot-indicator `<button>` is `width: di === idx ? 16 : 6, height: 6`. Inactive dots are 6×6px — far below the 44×44px iOS minimum and WCAG 2.5.5 (24×24px minimum). Even the active 16×6px dot is inadequate. | Increase the clickable area: keep the visual dot size but wrap in a `<button>` with `padding: 8px 5px` (or `minWidth: 24, minHeight: 24`) so the tap target is at least 24×24px. |
| 5 | Styling — hardcoded `'#fff'` | Medium | `HeroCarousel.jsx:58-63` — icon colors `color="#fff"`, `HeroCarousel.jsx:163` — eyebrow `color: '#fff'`, `HeroCarousel.jsx:170` — title `color: '#fff'`. These are all photo-overlay text elements where white is the only correct choice (text on dark scrim). `C.paper` is `#FFFFFF`, which is semantically a card surface rather than "white on dark". | These are photo-overlay contexts where `'#fff'` is idiomatic. Consider adding a `C.onPhoto` or `C.white` alias token (`'#FFFFFF'`) to `theme.js` for this pattern. At minimum document why the token is not used here. |
| 6 | Behavior — tap-to-advance | Medium | `HeroCarousel.jsx:98-108` — `endDrag()` is called on `pointerUp`/`pointerLeave`/`pointerCancel`. The logic at line 103 says: if no drag occurred (`dragDx` is below threshold), treat it as a tap and advance to the next slide. This means any tap anywhere on the carousel (including on the caption text) advances the slide. A user who taps on the title text to read it will inadvertently advance away. | Distinguish between "tap with no movement" and "drag with no threshold". If `Math.abs(dragDx) < 4` (essentially a tap), do not auto-advance — let the user read the current slide. The "tap to advance" pattern is unusual for a carousel with a caption. |
| 7 | Content — hardcoded Tampa-specific copy | Medium | `HeroCarousel.jsx:27` — `'Family days out, picked for Tampa moms'` and `HeroCarousel.jsx:36` — `'Schools, sitters & services other moms swear by'` are Tampa-specific. If the app ever expands beyond Tampa, this copy will be wrong. | Externalize slide data to props or a config, so the city name can be injected. Even if Tampa-only today, this is an easy future-proofing win. |
| 8 | Props / API — fully static | Low | `HeroCarousel.jsx:13-42` — `SLIDES` is a hardcoded module-level constant. There is no way to pass custom slides, override copy, or change the advance interval without editing the component. | Consider accepting a `slides` prop (with `SLIDES` as the default) and an `interval` prop (default 3800) so callers can customize without a component edit. |
| 9 | Duplicate pattern — dot indicators | Medium | `HeroCarousel.jsx:183-199` implements its own inline dot indicators that do not use the `Dot` component (`src/components/Dot.jsx`). The `Dot` component implements the same pill-expansion pattern but with different sizes (22px vs 16px). | As noted in the Dot audit: extract a shared `<CarouselDots>` primitive and use it in both `HeroCarousel` and any other carousel in the codebase. |

## Recommended improvements

1. Add ARIA carousel pattern: `role="region"`, `aria-roledescription`, slide roles.
2. Respect `prefers-reduced-motion`: disable auto-advance and CSS transitions.
3. Add a pause button for the auto-play.
4. Increase dot-indicator tap targets to at least 24×24px.
5. Fix tap-to-advance — taps should not advance; only drags should.
6. Externalize `SLIDES` data (or at minimum remove the hardcoded city name).

## Implementation notes

```jsx
// At the container level:
<div
  role="region"
  aria-label="App features"
  aria-roledescription="carousel"
  ref={containerRef}
  ...
>

// Each slide:
<div
  role="group"
  aria-roledescription="slide"
  aria-label={`${i + 1} of ${N}: ${s.title}`}
  ...
>

// Reduced motion:
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const INTERVAL = prefersReduced ? null : 3800;
```

## Acceptance criteria

- [ ] Outer container has `role="region" aria-roledescription="carousel"`.
- [ ] Each slide has `role="group" aria-roledescription="slide" aria-label`.
- [ ] Auto-advance pauses when `prefers-reduced-motion: reduce` is active.
- [ ] Dot indicator buttons have a minimum 24×24px tap target.
- [ ] Tap on slide body does not advance the slide.
- [ ] `npm run build` passes.
