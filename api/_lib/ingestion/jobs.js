import { createClient } from '@supabase/supabase-js';

export const makeJobClient = (url, key) => createClient(url, key, { auth: { persistSession: false } });

export const enqueueJob = async (sb, { kind, sourceId, params = {} }) => {
  const { data, error } = await sb.from('ingestion_jobs')
    .insert({ kind, source_id: sourceId, params, status: 'queued' }).select('*').single();
  if (error) throw new Error(`enqueue failed: ${error.message}`);
  return data;
};

// Atomically claim the oldest queued job. The status-guarded update means only
// one concurrent claimer wins (the loser gets an empty array).
export const claimNextJob = async (sb) => {
  const { data: q, error: qErr } = await sb.from('ingestion_jobs')
    .select('id').eq('status', 'queued').order('created_at', { ascending: true }).limit(1);
  if (qErr) throw new Error(`claim query failed: ${qErr.message}`);
  if (!q || !q.length) return null;
  const { data, error } = await sb.from('ingestion_jobs')
    .update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', q[0].id).eq('status', 'queued').select('*');
  if (error) throw new Error(`claim failed: ${error.message}`);
  return (data && data[0]) || null;
};

export const finishJob = async (sb, id, { status, counts, error }) => {
  const { error: e } = await sb.from('ingestion_jobs').update({
    status, counts: counts || {}, error: error || null,
    finished_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (e) throw new Error(`finish job failed: ${e.message}`);
};

export const listJobs = async (sb, { limit = 50 } = {}) => {
  const { data, error } = await sb.from('ingestion_jobs')
    .select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`list jobs failed: ${error.message}`);
  return data || [];
};
