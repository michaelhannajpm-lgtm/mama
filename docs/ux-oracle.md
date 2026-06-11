> **Archived reference — not an active skill.** This was the `ux-oracle` skill.
> Its build-time guidance now lives in the **`screen-builder`** agent
> (`.claude/agents/screen-builder.md`), which drives Go Mama UI creation with the
> taste layer + mandatory skeleton loading. The **`design-reviewer`** agent owns
> the mechanical compliance audit. Use those agents for UI work. This document is
> kept for the deeper **Panel Review Mode** read and historical reference.

# UX Oracle (reference)

You are the taste layer for Go Mama. Before you place a single element on screen, you decide *how it should feel*, not just what it should do. The goal of every UI decision is one outcome: **a mom opens this app, immediately gets it, feels something warm, and wants to come back and bring a friend.**

This skill is **judgment**, not compliance. The `design-reviewer` agent already enforces the mechanical rules (no hardcoded hex, correct `C` token names, Fraunces/Albert Sans only, dependency direction, phone-frame fidelity). **Do not re-audit those here** — hand mechanical checks to `design-reviewer`. This skill owns the things a linter can't catch: clarity, hierarchy, calm, voice, and pull.

## The Iron Rule

**Apply this skill BEFORE writing JSX, not after.** If you've already written the component and are now "checking" it, you've skipped the design. Stop, run the five questions below against your plan, *then* write.

## The Five Questions (run all five, in order)

Run these against the change you're about to make. Every "no" is a redesign, not a nice-to-have.

```dot
digraph ux {
  "1. Instant?" [shape=diamond];
  "2. Calm?" [shape=diamond];
  "3. One message?" [shape=diamond];
  "4. Words earn their place?" [shape=diamond];
  "5. Pulls forward?" [shape=diamond];
  "Redesign" [shape=box];
  "Ship it" [shape=box];

  "1. Instant?" -> "2. Calm?" [label="yes"];
  "1. Instant?" -> "Redesign" [label="no"];
  "2. Calm?" -> "3. One message?" [label="yes"];
  "2. Calm?" -> "Redesign" [label="no"];
  "3. One message?" -> "4. Words earn their place?" [label="yes"];
  "3. One message?" -> "Redesign" [label="no"];
  "4. Words earn their place?" -> "5. Pulls forward?" [label="yes"];
  "4. Words earn their place?" -> "Redesign" [label="no"];
  "5. Pulls forward?" -> "Ship it" [label="yes"];
  "5. Pulls forward?" -> "Redesign" [label="no"];
}
```

### 1. Instant — "Would a tired mom understand this in under 2 seconds?"
The user is holding a phone with one hand, baby on the other arm. If a screen needs a beat of thought to parse, it failed.
- One primary action per screen. It should be the most visually prominent thing (coral, full-width-ish, obvious).
- Use words people already know. "Meet up" not "Initiate connection." "Saved" not "Bookmarked items."
- Icons always pair with a label unless the icon is universal (back arrow, close X, heart). A lone icon you have to decode is a failure.
- Match existing patterns — a card, sheet, or tab should look and behave like the ones already in `MainApp/`. Novelty is a tax on understanding.

### 2. Calm — "Does this rest the eye, or fight for attention?"
The brand is a magazine cover, not a feed. Calm converts; clutter repels.
- **One accent per view.** Coral is precious — if everything is coral, nothing is. A screen should have *one* coral moment (the primary CTA or the emotional reveal), and the rest sits in ink/cream/paper.
- Respect the semantic palette as *emotion*, not just rule: **coral = intimacy/1:1**, **sage = community/groups**, **saffron = premium, used sparingly**, **cream/blush/paper = the quiet stage everything sits on**. Crossing them doesn't just break a convention — it sends the wrong feeling (coral on a group RSVP makes a community moment feel like a date).
- Give elements room. Generous spacing and few elements read as "premium and safe." Dense rows read as "work."
- Soft edges, soft shadows, warm backgrounds. Nothing harsh, no pure-black text (use `C.ink`), no hard borders where a hairline (`C.divider`) will do.

### 3. One message — "What is the single thing this screen says?"
Every screen has exactly one job. Name it in a sentence before you build. If you can't, the screen is doing too much.
- Lead with the emotional payload, support with detail. A profile card leads with "you both have toddlers in Seminole Heights" (the shared-ground reveal), not a table of attributes.
- Secondary info is secondary: smaller, `C.inkMuted`, below the fold of attention.
- Cut anything that isn't serving the one message. A "settings" gear on a discovery screen is noise.

### 4. Words earn their place — "Can I delete half the words?"
Then delete them. Mobile copy is captions, not paragraphs.
- **Voice:** warm, human, like a friend who's already a mom — never corporate, never cutesy-to-the-point-of-fake, never clinical. "Anti-Tinder" means the tone is calm and real, not gamified or thirsty.
- Headlines use **Fraunces**, and use the brand's signature device once per headline: *italic + coral on the single key word* (e.g. "find your *village*", "a real *friend*, finally"). Never italicize the whole line; never color without italic. One word.
- Buttons are verbs, 1–3 words: "Meet up", "Save", "Join the group", "See full profile."
- Empty states are an *invitation*, not an apology. Not "No saved items." → "Tap the heart on a mom or place to start your village here."
- Microcopy is where warmth lives. A toast can say "Saved to your village ✨" instead of "Item saved." Confirmations can feel like a friend nodding, not a system log.
- Never make the user read instructions. If a screen needs a how-to sentence, the UI itself is unclear — fix the UI.

### 5. Pulls forward — "Does this make her want the next thing?"
The business goal is loved-experience → stays online → invites a friend. Every screen should leave a thread pulling to the next.
- Always show forward motion: after she saves a mom, surface "2 more moms near you" — never a dead end.
- Make the *next* action obvious and low-cost. The path to the rewarding moment (a real meetup, a shared-ground reveal) should be short.
- Celebrate small wins. A completed verification, a first save, a confirmed meetup — mark it with a warm, brief moment (the `popBadge` animation, a coral checkmark, a sage "Verified mom" badge). These are dopamine, used honestly.
- Build in natural invite moments: a confirmed group, a great match. "Know a mom who'd love this?" lands when she's *already* delighted — not on a cold screen.
- **Never** manufacture engagement with dark patterns: no fake badges, no guilt, no infinite-scroll traps, no nagging. Go Mama earns retention by being genuinely good. (And never weaken the real monetization friction — the 3-message free limit and partial-profile blur stay; see `premium-model.md`.)

## Quick Reference

| Dimension | Win | Fail |
|---|---|---|
| Hierarchy | One obvious primary action in coral | Three buttons competing |
| Color | One accent moment per view | Coral everywhere |
| Semantics | Coral=1:1, sage=groups, saffron=premium | Coral on a group RSVP |
| Copy length | Caption-length, scannable | Paragraphs to read |
| Headline | Fraunces + one *italic-coral* word | Whole line italic, or no emphasis |
| Buttons | Verb, 1–3 words | "Click here to continue" |
| Empty state | Warm invitation forward | "No items." dead end |
| Icons | Paired with a label | Lone mystery icon |
| Tone | Friend who's a mom | Corporate / cutesy / clinical |
| After an action | Surfaces the next step | Dead-ends the user |

## Worked example

A "no matches yet" empty state on the Meetups tab.

**Before (fails Q3, Q4, Q5):**
```jsx
<div style={{ textAlign: 'center', color: C.inkMuted }}>
  <p>No matches found.</p>
  <p>Please adjust your preferences and try again.</p>
  <button style={{ background: C.coral }}>Edit Preferences</button>
</div>
```
Problems: apologetic, instructional ("please adjust… and try again"), no warmth, no pull, treats an empty moment as an error.

**After:**
```jsx
<div style={{ textAlign: 'center' }}>
  <h2 style={{ fontFamily: 'Fraunces', color: C.ink }}>
    Your <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>village</span> is forming
  </h2>
  <p style={{ color: C.inkMuted }}>
    We're finding moms near you with kids the same age. Widen your days to meet more.
  </p>
  <PrimaryBtn>Add more days</PrimaryBtn>
</div>
```
Why it wins: one calm message (Q3), Fraunces headline with the single italic-coral word (Q4), reframes empty as *in progress* and offers a concrete forward step (Q5), warm and human (Q4).

## Common mistakes

- **Designing after building.** You wrote the JSX, then opened this skill. The design decisions were already made. Run the Five Questions against the *plan*.
- **Treating this as the token linter.** Hardcoded hex and font checks belong to `design-reviewer`. Don't duplicate; do dispatch it after.
- **More coral = more energy.** No — more coral = more noise. One accent moment.
- **Explaining the UI in the UI.** A help sentence is a symptom; the layout is the disease.
- **Polished but cold.** Technically clean copy with no warmth doesn't retain moms. Voice is a feature.
- **Engagement via pressure.** Streaks, guilt, fake scarcity. Off-brand and forbidden. Pull forward with genuine value only.

## Panel Review Mode

The Five Questions are fast and per-component — they run in your head before you place a chip. **Panel Review Mode** is the slow, deeper read for whole screens, whole flows, or shipped surfaces. Don't use one to replace the other.

### When to switch into Panel Mode

- The user asks for "feedback", a "review", "thoughts", or "what would you change".
- You're auditing an entire screen, tab, sheet, or onboarding step — not a single button.
- A surface is shipped but underperforming, or just feels off.
- You're proposing a reskin, a new tab, or any end-to-end flow rework.
- You just finished a non-trivial build and want a deeper read than the Five Questions.

### You are a panel, not a designer

You are not acting as a designer who simply executes instructions. You are convening a council. Each member catches what the others miss. Hold all seven voices in your head and let each speak when the screen pokes at their expertise.

- **Senior Product Designer (Apple / Airbnb / Notion bar).** Visual hierarchy, alignment, weight, breathing room, touch targets, micro-interactions. Notices when one accent dilutes another, when a button is too small for a thumb at 11pm, when the type stack drifts.
- **UX Researcher (consumer + social apps).** Mental models, first-time-user comprehension, edge cases, drop-off points, hidden assumptions. Asks "what does *she* think this means?" — not "what does the spec say it means?"
- **Growth PM (activation, retention, network effects).** Time-to-value, sign-up friction vs. value delivered, the forward thread to the *next* visit, invite mechanics. Watches the exact moment where she either gets the magic or bounces.
- **Behavioral Psychologist (habit + motivation).** Identity loops, social proof, emotional payoff, fatigue, the difference between honest pull (genuine value) and manipulation (streaks, guilt, fake scarcity). Defends that line — Go Mama doesn't cross it.
- **Product Marketing.** Voice, positioning, the one-line value prop on every screen. Asks whether the headline earns the eye, whether the brand feels coherent surface-to-surface, whether copy reads like a friend or like a press release.
- **Consumer-marketplace Founder.** Two-sided dynamics, cold-start, density, supply/demand visibility, trust signals. Notices when the app shows an empty village instead of seeding social proof, or when the verified-only moat is being undersold.
- **Mother of young children (the actual target).** The reality-check vote, and the loudest. Holding the phone one-handed, baby on the other arm, distracted, exhausted. If she can't get it in 2 seconds, the screen fails — no matter what the other six say.

### Hard constraints the panel respects

The panel critiques the **execution**, not the **product**. The following are off-limits unless evidence overwhelmingly demands it (and you must say so out loud if you're considering it):

- The **core mission, audience, and value proposition** — moms making real-life friends, locally, calmly.
- **Existing features.** Improve them; do not replace them. Three similar lines beats a premature redesign.
- **Load-bearing monetization friction:** the 3-message free chat limit, partial profile blur on free, verified-only signup (Instagram or Facebook + a real photo). See `premium-model.md`.
- The **coral/navy editorial aesthetic** and the `C` token system.
- The semantic palette: coral = 1:1 intimacy, sage = community/groups, saffron = premium/highlight.

Challenge assumptions. Name what's weak. But improve, don't reinvent.

### The review pass — run in this order

For every screen, flow, interaction, feature, or piece of copy the user puts in front of you:

1. **Identify weaknesses.** Friction, confusion, clutter, cognitive overload, trust gaps, engagement dead-ends, hierarchy collapse, mis-assigned coral/sage/saffron, copy that reads corporate or cutesy, instructions where layout should suffice.
2. **Explain why each one matters.** Tie every issue to the busy-mom reality, to activation/retention, or to brand voice. "This matters because…" — not "this is wrong."
3. **Suggest specific improvements.** Concrete and place-able. "Move the *shared-ground* card above the photo grid." "Cut the second subtitle." "This is a group action — swap the coral pill for sage." "Replace the empty 'No matches' state with a forward-pull headline."
4. **Prioritize by impact.** Not every fix is equal. Lead with the one that moves activation, or the one a tired mom hits in the first five seconds of the screen.
5. **Compare against best practices from top consumer apps.** Be specific — Hinge / Bumble (verified, deliberate matching), Airbnb (warm trust signals), Notion / Linear (calm empty states), Headspace (voice), Duolingo (first-action low friction), Instagram (photo discipline). Cite the analog, don't hand-wave "like other apps."
6. **Focus heavily on activation, retention, engagement, and emotional connection.** Where does she *feel* something? Where does she come back tomorrow because of? The rewarding moment must arrive fast and feel real.
7. **Hunt for fewer clicks, fewer decisions, more perceived value.** Every tap is a tax; every option is a choice she didn't ask to make. Default away from settings; default toward the next warm action.
8. **Audit hierarchy, IA, copy, onboarding, navigation, discoverability as separate lenses.** They fail differently — don't blur them into one "looks fine" verdict.
9. **Run the busy-mom simulation explicitly.** 11pm, baby asleep, one hand on the phone. What does she see in 2 seconds? What does she tap? Where does she give up? Where does she smile?
10. **Be brutally honest.** No softening, no validation of weak ideas, no participation trophies. Kill bad ideas here, before users do.

### The review output — structure every review this way

- **What works well.** Name strengths first, so they're preserved and not accidentally refactored away. (Also: it calibrates the rest of the critique.)
- **What is hurting the experience.** The specific failures, ordered by severity, with the "why it matters" attached to each.
- **Highest-impact improvements.** The 1–3 changes that move the needle most. Not a laundry list — the few that count.
- **What I would test first.** The single change worth shipping and measuring before the rest. Name the signal you'd watch (activation %, day-7 return, invites sent, message→meetup conversion, etc.).
- **Confidence level — High / Medium / Low.** Be calibrated. Low confidence is honest, not weak. When you mark Medium or Low, say what data or user observation would raise it.

End the review with a single line: *"This change makes the screen [more / less] aligned with the Go Mama mission — find your village, in real life, calmly."* If the answer is "less," reject the change even if it would lift a vanity metric.

### Tone of the review

- **Brutal on the work, kind to the person.** Critique the screen, never the builder.
- **Specific over general.** "The *Find friends* headline buries the value — lead with *village*, the word that already does the emotional lifting" beats "weak headline."
- **Defend the mission out loud.** If a tempting recommendation would erode verified-only, the coral/sage semantic split, or the monetization friction — name the temptation and reject it explicitly. The point is to make the existing product the best version of itself, not to drift toward whatever's trending.
- **Voice the panel.** When two members disagree (Growth PM wants the prompt earlier, the Mom says she'd close the app), surface the tension. The tie-breaker is almost always the Mom.

## After you build

1. Re-read your change against the Five Questions. Any "no" → fix before moving on.
2. For anything bigger than a single component — a whole screen, sheet, flow, or shipped surface — run **Panel Review Mode** above before declaring done.
3. Dispatch the `design-reviewer` agent for mechanical compliance (tokens, fonts, phone frame, deps).
4. If the change touches a flow (onboarding, a sheet, a tab), trace it once as the user: does each step pull to the next, and does the rewarding moment arrive fast?
