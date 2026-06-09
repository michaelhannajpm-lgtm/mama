// Client API for the nearby-moms discovery endpoint. Mirrors lib/seeded-moms.js.
export const fetchNearbyMoms = async (user, { limit = 24, verifiedOnly = true } = {}) => {
  const res = await fetch('/api/mom-profiles/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, limit, verifiedOnly }),
  });
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.error || `Could not load nearby moms (${res.status})`);
  return {
    moms: Array.isArray(body.moms) ? body.moms : [],
    total: Number.isFinite(body.total) ? body.total : 0,
  };
};
