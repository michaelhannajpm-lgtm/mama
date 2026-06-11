# Dot — `src/components/Dot.jsx`

- **Props / API:** `on` (boolean) — when `true`, renders a wide coral pill (22×6px); when `false`, a narrow gray dot (6×6px). Both at 4px border-radius.
- **Used by:** Zero call sites found. No file outside `Dot.jsx` itself imports or renders `<Dot>`. Grepping `src/` for `from.*components/Dot`, `<Dot `, and `{ Dot }` all return empty.
- **Purpose:** Intended as a carousel step-indicator dot (the "pill expands on active" pattern used in onboarding and the HeroCarousel). No longer used.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Dead code — orphaned component | High | `Dot.jsx:3-8` — The entire component is unreferenced. `HeroCarousel.jsx:183-199` implements its own inline dot indicators using raw `<button>` elements with `width: di === idx ? 16 : 6`. `AboutYou.jsx` does not use `Dot` either (grep confirms). The component was likely created for the carousel indicator but never wired in, or was replaced by inline implementations. | Delete `Dot.jsx`. Before deleting, evaluate consolidating the two separate inline dot-indicator implementations (HeroCarousel line 192; any others) into a proper `StepDots` or `CarouselIndicator` primitive that is actually reused. |
| 2 | Duplicate pattern — divergent implementations | Medium | The `Dot` component expands to 22px wide when active; `HeroCarousel.jsx:192` expands to 16px wide when active. Neither matches the other. If a third carousel were added (e.g. onboarding screens) a developer would face three different sizes/behaviors for the same visual affordance. | Extract a single `<CarouselDots current={idx} total={N} onSelect={go} />` primitive with standardized sizes and use it in both `HeroCarousel` and any onboarding step indicator. |
| 3 | Interaction states | Medium | `Dot.jsx` renders a `<div>`, not a `<button>`. In the context where it would be used as a carousel indicator, it cannot receive keyboard focus, fire `onClick`, or be activated with Enter/Space. The `HeroCarousel` inline implementation wraps each dot in a `<button>` with `aria-label` — the right approach. `Dot` as a `<div>` is categorically wrong for an interactive indicator. | If `Dot` is ever revived, change it to a `<button>` with an `aria-label` prop, or keep it as a purely decorative visual and require the caller to wrap it. |
| 4 | Styling — semantic palette | Low | `Dot.jsx:6` — active state uses `C.terracotta` (correct for the coral 1:1 intimacy semantic when used in onboarding, which is a personal/intimate flow). Inactive state uses `C.divider` (a hairline token, not a muted indicator token). | If revived, inactive state should use `C.skeleton` or `C.inkMuted` — `C.divider` is a hairline token semantically meant for separator lines, not dot indicators. |

## Recommended improvements

1. **Delete `Dot.jsx`** — it is dead code with no call sites.
2. Create a proper `<CarouselDots>` or `<StepDots>` primitive (a `<button>`-based row) and use it in `HeroCarousel` and any onboarding step indicators. Standardize the active pill width to one value (16px or 22px, pick one).

## Implementation notes

- Verify with `grep -rn "Dot"` before deleting — a future merge could add a call site.
- `HeroCarousel.jsx:183-199` is the reference implementation to extract into the new primitive.

## Acceptance criteria

- [ ] `Dot.jsx` deleted (or replaced by a reusable `CarouselDots` primitive).
- [ ] Zero dangling `import.*Dot` references.
- [ ] `HeroCarousel` and any onboarding step indicator use the same component with the same active pill width.
- [ ] Dot indicators are `<button>` elements with `aria-label`.
