# Premium model

| Feature | Free | Plus ($7.99/mo) |
|---|---|---|
| Receive matches | ✓ | ✓ |
| Schedule 1:1 meetups | ✓ | ✓ |
| RSVP to groups | ✓ | ✓ |
| Set availability + preferences | ✓ | ✓ |
| Message a match | **25 messages per mom** | Unlimited |
| Profile depth | Partial: name + initial, broad kids, 2 values, 2 interests, shared-ground highlighted | Full: bio, all values/interests, exact kid ages, all free slots, met-up history |
| Group attendees | First 3 visible + count | All visible + DM access |
| Group chat | Read | Read + post |

## Conversion levers — keep these

- **25-message free limit.** Softened from 10 on 2026-06-01 as part of the GoMama port (see `docs/superpowers/specs/2026-06-01-premium-message-limit-softening-design.md`). Still tight enough to drive conversion on engaged chats; gating mechanism unchanged. Don't raise further without product sign-off.
- **Partial profile blur with full reveal in Plus.** Converts well. Do not change.
- **"Shared ground" coral card stays free** on every profile — this is the matching signal that drives sign-up *and* upgrade. Don't paywall it.

## Trial behavior

`PremiumSheet`'s `onActivate` flips `account.isPremium = true` and starts a 7-day visual trial timer. (No real billing — prototype only.)
