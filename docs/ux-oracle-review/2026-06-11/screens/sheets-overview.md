# Sheets overview — all 31 bottom-drawer surfaces

2026-06-11 audit. Deep-dives live in `sheet-*.md` files in this directory. This file covers:
1. All 31 sheets in a reference table (skim assessments for the ~22 not individually audited)
2. Cross-cutting findings: header/close/handle consistency, content-sized contract, keyboard/focus, loading contract, premium-gate consistency

---

## All 31 sheets — reference table

Sheet files live in `src/sheets/`. Content-sized = yes means the drawer correctly shrinks to its content (no forced full-height). Full-height = yes means it intentionally uses `fullScreen` prop or a full-screen raw div pattern. Mixed = behaves correctly in one mode, not the other.

| # | File | Purpose | Content-sized | Full-height opt-in | Severity | Top issue |
|---|------|---------|:---:|:---:|---|---|
| 1 | `AvailabilitySheet.jsx` | Recurring-week + custom grid slot capture | Yes | — | Low | Raw drawer div (bypasses `Sheet` primitive); `maxHeight: '90%'` not using the Sheet cap tokens |
| 2 | `ContactVerifySheet.jsx` | Add/change phone or email with OTP verify | Yes | — | Low | Well-structured; `maxHeight: '82%'` hardcoded (mirrors Sheet default but separately maintained) |
| 3 | `CreateAccountSheet.jsx` | Passwordless account gate (1:1 / group trigger) | **No** | — | **Critical** | Pre-filled "Sana" + Tampa phone number; terms pre-agreed; `minHeight: 540` forced |
| 4 | `DeleteAccountSheet.jsx` | Capture leaving reason + 2-step delete confirm | Yes | — | Low | "Continue" CTA fires on step 1 even without reason if `!reasonCode` is somehow truthy (guarded); overall solid |
| 5 | `EditIdentitySheet.jsx` | Display name + @handle edit | Yes | — | Low | `tall` prop passed but content is short — no issue, just slightly over-provisioned |
| 6 | `EventDetailSheet.jsx` | Event/meetup detail + RSVP | Yes | `fullScreen` prop | **High** | RSVP flash fires for verified moms; fake FALLBACK_INSTRUCTIONS shown as real; DEFAULT_GOING_AVATARS — same Unsplash faces everywhere |
| 7 | `GroupDiscussionSheet.jsx` | Group chat thread + join flow | Yes | — | Medium | No loading skeleton while `convId` resolves (`{convId && <ConversationFeed>}` — blank until async resolves) |
| 8 | `GroupsAdvancedFilterSheet.jsx` | Sage-accent filter drawer for mom groups | Yes | — | Low | Well-structured; draft-local pattern correct; sage accent for group context is correct |
| 9 | `InterestsPreferencesSheet.jsx` | 4-step family preferences flow (full-screen) | Yes (full-screen explicit) | Explicit `inset-0` raw div | Medium | Bypasses `Sheet` primitive; full-screen justified (many cards per step) but should use `Sheet fullScreen` for consistency |
| 10 | `KidsSheet.jsx` | Per-child cards (name, age, gender) | Likely yes | — | Low | Not fully read; from skimming: content-sized structure, no forced heights visible |
| 11 | `LocationSheet.jsx` | Neighborhood picker + radius slider | Yes (`tall`) | — | Low | Solid; `NeighborhoodPicker` component handles the complex input; `saving` state disables CTA |
| 12 | `MamaHubSheet.jsx` | 4-tab hub: Plans / Chat / Groups / Saved | Yes | — | **High** | SEED_CHATS hardcoded (4 fake conversations visible on first open — not from live data); no three-state loading for the chat list |
| 13 | `MeetupsFilterSheet.jsx` | Filter drawer for meetups tab | Yes | — | Medium | Uses `Sheet` correctly; `tall` not set — with all filter categories visible, may clip on small phones; draft pattern correct |
| 14 | `MessageSheet.jsx` | DM thread + 3-message free limit gate | **No** | — | **High** | `minHeight: 540` both states; no skeleton while Supabase messages load; blank white void during API call |
| 15 | `MomDetailSheet.jsx` | Rich mom profile + all deep actions | Yes | `fullScreen` prop | **High** | "Buddy Brew · Hyde Park" hardcoded suggested meetup; bio forced italic; 16× `'#fff'` instead of `C.paper` |
| 16 | `MomsAdvancedFilterSheet.jsx` | Plus-gated coral filter drawer for moms | Yes (`tall`) | — | Low | Well-structured; correct coral accent for moms context; `verifiedOnly: true` default is a good safe default |
| 17 | `MyVillageSheet.jsx` | Bookmarks / Interested / Joined / Chats hub | Yes | — | Medium | `resolve()` helper returns null for unknown IDs — silently hides saved items with no empty-state message; saved `mom-` prefix IDs can fail to resolve if mom left nearby range |
| 18 | `NotificationsSheet.jsx` | Bell feed: messages, matches, RSVPs, reminders | Yes | — | **High** | Entirely SEED_NOTIFS hardcoded (5 static rows); zero real notification data; no loading state; this is always fake |
| 19 | `PlaceDetailSheet.jsx` | Place/program/school detail + directions | **No** | Manual raw div | **High** | Bypasses `Sheet` primitive entirely; "12 moms" hardcoded social proof; fabricated amenities; `onShare` called for phone call |
| 20 | `PlacesFilterSheet.jsx` | Live-apply filter for Places sub-view | Yes | — | Low | Live-apply (no draft) pattern works; `activeCount` correctly excludes cost/parking; CTA reflects live count |
| 21 | `PremiumSheet.jsx` | Plus upsell — dark surface | Yes | — | Medium | Feature list order: "Advanced filters" leads instead of "Unlimited messages" (which is the primary conversion trigger); no `aria-label` on CTA with price |
| 22 | `ProfilePhotosSheet.jsx` | Manage up to 5 profile photos | Yes | — | Medium | Upload error handling flash is correct; `busy` state correctly disables UI; no loading skeleton while upload in progress (button copy changes only) |
| 23 | `ProfileSheet.jsx` | Single-mom profile card (partial/full) | Yes (`tall`) | — | **High** | Duplicate of `MomDetailSheet` without the action surface; "Profile · partial" internal label visible in UI; pre-agreed with interests using sageDark in "you both share" card (semantics) |
| 24 | `RateSheet.jsx` | 1–5 star rating with optional note | Yes | — | Low | Smallest sheet in the codebase (50 lines); clean; `stars === 0` CTA disabled is correct; `item.dist` (LocalPicksTab shape) vs `item.distance` (other shapes) may cause blank distance |
| 25 | `ScheduleSheet.jsx` | Pick a 1:1 meetup time slot | Yes | — | **Critical** | San Francisco place names ("Sightglass · 7th St", "Dolores Park") in a Tampa Bay app; hardcoded fake availability slots |
| 26 | `SeeAllSheet.jsx` | Full-frame "See all" list with filters | No (full-frame overlay) | Explicit `absolute inset-0` raw div | Medium | Bypasses `Sheet`; full-frame is intentional (hosts card grid); but uses raw div with manual z-index/animation — should use `Sheet fullScreen` |
| 27 | `SeededMomLoginSheet.jsx` | Dev tool: log in as a seeded mom | Yes (`tall hideClose`) | — | Low | Dev-only tool; correct use of `hideClose`; own close button wired in header; not production-visible |
| 28 | `ShareSheet.jsx` | Share channels + per-mom invite picker | Yes | — | Medium | Hardcoded channel tiles use inline `bg/fg` hex values (`'#DDF4E1'`, `'#2EA84E'`, etc.) — not `C` tokens; acceptable for brand-specific channel colors but undocumented |
| 29 | `SubjectThreadSheet.jsx` | Discussion thread for a place/event/meetup | Yes (`tall`) | — | Medium | No loading skeleton while `convId` resolves (`{convId && <ConversationFeed>}` — blank until resolved); `expiresHint` sage pill correct |
| 30 | `ToggleSettingsSheet.jsx` | Reusable on/off toggle drawer (Notifications, Privacy) | Yes | — | Low | Clean, well-abstracted; `gateKey` master-gate pattern correct; `aria-pressed` on switches correct |
| 31 | `VerifyPromptSheet.jsx` | Verification gate for connect/RSVP/join | Yes | — | Medium | Shield icon coral instead of sage; `fontWeight: 800` on detail text; `C.peach` used as card bg (wrong semantic) |

---

## Cross-cutting findings

### 1. Content-sized drawer compliance

**Rule:** sheets shrink-wrap their content. `fullScreen` is an explicit opt-in for rich detail views. The team reverted a full-screen-everything decision on 2026-06-11 and documented this in `Sheet.jsx:13-15`.

**Violations:**
- `CreateAccountSheet.jsx:106` — `minHeight: 540` forces the sheet taller than its content.
- `MessageSheet.jsx:101,122` — `minHeight: 540` on both the unavailable and main states.
- `PlaceDetailSheet.jsx:77` — raw `absolute inset-0` div, bypassing `Sheet` entirely (always full-height).
- `SeeAllSheet.jsx` — raw `absolute inset-0` div, intentionally full-frame but not using `Sheet fullScreen`.
- `AvailabilitySheet.jsx:138` — raw `absolute left-0 right-0 bottom-0` drawer div with `maxHeight: '90%'` (manual, not Sheet-primitive).
- `ContactVerifySheet.jsx:66` — raw `absolute left-0 right-0 bottom-0` with `maxHeight: '82%'` (manual).
- `InterestsPreferencesSheet.jsx` — explicit full-screen raw div (justified by multi-card step flow).

**Sheets correctly using `Sheet` primitive with content-sizing:** `CreateAccountSheet` (has `tall`, just remove `minHeight`), `PremiumSheet`, `ScheduleSheet`, `ProfileSheet`, `EventDetailSheet`, `MomDetailSheet`, `VerifyPromptSheet`, `DeleteAccountSheet`, `EditIdentitySheet`, `KidsSheet`, `LocationSheet`, `MeetupsFilterSheet`, `MomsAdvancedFilterSheet`, `GroupsAdvancedFilterSheet`, `PlacesFilterSheet`, `ProfilePhotosSheet`, `RateSheet`, `SeededMomLoginSheet`, `ShareSheet`, `SubjectThreadSheet`, `ToggleSettingsSheet`, `NotificationsSheet`, `MyVillageSheet`, `MamaHubSheet`, `GroupDiscussionSheet`.

**Recommendation:** Migrate `AvailabilitySheet`, `ContactVerifySheet`, `SeeAllSheet`, and `PlaceDetailSheet` to use `<Sheet>` (with `fullScreen` for the latter two). This gives them the drag handle, close button, safe-area padding, and animation from the shared primitive automatically.

---

### 2. Drag handle / close affordance consistency

The `Sheet` primitive renders a drag handle (top center, `C.divider` colored) and a top-right close X automatically. Sheets that bypass `Sheet` must implement these manually.

**Manual implementations — diverge from Sheet:**

| File | Handle | Close | Issue |
|------|--------|-------|-------|
| `AvailabilitySheet.jsx:147-167` | None | ChevronLeft + X pair | Dual-button header (back/close) — unique pattern not matching Sheet's single X |
| `ContactVerifySheet.jsx:73-96` | None | ChevronLeft (step 2) + X | Same dual-button pattern |
| `InterestsPreferencesSheet.jsx` | None | ChevronLeft + X | Full-screen multi-step — intentional back/close split |
| `SeeAllSheet.jsx` | None | Back arrow (X + left) | Uses plain `X` icon top-left inline — inconsistent with `Sheet` which uses `ArrowLeft` for fullScreen |
| `PlaceDetailSheet.jsx` | None | `ArrowLeft` or `X` floating over hero | Correct icon behavior but manually implemented |

**Sheets using `Sheet` primitive** inherit the standard handle and close affordance automatically — no divergence possible.

**Recommendation:** For `AvailabilitySheet` and `ContactVerifySheet`, consider adopting the `Sheet` primitive (they are content-sized drawers) and using `hideClose` + rendering their own context-aware back/close header inside `children`. This keeps animation and handle behavior consistent.

---

### 3. Keyboard / focus-trap accessibility

None of the sheets implement a `focus-trap` (no `FocusTrap` component, no `inert` attribute on background content, no `aria-modal`). For modal drawers this is an accessibility gap: keyboard users can Tab past the drawer overlay into background content.

**Severity:** High for production. Low for prototype stage.

**Sheets with form inputs** (the most important to fix first): `CreateAccountSheet`, `MessageSheet`, `ContactVerifySheet`, `EditIdentitySheet`, `LocationSheet`, `KidsSheet`, `AvailabilitySheet` (drag grid has `onPointerDown`, not keyboard-accessible).

**Recommendation:**
1. Add `role="dialog" aria-modal="true" aria-labelledby="<headline-id>"` to the `Sheet` panel div (`Sheet.jsx:37`). This signals to screen readers that background content is inert.
2. For production: install `focus-trap-react` or implement a `useEffect` that traps Tab within the panel and returns focus to the trigger on close.
3. The `AvailabilitySheet` drag grid (`onPointerDown` only) is not keyboard-accessible — add `onKeyDown` handlers for arrow-key navigation.

---

### 4. Three-state loading contract (API-backed sheets)

The three-state contract (loading skeleton → data → warm empty state) is mandatory for any surface backed by `api/*` calls.

| Sheet | Has API call | Loading state | Skeleton | Empty state | Verdict |
|-------|-------------|---------------|----------|-------------|---------|
| `MessageSheet` | Yes (`listMessages`) | `loading: true` local flag | **None** — blank space | "Not available yet" for unavailable mom; no empty-thread state | **Fails** — no skeleton |
| `GroupDiscussionSheet` | Yes (`getGroupConversation`) | None — renders `{convId && <ConversationFeed>}` | **None** — blank while `convId === null` | None | **Fails** |
| `SubjectThreadSheet` | Yes (`getSubjectConversation`) | None — `{convId && <ConversationFeed>}` | **None** | None | **Fails** |
| `MamaHubSheet` — Chat tab | Partial (SEED_CHATS static) | Not applicable (static) | N/A | N/A | Fake data — not real loading |
| `NotificationsSheet` | None (SEED_NOTIFS static) | N/A | N/A | N/A | Fake data — not real loading |
| `MomDetailSheet` | No (props) | N/A | N/A | `if (!mom) return null` | Passes (parent owns) |
| `EventDetailSheet` | No (props) | N/A | N/A | `if (!event) return null` | Passes |
| `PlaceDetailSheet` | No (props) | N/A | N/A | `if (!place) return null` | Passes |
| `ProfileSheet` | No (props) | N/A | N/A | Implicit (parent guards) | Passes |
| `ProfilePhotosSheet` | Yes (`uploadProfilePhoto`) | `busy: true` | None (button copy changes) | "No photos yet" implied | Medium — no upload progress indicator |

**Sheets with `convId`-gated content** (`GroupDiscussionSheet`, `SubjectThreadSheet`):

```jsx
// BEFORE (current): blank while convId is null
{convId && <ConversationFeed conversationId={convId} .../>}

// AFTER: skeleton while loading
{convId
  ? <ConversationFeed conversationId={convId} .../>
  : <ConversationSkeleton/>}
```

`ConversationSkeleton` = 3 message-bubble shapes in `C.skeleton` with `shimmer` animation, mirroring `ConversationFeed`'s visual footprint.

---

### 5. Premium-gate consistency

Premium gates must use `account.isPremium` (threaded from `App.jsx`), never hardcode the free limit or prices, and must not gate the verification flow or the "shared ground" card.

| Pattern | Correct usage | Sheets |
|---------|---------------|--------|
| DM free limit from `freeLimit` prop (not hardcoded) | Yes — `freeLimit = DM_FREE_LIMIT` default at `MessageSheet.jsx:13` | `MessageSheet` |
| Price from `plusPrice` prop | Yes — default 7.99 in `PremiumSheet`, `MessageSheet`, `ProfileSheet` | `PremiumSheet`, `MessageSheet`, `ProfileSheet`, `MomDetailSheet` |
| Trial days from `plusTrialDays` prop | Yes — default 7 across sheets | All premium upsell surfaces |
| "Shared ground" never paywalled | Yes — `ProfileSheet.jsx:63` always renders the coral card | `ProfileSheet`, `MomDetailSheet` |
| Verification gate separate from premium | Yes — `VerifyPromptSheet` is orthogonal; `GroupDiscussionSheet` correctly gates join on Plus, not on verification | All |
| `GroupDiscussionSheet` — join is Plus-only | Groups join is Plus-gated (2026-06-10 product change per file comment) | `GroupDiscussionSheet.jsx:22-26` |

**One inconsistency:** `MomsAdvancedFilterSheet` has `verifiedOnly: true` as the default filter, meaning non-premium moms who open basic filters see verified-only as pre-selected. This is a valid product decision but should be confirmed as intentional (filtering for verified moms is free; advanced filters require Plus).

---

## Priority fix list (ranked by severity)

| Rank | Severity | File + Line | Issue |
|------|----------|-------------|-------|
| 1 | **Critical** | `CreateAccountSheet.jsx:19-20` | Pre-filled "Sana" + real Tampa phone number visible to all users |
| 2 | **Critical** | `ScheduleSheet.jsx:36-37` | San Francisco place names in a Tampa Bay app |
| 3 | **High** | `PlaceDetailSheet.jsx:77` | Bypasses `Sheet` primitive; also `line 305` hardcoded "12 moms" |
| 4 | **High** | `MessageSheet.jsx:101,122` | `minHeight: 540` + no skeleton while messages load |
| 5 | **High** | `EventDetailSheet.jsx:127-129` | RSVP toast fires for all users including verified |
| 6 | **High** | `EventDetailSheet.jsx:113-117` | FALLBACK_INSTRUCTIONS shown as real meetup instructions |
| 7 | **High** | `NotificationsSheet.jsx` | Entirely fake SEED_NOTIFS — no real notification data |
| 8 | **High** | `MamaHubSheet.jsx:28-41` | SEED_CHATS — 4 fake conversations always visible |
| 9 | **High** | `ProfileSheet.jsx` | Duplicate of `MomDetailSheet`; should evaluate retirement |
| 10 | **High** | `CreateAccountSheet.jsx:22` | Terms pre-checked (`agreed: true`) |
| 11 | **Medium** | `GroupDiscussionSheet.jsx, SubjectThreadSheet.jsx` | No skeleton while `convId` resolves |
| 12 | **Medium** | `VerifyPromptSheet.jsx:79` | Shield icon coral instead of sage |
| 13 | **Medium** | `MomDetailSheet.jsx:326-334` | Hardcoded "Buddy Brew · Hyde Park" suggested meetup |
| 14 | **Medium** | All sheets bypassing `Sheet` primitive | Accessibility gap (no `role="dialog" aria-modal`) |
| 15 | **Medium** | `MessageSheet.jsx` | Coral counter text below WCAG AA contrast |
