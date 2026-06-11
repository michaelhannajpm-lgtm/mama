// ============================================================================
// Runtime application-config cache.
//
// The app reads admin-editable knobs + JSON lookups from /api/config (backed by
// the app_config table). This module is the single client-side entry point:
//
//   - loadConfig({ force })  fetch-or-cache; re-syncs from the DB on a TTL.
//   - getConfigLookup(key, fallback)  pull a migrated lookup, falling back to
//     the hardcoded src/data/* array when config is missing/unfetched.
//   - invalidateConfig()  drop the cache so the next loadConfig refetches.
//
// Why a cache: an admin editing app_config should reach already-loaded clients
// without a reload. App.jsx re-syncs on an interval (cache.ttlSeconds); this
// module holds the last-known bundle (also mirrored to localStorage) so a
// returning mom's first paint uses real config, and every fetch failure is a
// no-op that returns the last good value instead of throwing.
//
// Lives in lib/ (framework-free) so screens & sheets may import getConfigLookup
// without breaking the one-way data ← lib ← screens dependency rule.
// ============================================================================

const STORAGE_KEY = 'gomama.appConfig.v1';
const DEFAULT_TTL_SECONDS = 300;

// Last-known bundle. `fetchedAt` is epoch-ms of the last successful network read
// (null = never fetched this session). config/lookups/cache mirror /api/config.
let _current = readStorage() || { config: {}, lookups: {}, cache: defaultCachePolicy(), fetchedAt: null };
let _inflight = null; // de-dupes concurrent loadConfig() callers

function defaultCachePolicy() {
  return { expires: true, ttlSeconds: DEFAULT_TTL_SECONDS };
}

// Pure freshness check — exported for unit testing. `expires === false` makes
// the cache sticky (never stale); otherwise it's fresh within the TTL window.
// A null/unknown fetchedAt is never fresh (forces an initial fetch).
export const isCacheFresh = (fetchedAt, now, ttlSeconds, expires) => {
  if (expires === false) return true;
  if (fetchedAt == null) return false;
  const ttlMs = (Number(ttlSeconds) > 0 ? Number(ttlSeconds) : DEFAULT_TTL_SECONDS) * 1000;
  return now - fetchedAt < ttlMs;
};

function readStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      config: parsed.config || {},
      lookups: parsed.lookups || {},
      cache: parsed.cache || defaultCachePolicy(),
      fetchedAt: parsed.fetchedAt ?? null,
    };
  } catch { return null; }
}

function writeStorage(bundle) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch { /* private mode / quota — in-memory cache still works */ }
}

// Normalize a /api/config payload into our bundle shape.
function normalize(body) {
  const cache = body?.cache && typeof body.cache === 'object' ? body.cache : defaultCachePolicy();
  return {
    config: body?.config && typeof body.config === 'object' ? body.config : {},
    lookups: body?.lookups && typeof body.lookups === 'object' ? body.lookups : {},
    cache: {
      expires: cache.expires !== false, // default true
      ttlSeconds: Number(cache.ttlSeconds) > 0 ? Number(cache.ttlSeconds) : DEFAULT_TTL_SECONDS,
    },
    fetchedAt: Date.now(),
  };
}

// Returns the current bundle, fetching from /api/config when the cache is stale
// (or force=true). Never throws: on any failure it returns the last-known
// bundle so callers always get something usable (then their own `?? default`
// fallbacks apply). Concurrent calls share one in-flight request.
export const loadConfig = async ({ force = false } = {}) => {
  const { ttlSeconds, expires } = _current.cache || defaultCachePolicy();
  if (!force && isCacheFresh(_current.fetchedAt, Date.now(), ttlSeconds, expires)) {
    return _current;
  }
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const res = await fetch('/api/config', { headers: { Accept: 'application/json' } });
      if (!res.ok) return _current;
      const body = await res.json();
      _current = normalize(body);
      writeStorage(_current);
      return _current;
    } catch {
      return _current; // offline / API down → keep last good bundle
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
};

// The flat camelCase config map (e.g. { defaultPlacesRadiusMiles: 50 }).
export const getConfigMap = () => _current.config || {};

// A migrated JSON lookup (e.g. 'family_values'), falling back to the hardcoded
// static array when config is absent/unfetched. This is how screens consume
// admin-edited vocabulary while staying safe if /api/config never resolves.
export const getConfigLookup = (key, fallback) => {
  const v = _current.lookups?.[key];
  return v === undefined || v === null ? fallback : v;
};

// Client cache policy currently in effect (drives App.jsx's re-sync interval).
export const getCachePolicy = () => _current.cache || defaultCachePolicy();

// Drop the cache (memory + storage) so the next loadConfig() refetches.
export const invalidateConfig = () => {
  _current = { config: {}, lookups: {}, cache: defaultCachePolicy(), fetchedAt: null };
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
};
