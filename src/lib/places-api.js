// Client for the public places API. Fetches /api/places + /api/categories and
// normalizes into the shapes screens consume (PLACES grouped, TOP_PICKS).
import { loadConfig } from './config-cache.js';

const EMPTY_GROUPS = { fun: [], sports: [], wellness: [], schools: [], childcare: [], extracurricular: [], camps: [], health: [] };

export const normalizePlacesPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return { places: { ...EMPTY_GROUPS }, topPicks: [], flat: [] };
  return {
    places: { ...EMPTY_GROUPS, ...(payload.places || {}) },
    topPicks: Array.isArray(payload.topPicks) ? payload.topPicks : [],
    flat: Array.isArray(payload.flat) ? payload.flat : [],
  };
};

export const fetchPlaces = async () => {
  const res = await fetch('/api/places', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`places ${res.status}`);
  return normalizePlacesPayload(await res.json());
};

export const fetchCategories = async () => {
  const res = await fetch('/api/categories', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`categories ${res.status}`);
  const body = await res.json();
  return Array.isArray(body.rows) ? body.rows : [];
};

// App-level config (e.g. { defaultPlacesRadiusMiles: 50 }). Thin back-compat
// wrapper over the runtime cache (config-cache.js) — returns the flat config
// map, {} on error. New code should prefer loadConfig()/getConfigLookup().
export const fetchConfig = async () => {
  const { config } = await loadConfig();
  return config || {};
};

// Look up a place by slug/id across a grouped PLACES object (live or fallback).
export const findPlaceIn = (grouped, id) => {
  for (const cat of Object.keys(grouped || {})) {
    const hit = (grouped[cat] || []).find(p => p.id === id || p.slug === id);
    if (hit) return { ...hit, category: hit.category || cat };
  }
  return null;
};
