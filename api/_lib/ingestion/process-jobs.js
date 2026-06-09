import { makeJobClient, claimNextJob, finishJob, saveJobProgress } from './jobs.js';
import { runIngestion } from './runIngestion.js';
import { runEventIngestion } from './runEventIngestion.js';

// Work-units processed per invocation (per kind). Keep small enough that one
// slice + DB writes fit comfortably under the serverless time budget.
const SLICE = { places: 10, events: 15 };
const NUMERIC = ['fetched', 'normalized', 'created', 'updated', 'review', 'skipped', 'errors',
  'venuesResolved', 'placesCreatedFromVenues', 'venuesLinked', 'placesScanned'];

const mergeCounts = (a = {}, b = {}) => {
  const o = { ...a };
  for (const k of NUMERIC) o[k] = (a[k] || 0) + (b[k] || 0);
  return o;
};

// The deployment URL for the processor, used to chain fresh invocations.
export const selfProcessUrl = () => {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.PUBLIC_BASE_URL || '');
  return base ? `${base}/api/internal/process-ingestion` : null;
};

// Claim the oldest queued job and process ONE slice of its work list. Accumulates
// counts into the job. If more work remains, re-queues the job (status='queued')
// at the new cursor and returns { continue: true } so the caller can kick a fresh
// invocation (a new time budget). Otherwise finishes the job.
export async function processNextJob(env, { logger = console } = {}) {
  if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env not set');
  const sb = makeJobClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const job = await claimNextJob(sb);
  if (!job) return { idle: true };
  const p = job.params || {};
  const sliceSize = p.sliceSize ?? SLICE[job.kind] ?? 12;
  const offset = job.cursor || 0;
  try {
    const result = job.kind === 'places'
      ? await runIngestion({ sourceId: job.source_id, limit: p.limit ?? 20, dryRun: false, offset, sliceSize, env, logger })
      : await runEventIngestion({
          sourceId: job.source_id, limit: p.limit ?? 50, since: p.since ?? null,
          placeId: p.placeId ?? null, allPlaces: p.allPlaces ?? false, venueLimit: p.venueLimit ?? 100,
          dryRun: false, offset, sliceSize, env, logger,
        });
    const counts = mergeCounts(job.counts, result);
    if (result.hasMore) {
      await saveJobProgress(sb, job.id, { cursor: result.nextOffset, total: result.total, counts, status: 'queued' });
      return { ok: true, jobId: job.id, continue: true, cursor: result.nextOffset, total: result.total, counts };
    }
    const status = (counts.errors || 0) === 0 ? 'succeeded' : ((counts.created || counts.updated) ? 'partial' : 'failed');
    await finishJob(sb, job.id, { status, counts });
    return { ok: true, jobId: job.id, status, counts };
  } catch (e) {
    await finishJob(sb, job.id, { status: 'failed', counts: job.counts || {}, error: e.message });
    return { ok: false, jobId: job.id, error: e.message };
  }
}
