# CreateAccountSheet — account gate (triggered by pending action)

- **File:** `src/sheets/CreateAccountSheet.jsx` (290 lines)
- **Purpose:** Passwordless account creation triggered mid-flow when a mom tries to schedule a 1:1 or RSVP to a group before having an account. Collects firstName + phone/email + terms, sends OTP, then verifies inline and replays the queued action.
- **Entry / when shown:** `App.jsx:678` via `pendingAction` state; opened from `requestAccount()` helper when any gated action fires without `account` present.
- **Related components/sheets:** `Sheet` (tall), `CodeVerify` component (phase 2), `ScheduleSheet` (upstream trigger), `GroupDiscussionSheet` (upstream trigger).
- **Data dependencies:** `sendOtp` / `verifyOtp` from `lib/onboarding.js` — async calls; no `*Loading` flag, uses local `submitting` state.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  ━━━━━  (drag handle)                   │
│                           [X]           │
│  JOINING A GROUP / ALMOST MATCHED       │
│  Create your account                    │  ← Fraunces 26px; "account" italic+coral
│  We'll save your RSVP...               │
│                                         │
│  ┌ pending-action card ───────────────┐ │
│  │ [avatar] 1:1 WITH                  │ │
│  │          Mom name · Tue Morning    │ │
│  │          Coffee shop               │ │
│  └────────────────────────────────────┘ │
│                                         │
│  FIRST NAME                             │
│  ┌──────────────────────────────────┐  │
│  │ Sana                             │  │  ← PRE-FILLED "Sana" / "(813) 956-2058"
│  └──────────────────────────────────┘  │
│                                         │
│  SEND MY CODE TO                        │
│  ┌─────────────────────────────────┐   │
│  │  [Phone]  │  Email              │   │
│  └─────────────────────────────────┘   │
│  ┌──────────────────────────────────┐  │
│  │ +1  (813) 956-2058              │  │  ← PRE-FILLED
│  └──────────────────────────────────┘  │
│                                         │
│  [✓] I agree to Terms + Community Pact │
│                                         │
│  [ Send my code  → ]                   │
│  🔒 Your phone is never shown to moms. │
└─────────────────────────────────────────┘
```

Phase 2 (code entry) delegates entirely to `<CodeVerify>`.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Trust / Data integrity | **Critical** | `useState('Sana')` and `useState('(813) 956-2058')` at lines 19–20 ship a real-looking name and Tampa phone number as visible pre-fills. A real user opens this sheet and sees someone else's data, creating a trust-breaking moment and potential confusion about whose account they are creating. | Initialize both to `''`. Pre-fills on a passwordless auth form must be empty unless an authenticated profile already exists. |
| 2 | Content-sized compliance | **High** | `style={{ minHeight: 540 }}` at line 106 (collect phase) and line 101 (unavailable state) forces the drawer to 540 px regardless of content. On small phones this can push the CTA below the viewport fold before the keyboard opens, violating the content-sized drawer contract. | Remove `minHeight`. Let the `tall` Sheet prop (already set, `CreateAccountSheet.jsx:105`) handle height via its `maxHeight: 92%` cap. Content will shrink-wrap on large devices and scroll naturally on small ones. |
| 3 | Empty state / loading | **High** | No loading skeleton or intermediate state while `sendOtp` / `verifyOtp` execute. The button changes copy to "Sending code…" (`line 277`) but the CTA simply disables and shows no progress indicator. If the API call takes 2–4 s (SMS delivery), the form appears frozen. | Show a spinner or pulse on the button during `submitting`. `CodeVerify` already handles the verify phase well; match that treatment in the collect phase. |
| 4 | Terms link dead | **Medium** | `<span style={{ color: C.terracotta, textDecoration:'underline' }}>Terms</span>` at line 257 and "Community Pact" link at line 257 are decorative — no `href`, no `onClick`. For an account-creation gate these must route somewhere. | Make Terms open `/terms` (already served by Vercel rewrites) in a new tab. Community Pact can link to a `#community-pact` anchor or an external URL. A tap-dead legal link is a compliance risk. |
| 5 | Typography / emphasis | **Medium** | The eyebrow labels ("JOINING A GROUP", "ALMOST MATCHED", "ALMOST THERE") at line 125 use `C.terracotta` which is appropriate for 1:1 context but the group-join variant should use `C.sageDark` (community = sage per token semantics). | Group join (`isGroup`) eyebrow: use `color: C.sageDark`. 1:1 / default: keep coral. |
| 6 | Auto-agreed terms | **Medium** | `const [agreed, setAgreed] = useState(true)` at line 22 — the terms box pre-checks itself. Most app stores and jurisdictions require explicit opt-in for terms (no pre-checked consent). | Initialize `agreed` to `false`. |
| 7 | Form UX — phone format prefix | **Low** | The `+1` country-code prefix at line 228 is rendered as a static label inside the input, not a proper country selector. There is no accessible label connecting it to the input. | Wrap `+1` + `<input>` with a shared `<label>` element, or add `id`/`htmlFor` association. If the app targets US-only, add `aria-label="US phone number"` to the input. |
| 8 | Missing `aria-label` on method toggle | **Low** | The Phone/Email segmented control at lines 201–222 has no `role="group"` or `aria-label`. Screen readers announce two isolated buttons. | Add `role="group" aria-label="Send code to"` on the container div at line 200. |

## Key issues (prose, ranked)

1. **Pre-filled stranger's name and phone number (Critical).** The values `'Sana'` and `'(813) 956-2058'` are hardcoded defaults shipped in production code. Any user who opens this sheet sees an unfamiliar identity in an account-creation form. This is both a data trust failure and, depending on whose details those are, a privacy issue. Fix: empty strings for both defaults.

2. **`minHeight: 540` violates content-sized contract (High).** The project-wide rule (see `Sheet.jsx` comment, reverted from full-screen 2026-06-11) is that drawers shrink-wrap content. Pinning 540 px on the collect phase forces the drawer taller than its content, and on small-screen devices the CTA can sit below keyboard height. Remove the constraint; the `tall` Sheet prop already raises the height cap sufficiently.

3. **Pre-agreed terms box (Medium/legal risk).** Terms checkboxes that default to `true` bypass user consent. This is a prototypical consent dark pattern flagged by GDPR guidance and App Store review.

4. **Dead legal links (Medium).** Terms and Community Pact spans with no `href`/`onClick` create a trust gap at the highest-stakes moment (account creation).

## Recommended redesign

```
┌─────────────────────────────────────────┐
│  ━━━━━                      [X]         │
│                                         │
│  ALMOST MATCHED  (coral)                │
│  Create your account                    │
│  We'll save your match and send...      │
│                                         │
│  [pending action card]                  │
│                                         │
│  FIRST NAME                             │
│  ┌──────────────────────────────────┐  │
│  │ What should other moms call you? │  │  ← no pre-fill
│  └──────────────────────────────────┘  │
│                                         │
│  SEND MY CODE TO                        │
│  ┌─ [Phone] ─── Email ─────────────┐   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐  │
│  │ +1  (555) 123-4567  (empty)      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [ ] I agree to Go Mama's              │  ← unchecked
│      Terms  and  Community Pact        │  ← both tappable
│      (underlined links)                │
│                                         │
│  [ Send my code → ] (disabled until    │
│    form complete + agreed)             │
│  🔒 Your phone is never shown.         │
└─────────────────────────────────────────┘
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| First name field | Shows "Sana" | Empty, placeholder text |
| Phone field | Shows "(813) 956-2058" | Empty |
| Terms checkbox | Pre-checked (coral fill) | Unchecked (empty border) |
| Terms/Pact text | Decorative underline only | Tappable links |
| Sheet height | Pinned to 540 px minimum | Shrink-wraps to content |
| Group eyebrow | Coral (wrong semantic) | Sage dark |

## Implementation notes

- `CreateAccountSheet.jsx:19` — change `useState('Sana')` to `useState('')`
- `CreateAccountSheet.jsx:20` — change `useState('(813) 956-2058')` to `useState('')`
- `CreateAccountSheet.jsx:22` — change `useState(true)` to `useState(false)`
- `CreateAccountSheet.jsx:106` — remove `minHeight: 540` style property
- `CreateAccountSheet.jsx:125` — wrap in ternary: `color: isGroup ? C.sageDark : C.terracotta`
- `CreateAccountSheet.jsx:257` — replace `<span>Terms</span>` with `<a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, textDecoration: 'underline' }}>Terms</a>`; same pattern for Community Pact
- `CreateAccountSheet.jsx:200` — add `role="group" aria-label="Send code to"` on the pill container

## Acceptance criteria

- [ ] Name and phone fields open empty on every device / session
- [ ] Terms checkbox opens unchecked; CTA disabled until explicitly checked
- [ ] Tapping "Terms" navigates to `/terms` (new tab); "Community Pact" routes to a real URL
- [ ] Sheet height content-sizes correctly (no 540 px floor) — test on 375×667 (SE) viewport with keyboard open
- [ ] Group-context eyebrow ("Joining a group") renders in `C.sageDark`, not coral
- [ ] `npm run build` passes with no new warnings
