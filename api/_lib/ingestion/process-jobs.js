import { makeJobClient, claimNextJob, finishJob } from './jobs.js';
import { runIngestion } from './runIngestion.js';
import { runEventIngestion } from './runEventIngestion.js';

// Claim and run ONE queued job to completion (bounded by the source's own
// limit). Returns { idle } when the queue is empty. Each call runs within one
// serverless invocation's time budget; size jobs accordingly.
export async function processNextJob(env, { logger = console } = {}) {
  if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env not set');
  const sb = makeJobClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const job = await claimNextJob(sb);
  if (!job) return { idle: true };
  const p = job.params || {};
  try {
    const counts = job.kind === 'places'
      ? await runIngestion({ sourceId: job.source_id, limit: p.limit ?? 20, dryRun: false, env, logger })
      : await runEventIngestion({
          sourceId: job.source_id, limit: p.limit ?? 50, since: p.since ?? null,
          placeId: p.placeId ?? null, allPlaces: p.allPlaces ?? false, venueLimit: p.venueLimit ?? 100,
          dryRun: false, env, logger,
        });
    const status = (counts.errors || 0) === 0 ? 'succeeded' : ((counts.created || counts.updated) ? 'partial' : 'failed');
    await finishJob(sb, job.id, { status, counts });
    return { ok: true, jobId: job.id, status, counts };
  } catch (e) {
    await finishJob(sb, job.id, { status: 'failed', counts: {}, error: e.message });
    return { ok: false, jobId: job.id, error: e.message };
  }
}
