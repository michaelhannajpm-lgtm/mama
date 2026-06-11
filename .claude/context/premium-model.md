# Premium model

**Go Mama works fully for free.** A free, verified account can receive matches, schedule 1:1 meetups, RSVP to groups, set availability/preferences, browse all live places and events, bookmark, rate, and chat (up to the free message limit). Plus removes friction and unlocks depth — it never gates the core "find a mom, meet up" loop.

The split is driven by `account.isPremium`. Prices and limits are **admin-configurable** via `app_config` / `/api/config` (see `architecture.md`), with code fallbacks shown below.

| Capability | Free | Plus |
|---|---|---|
| Receive matches / nearby moms | ✓ | ✓ |
| Schedule 1:1 meetups · RSVP to groups · send invites | ✓ | ✓ |
| Set availability + preferences | ✓ | ✓ |
| Browse live places & events, bookmark, rate, "I'm going" | ✓ | ✓ |
| "Shared ground" reveal on every profile | ✓ (always free) | ✓ |
| **Message a match** | First **`dmFreeMessageLimit`** (default **3**) per mom | Unlimited |
| **Profile depth** | Partial — broad kids, limited values/interests, blurred bio | Full bio, all values/interests, exact kid ages, all free slots |
| **Advanced filters** (Connect + Explore) | Basic quick filters | Stage, distance, amenities, and more |
| **Group attendees** | First few + count | All visible + DM them ahead |
| **Met-up history** | Hidden | Visible (social proof / how active a mom is) |

Source of truth for the gates: `src/sheets/PremiumSheet.jsx` (the upsell list), `MessageSheet.jsx` (DM limit), `ProfileSheet.jsx` / `MomDetailSheet.jsx` (profile depth), `ConnectTab.jsx` / `LocalPicksTab.jsx` + the `*AdvancedFilterSheet` sheets (advanced filters), `GroupDiscussionSheet.jsx` (group attendees/DM). Grep `isPremium` to find every gate.

## Verification vs. premium (don't conflate)

The **verification gate** is orthogonal to Plus and applies to everyone: unverified moms are blocked from connect/RSVP/join-group, and verified-only DMs require the *sender* to be verified. This is a safety mechanism, not a paywall — never move a verification gate behind Plus.

## Conversion levers — keep these

- **Free message limit (default 3 per mom).** Tightened from 25 → 3 on 2026-06-08 to drive Plus conversion on engaged chats. The value now comes from `appConfig.dmFreeMessageLimit` (fallback `DM_FREE_LIMIT = 3` in `src/lib/chat-helpers.js`, threaded as `freeLimit` into `MessageSheet`). Don't lower the fallback or raise the live config without product sign-off.
- **Partial profile blur with full reveal in Plus.** Converts well. Do not change.
- **"Shared ground" coral card stays free** on every profile — it's the matching signal that drives both sign-up *and* upgrade. Never paywall it.

## Trial behavior

`PremiumSheet.onActivate` flips `account.isPremium = true` and starts a visual `plusTrialDays`-day trial (`trialEndsAt`, default 7 days). Price defaults to `$7.99/mo` (`plusPriceMonthly`). **There is no real billing** — activation and the trial countdown are prototype-only.
