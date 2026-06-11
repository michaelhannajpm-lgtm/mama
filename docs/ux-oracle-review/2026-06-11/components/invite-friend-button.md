# InviteFriendButton — `src/components/InviteFriendButton.jsx`

- **Props / API:** `flash` (function — toast callback)
- **Used by:** `src/screens/MainApp/ConnectTab.jsx:20,1281` (1 call site)
- **Purpose:** Coral gradient CTA pill at the bottom of the Connect tab. Triggers the Web Share API when available, falls back to clipboard copy. Includes the current mom's referral code (`?ref=username`) so invites are attributed on sign-up.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Under-deployment — Connect tab only | High | `InviteFriendButton.jsx:6-8` — the component comment says it is "rendered at the bottom of Home, Connect, and Explore tabs," but it is only imported in `ConnectTab.jsx` (1 call site). Home and Explore (LocalPicksTab) do not use it. This is a missed growth-loop opportunity — invite moments work best when a mom is already delighted (after seeing a great event or nearby mom), not only in the social-discovery tab. | Add `<InviteFriendButton flash={flash}/>` to the bottom of `HomeTab.jsx` and `LocalPicksTab.jsx`. The `px-5` gutter is already present in both scrollers. |
| 2 | Styling — hardcoded `'#fff'` | Low | `InviteFriendButton.jsx:45` — `color: '#fff'`. This is white text on a coral gradient button. Use `C.paper` for token consistency. | Replace `'#fff'` with `C.paper`. |
| 3 | Accessibility — button type | Medium | `InviteFriendButton.jsx:38` — `<button>` has no `type="button"`. If ever placed inside a form, this could trigger form submission. | Add `type="button"`. |
| 4 | Accessibility — aria-label | Low | `InviteFriendButton.jsx:38-54` — the button has visible text "Invite a friend" and a `UserPlus` icon with no `aria-label`. The visible text is sufficient for AT. However, the `UserPlus` icon at line 51 has no `aria-hidden` attribute — screen readers may read "user plus icon Invite a friend" (the icon title from Lucide). | Add `aria-hidden="true"` to the `<UserPlus>` icon. |
| 5 | Behavior — clipboard API guard | Medium | `InviteFriendButton.jsx:30` — `navigator.clipboard?.writeText(...)` is guarded with optional chaining (safe). However, `navigator.clipboard` is only available in secure contexts (HTTPS). On HTTP dev environments the fallback `flash?.('Share unsupported on this device')` fires even though sharing is conceptually possible. This is acceptable for production (Vercel is HTTPS), but the error message is slightly misleading in dev. | In development, add a `console.log` with the URL so devs can test the share text. No production change needed. |
| 6 | Behavior — `myCode()` for anonymous sessions | Low | `InviteFriendButton.jsx:23` — `inviteUrl(myCode())` — `myCode()` returns the user's username from `referral.js`. For anonymous or seeded sessions without a username, `myCode()` presumably returns `null` or `undefined`, and `inviteUrl(null)` falls back to the bare origin. The component comment acknowledges this. | Add a `disabled` visual state (grayed-out or hidden) when `myCode()` returns falsy, to signal to moms that their invite link isn't ready yet (they need to complete sign-up). |
| 7 | Styling — self-contained margins | Low | `InviteFriendButton.jsx:48-49` — `marginTop: 20, marginBottom: 6` are baked into the component's inline style. The component comment says "callers control the surrounding gutter." These internal margins conflict with that stated contract — callers cannot easily control vertical spacing without overriding the component's own margins. | Remove `marginTop`/`marginBottom` from the component and let callers manage spacing via wrapper `<div className="mt-5 mb-1.5">` or similar. |

## Recommended improvements

1. Deploy to `HomeTab` and `LocalPicksTab` as well as `ConnectTab` (comment says this was the intent).
2. Add `type="button"` and `aria-hidden` on the icon.
3. Replace `'#fff'` with `C.paper`.
4. Remove self-contained margins; let callers own spacing.
5. Add a disabled state when no referral code is available.

## Implementation notes

- `InviteFriendButton.jsx:38` → add `type="button"`.
- `InviteFriendButton.jsx:45` → `color: C.paper`.
- `InviteFriendButton.jsx:51` → `<UserPlus size={15} aria-hidden="true"/>`.
- Remove lines 48-49 (`marginTop: 20, marginBottom: 6`) and add a wrapper div at the call sites.
- Import and render in `src/screens/MainApp/HomeTab.jsx` and `src/screens/MainApp/LocalPicksTab.jsx` at the bottom of each tab's scroll container (inside the existing `px-5` padding).

## Acceptance criteria

- [ ] `type="button"` on the `<button>`.
- [ ] `UserPlus` icon has `aria-hidden="true"`.
- [ ] No hardcoded `'#fff'`; uses `C.paper`.
- [ ] Margin is not baked into the component (callers control spacing).
- [ ] Component is rendered in `HomeTab` and `LocalPicksTab` as well as `ConnectTab`.
- [ ] `npm run build` passes.
