// Trigger the claude-builder workflow via GitHub API.
// Requires env: GITHUB_TOKEN_BUILDER (fine-grained PAT) + GITHUB_REPO (owner/repo).
const WORKFLOW_FILE = 'claude-builder.yml';

export const dispatchClaudeBuilder = async ({ prompt, sessionId, mode, historyB64 }) => {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN_BUILDER;
  if (!repo || !token) return { ok: false, error: 'GITHUB_REPO or GITHUB_TOKEN_BUILDER missing' };

  const r = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Branch the workflow FILE is read from. The workflow itself
        // checks out release-latest regardless. Override with the
        // BUILDER_WORKFLOW_REF env var while the feature is still on a branch.
        ref: process.env.BUILDER_WORKFLOW_REF || 'master',
        inputs: {
          prompt: prompt.slice(0, 8000),
          session_id: sessionId,
          mode,
          history_b64: historyB64 || '',
        },
      }),
    }
  ).catch((e) => ({ __error: e?.message || 'fetch failed' }));

  if (r && r.__error) return { ok: false, error: r.__error };
  if (r.status === 204) return { ok: true };
  const text = await r.text().catch(() => '');
  return { ok: false, status: r.status, error: text.slice(0, 300) };
};
