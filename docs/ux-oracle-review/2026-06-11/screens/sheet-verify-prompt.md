# VerifyPromptSheet — verification gate

- **File:** `src/sheets/VerifyPromptSheet.jsx` (123 lines)
- **Purpose:** Bottom drawer that intercepts connect / RSVP / join-group actions for unverified moms and explains what verification requires, then routes to the Profile tab verify flow. Action-specific headlines for "connect", "meetup", "group" and a generic default.
- **Entry / when shown:** `requireVerify(action, name)` helper in `MainApp/index.jsx` — fires whenever an unverified mom attempts a gated action. No `App.jsx` state needed; it is managed within the MainApp shell.
- **Related components/sheets:** `Sheet` (no `tall`, content-sized), `YouTab` (verification destination).
- **Data dependencies:** Static — all content is from `action` and `contextName` props plus the `ACTION_COPY` map. No loading states.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  ━━━━━                       [X]        │
│                                         │
│  ONE MORE STEP   (coral eyebrow)        │
│  Verify to connect                      │  ← Fraunces 24px
│  [contextName — italic block below if   │
│   provided, e.g. "Sarah K."]            │
│                                         │
│  ┌─ info card ─────────────────────┐   │
│  │ [shield icon white circle]      │   │
│  │ Verified moms can request to    │   │
│  │ connect with other moms...      │   │  ← fontWeight: 800 (primary detail)
│  │                                 │   │
│  │ Connect Instagram or Facebook,  │   │
│  │ then add a real photo. Takes    │   │
│  │ about 30 seconds.               │   │  ← fontWeight: normal (secondary detail)
│  └─────────────────────────────────┘   │
│                                         │
│  [ Verify now  → ]                      │  ← coral gradient, 52px CTA
│  [ Maybe later ]                        │  ← transparent text button
│                                         │
└─────────────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | `contextName` renders below headline without label | **Medium** | Lines 58–61: `contextName` renders as `<span style={{ display: 'block', color: C.coral, fontStyle: 'italic', marginTop: 2 }}>{contextName}</span>` inside the `<h3>`. For "Verify to connect" with `contextName="Sarah K."`, this produces: "Verify to connect\nSarah K." — the name is italic+coral but has no preposition. The mom reads "Verify to connect Sarah K." which is grammatically ambiguous (connect Sarah K. = make a call to her, or: connect = a general ability). | Change the headline to incorporate the name grammatically: `Verify to connect with {contextName}` when `contextName` is provided. For `meetup`: `Verify to RSVP to {contextName}`. For `group`: `Verify to join {contextName}`. |
| 2 | Hardcoded `'#fff'` on shield icon | **Low** | Line 75: `background: '#fff', color: C.coralDeep` — the shield icon container uses hardcoded white. | Replace with `background: C.paper`. |
| 3 | `fontWeight: 800` on explanatory detail text | **Medium** | Line 85: `fontWeight: 800` on `copy.detail` — the primary detail sentence ("Verified moms can request to connect…"). For 13 px body text, 800 weight is very heavy; at this size it reads as shouting. Secondary text at line 90 is unweighted normal. | Change `copy.detail` to `fontWeight: 600` (semi-bold, still distinct from the secondary text). |
| 4 | "Maybe later" button has no `type="button"` | **Low** | Line 109: the cancel button is a `<button>` with no `type` attribute. Inside a form context, this would default to `type="submit"`. While there is no form here, it is best practice. | Add `type="button"` to both buttons. |
| 5 | Info card gradient uses `C.peach` and `C.coralSoft` | **Medium** | Lines 69–72: `background: \`linear-gradient(135deg, ${C.peach}, ${C.coralSoft})\``. `C.peach` is documented as a "decorative chip background" for the Landing screen's feature grid — not a card background. This semantic bleed is minor but uses a token outside its documented context. | Use `C.coralSoft` for both ends of the gradient (a softer single-tone): `background: C.coralSoft, border: \`1px solid ${C.divider}\`` — matches the CreateAccountSheet pending-action card pattern. |
| 6 | Shield icon color is coral, not sage | **Medium** | Line 79: `color: C.coralDeep` on `<ShieldCheck>`. Verification is safety, not intimacy — the shield should be sage (community/safety) per the semantic palette. Coral means 1:1 intimacy. The verified state badge on mom profiles (`MomDetailSheet.jsx:162`) correctly uses `C.sageDark`. | Change shield icon color to `C.sageDark`. Keep the CTA coral (it's a primary action leading to account setup). |
| 7 | Content-sized compliance | **Low** | Sheet uses `<Sheet onClose={onClose}>` at line 42 — no `tall` prop. Content is approximately 320 px (eyebrow + headline + card + two buttons). On 375-wide phone at 82% cap = ~547 px, this is well within bounds. Compliant. | No change needed. |
| 8 | `onVerify?.()` + `onClose?.()` both called on CTA | **Low** | Line 96: `onClick={() => { onVerify?.(); onClose?.(); }}`. If `onVerify` triggers navigation that unmounts the sheet, calling `onClose` afterward is a no-op on an unmounted component. No harm in React 18 (effects clean up), but it is cleaner to call only `onVerify` and let the verify flow close the sheet as part of navigation. | Have `onVerify` be responsible for dismissal; remove the explicit `onClose()` call. |

## Key issues (prose, ranked)

1. **Shield icon is coral instead of sage (Medium).** The verification system is a safety mechanism (not intimacy/1:1), and the semantic palette maps safety/community signals to sage. The profile "Verified mom" badge in `MomDetailSheet` uses `C.sageDark` correctly. This sheet's shield should match.

2. **`contextName` renders ambiguously (Medium).** "Verify to connect" + "Sarah K." as a block renders confusingly. The copy should integrate the name into the sentence.

3. **`fontWeight: 800` on 13 px body text (Medium).** Excessively heavy; the detail text should be readable, not bold.

4. **`C.peach` on info card background (Medium).** Peach is documented as a Landing feature-grid decorative chip. Using it as a card background leaks the token's semantic context.

## Recommended redesign

```
┌─────────────────────────────────────────┐
│  ━━━━━                       [X]        │
│                                         │
│  ONE MORE STEP  (coral)                 │
│  Verify to connect with Sarah K.        │  ← name integrated in sentence
│                                         │
│  ┌─ info card (coralSoft bg) ────────┐  │
│  │ [🛡 ShieldCheck, sageDark]        │  │  ← SAGE not coral
│  │ Verified moms can request to      │  │  ← fontWeight 600 (not 800)
│  │ connect with other moms.          │  │
│  │                                   │  │
│  │ Connect Instagram or Facebook,    │  │
│  │ then add a real photo.            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [ Verify now → ]  (coral gradient)    │
│  [ Maybe later ]                        │
│                                         │
└─────────────────────────────────────────┘
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Shield icon color | `C.coralDeep` (coral) | `C.sageDark` (sage) |
| Info card background | `peach→coralSoft` gradient | `C.coralSoft` flat |
| Headline + contextName | Block below, ambiguous | Integrated sentence |
| `copy.detail` weight | `fontWeight: 800` | `fontWeight: 600` |
| Shield icon bg | `'#fff'` | `C.paper` |

## Implementation notes

- `VerifyPromptSheet.jsx:69-72` — change `background: \`linear-gradient(135deg, ${C.peach}, ${C.coralSoft})\`` to `background: C.coralSoft, border: \`1px solid ${C.divider}\``
- `VerifyPromptSheet.jsx:79` — change `color: C.coralDeep` to `color: C.sageDark`
- `VerifyPromptSheet.jsx:75` — change `background: '#fff'` to `background: C.paper`
- `VerifyPromptSheet.jsx:57-61` — restructure headline rendering to embed contextName in the sentence rather than as a separate block:
  ```jsx
  const headline = contextName
    ? copy.title.replace('connect', `connect with ${contextName}`)
                .replace('RSVP', `RSVP to ${contextName}`)
                .replace('join', `join ${contextName}`)
    : copy.title;
  ```
  Or hardcode per action key in `ACTION_COPY`.
- `VerifyPromptSheet.jsx:85` — change `fontWeight: 800` to `fontWeight: 600`
- `VerifyPromptSheet.jsx:96` — remove `onClose?.()` from the Verify CTA; let `onVerify` control dismissal
- `VerifyPromptSheet.jsx:96,109` — add `type="button"` to both buttons

## Acceptance criteria

- [ ] Shield icon renders in `C.sageDark`
- [ ] Info card background is `C.coralSoft` (no peach gradient)
- [ ] When `contextName` is provided, headline integrates the name grammatically
- [ ] `copy.detail` uses `fontWeight: 600`
- [ ] Shield icon container background is `C.paper`
- [ ] Both buttons have `type="button"`
- [ ] `npm run build` passes
