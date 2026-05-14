// Find a Vercel deployment by commit SHA. Returns { url, state } or null.
export const findDeployForSha = async (sha) => {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  const u = `https://api.vercel.com/v6/deployments?projectId=${projectId}&meta-githubCommitSha=${sha}&limit=1`;
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!r || !r.ok) return null;
  const data = await r.json().catch(() => ({}));
  const d = data?.deployments?.[0];
  if (!d) return null;
  return { url: `https://${d.url}`, state: d.state, created: d.created };
};
