# Coral / navy palette port — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/theme.js` — touches every screen, sheet, component, and admin view via inherited tokens.

## Problem

The current Go Mama web app uses a warm terracotta / sage / saffron palette. A separate GoMama Expo prototype at `C:\projects\GoMama` uses a coral / navy palette with brighter, more saturated primary actions (`#E96B7D → #D6446A` gradient) on a creamier blush background. The user wants the web app's visual system replaced with GoMama's.

## Goals

1. Swap every primary visual token to its GoMama counterpart.
2. Inherit the new palette across ~30 files / ~679 token references without touching them individually.
3. Add new tokens (`coral`, `navy`, `peach`, `lilac`, `blush`) that the new screens reference directly.
4. Preserve semantic discipline — terracotta still means "1:1 intimacy", sage still means "community/groups".

## Non-goals

- Renaming tokens. The token *names* are kept (`terracotta`, `ink`, `sage`) so existing components inherit visually without a rename. Only the *hex values* shift.
- Updating Tailwind config. The codebase already uses inline `style={{ color: C.x }}` rather than Tailwind color classes for design tokens.
- Re-tinting hardcoded gradient strings in a handful of sheets (those still reference the old terracotta hex literally — flagged in `.claude/context/todo.md` if it bothers anyone).

## Token map

| Token | Old hex | New hex | Note |
|---|---|---|---|
| `cream` | `#F6EFE2` | `#FBF5EF` | Page background, slightly cooler |
| `creamSoft` | `#FBF6EC` | `#FCEEEE` | Now blush (warm pink) |
| `paper` | `#FFFEFA` | `#FFFFFF` | Pure white cards |
| `ink` | `#2A1E22` | `#1B2A4E` | Now navy |
| `inkSoft` | `#5C4A4F` | `#3A4A6D` | Navy soft |
| `inkMuted` | `#8C7A7E` | `#7C8499` | Cool muted |
| `terracotta` | `#C8553D` | `#E96B7D` | Coral |
| `terracottaDark` | `#A8412C` | `#D6446A` | Coral deep |
| `sage` | `#7E9678` | `#E2EBD8` | Now a light *background* sage (was foreground sage) |
| `sageDark` | `#5E7A5A` | `#5E7A3B` | Readable sage foreground |
| `saffron` | `#D9A441` | unchanged |  |
| `rose` | `#E8B4A0` | `#FDE2D4` | Now peach |
| `divider` | `#E8DECB` | `#EFE5E0` | Cooler line |

## Added tokens

`coral`, `coralDeep`, `coralSoft`, `navy`, `navySoft`, `blush`, `lilac`, `peach`, `muted`, `line`.

These are used directly by new screens (Landing, AboutYou, VillagePreview, FavoritesTab) where the GoMama design references the bare GoMama names.

## Decision: value-only remap

Two options were considered:

1. **Rename every token** (terracotta → coral) across all 30 files. Cleaner names but ~679 edits and high risk.
2. **Remap hex values, keep names.** The visual shift is identical; semantic meaning ("primary accent") is preserved; no diff outside `theme.js`. **Chosen.**

## Risks

- **Sage flip.** Old `sage` was a darker foreground tone (`#7E9678`). New `sage` is a light *background* tone (`#E2EBD8`); code that drew text in `C.sage` becomes unreadable. Mitigation: anywhere sage is used as a text color, switch to `sageDark`. Audited at port time.
- **`paper` flatness.** Going from `#FFFEFA` to `#FFFFFF` makes cards slightly more sterile. Acceptable trade for GoMama fidelity.

## Testing

- Vite HMR clean across every screen after the swap.
- Admin dashboard inherits the new palette automatically (uses the same tokens).
- The waitlist marketing page at `/` has its own CSS file (`waitlist.css`) and is unaffected.
