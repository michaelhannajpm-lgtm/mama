# ConversationFeed — `src/components/ConversationFeed.jsx`

- **Props / API:** `conversationId` (string), `author` (`{name, photo}` — the current user's identity snapshot), `myUserId` (string), `placeholder` (string, default `'Share with the group…'`), `flash` (function — toast callback), `readOnly` (boolean, default `false`)
- **Used by:** `src/sheets/GroupDiscussionSheet.jsx`, `src/sheets/SubjectThreadSheet.jsx` (2 call sites)
- **Purpose:** Threaded discussion feed (posts → comments → likes) for group and subject conversations. Fetches posts and reactions from Supabase chat tables via `src/lib/chat.js`. Subscribes to real-time updates. Renders a composer (unless `readOnly`) and a list of posts with inline comments.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Three-state contract — missing loading state | High | `ConversationFeed.jsx:16-21` — `loadInto` is async and populates `rows` on completion, but the initial `rows` state is `[]` (empty array) with no `loading` flag. Between mount and the first `listThread` resolve, the UI renders an empty feed — no skeleton, no spinner. On slow connections this looks like "no posts yet" (an empty state) when it is actually loading. The `empty` state and the `loading` state are visually indistinguishable. | Add `const [loading, setLoading] = useState(true)`. Set `loading = true` before `loadInto`, `false` after. Render `<Skeleton>` placeholders when `loading && rows.length === 0`, and the warm "start the conversation" empty state when `!loading && rows.length === 0`. |
| 2 | Three-state contract — missing empty state | High | `ConversationFeed.jsx:84-122` — when `tree` is empty, nothing renders in the feed area (just the composer if not readOnly). There is no warm empty-state invitation. | Add an empty state: e.g. a soft "Be the first to share something" card with a `HeartHandshake` icon and the warm empty-state styling from `HomeTab` (cream background, coral invite text). |
| 3 | Accessibility — post list | High | `ConversationFeed.jsx:84-122` — posts are rendered as `<div>` elements with no semantic list markup. A screen reader navigating the feed gets a flat sequence of divs. | Wrap posts in `<ul role="feed" aria-label="Discussion posts">` and each post in `<li>`. This matches the ARIA `feed` role (APG) designed for infinite/long-scrolling lists of article-like content. |
| 4 | Accessibility — composer input | High | `ConversationFeed.jsx:62-67` — the composer `<input>` has a dynamic `placeholder` but no `aria-label`. When `replyTo` is set, the placeholder changes to `'Write a reply…'` but screen readers reading a placeholder alone may not announce it in all browsers. | Add `aria-label={replyTo ? 'Write a reply' : placeholder}` to the input. |
| 5 | Accessibility — like button state | Medium | `ConversationFeed.jsx:94-103` — the Heart button changes color and fill when liked (`iLiked(p.id)`), but there is no `aria-pressed` attribute to convey the toggle state to screen readers. A blind user cannot know if they have already liked a post. | Add `aria-pressed={iLiked(p.id)}` to the like `<button>` and update `aria-label` to `iLiked(p.id) ? 'Unlike post' : 'Like post'`. |
| 6 | Accessibility — author avatar | Medium | `ConversationFeed.jsx:88` — `<img src={p.author_photo} alt="">` uses an empty alt. The author name is shown adjacent to the avatar, so the empty alt is acceptable (decorative). Correct as-is. | No change needed. |
| 7 | Accessibility — reply cancel button | Low | `ConversationFeed.jsx:75-79` — the "Replying to a post · cancel" button has no `aria-label`. "cancel" as button text is fine, but the full string "Replying to a post · cancel" as an unlabelled button is awkward. | Change to a `<button aria-label="Cancel reply">Cancel</button>` beside a text label `<span>Replying to a post</span>`. |
| 8 | Styling — hardcoded `'#fff'` | Medium | `ConversationFeed.jsx:69` — `color: '#fff'` on the Send button. `ConversationFeed.jsx:85` — `background: '#fff'` on post cards. `C.paper = '#FFFFFF'` is the token for card surfaces. | Replace `'#fff'` with `C.paper` on line 85. Line 69 is white text on a gradient button — `C.paper` is acceptable but semantically a surface token; a `C.white` alias would be cleaner. |
| 9 | Error handling — partial | Medium | `ConversationFeed.jsx:51-53` — `sendMessage` errors call `flash?.('Could not post')`. `ConversationFeed.jsx:54` — `toggleReaction` errors are silently swallowed (`catch { /* ignore */ }`). Swallowing reaction errors means a mom who double-taps heart on slow connectivity gets no feedback. | Add `flash?.('Could not like post')` to the like catch block. |
| 10 | Performance — refresh on every action | Medium | `ConversationFeed.jsx:23-27` — `refresh()` calls both `listThread` and `listReactions` after every post and like. The real-time `subscribe` also calls `refresh()` on every incoming message/reaction. On an active thread this means multiple parallel fetches. | Use optimistic local state updates for likes (toggle the local `likes` array immediately, then confirm/revert on the API response). For posts, insert the new post locally before the `refresh()`. |
| 11 | Styling — semantic palette | Low | `ConversationFeed.jsx:69` — the Send button uses `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`. This is a group discussion context. Per the semantic palette, community/group interactions should use `C.sage`/`C.sageDark`, not coral (which is 1:1 intimacy). | Change the Send button background to `C.sageDark` (readable sage foreground) for group contexts. The like heart in `C.coralDeep` (line 99) could similarly be reconsidered — hearts are intimate, but liking a group post is community behavior. |

## Recommended improvements

1. Add loading skeleton and warm empty state (three-state contract).
2. Add `role="feed"` list, `aria-label` on composer input, `aria-pressed` on like button.
3. Fix semantic palette: Send button should use sage, not coral, in a group context.
4. Add `flash` for swallowed like errors.
5. Use optimistic updates to reduce full refreshes.

## Implementation notes

```jsx
// Loading state addition:
const [loading, setLoading] = useState(true);

const loadInto = async (setAlive) => {
  const data = await listThread(conversationId);
  const reacts = await listReactions(data.map((r) => r.id));
  if (setAlive()) { setRows(data); setLikes(reacts); setLoading(false); }
};

// In render:
{loading && <Skeleton w="100%" h={60} radius={12} />}
{!loading && tree.length === 0 && <EmptyFeedState />}
```

## Acceptance criteria

- [ ] A `<Skeleton>` appears while the first fetch is in flight.
- [ ] An empty-state invitation renders when `tree.length === 0 && !loading`.
- [ ] Post list uses `<ul role="feed">` / `<li>` markup.
- [ ] Composer `<input>` has `aria-label`.
- [ ] Like button has `aria-pressed` and accessible label.
- [ ] Like errors flash a message rather than being silently swallowed.
- [ ] `npm run build` passes.
