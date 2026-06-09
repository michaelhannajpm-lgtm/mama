import { createClient } from '@supabase/supabase-js';
import { SOURCES, EVENT_SOURCES, getSource, getEventSource } from './sources.js';

export const makeSourceClient = (url, key) => createClient(url, key, { auth: { persistSession: false } });

// DB row -> orchestrator-shaped source object (lifts config.* up).
export const dbRowToSource = (row) => {
  if (!row) return null;
  const cfg = row.config || {};
  return {
    id: row.id, name: row.name, type: row.source_type, kind: row.kind,
    city: row.city, county: row.county, enabled: row.enabled,
    cadenceHours: row.cadence_hours, parserVersion: row.parser_version, notes: row.notes,
    bias: cfg.bias || undefined,
    queries: cfg.queries || undefined,
    url: cfg.url || row.url || undefined,
    defaultType: cfg.defaultType || undefined,
    pageId: cfg.pageId || undefined,
    limit: cfg.limit || undefined,
  };
};

// Registry/admin source object -> DB row (packs type-specific into config).
export const sourceToRow = (s, kind) => {
  const config = {};
  if (s.bias) config.bias = s.bias;
  if (s.queries) config.queries = s.queries;
  if (s.url) config.url = s.url;
  if (s.defaultType) config.defaultType = s.defaultType;
  if (s.pageId) config.pageId = s.pageId;
  if (s.limit != null) config.limit = s.limit;
  return {
    id: s.id, name: s.name, source_type: s.type, kind: kind || s.kind || 'places',
    city: s.city || null, county: s.county || null,
    enabled: s.enabled !== false, cadence_hours: s.cadenceHours || 24,
    parser_version: s.parserVersion || 'v1', notes: s.notes || null,
    url: s.url || null, config,
  };
};

const hasUsableConfig = (row) => {
  const c = row.config || {};
  if (row.source_type === 'google_places') return Array.isArray(c.queries) && c.queries.length > 0;
  if (row.source_type === 'ics' || row.source_type === 'json_ld') return !!(c.url || row.url);
  if (row.source_type === 'facebook_graph') return !!c.pageId;
  return true; // place_website / eventbrite need no extra config
};

// Load one source from DB; fall back to the JS registry when absent or when the
// DB row lacks usable config (e.g. a pre-seed denormalized row).
export const loadSource = async (sb, id, { fallback = true } = {}) => {
  if (sb) {
    const { data, error } = await sb.from('ingestion_sources').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`load source failed: ${error.message}`);
    if (data && hasUsableConfig(data)) return dbRowToSource(data);
  }
  if (fallback) return getSource(id) || getEventSource(id) || null;
  return null;
};

// List sources (for admin + the launcher dropdown).
export const loadSources = async (sb, { kind = null, enabledOnly = false } = {}) => {
  let q = sb.from('ingestion_sources').select('*').order('kind', { ascending: true }).order('name', { ascending: true });
  if (kind) q = q.eq('kind', kind);
  if (enabledOnly) q = q.eq('enabled', true);
  const { data, error } = await q;
  if (error) throw new Error(`load sources failed: ${error.message}`);
  return (data || []).map(dbRowToSource);
};

// Ensure a source row exists WITHOUT overwriting admin edits (insert-if-missing).
export const ensureSource = async (sb, source, kind) => {
  const { data, error } = await sb.from('ingestion_sources').select('id').eq('id', source.id).maybeSingle();
  if (error) throw new Error(`ensure source check failed: ${error.message}`);
  if (data) return; // already exists — never clobber
  const { error: insErr } = await sb.from('ingestion_sources').insert(sourceToRow(source, kind));
  if (insErr) throw new Error(`ensure source insert failed: ${insErr.message}`);
};

// One-time seed: force-upsert the JS registry into the DB (initial migration).
export const seedSourcesFromRegistry = async (sb) => {
  const rows = [
    ...SOURCES.map(s => sourceToRow(s, 'places')),
    ...EVENT_SOURCES.map(s => sourceToRow(s, 'events')),
  ];
  const { error } = await sb.from('ingestion_sources').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`seed sources failed: ${error.message}`);
  return rows.length;
};

export const SOURCE_TYPES = ['google_places', 'eventbrite', 'ics', 'json_ld', 'facebook_graph', 'place_website'];

// Returns an error string, or null when valid. `s` is the lifted (orchestrator)
// shape: { id, name, type, kind, city, county, cadenceHours, parserVersion, notes,
// enabled, bias, queries, url, defaultType, pageId }.
export const validateSource = (s) => {
  if (!s || typeof s !== 'object') return 'source object required';
  if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) return 'id must be a lowercase-hyphen slug';
  if (!s.name) return 'name required';
  if (!SOURCE_TYPES.includes(s.type)) return `bad type: ${s.type}`;
  if (s.kind !== 'places' && s.kind !== 'events') return 'kind must be places or events';
  if (s.type === 'google_places') {
    if (!s.bias || s.bias.lat == null || s.bias.lng == null) return 'google_places needs bias { lat, lng, radiusM }';
    if (!Array.isArray(s.queries) || s.queries.length === 0) return 'google_places needs at least one query';
  }
  if ((s.type === 'ics' || s.type === 'json_ld') && !s.url) return `${s.type} needs a url`;
  if (s.type === 'facebook_graph' && !s.pageId) return 'facebook_graph needs a pageId';
  return null;
};

export const createSource = async (sb, s) => {
  const { data: exists } = await sb.from('ingestion_sources').select('id').eq('id', s.id).maybeSingle();
  if (exists) throw new Error(`source ${s.id} already exists`);
  const { error } = await sb.from('ingestion_sources').insert(sourceToRow(s, s.kind));
  if (error) throw new Error(`create source failed: ${error.message}`);
};

export const updateSource = async (sb, id, patch) => {
  const { data: row, error: gErr } = await sb.from('ingestion_sources').select('*').eq('id', id).maybeSingle();
  if (gErr) throw new Error(`load source failed: ${gErr.message}`);
  if (!row) throw new Error(`no source ${id}`);
  const merged = { ...dbRowToSource(row), ...patch, id }; // id is immutable
  const dbRow = sourceToRow(merged, merged.kind);
  delete dbRow.id;
  const { error } = await sb.from('ingestion_sources').update({ ...dbRow, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`update source failed: ${error.message}`);
};

export const setSourceEnabled = async (sb, id, enabled) => {
  const { error } = await sb.from('ingestion_sources').update({ enabled: !!enabled, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`toggle source failed: ${error.message}`);
};

export const deleteSource = async (sb, id) => {
  const { error } = await sb.from('ingestion_sources').delete().eq('id', id);
  if (error) throw new Error(`delete source failed: ${error.message}`);
};
