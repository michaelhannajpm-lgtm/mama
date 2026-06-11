// ============================================================================
// Deployments — version history from the Vercel REST API via
// /api/admin/deployments. Click a row to open that deployment; the commit row
// links to the build inspector. Degrades to a setup card until VERCEL_TOKEN is
// configured. Console design system (`AC` + primitives).
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { Rocket, AlertTriangle, ExternalLink, GitBranch, Terminal } from 'lucide-react';
import { AC } from '../admin-theme';
import { fetchEndpoint } from '../lib/adminFetch';
import { PageHeader, Card, Badge, Banner, Button, EmptyState, Toolbar, Select, rel } from '../components/primitives';

const STATE_TONE = {
  READY: 'success', BUILDING: 'info', QUEUED: 'info', INITIALIZING: 'info',
  ERROR: 'danger', CANCELED: 'neutral', UNKNOWN: 'neutral',
};

// Time window → milliseconds back from now (null = all time).
const WINDOWS = { '24h': 864e5, '7d': 6048e5, '30d': 2592e6, all: null };
const WINDOW_OPTS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

// Status filter. `default` = smart hide of old failures; `all` = everything;
// any concrete state = show only that state.
const STATUS_OPTS = [
  { value: 'default', label: 'Default (hide old failures)' },
  { value: 'all', label: 'All deployments' },
  { value: 'READY', label: 'Ready' },
  { value: 'ERROR', label: 'Error' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'QUEUED', label: 'Queued' },
];

const isError = (d) => (d.state || 'UNKNOWN') === 'ERROR';

// Apply the status filter to the (newest-first) deployment list.
// Default mode: keep the leading run of errors at the top until the first
// successful (READY) deploy, then hide every ERROR after it — surfacing a live
// breakage while suppressing stale failures. Other modes are literal filters.
function applyStatus(list, status) {
  if (status === 'all') return { visible: list, hiddenFailures: 0 };
  if (status !== 'default') {
    return { visible: list.filter((d) => (d.state || 'UNKNOWN') === status), hiddenFailures: 0 };
  }
  const firstSuccess = list.findIndex((d) => (d.state || 'UNKNOWN') === 'READY');
  const cut = firstSuccess === -1 ? Infinity : firstSuccess;
  let hiddenFailures = 0;
  const visible = list.filter((d, i) => {
    if (!isError(d) || i < cut) return true;
    hiddenFailures += 1;
    return false;
  });
  return { visible, hiddenFailures };
}

export const DeploymentsSection = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowSel, setWindowSel] = useState('7d');
  const [status, setStatus] = useState('default');

  const load = async (win = windowSel) => {
    setLoading(true); setError(null);
    try {
      const ms = WINDOWS[win];
      const qs = ms == null ? '' : `?since=${Date.now() - ms}`;
      setData(await fetchEndpoint(`/api/admin/deployments${qs}`, 'Deployments'));
    } catch (e) {
      setError(e?.message || 'Could not load deployments');
    } finally {
      setLoading(false);
    }
  };

  // Refetch whenever the time window changes; status filtering is client-side.
  useEffect(() => { load(windowSel); }, [windowSel]);

  const all = data?.deployments || [];
  const { visible: deployments, hiddenFailures } = useMemo(
    () => applyStatus(all, status),
    [all, status],
  );

  const configured = data?.configured !== false;

  return (
    <div>
      <PageHeader
        title="Deployments"
        subtitle="Version history from Vercel. Click a version to open it; the commit opens the build inspector."
        actions={<Button size="sm" onClick={() => load(windowSel)} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</Button>}
      />

      {configured && (
        <Toolbar>
          <Select
            options={STATUS_OPTS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          />
          <Select
            options={WINDOW_OPTS}
            value={windowSel}
            onChange={(e) => setWindowSel(e.target.value)}
            disabled={loading}
            aria-label="Time range"
          />
          {data && (
            <span style={{ fontFamily: AC.font, fontSize: 12, color: AC.textMuted }}>
              {deployments.length} of {all.length}
            </span>
          )}
        </Toolbar>
      )}

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
        all.length > 0 ? (
          <EmptyState
            icon={Rocket}
            title="No deployments match this filter"
            body={`None of the ${all.length} deployment${all.length === 1 ? '' : 's'} in this range match the “${STATUS_OPTS.find((o) => o.value === status)?.label}” filter.`}
            action={<Button onClick={() => setStatus('all')}>Show all deployments</Button>}
          />
        ) : (
          <EmptyState icon={Rocket} title="No deployments found" body="Nothing returned for this project scope in this time range." />
        )
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

      {status === 'default' && hiddenFailures > 0 && (
        <div className="mt-2" style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textMuted }}>
          {hiddenFailures} older failed deployment{hiddenFailures === 1 ? '' : 's'} hidden ·{' '}
          <button onClick={() => setStatus('all')}
            style={{ background: 'transparent', color: AC.info, cursor: 'pointer', fontWeight: 600 }}>
            Show all
          </button>
        </div>
      )}

      {data?.configured && !data?.scoped && all.length > 0 && (
        <div className="mt-2" style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textMuted }}>
          Showing all deployments visible to the token. Set <code style={{ fontFamily: AC.mono }}>VERCEL_PROJECT_ID</code> to scope to this project.
        </div>
      )}
    </div>
  );
};
