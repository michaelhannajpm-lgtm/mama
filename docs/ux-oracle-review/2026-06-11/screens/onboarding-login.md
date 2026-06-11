# Login — returning-member sign-in

- **File:** `src/screens/onboarding/Login.jsx` (260 lines)
- **Purpose:** Passwordless sign-in for returning moms. Two phases: `collect` (phone or email input + OAuth buttons) and `code` (OTP/magic-link verification via `CodeVerify`). Sized to fit iPhone SE (375×667) without scroll.
- **Entry / when shown:** Opened from Landing via `onSignIn`, or from Account.jsx via the "Already a member? Log in" link. Controlled by `loginOpen` in `App.jsx`.
- **Related components/sheets:** `PrimaryBtn`, `CodeVerify`, `ProviderGlyph` (local, duplicated from Account.jsx), `ENABLED_PROVIDERS`
- **Data dependencies:** No live API fetches. Auth calls via `lib/onboarding.js`.

---

## Current state (wireframe)

### Phase: collect

```
┌─────────────────────────────────┐
│ [←]                             │  ← no StatusBar
│                                 │
│  Welcome back                   │  Albert Sans 10px uppercase eyebrow
│  Hello again, mama.             │  Fraunces 24 (weight:400); italic+coral "mama"
│  Enter your phone or email…     │  Albert Sans 12 inkSoft
│                                 │
│ ┌──────────┬──────────┬───────┐ │  OAuth: icon-only grid (if PROVIDERS > 0)
│ │ [Apple]  │ [Google] │ [FB]  │ │  h=40 rounded-xl, NO labels
│ └──────────┴──────────┴───────┘ │
│                                 │
│  ─── or sign in with ──────────  │
│                                 │
│  SEND MY CODE TO                │  eyebrow label
│  ┌───────────┬──────────────┐   │  Email tab selected by default
│  │  Email    │  Phone       │   │  ← NOTE: Login defaults to email; Account defaults to phone
│  └───────────┴──────────────┘   │
│  ┌──────────────────────────────┐│  h=40, C.paper bg
│  │ [✉]  you@example.com        ││
│  └──────────────────────────────┘│
│                                 │
│ [error banner if any]           │
│                                 │
│ [──── Send my code ────── →]   │  PrimaryBtn, terracotta variant, sticky bottom
└─────────────────────────────────┘
```

### Phase: code

```
┌─────────────────────────────────┐
│ [←]                             │
│                                 │
│  [CodeVerify component]         │
│  "Check your email"             │
│  Enter your code                │
│  ┌──────────────────────────────┐│
│  │ ••••••   (OTP input)         ││
│  └──────────────────────────────┘│
│  [──── Sign in ─────────── →]   │  cta="Sign in"
│  Resend code · Change email     │
└─────────────────────────────────┘
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Component duplication | High | `ProviderGlyph` at Login.jsx:15–35 is identical to Account.jsx:29–48 — 40 lines of SVG duplicated verbatim. Any icon update requires editing two files. | Extract to `src/components/ProviderGlyph.jsx` (shared with Account). See Account audit. |
| 2 | Accessibility — OAuth icon-only buttons | High | Login.jsx:163–171: OAuth provider buttons in the login flow render icon-only (`height: 40`, no text label, no visible text). The `aria-label` prop is set via `p.label` from `ENABLED_PROVIDERS` (Login.jsx:170), so the accessible name is present. However at 40×40px these buttons are at the iOS minimum tap target (44×44pt); combined with icon-only affordance, a mom who doesn't recognise the Google/Apple/Facebook glyph has no text cue. The `Account.jsx` choose-phase uses 50px-tall buttons WITH text labels — the login flow is strictly worse. | Increase OAuth button height to 48px minimum and add text labels, matching Account.jsx's choose phase. Or at minimum add a tooltip / visible label to each icon. |
| 3 | Missing StatusBar | Medium | Login.jsx renders no `<StatusBar/>` component. Every other screen in the onboarding flow (Landing, AboutYou, Account, NotificationsOptIn) renders `<StatusBar/>` as its first child. Without it the status area (time + battery) is invisible or shows through whatever is behind the sheet, creating visual inconsistency. | Add `import { StatusBar } from '../../components/StatusBar';` and render `<StatusBar/>` as the first child of the root `<div>`, matching all sibling screens. |
| 4 | Method default inconsistency | Medium | Login.jsx:39 defaults to `method: 'email'`; Account.jsx:56 defaults to `method: 'phone'`. A returning mom who originally signed up with phone is shown the email tab first on login — the opposite of her registration default. This is particularly confusing given the method-order inconsistency: Login shows Email first / Phone second (line 199 then 207), while Account shows Phone first / Email second (line 321 then 333). | Default `method` in Login to `'phone'` to match Account. Make the tab order consistent: Phone | Email in both screens. |
| 5 | Error display — contrast | Medium | The error banner at Login.jsx:236: `background: ${C.terracotta}15` creates a ~8% opacity coral background. The text is `color: C.ink` (Login.jsx:238) rather than `C.terracotta`. This is inconsistent with Account.jsx:394 where the error text is `color: C.terracotta`. Neither pattern has been checked for contrast — the 8–20% opacity backgrounds with coral text fail WCAG AA at that saturation level. | Use the Account.jsx pattern consistently and verify contrast: `background: ${C.coral}14`, text `color: C.terracotta`. Or switch to a fully opaque error color combination (e.g. `background: #FFF0F2`, text: `C.coralDeep`). |
| 6 | No terms/consent notice | Medium | The Account choose-phase displays passive consent copy ("By continuing, you agree to Go Mama's Terms and Community Pact") at Account.jsx:246–250. The Login screen has no equivalent notice. A returning user who originally agreed may have done so months ago; repeating the consent reminder is a legal best practice. | Add the same one-line passive consent footer to the login collect phase, matching Account.jsx:246–250. |
| 7 | Back button visual inconsistency | Low | Login.jsx:121–124: the back button is `rounded-full p-2 -ml-2` with `color: C.inkSoft` — a bare arrow with no background or border. Account.jsx:158–162 uses `background: '#fff', border: 1px solid C.line`. Both are the same conceptual navigation element. | Standardize the back button style. The Account style (white pill with border) has better touch affordance. |
| 8 | `formatPhone` duplicated | Low | `formatPhone` function at Login.jsx:47–52 is identical to Account.jsx:65–70. | Extract to `src/lib/format-phone.js` (a pure utility) and import in both files. |
| 9 | No name input on login | Low | By design, login does not collect `firstName`. If a returning mom has no `first_name` in `user_metadata`, `handleVerify` at Login.jsx:93 falls back to the email prefix (`email.split('@')[0]`) or `'Mama'`. This is correct for the current implementation. No change needed, but it's worth noting the UX edge case where a returning user is greeted as "Mama" instead of their name after login. | Consider enriching the greeting on the code phase: "Welcome back — entering the code for [phone/email]" instead of a generic heading. |
| 10 | Hardcoded disabled CTA | Low | `PrimaryBtn` (used at Login.jsx:253) applies hardcoded `'#D8CCB6'` for disabled state — same finding as Account and AboutYou. | Token-ize as `C.disabled` in `src/theme.js`. |

---

## Key issues (prose, ranked)

**1. No StatusBar — Login is the only screen in the flow without it (Medium, but creates jarring visual inconsistency).**
Every sibling screen (Landing, AboutYou, Account, NotificationsOptIn) renders `<StatusBar/>`. Login does not. When the screen opens — especially if it opens as a modal over Landing — the status bar area appears visually broken. This is a single-line import and render that unifies the experience.

**2. OAuth icon-only buttons at 40px are under-sized and have no text affordance (High).**
The Account sign-up flow uses 50px-tall OAuth buttons with full text labels. The Login flow uses 40px icon-only squares. A mom who signed up with Google six months ago has a smaller, less readable button to find her way back in. The parity gap between Account (generous, labeled) and Login (compressed, unlabeled) is the most noticeable UX inconsistency between adjacent screens.

**3. Method default is inverted vs. Account — email first on login, phone first on signup (Medium).**
If a mom signed up via phone (the Account default), she returns to login and sees the email tab selected. She must tap to phone before entering her number. Inverting the tab order also means the two screens present different first impressions of the same concept, eroding mental model consistency.

---

## Recommended redesign

### Collect phase — key annotated changes

```
// Add at top of component render:
<StatusBar/>                          // [A] — matches all sibling screens

// OAuth buttons — match Account's choose-phase size/labels:
<button ... style={{ height: 48, ... }}>   // [B] — 48px (was 40)
  <ProviderGlyph id={p.id} size={18}/>
  <span>{p.label}</span>                   // [B] — add visible text label
</button>

// Method tabs — swap default:
const [method, setMethod] = useState('phone');  // [C] — was 'email'
// Tab order: Phone | Email (matching Account)

// Passive consent footer (add below error):
<p className="text-center text-[10.5px]" style={{ marginTop: 16, ... }}>
  By continuing, you agree to Go Mama's{' '}
  <span style={{ color: C.coral, textDecoration: 'underline' }}>Terms</span> and{' '}
  <span style={{ color: C.coral, textDecoration: 'underline' }}>Community Pact</span>.
</p>                                           // [D] — matching Account.jsx:246–250
```

---

## Before / after comparison

| Before | After |
|--------|-------|
| No `<StatusBar/>` | `<StatusBar/>` as first child |
| OAuth buttons: 40px, icon-only | OAuth buttons: 48px, icon + text label |
| Default method: email | Default method: phone (matching Account) |
| Tab order: Email / Phone | Tab order: Phone / Email (matching Account) |
| No consent notice | Passive consent footer matches Account |
| Back: bare arrow, no bg | Back: white pill with `C.line` border |
| `ProviderGlyph` duplicated inline | Imported from `src/components/ProviderGlyph.jsx` |
| `formatPhone` duplicated inline | Imported from `src/lib/format-phone.js` |
| Error text: `C.ink` | Error text: `C.terracotta` (consistent with Account) |

---

## Implementation notes

- `Login.jsx:1–8` — add `import { StatusBar } from '../../components/StatusBar'`; add `<StatusBar/>` as first child of root div.
- `Login.jsx:39` — change `useState('email')` to `useState('phone')`.
- `Login.jsx:159–171` — increase OAuth button `height` from 40 to 48; add `<span>{oauthLoading === p.id ? 'Connecting…' : p.label}</span>` inside each button; add `gap: 8` to the button style.
- `Login.jsx:190–210` — swap tab rendering order to Phone first, then Email.
- `Login.jsx:236–240` — change error text color from `C.ink` to `C.terracotta` to match Account.jsx:394.
- Add passive consent paragraph after the error block, before the sticky CTA.
- Extract `ProviderGlyph` to `src/components/ProviderGlyph.jsx` (done once, shared with Account).
- Extract `formatPhone` to `src/lib/format-phone.js` (done once, shared with Account).
- Standardize the back button style to match Account.jsx:158–162.

---

## Acceptance criteria

- [ ] `npm run build` succeeds.
- [ ] Login renders a `<StatusBar/>` as its first visible child.
- [ ] OAuth provider buttons are ≥ 48px tall and show a visible text label alongside the glyph.
- [ ] Default selected method tab is "Phone", not "Email".
- [ ] Tab order is Phone | Email (left-to-right), matching Account.
- [ ] A passive consent sentence appears below the form on the collect phase.
- [ ] Error banner text color is `C.terracotta` (consistent with Account).
- [ ] Back button matches Account's style (white pill, `C.line` border).
- [ ] `ProviderGlyph` is not defined inline — imported from a shared file.
- [ ] `formatPhone` is not defined inline — imported from a shared utility.
