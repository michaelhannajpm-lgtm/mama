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
