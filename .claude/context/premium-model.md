# Premium model

| Feature | Free | Plus ($7.99/mo) |
|---|---|---|
| Receive matches | ✓ | ✓ |
| Schedule 1:1 meetups | ✓ | ✓ |
| RSVP to groups | ✓ | ✓ |
| Set availability + preferences | ✓ | ✓ |
| Message a match | **3 messages per mom** | Unlimited |
| Profile depth | Partial: name + initial, broad kids, 2 values, 2 interests, shared-ground highlighted | Full: bio, all values/interests, exact kid ages, all free slots, met-up history |
| Group attendees | First 3 visible + count | All visible + DM access |
| Group chat | Read | Read + post |

## Conversion levers — keep these

- **3-message free limit.** Tightened from 25 → 3 on 2026-06-08 per product owner directive — drives Plus conversion harder on engaged chats. Gating mechanism unchanged. `FREE_LIMIT` lives in `src/sheets/MessageSheet.jsx`; don't raise without product sign-off.
- **Partial profile blur with full reveal in Plus.** Converts well. Do not change.
- **"Shared ground" coral card stays free** on every profile — this is the matching signal that drives sign-up *and* upgrade. Don't paywall it.

## Trial behavior

`PremiumSheet`'s `onActivate` flips `account.isPremium = true` and starts a 7-day visual trial timer. (No real billing — prototype only.)
