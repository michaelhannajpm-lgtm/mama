# Account — onboarding step 2 (create account)

- **File:** `src/screens/onboarding/Account.jsx` (420 lines)
- **Purpose:** Social-first, passwordless account creation. Three phases: `choose` (OAuth buttons), `collect` (first name + phone/email + terms), `code` (OTP verification via `CodeVerify`).
- **Entry / when shown:** Shown when `step === 2` after `AboutYou` completes. Also reachable if `AboutYou` calls `onNext()` for a user who has already signed in and is completing onboarding.
- **Related components/sheets:** `StatusBar`, `PrimaryBtn`, `CodeVerify`, `ProviderGlyph` (local), `PROVIDER_STYLE` (local config)
- **Data dependencies:** No live API fetches on mount. Auth calls go through `lib/onboarding.js` (`sendOtp`, `verifyOtp`, `signInWithProvider`). The `account` prop is received but immediately discarded: `void account` at line 52.

---

## Current state (wireframe)

### Phase: choose

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│ [←]                             │
│                                 │
│  Save your spot                 │  Fraunces 25 bold; italic+coral "spot"
│  Join your village in one tap…  │  Albert Sans 12.5 muted
│                                 │
│ ┌──────────────────────────────┐│  OAuth providers (if PROVIDERS.length > 0)
│ │  [Apple glyph] Continue w/   ││  h=50 each, C.ink bg
│ │  Apple                       ││
│ └──────────────────────────────┘│
│ ┌──────────────────────────────┐│
│ │  [Google glyph] Continue w/  ││  white bg, C.line border
│ │  Google                      ││
│ └──────────────────────────────┘│
│                                 │
│  ─────────── or ──────────────  │  C.divider hairlines
│                                 │
│ ┌──────────────────────────────┐│  "Continue with phone or email"
│ │  [✉] Continue with phone    ││  transparent bg, C.line border
│ │      or email                ││
│ └──────────────────────────────┘│
│                                 │
│  By continuing, you agree to…   │  Albert Sans 10.5 muted, centered
│  Terms · Community Pact         │  C.terracotta underline links
│                                 │
│  Already a member? Log in       │  Albert Sans 12.5 inkSoft
│  [⚡ Dev · Auto-login as Sana]  │  (DEV-only, purple gradient)
└─────────────────────────────────┘
```

### Phase: collect

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│ [←]                             │
│                                 │
│  A few details                  │  Fraunces 24; italic+coral "details"
│  We'll send a 6-digit code…     │  Albert Sans 12 muted
│                                 │
│  FIRST NAME                     │  eyebrow label
│  ┌──────────────────────────────┐│  h=40, C.paper bg
│  │  Sana       (pre-filled!)    ││  ← default value "Sana"
│  └──────────────────────────────┘│
│                                 │
│  SEND MY CODE TO                │
│  ┌───────────┬──────────────┐   │  segmented phone/email toggle
│  │  📱 Phone │  ✉ Email    │   │
│  └───────────┴──────────────┘   │
│  ┌──────────────────────────────┐│  h=40
│  │ +1  (813) 956-2058 (pre-fill)││  ← hardcoded default phone
│  └──────────────────────────────┘│
│                                 │
│  🛡️ We'll ask you to verify…   │  blush bg, dashed coralSoft border
│                                 │
│  ☑ I agree to Terms & Pact     │  checked by default
│                                 │
│ [───── Send my code ────── →]   │  PrimaryBtn, terracotta variant
└─────────────────────────────────┘
```

### Phase: code

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│ [←]                             │
│                                 │
│  [CodeVerify component]         │
│  "Check your texts"             │
│  Enter your code                │
│  ┌──────────────────────────────┐│
│  │ ••••••   (OTP input)         ││
│  └──────────────────────────────┘│
│  [──── Match me ────────── →]   │  CTA from cta="Match me" prop
│  Resend code · Change number    │
└─────────────────────────────────┘
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Trust / security | Critical | `firstName` defaults to `'Sana'` (Account.jsx:55), `phone` defaults to `'(813) 956-2058'` (Account.jsx:57), and `agreed` defaults to `true` (Account.jsx:59). A real user who taps the phone/email path without reading the form can submit it with a stranger's name and phone number without noticing — or even accidentally create an account using test credentials. `canSend` at line 75 evaluates to `true` on page load because `phoneOk` is satisfied by the prefilled number and `agreed` is `true`. | Clear all default values: `useState('')` for `firstName`, `useState('')` for `phone`, `useState(false)` for `agreed`. These are test-data hangovers that must not ship to real users. |
| 2 | Trust / consent | Critical | `agreed` defaults to `true` (Account.jsx:59). Pre-checked terms checkboxes violate GDPR/CCPA dark-pattern prohibitions and Apple App Store guideline 5.1.1 (data collection and storage). The terms checkbox must default to unchecked. | Set `useState(false)` for `agreed`. |
| 3 | Hardcoded hex — disabled CTA | High | `PrimaryBtn` (called at Account.jsx:413) uses hardcoded `'#D8CCB6'` for the disabled state (PrimaryBtn.jsx:8). Same pattern as `AboutYou`. | Token-ize as `C.disabled` in `src/theme.js` (see AboutYou audit). |
| 4 | Dead prop | High | `account` prop is received at Account.jsx:51 and immediately discarded via `void account`. If `account` is non-null (returning user who skipped sign-out), the screen should detect this and route differently rather than silently ignoring it. The `void` suppresses the ESLint "unused variable" warning without actually addressing the logic. | Evaluate whether `account` should gate phase initialization (e.g. skip to `choose` if an account already exists, or show a "you're already signed in" message). If it is truly unused, remove it from the destructured props. |
| 5 | Form usability — no `autoFocus` or `autoComplete` | High | The `firstName` input at Account.jsx:309 has neither `autoFocus` nor `autoComplete="given-name"`. On mobile, the keyboard does not open automatically when the collect phase renders, adding a tap to start typing. The `phone` input has `inputMode="tel"` and `type="tel"` but no `autoComplete="tel"`. | Add `autoFocus` to the `firstName` input. Add `autoComplete="given-name"` to `firstName`. Add `autoComplete="tel"` to the phone input. |
| 6 | Form usability — no Enter-key submit on collect phase | High | The `firstName` and `phone`/`email` inputs in the collect phase have no `onKeyDown` Enter-submit handlers. Login.jsx:219, 228 correctly handles this with `onKeyDown={(e) => { if (e.key === 'Enter' && canSend) handleSend(); }}`. Account.jsx is missing these handlers — a mom who fills the form and presses Enter on mobile or a connected keyboard does nothing. | Add the same `onKeyDown` Enter-submit handler to all three collect-phase inputs, matching Login.jsx:219 and :228. |
| 7 | Semantic palette — choose phase consent links | Medium | Terms/Community Pact links in the choose phase (Account.jsx:248–249) and the collect phase (Account.jsx:388–389) use `C.terracotta` for the underline color. `C.terracotta` and `C.coral` are the same value, so this is not a visual problem. However using `C.terracotta` directly (an alias) instead of `C.coral` is inconsistent with the rest of the file's usage pattern. | Standardize on `C.coral` throughout for consistency with the rest of the phone app. `C.terracotta` is an alias — both are fine — but mixing the aliases within a single file creates confusion. |
| 8 | CTA copy — phase disconnect | Medium | In the `code` phase, the CTA is `"Match me"` (Account.jsx:179). This is a warm, brand-appropriate label, but it does not match what the button actually does (verify the OTP code). A mom who got an OTP and types it in expects a button that says something like "Verify" or "Confirm" — "Match me" is the outcome of onboarding, not the action of code verification. The mismatch could cause hesitation at the most critical conversion moment. | Change the `code` phase CTA to `"Confirm & match me"` or split: keep "Verify" for the code step and show "Match me" on the success transition. |
| 9 | Accessibility — terms checkbox | Medium | The terms agree button at Account.jsx:378–391 is a `<button>` acting as a checkbox. It has no `role="checkbox"`, no `aria-checked={agreed}`, and no associated `<label>` element. Screen readers will announce it as a generic button. | Replace with an `<input type="checkbox" id="terms-agree">` + `<label htmlFor="terms-agree">`, or add `role="checkbox" aria-checked={agreed}` to the button. |
| 10 | `ProviderGlyph` duplication | Medium | `ProviderGlyph` is defined identically in both Account.jsx (lines 29–48) and Login.jsx (lines 15–35) — 40 lines of identical SVG code duplicated across two files. | Extract `ProviderGlyph` to `src/components/ProviderGlyph.jsx` as a named export, imported by both Account and Login. |
| 11 | Back button visual inconsistency | Low | The back button in Account.jsx (line 158) uses `background: '#fff', border: 1px solid C.line` (matching AboutYou). Login.jsx (line 121) uses a borderless `rounded-full p-2 -ml-2` with `color: C.inkSoft`. These are the same conceptual element (back-to-previous-screen) with two different visual treatments within two steps of each other. | Standardize the back button to the `background: '#fff', border: C.line` pill style used in AboutYou and Account, across both Account and Login. |
| 12 | No scroll affordance on collect phase | Low | The `collect` phase content sits inside a `flex-1 px-6 overflowY: auto` div (Account.jsx:166). On an iPhone SE (375×667) the verification note + checkbox + error state could push the `PrimaryBtn` below the fold. The sticky bottom CTA at lines 407–417 is outside the scroll area and always visible, which is correct — but the gap `<div style={{ height: 4 }}/>` at line 404 is minimal; on a small screen the checkbox might be partially obscured by the CTA. | Test on a 375×667 viewport; increase the bottom spacer from `4px` to `8px` or add `paddingBottom: 80` to the scroll container. |

---

## Key issues (prose, ranked)

**1. Pre-filled name, phone, and pre-checked terms are production-breaking trust and compliance failures (Critical).**
`firstName: 'Sana'`, `phone: '(813) 956-2058'`, and `agreed: true` are test-data defaults that are live in production. A real user who taps through to the `collect` phase can tap "Send my code" immediately — submitting a 6-digit code to "(813) 956-2058" (a test number) without knowing it. More critically, the pre-checked `agreed: true` violates GDPR, CCPA, and App Store rules on consent. These are the most urgent fixes in the entire onboarding flow.

**2. Missing Enter-key submit and autoFocus on the collect phase degrades mobile form usability (High).**
The keyboard does not auto-open on render, and pressing Enter does nothing. Login.jsx handles this correctly. Account.jsx does not. A mom on a connected Bluetooth keyboard or who tabs through fields will be stuck.

**3. "Match me" as the OTP verification CTA is semantically mismatched (Medium).**
When a mom types her 6-digit code, the action she wants to confirm is "verify this is my phone/email". Labeling this "Match me" conflates the verification step with the matching outcome — a small but real source of hesitation at the highest-drop-off moment (OTP entry).

---

## Recommended redesign

### Collect phase — key changes annotated

```
// firstName field:
<input
  value={firstName}
  autoFocus
  autoComplete="given-name"
  onChange={e => setFirstName(e.target.value)}
  onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('phone-input')?.focus(); }}
  placeholder="Your first name"   // ← not prefilled
  ...
/>

// phone input:
<input
  id="phone-input"
  value={phone}                   // ← starts empty
  autoComplete="tel"
  onKeyDown={(e) => { if (e.key === 'Enter' && canSend) handleSend(); }}
  placeholder="(555) 123-4567"
  ...
/>

// terms:
const [agreed, setAgreed] = useState(false);  // ← not pre-checked
```

### Code phase CTA change

```
// Account.jsx:179:
cta="Confirm & continue"   // was "Match me"
```

---

## Before / after comparison

| Before | After |
|--------|-------|
| `firstName = 'Sana'` (prefilled test data) | `firstName = ''` (empty) |
| `phone = '(813) 956-2058'` (prefilled test) | `phone = ''` (empty) |
| `agreed = true` (pre-checked) | `agreed = false` (unchecked) |
| No `autoFocus` on first input | `autoFocus` on `firstName` |
| No Enter-key submit on any input | `onKeyDown` Enter-submit on all collect inputs |
| Terms: `<button>` with no ARIA role | Terms: `role="checkbox"` + `aria-checked` |
| `ProviderGlyph` duplicated in Account + Login | Shared `src/components/ProviderGlyph.jsx` |
| Code CTA: "Match me" | Code CTA: "Confirm & continue" |
| `void account` prop | Remove unused prop or handle it |

---

## Implementation notes

- `Account.jsx:55–59` — change: `useState('Sana')` → `useState('')`, `useState('(813) 956-2058')` → `useState('')`, `useState(true)` → `useState(false)`.
- `Account.jsx:309` — add `autoFocus autoComplete="given-name"`.
- `Account.jsx:348` — add `autoComplete="tel"`.
- `Account.jsx:309,348,354` — add `onKeyDown` Enter handlers matching Login.jsx:219–228.
- `Account.jsx:378–391` — add `role="checkbox"` + `aria-checked={agreed}` to the button (or refactor to `<input type="checkbox">`).
- `Account.jsx:179` — change `cta="Match me"` to `cta="Confirm & continue"`.
- Create `src/components/ProviderGlyph.jsx` with the shared SVG logic; import in Account.jsx and Login.jsx.
- `Account.jsx:51` — either remove `account` from destructured props (if unused) or add logic that checks it.

---

## Acceptance criteria

- [ ] `npm run build` succeeds.
- [ ] On the `collect` phase, `firstName` field renders empty. `phone` field renders empty. Terms checkbox is unchecked.
- [ ] `canSend` is `false` on initial render of the `collect` phase (no values filled).
- [ ] Tapping Enter in the `firstName` field moves focus to the phone/email input.
- [ ] Tapping Enter in the phone/email field when `canSend` is true calls `handleSend`.
- [ ] `autoFocus` on the `firstName` field triggers the keyboard on mobile.
- [ ] Terms agree button has `role="checkbox"` and `aria-checked` that updates on toggle.
- [ ] `ProviderGlyph` is imported from a shared component, not duplicated inline.
- [ ] OTP phase CTA does not read "Match me" — reads "Confirm & continue" or equivalent.
