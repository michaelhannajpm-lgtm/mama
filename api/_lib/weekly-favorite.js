// Pure helpers for the Weekly Favorite ("Local Favorite This Week"). No I/O.
// The 8-week cooldown is applied by the caller (it decides which place_ids are
// "recent" and passes them as recentIds); this module just scores and picks.

// Monday-start week key. Returns 'YYYY-MM-DD' for the Monday 00:00 of the
// week containing `date`, in the date's local time.
export const weekStart = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();                 // 0=Sun..6=Sat
  const backToMonday = (dow + 6) % 7;      // Sun→6, Mon→0, Tue→1, ...
  d.setDate(d.getDate() - backToMonday);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Quality weighted by review volume. Rating is squared so that a meaningful
// rating gap (e.g. 4.9 vs 4.7) can outweigh a moderate review-count gap —
// high-quality but modestly-reviewed places can still surface.
export const placeScore = (r) =>
  Math.pow(r.rating || 0, 2) * Math.log10((r.review_count || 0) + 1);

// Highest-scoring place whose id is not in recentIds. Deterministic tie-break:
// higher review_count, then lower id (string-safe — ids are uuids in prod).
// Returns null when none are eligible.
export const pickAuto = (rows = [], recentIds = []) => {
  const block = new Set(recentIds);
  const eligible = (rows || []).filter((r) => r && r.id != null && !block.has(r.id));
  if (!eligible.length) return null;
  return eligible.sort((a, b) =>
    (placeScore(b) - placeScore(a)) ||
    ((b.review_count || 0) - (a.review_count || 0)) ||
    String(a.id).localeCompare(String(b.id)),
  )[0];
};
