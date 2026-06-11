// ============================================================================
// Deployments — version history from the Vercel REST API via
// /api/admin/deployments. Click a row to open that deployment; the commit row
// links to the build inspector. Degrades to a setup card until VERCEL_TOKEN is
// configured. Console design system (`AC` + primitives).
// ============================================================================
import { useEffect, useState } from 'react';
import { Rocket, AlertTriangle, ExternalLink, GitBranch, Terminal } from 'lucide-react';
import { AC } from '../admin-theme';
import { fetchEndpoint } from '../lib/adminFetch';
import { PageHeader, Card, Badge, Banner, Button, EmptyState, rel } from '../components/primitives';

const STATE_TONE = {
  READY: 'success', BUILDING: 'info', QUEUED: 'info', INITIALIZING: 'info',
  ERROR: 'danger', CANCELED: 'neutral', UNKNOWN: 'neutral',
};

export const DeploymentsSection = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setData(await fetchEndpoint('/api/admin/deployments', 'Deployments'));
    } catch (e) {
      setError(e?.message || 'Could not load deployments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deployments = data?.deployments || [];

  return (
    <div>
      <PageHeader
        title="Deployments"
        subtitle="Version history from Vercel. Click a version to open it; the commit opens the build inspector."
        actions={<Button size="sm" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</Button>}
      />

      {error && <Banner tone="danger" icon={AlertTriangle}>{error}</Banner>}

      {loading && !data ? (
        <Card><div className="text-center" style={{ padding: 30, fontFamily: AC.font, fontSize: 13, color: AC.textMuted }}>Loading deployments…</div></Card>
      ) : data && data.configured === false ? (
        <EmptyState
          icon={Rocket}
          title="Connect Vercel"
          body={(
            <>
              Add a <code style={{ fontFamily: AC.mono }}>VERCEL_TOKEN</code> (and optionally{' '}
              <code style={{ fontFamily: AC.mono }}>VERCEL_PROJECT_ID</code> /{' '}
              <code style={{ fontFamily: AC.mono }}>VERCEL_TEAM_ID</code>) to your Vercel env to see version history here.
            </>
          )}
          action={(
            <Button variant="primary" icon={ExternalLink}
              onClick={() => window.open('https://vercel.com/account/tokens', '_blank', 'noopener')}>
              Create a token
            </Button>
          )}
        />
      ) : deployments.length === 0 ? (
        <EmptyState icon={Rocket} title="No deployments found" body="Nothing returned for this project scope yet." />
      ) : (
        <Card padding={0}>
          {deployments.map((d, i) => (
            <div key={d.id} className="flex items-center gap-3"
              style={{ padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${AC.divider}` }}>
              {/* State + target */}
              <div style={{ width: 96, flexShrink: 0 }}>
                <Badge tone={STATE_TONE[d.state] || 'neutral'} dot>{(d.state || '').toLowerCase() || 'unknown'}</Badge>
                {d.target && (
                  <div className="mt-1 uppercase" style={{ fontFamily: AC.font, fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', color: d.target === 'production' ? AC.accent : AC.textMuted }}>
                    {d.target}
                  </div>
                )}
              </div>

              {/* Commit / link */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => d.url && window.open(d.url, '_blank', 'noopener')}
                  disabled={!d.url}
                  className="flex items-center gap-1.5 text-left"
                  style={{ background: 'transparent', cursor: d.url ? 'pointer' : 'default', maxWidth: '100%' }}>
                  <span className="truncate" style={{ fontFamily: AC.font, fontSize: 13.5, fontWeight: 600, color: AC.text }}>
                    {d.commitMessage || d.url?.replace(/^https?:\/\//, '') || d.id}
                  </span>
                  {d.url && <ExternalLink size={12} style={{ color: AC.textMuted, flexShrink: 0 }} />}
                </button>
                <div className="flex items-center gap-2.5 mt-1 flex-wrap" style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textMuted }}>
                  {d.commitRef && (
                    <span className="flex items-center gap-1"><GitBranch size={11} /> {d.commitRef}</span>
                  )}
                  {d.commitSha && (
                    <span style={{ fontFamily: AC.mono }}>{d.commitSha}</span>
                  )}
                  {d.creator && <span>{d.creator}</span>}
                  {d.inspectorUrl && (
                    <button onClick={() => window.open(d.inspectorUrl, '_blank', 'noopener')}
                      className="flex items-center gap-1" style={{ background: 'transparent', color: AC.info, cursor: 'pointer' }}>
                      <Terminal size={11} /> inspect
                    </button>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="tabular-nums shrink-0" style={{ fontFamily: AC.mono, fontSize: 11.5, color: AC.textMuted, textAlign: 'right' }}>
                {rel(d.createdAt)}
              </div>
            </div>
          ))}
        </Card>
      )}

      {data?.configured && !data?.scoped && deployments.length > 0 && (
        <div className="mt-2" style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textMuted }}>
          Showing all deployments visible to the token. Set <code style={{ fontFamily: AC.mono }}>VERCEL_PROJECT_ID</code> to scope to this project.
        </div>
      )}
    </div>
  );
};
