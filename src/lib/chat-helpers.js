// Pure chat logic — no I/O, no supabase. Unit-tested in chat-helpers.test.mjs.

// Canonical, order-independent key for a DM pair. Mirrors the SQL
// get_or_create_dm pairing so client + server agree. null when invalid.
export const dmPairKey = (a, b) => {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}:${b}` : `${b}:${a}`;
};

// 1:1 DM free-tier state. FREE_LIMIT is the protected 3-message lever
// (see CLAUDE.md / premium-model.md — do not change without product sign-off).
export const DM_FREE_LIMIT = 3;

export const dmFreeState = (messages = [], myUserId, isPremium = false) => {
  const used = messages.filter((m) => m.author_id === myUserId).length;
  if (isPremium) return { used, remaining: Infinity, limitReached: false };
  const remaining = Math.max(0, DM_FREE_LIMIT - used);
  return { used, remaining, limitReached: remaining <= 0 };
};

// Group flat message rows into a feed tree: top-level posts (parent_id=null)
// each carrying their comments. Soft-deleted rows are dropped. Posts newest-
// first; comments oldest-first.
export const buildThread = (rows = []) => {
  const live = rows.filter((r) => !r.deleted_at);
  const posts = live.filter((r) => !r.parent_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const byParent = new Map();
  for (const r of live) {
    if (!r.parent_id) continue;
    if (!byParent.has(r.parent_id)) byParent.set(r.parent_id, []);
    byParent.get(r.parent_id).push(r);
  }
  return posts.map((p) => ({
    ...p,
    comments: (byParent.get(p.id) || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }));
};
