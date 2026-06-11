# ProfileSheet — single-mom profile card (partial vs. full, premium gate)

- **File:** `src/sheets/ProfileSheet.jsx` (203 lines)
- **Purpose:** Scrollable profile view for a matched mom, showing name/photo hero, shared-ground coral card (always free), partial or full values/interests (gated), and the premium blur overlay with "See full profile" CTA. Called from `App.jsx` via `profileMom` state.
- **Entry / when shown:** `App.jsx:685` whenever `profileMom` is set. Distinct from `MomDetailSheet` — this is the simpler, older card view without the deep action surface (connect/propose/share). Both coexist in the codebase.
- **Related components/sheets:** `Sheet` (tall), `PresencePill` (`PresenceDot.jsx`), `PremiumSheet` (via `openPremium`).
- **Data dependencies:** Static — all data comes from the `mom` prop (already fetched upstream). No loading states.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  ━━━━━                       [X]        │
│                                         │
│  ┌─ hero photo card ──────────────────┐ │
│  │ [photo / gradient bg, 220 px]      │ │
│  │  ┌ overlay ──────────────────────┐ │ │
│  │  │ Profile · partial              │ │ │  ← eyebrow, white, 10.5px
│  │  │ Sara K.          🛡           │ │ │  ← Fraunces 32px
│  │  │ New mom · toddler · 0.8 mi   │ │ │
│  │  │ [presence pill]               │ │ │
│  │  └────────────────────────────────┘ │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─ shared ground card (coral) ────────┐ │
│  │ ♥ YOU BOTH SHARE · 3              │ │  ← always visible, free
│  │ [Outdoor fun] [Coffee dates]       │ │  ← coral chips for values
│  │ [Yoga]                             │ │  ← sageDark chips for interests
│  └─────────────────────────────────────┘ │
│                                         │
│  VALUES                 +4 more in Plus │
│  [Outdoors] [Family-first]              │  ← first 2 only (partial)
│                                         │
│  INTERESTS              +3 more in Plus │
│  [Coffee] [Yoga]                        │  ← first 2 only
│                                         │
│  ┌─ blur overlay (non-Plus) ──────────┐ │
│  │  [blurred: bio text]               │ │
│  │  [blurred: FREE TIMES chips]       │ │
│  │  ─────────────────────────────     │ │
│  │  gradient fade                     │ │
│  │  🔒 PLUS REVEALS                  │ │
│  │  Bio, all her free times…          │ │
│  │  [ See full profile ]              │ │  ← C.ink bg, C.saffron text
│  │  7 days free · then $7.99/mo      │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Duplicate of MomDetailSheet | **High** | `ProfileSheet` and `MomDetailSheet` both exist. `MomDetailSheet` is the comprehensive replacement (bio, availability, actions, propose, share). `ProfileSheet` is the legacy simpler version, still wired in `App.jsx:685`. Two different surfaces showing a mom's profile creates inconsistency: a mom opened from `HomeTab` gets `MomDetailSheet` (full actions), while a mom opened from the App-level `profileMom` state gets `ProfileSheet` (actions missing). | Evaluate whether `ProfileSheet` can be retired and all call sites redirected to `MomDetailSheet`. At minimum, note this duplication so it does not diverge further. |
| 2 | Shared-interest chips semantic mismatch | **Medium** | `sharedValues` chips at line 70 use `background: C.terracotta` — correct (values = coral). `sharedInterests` chips at line 75 use `background: C.sageDark` — this is correct (interests → community/sage). However the eyebrow "YOU BOTH SHARE" at line 65 uses `color: C.terracotta`. Since both values and interests appear in the same card, mixing coral and sage within one "You both share" panel can confuse the color semantic. | Unify the shared ground card: all chips on `C.terracotta` background, or lead with "Values in common" (coral) and "Also into" (sage) as sub-labels within the card. Do not split semantics silently. |
| 3 | Hardcoded `color:'#fff'` | **Low** | `color:'#fff'` appears at lines 39, 70, and 76 for chip text and hero overlay text. These are legitimate use of white on dark/colored backgrounds, but they bypass the token system. | `C.paper` = `#FFFFFF` — substitute `C.paper` for `'#fff'` in chip text and overlay. This is minor but keeps the token discipline consistent. |
| 4 | Partial name format bug risk | **Medium** | `displayName` at line 14: `${mom.name.split(' ')[0]} ${mom.name.split(' ')[1]?.[0] || ''}.` — if `mom.name` is a single-word display name, `split(' ')[1]?.[0]` is `undefined`, producing `"Jessica."` with a trailing period and no initial. This renders as "Jessica." for single-name moms. | Guard: `const last = mom.name.split(' ')[1]; return last ? \`${first} ${last[0]}.\` : first;` |
| 5 | Blur overlay gradient hardcoded color | **Medium** | Line 179: `background: 'linear-gradient(to bottom, transparent 0%, rgba(246,239,226,.92) 40%, rgba(246,239,226,.98) 100%)'` — `rgba(246,239,226)` is a manual approximation of `C.creamSoft` (`#FCEEEE` → rgb 252,238,238) but is actually slightly different (`246,239,226` ≈ `C.cream` at #FBF5EF → 251,245,239 — close but not exact). | Use CSS custom property approach or compute: the gradient endpoint should be `C.creamSoft` to visually connect to the sheet's cream background. Replace with `${C.creamSoft}EB` (92% alpha) and `${C.creamSoft}FA` (98% alpha) — note these are hex+alpha, so use rgba with the decoded values from `C.creamSoft` (#FCEEEE = 252,238,238). |
| 6 | "Profile · partial / full" eyebrow exposed | **Low** | Line 49 renders `'Profile · partial'` or `'Profile · full'` in the hero overlay. "Partial" is an internal system label that a real mom shouldn't see — it names the constraint, not the experience. | Replace with something human: `'Preview'` for partial, `'Full profile'` for Plus. Or omit the state indicator entirely; the blurred section below already communicates incompleteness. |
| 7 | `openPremium` crash if undefined | **Low** | `openPremium` at line 7 has no default value. If the caller forgets to pass it (see `App.jsx:685` — only `profile`, `isPremium`, `onClose`, `openPremium` are passed, so this is currently safe), the "See full profile" button at line 191 calls `openPremium()` and throws. | Add `openPremium = () => {}` default in the prop destructure at line 7. |

## Key issues (prose, ranked)

1. **ProfileSheet vs MomDetailSheet duplication (High).** Two profile sheets for the same entity with different depths and different action surfaces create an inconsistent experience. A mom who taps a profile from the Home tab gets the rich `MomDetailSheet` experience (connect, propose, share, full bio free). A mom opened via `App.jsx profileMom` state gets the leaner `ProfileSheet` without those actions. This should be unified.

2. **"Profile · partial" text visible in UI (Low but brand issue).** Internal system language in the hero overlay of a premium experience.

3. **Blur overlay gradient not using `C` tokens (Medium).** Hardcoded `rgba(246,239,226)` differs subtly from `C.cream` and is not maintainable.

4. **Single-name `displayName` formatting edge case (Medium).** Produces "Jessica." for single-word display names.

## Recommended redesign

```
── partial (non-Plus) hero ──────────────
│  [hero photo 220 px]                   
│  Preview                               │  ← was "Profile · partial"
│  Sara K.           🛡                  │
│  New mom · toddler · 0.8 mi           │
│  [online pill]                         

── shared ground card ───────────────────
│ ♥ YOU BOTH SHARE · 3                   
│ [Outdoors]  ← coral (value)           
│ [Coffee dates] [Yoga]  ← coral too    │  ← unify all to coral in shared card
│ (sageDark reserved for non-shared interests section)
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Hero eyebrow | "Profile · partial" | "Preview" |
| Hero eyebrow (Plus) | "Profile · full" | "Full profile" |
| Interest chips in shared card | sageDark bg | coral bg (unified) |
| `'#fff'` chip text | Hardcoded | `C.paper` |
| Blur gradient | `rgba(246,239,226)` | `C.cream`-derived |
| `openPremium` | No default | `= () => {}` default |

## Implementation notes

- `ProfileSheet.jsx:49` — change `isPremium ? 'Profile · full' : 'Profile · partial'` to `isPremium ? 'Full profile' : 'Preview'`
- `ProfileSheet.jsx:75` — change `background: \`${C.sageDark}\`` to `background: C.terracotta` (unified in shared-ground card)
- `ProfileSheet.jsx:39,70,76` — change `color:'#fff'` to `color: C.paper`
- `ProfileSheet.jsx:14` — fix displayName: `const [first, ...rest] = mom.name.split(' '); const last = rest[0]; return isPremium ? mom.name : (last ? \`${first} ${last[0]}.\` : first);`
- `ProfileSheet.jsx:179` — replace hardcoded rgba with `rgba(252,238,238,.92)` (matches `C.creamSoft`) and `rgba(252,238,238,.98)`
- `ProfileSheet.jsx:7` — add `openPremium = () => {}` to default props

## Acceptance criteria

- [ ] Hero eyebrow shows "Preview" / "Full profile" instead of "partial" / "full"
- [ ] All shared-ground chips in the "You both share" card use coral background
- [ ] `'#fff'` replaced with `C.paper` in chip text and overlay
- [ ] Single-name moms display without trailing period
- [ ] Blur gradient uses cream-derived rgba values
- [ ] `openPremium` has a safe default — no crash if caller omits it
- [ ] `npm run build` passes
