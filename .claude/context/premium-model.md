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

- **3-message free limit.** Intentional monetization friction. Do not change.
- **Partial profile blur with full reveal in Plus.** Converts well. Do not change.
- **"Shared ground" terracotta card stays free** on every profile — this is the matching signal that drives sign-up *and* upgrade. Don't paywall it.

## Trial behavior

`PremiumSheet`'s `onActivate` flips `account.isPremium = true` and starts a 7-day visual trial timer. (No real billing — prototype only.)
