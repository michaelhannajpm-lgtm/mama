# CodeVerify — `src/components/CodeVerify.jsx`

- **Props / API:** `target` (string — phone number or email displayed to user), `method` (`'phone'` | `'email'`), `onVerify` (function — receives the 6-digit code string), `onResend` (async function), `onChangeContact` (function), `submitting` (boolean, default `false`), `error` (string | null, default `null`), `demo` (boolean, default `false`), `accent` (CSS color, default `C.terracotta`), `cta` (string, default `'Verify & continue'`)
- **Used by:** `src/screens/onboarding/Account.jsx`, `src/screens/onboarding/Login.jsx`, `src/sheets/ContactVerifySheet.jsx`, `src/sheets/CreateAccountSheet.jsx` (4 call sites)
- **Purpose:** Shared 6-digit OTP entry block used in every passwordless auth flow. Channel-agnostic (phone SMS or email link/code). Includes a code input, verify button, resend, and change-contact footer actions.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — input ARIA | Medium | `CodeVerify.jsx:56-77` — the OTP input has `aria-label="6-digit verification code"` (line 63) — correct. It also has `autoComplete="one-time-code"` (line 60) and `inputMode="numeric"` (line 59) — both correct for OTP. `autoFocus` at line 61 moves focus to the input on mount, which is the right behavior for this flow. Full compliance here. | No action needed for the input itself. |
| 2 | Accessibility — error announcement | High | `CodeVerify.jsx:88-91` — the error block is rendered conditionally but has no `role="alert"` or `aria-live="assertive"`. When an OTP fails, the error message appears visually but is not announced to screen readers. A mom who is blind will not know why the verify button is disabled or why submission failed. | Add `role="alert"` to the error `<div>` at line 88. This causes AT to announce the error text immediately when it appears. |
| 3 | Styling — hardcoded `'#fff'` | Low | `CodeVerify.jsx:101` — `color: codeOk && !submitting ? '#fff' : C.inkMuted`. The `'#fff'` is white text on the coral verify button. `C.paper` is `#FFFFFF`. | Replace `'#fff'` with `C.paper`. |
| 4 | Styling — alpha hex pattern | Low | `CodeVerify.jsx:88` — `background: \`${C.terracotta}15\`` appends a hex alpha `15` (≈8% opacity) directly to the token value. This works because `C.terracotta` is a 6-digit hex (`#E96B7D`), making the result `#E96B7D15` — a valid 8-digit hex. However, this pattern is fragile: if `C.terracotta` were ever changed to an `rgb()` or `hsl()` value, appending `15` would produce an invalid color. | Use `rgba()` explicitly: `background: 'rgba(233,107,125,.08)'` or define a token `C.coralTint` / `C.coralAlpha` in `theme.js`. |
| 5 | Interaction states — verify button | Medium | `CodeVerify.jsx:93-106` — the verify `<button>` does not have `type="button"`. In a form context this would trigger form submission. All current call sites use it outside explicit `<form>` elements, but defensive `type="button"` is standard. | Add `type="button"` to the verify button. |
| 6 | Interaction states — resend button | Low | `CodeVerify.jsx:109-115` — the resend `<button>` has no `type="button"`. Same risk as finding 5. | Add `type="button"` to both the resend and "Change number/email" buttons. |
| 7 | UX — resend feedback timing | Medium | `CodeVerify.jsx:35-39` — on resend, `setResent(false)` immediately, then `await onResend?.()`, then `setResent(true)`. During the async operation the button shows "Resend code" again (since `resent` was just set to `false`). If `onResend` takes 1–2s, there is a window where the user does not know if their tap registered. | Show a loading indicator or change the button text to "Sending…" during the async operation. Add an intermediate `setSending(true)` state. |
| 8 | UX — code input with dots placeholder | Low | `CodeVerify.jsx:73` — `placeholder="••••••"` uses dot characters. On some Android keyboards with `inputMode="numeric"`, dots may render as `000000` or not render at all, creating visual confusion. | Change placeholder to `"123456"` (digits) or omit it entirely since the label and context make the expected input clear. |
| 9 | Typography — OTP in Fraunces | Low | `CodeVerify.jsx:74` — `fontFamily: 'Fraunces'` for the OTP input value. Fraunces is a serif display face; the digit letterforms may not be the clearest for reading back 6-digit codes (vs. a monospace or tabular numeric font). | Consider `fontFamily: 'Albert Sans'` with `fontVariantNumeric: 'tabular-nums'` for the OTP input — cleaner digit alignment, easier visual verification. |
| 10 | Props / API — `accent` default | Low | `CodeVerify.jsx:24` — `accent = C.terracotta` as a default prop value. This means `C.terracotta` is evaluated at module import time (not at render time). Since `C` is a static object, this is fine — but it means the prop signature evaluates a module import in the function parameter list, which is a non-obvious pattern. | Document with a comment. No functional change needed. |

## Recommended improvements

1. Add `role="alert"` to the error block (accessibility — screen reader announcement).
2. Add `type="button"` to verify, resend, and change-contact buttons.
3. Replace `'#fff'` with `C.paper` and the alpha hex pattern with `rgba()`.
4. Add a "Sending…" state during resend.
5. Reconsider Fraunces for the OTP input digits.

## Implementation notes

```jsx
// Error block fix:
{error && (
  <div role="alert" className="rounded-xl flex items-start gap-2 px-3 py-2"
    style={{ marginTop: 10, background: 'rgba(233,107,125,.08)', border: `1px solid ${C.terracotta}` }}>
    <div className="text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.4 }}>{error}</div>
  </div>
)}

// Verify button:
<button type="button" onClick={...} disabled={...} ...>

// Resend:
<button type="button" onClick={handleResend} ...>
```

## Acceptance criteria

- [ ] Error block has `role="alert"`.
- [ ] All interactive buttons have `type="button"`.
- [ ] No `'#fff'` or `${token}15` alpha pattern; use `C.paper` and `rgba()` respectively.
- [ ] Resend shows a loading/sending state during the async operation.
- [ ] `npm run build` passes.
