// GET /api/admin/deployments — version history from the Vercel REST API.
// SECURITY: gated by requireAdmin (admin bearer token).
//
// Requires a Vercel access token. Optional scoping to one project / team:
//   VERCEL_TOKEN        — Vercel access token (https://vercel.com/account/tokens)  [required]
//   VERCEL_PROJECT_ID   — limit to one project (id or name)                         [recommended]
//   VERCEL_TEAM_ID      — team/org scope if the project lives under a team          [optional]
//
// When VERCEL_TOKEN is absent, responds 200 with { configured: false } so the
// console can render a friendly setup card instead of an error.
import { json } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';

const short = (sha) => (typeof sha === 'string' ? sha.slice(0, 7) : null);

const toUi = (d) => {
  const meta = d.meta || {};
  return {
    id: d.uid,
    name: d.name || null,
    url: d.url ? `https://${d.url}` : null,
    inspectorUrl: d.inspectorUrl || null,
    state: d.readyState || d.state || 'UNKNOWN',
    target: d.target || (d.meta?.deployHookId ? 'hook' : null),
    createdAt: d.created || d.createdAt || null,
    ready: d.ready || null,
    creator: d.creator?.username || meta.githubCommitAuthorName || null,
    commitSha: short(meta.githubCommitSha),
    commitRef: meta.githubCommitRef || null,
    commitMessage: meta.githubCommitMessage || null,
  };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return json(res, 200, {
      ok: true,
      configured: false,
      hint: 'Set VERCEL_TOKEN (and optionally VERCEL_PROJECT_ID / VERCEL_TEAM_ID) in your Vercel env to enable deployment history.',
    });
  }

  // `since` (epoch ms) scopes the pull to a time window; the client computes it
  // from the selected range (24h / 7d / 30d / all). Status filtering + the
  // hide-old-failures rule happen client-side, so we pull every state here.
  const url = new URL(req.url, 'http://localhost');
  const sinceRaw = url.searchParams.get('since');
  const since = sinceRaw && /^\d+$/.test(sinceRaw) ? sinceRaw : null;

  const params = new URLSearchParams({ limit: '100' });
  if (since) params.set('since', since);
  if (process.env.VERCEL_PROJECT_ID) params.set('projectId', process.env.VERCEL_PROJECT_ID);
  if (process.env.VERCEL_TEAM_ID) params.set('teamId', process.env.VERCEL_TEAM_ID);

  try {
    const r = await fetch(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Vercel ${r.status}: ${text.slice(0, 200)}` });
    }
    const body = await r.json();
    const deployments = (body?.deployments || []).map(toUi);
    return json(res, 200, {
      ok: true,
      configured: true,
      scoped: !!process.env.VERCEL_PROJECT_ID,
      count: deployments.length,
      deployments,
    });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach the Vercel API' });
  }
}
