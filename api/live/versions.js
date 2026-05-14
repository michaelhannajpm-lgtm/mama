// GET /api/live/versions
// Lists release-* tags newest-first, joined with their Vercel deployment URLs.
// Cached 30s in memory per Vercel function instance.
import { json } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';
import { findDeployForSha } from '../_lib/vercelDeployments.js';

let CACHE = { ts: 0, data: null };
const TTL_MS = 30_000;

const listReleaseTags = async () => {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN_BUILDER;
  if (!repo || !token) return [];
  // List all matching refs (lightweight). Up to 100 newest tags.
  const r = await fetch(`https://api.github.com/repos/${repo}/git/matching-refs/tags/release-`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  }).catch(() => null);
  if (!r || !r.ok) return [];
  const refs = await r.json().catch(() => []);
  // refs: [{ ref: 'refs/tags/release-3', object: { sha } }, ...]
  // Sort by numeric suffix desc.
  return refs
    .map((x) => ({
      tag: x.ref.replace('refs/tags/', ''),
      n: Number(x.ref.replace('refs/tags/release-', '')) || 0,
      sha: x.object?.sha,
    }))
    .filter((x) => Number.isFinite(x.n) && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 50);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return;

  if (CACHE.data && Date.now() - CACHE.ts < TTL_MS) {
    return json(res, 200, CACHE.data);
  }

  const tags = await listReleaseTags();
  // Resolve deploy URLs in parallel.
  const enriched = await Promise.all(tags.map(async (t) => {
    const deploy = await findDeployForSha(t.sha);
    return { ...t, deployUrl: deploy?.url || null, state: deploy?.state || 'UNKNOWN' };
  }));
  const data = { versions: enriched };
  CACHE = { ts: Date.now(), data };
  return json(res, 200, data);
}
