// Pure chat logic — no I/O, no supabase. Unit-tested in chat-helpers.test.mjs.

// Canonical, order-independent key for a DM pair. Mirrors the SQL
// get_or_create_dm pairing so client + server agree. null when invalid.
export const dmPairKey = (a, b) => {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}:${b}` : `${b}:${a}`;
};
