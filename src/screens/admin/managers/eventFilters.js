// Pure, dependency-free filter helpers for the admin Events manager — kept
// import-free so they run under `node --test` (see eventFilters.test.mjs).

// True when a row was created by the create-event skill (stamped in
// metadata.skill at insert). Drives the "Skill" badge + the Source filter.
export const isSkillCreated = (row) => row?.metadata?.skill === 'create-event';

// Inclusive date-range match for a row timestamp (ISO string) against a filter
// range = { preset, from, to }. preset: 'any' | 'today' | '7d' | '30d' | 'custom'.
// from/to are 'YYYY-MM-DD' strings (custom only). `now` is injectable for tests.
export const dateInRange = (iso, range = {}, now = new Date()) => {
  const preset = range.preset || 'any';
  if (preset === 'any') return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const nowMs = now.getTime();
  if (preset === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  if (preset === '7d') return t >= nowMs - 7 * 86400000;
  if (preset === '30d') return t >= nowMs - 30 * 86400000;
  if (preset === 'custom') {
    if (range.from && t < new Date(`${range.from}T00:00:00`).getTime()) return false;
    if (range.to && t > new Date(`${range.to}T23:59:59.999`).getTime()) return false;
    return true;
  }
  return true;
};

// Source filter: 'any' | 'skill' | 'manual'.
export const matchesSource = (row, source) => {
  if (source === 'skill') return isSkillCreated(row);
  if (source === 'manual') return !isSkillCreated(row);
  return true; // 'any'
};

// Sort comparator factory for the events list. field: 'created' | 'modified';
// dir: 'desc' | 'asc'. Sorts by created_at / updated_at timestamps.
export const eventComparator = (sort = 'created_desc') => {
  const [field, dir] = sort.split('_');
  const key = field === 'modified' ? 'updated_at' : 'created_at';
  const mul = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    const ta = new Date(a?.[key] || 0).getTime();
    const tb = new Date(b?.[key] || 0).getTime();
    return (ta - tb) * mul;
  };
};
