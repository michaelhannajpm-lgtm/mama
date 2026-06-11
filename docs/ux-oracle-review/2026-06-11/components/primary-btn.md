# PrimaryBtn — `src/components/PrimaryBtn.jsx`

- **Props / API:** `children` (ReactNode), `onClick` (function), `disabled` (boolean), `variant` (`'dark'` | `'coral'`, default `'dark'`)
- **Used by:** `src/screens/DeletedScreen.jsx`, `src/screens/ReactivateScreen.jsx`, `src/screens/onboarding/Account.jsx`, `src/screens/onboarding/Login.jsx`, `src/screens/onboarding/NotificationsOptIn.jsx` (5 call sites — onboarding screens only)
- **Purpose:** Full-width primary CTA button used across onboarding. `variant='dark'` → navy ink background (onboarding default). `variant='coral'` → terracotta background (1:1 intimacy CTA).

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Duplicate pattern — critical adoption gap | High | `PrimaryBtn` is used only in 5 onboarding screens. Every sheet in `src/sheets/` (26 sheets) rolls its own full-width CTA button inline: e.g. `ScheduleSheet.jsx:110-111`, `EventDetailSheet.jsx:62-64`, `PlacesFilterSheet.jsx:200-202`, `KidsSheet.jsx:205-207`, `VerifyPromptSheet.jsx:99`, `ContactVerifySheet.jsx:153`, `CreateAccountSheet.jsx:270-272`, `GroupDiscussionSheet.jsx:147`, `PlaceDetailSheet.jsx:248`, `MomDetailSheet.jsx:342,414`, `DeleteAccountSheet.jsx:96,143`, `RateSheet.jsx:112`, `ToggleSettingsSheet.jsx:98`, `LocationSheet.jsx:114`, `MessageSheet.jsx:219,251`, `MeetupsFilterSheet.jsx:164,259`. Each varies in height (48, 52, or 56px), border-radius (14, 16, or "rounded-2xl"), and box-shadow. This fragmentation means: (a) a design change to the CTA style requires touching 26+ files; (b) disabled state is inconsistently handled; (c) hit targets vary. | Expand `PrimaryBtn` to accept a `size` prop (`'lg'` = 56px for onboarding, `'md'` = 52px for sheets) and import it in all sheets. This is the single highest-leverage component fix in the codebase. |
| 2 | Styling — hardcoded hex | Medium | `PrimaryBtn.jsx:8` — `background: disabled ? '#D8CCB6'` uses a hardcoded hex for the disabled state. No matching token exists in `theme.js`. | Add a `C.disabled` or `C.skeleton`-adjacent token (e.g. `C.btnDisabled`) to `theme.js` and reference it here. Alternatively `C.skeleton` (`#ECE3DC`) is close and already exists. |
| 3 | Styling — hardcoded hex | Low | `PrimaryBtn.jsx:9` — `color: variant==='dark' ? C.cream : '#fff'`. The coral variant uses literal `'#fff'`. `C.paper` is `#FFFFFF` — use it, or add a `C.white` alias. | Replace `'#fff'` with `C.paper`. |
| 4 | Interaction states | Medium | `PrimaryBtn.jsx:3-16` — only `active:scale-[.98]` is defined. No `hover` state (desktop/web view), no `focus-visible` ring for keyboard navigation. The button is not keyboard-accessible in any distinctive way beyond the default browser outline (which may be overridden by Tailwind's reset). | Add `focus-visible:ring-2 focus-visible:ring-offset-2` with a coral ring for the coral variant and an ink ring for the dark variant. |
| 5 | Accessibility | Medium | `PrimaryBtn.jsx:3` — no `type="button"` attribute. Inside a `<form>` this would submit the form on click instead of calling `onClick`. All 5 call sites are not inside explicit forms today, but defensive `type="button"` is standard practice. | Add `type="button"` to the `<button>`. |
| 6 | Props / API | Low | No `loading` prop. Callers in sheets (e.g. `ScheduleSheet`, `LocationSheet`) add their own inline spinner or "…" text swap. A `loading` prop that shows a spinner and disables the button would standardize this pattern. | Add an optional `loading` boolean prop that renders a spinner icon in place of children and sets `disabled` automatically. |

## Recommended improvements

1. Expand `PrimaryBtn` with `size` (`'lg'`/`'md'`) and `loading` props, fix the hardcoded hex values, add `type="button"` and `focus-visible` ring.
2. Systematically replace the 26+ inline full-width CTAs in sheets with `<PrimaryBtn>`.

## Implementation notes

```jsx
// After fix:
export const PrimaryBtn = ({ children, onClick, disabled, loading, variant='dark', size='lg' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full transition-all active:scale-[.98] focus-visible:ring-2 focus-visible:ring-offset-2"
    style={{
      height: size === 'lg' ? 56 : 52,
      borderRadius: size === 'lg' ? 18 : 16,
      background: (disabled || loading) ? C.skeleton : (variant === 'dark' ? C.ink : C.terracotta),
      color: variant === 'dark' ? C.cream : C.paper,
      // ...rest
    }}>
    {loading ? <Spinner size={16}/> : children}
  </button>
);
```

## Acceptance criteria

- [ ] No hardcoded hex (`#D8CCB6`, `#fff`) in `PrimaryBtn.jsx`.
- [ ] `type="button"` present on the `<button>`.
- [ ] `focus-visible` ring implemented.
- [ ] At least the sheet CTAs in the 5 most-used sheets (`ScheduleSheet`, `EventDetailSheet`, `LocationSheet`, `KidsSheet`, `CreateAccountSheet`) migrated to `<PrimaryBtn>`.
- [ ] `npm run build` passes.
