// ============================================================================
// Go Mama · Admin Console shell.
//
// Restructured 2026-06-11 from the single-file AdminPage into a screen folder:
//   admin-theme.js        console design tokens (`AC`)
//   nav.js                section registry (sidebar + router source of truth)
//   lib/adminFetch.js     token auth + fetch helpers
//   lib/adminRouter.js    deep-linkable /admin/<section> URL routing
//   components/           console chrome + primitives
//   sections/            one module per section
//   managers/             relocated Places/Events/… managers
//
// SECURITY: gated by a shared admin password (api/_lib/admin-auth.js). The
// login exchanges it for a signed bearer token; every /api/admin/* route
// enforces it server-side via requireAdmin.
// ============================================================================
import { useEffect, useState } from 'react';
import { RefreshCw, ShieldOff, AlertTriangle } from 'lucide-react';
import { AC } from './admin-theme';
import { NAV_INDEX } from './nav';
import { useAdminRoute } from './lib/adminRouter';
import { useAdminDeepLink } from './lib/adminDeepLink';
import { getAdminToken, clearAdminToken, fetchEndpoint, adminFetch } from './lib/adminFetch';
import { useAdminTheme } from './lib/useAdminTheme';
import { Sidebar } from './components/Sidebar';
import { AdminLogin } from './components/AdminLogin';
import { ThemeToggle } from './components/ThemeToggle';
import { Button, Banner } from './components/primitives';
import { ConfirmProvider } from './components/ConfirmDialog';

// Sections
import { Overview, MomsReport, QuickActions } from './sections/legacy';
import { MomProfilesSection } from './sections/MomProfilesSection';
import { UsersSection } from './sections/UsersSection';
import { DeploymentsSection } from './sections/DeploymentsSection';
import { PlacesManager } from './managers/PlacesManager';
import { EventsManager } from './managers/EventsManager';
import { IngestionManager } from './managers/IngestionManager';
import { SourcesManager } from './managers/SourcesManager';
import { ConfigManager } from './managers/ConfigManager';
import { WeeklyFavoriteManager } from './managers/WeeklyFavoriteManager';

// Sections that read the shared Supabase data load. Others (users, deployments,
// ingestion, config) fetch their own data and render immediately.
const NEEDS_SHARED = new Set(['overview', 'onboarding', 'mom-profiles', 'places', 'events', 'featured', 'sources', 'actions']);

const COLLAPSE_KEY = 'gm_admin_rail_collapsed';

export const AdminApp = () => {
  const { theme, setTheme } = useAdminTheme();
  const [section, navigate, recordRef] = useAdminRoute();
  // URL → record bridge: when /admin/<section>/<ref> carries a ref, drive the
  // existing gm-admin-open-<entity> machinery so the record's modal opens.
  useAdminDeepLink(section, recordRef);
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });

  const [moms, setMoms] = useState(null);
  const [momProfiles, setMomProfiles] = useState(null);
  const [places, setPlaces] = useState(null);
  const [events, setEvents] = useState(null);
  const [sources, setSources] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleCollapse = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });

  const signOut = () => {
    clearAdminToken();
    setAuthed(false);
    setMoms(null); setMomProfiles(null); setPlaces(null); setEvents(null); setSources(null);
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [a, b, c, d, g] = await Promise.all([
        fetchEndpoint('/api/admin/onboarding', 'Onboarding'),
        fetchEndpoint('/api/admin/mom-profiles', 'Mom profiles'),
        fetchEndpoint('/api/admin/places', 'Places'),
        fetchEndpoint('/api/admin/events', 'Events'),
        fetchEndpoint('/api/admin/sources', 'Sources'),
      ]);
      setMoms(a.rows || []);
      setMomProfiles(b.rows || []);
      setPlaces(c.rows || []);
      setEvents(d.rows || []);
      setSources(g.rows || []);
    } catch (e) {
      setError(e?.message || 'Could not load data');
    } finally {
      setLoading(false);
    }
  };

  // A 401 from any admin call drops us back to the login gate.
  useEffect(() => {
    const onUnauth = () => setAuthed(false);
    window.addEventListener('gm-admin-unauthorized', onUnauth);
    return () => window.removeEventListener('gm-admin-unauthorized', onUnauth);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed]);

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  const meta = NAV_INDEX[section] || NAV_INDEX.overview;
  const sharedReady = moms && momProfiles && places && events;
  const sharedPending = NEEDS_SHARED.has(section) && !sharedReady;

  const summary = loading
    ? 'loading…'
    : sharedReady
      ? sectionSummary(section, { moms, momProfiles, places, events, sources })
      : '';

  return (
    <ConfirmProvider>
    <div style={{ display: 'flex', minHeight: '100vh', background: AC.bg, color: AC.text }}>
      <Sidebar current={section} onNavigate={navigate} collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Console header */}
        <header className="sticky top-0 z-10 flex items-center gap-3" style={{
          height: AC.headerHeight, padding: '0 20px', background: AC.surface,
          borderBottom: `1px solid ${AC.border}`,
        }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {meta.icon && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: AC.accentSoft, color: AC.accent,
                }}>
                  <meta.icon size={15} />
                </span>
              )}
              <h1 style={{ fontFamily: AC.font, fontSize: 15, fontWeight: 700, color: AC.text, letterSpacing: '-.01em' }}>
                {meta.label}
              </h1>
              <span style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textFaint }}>{meta.group}</span>
            </div>
            {summary && (
              <div className="truncate" style={{ fontFamily: AC.font, fontSize: 11.5, color: AC.textMuted }}>{summary}</div>
            )}
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}
            icon={(p) => <RefreshCw {...p} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" icon={ShieldOff} onClick={signOut}>Sign out</Button>
        </header>

        {/* Section body — full page width (no max-width cap) so dense tables
            use the entire real estate. */}
        <div style={{ flex: 1, padding: 20, width: '100%' }}>
          {error && (
            <Banner tone="danger" icon={AlertTriangle}>
              <strong>Could not load.</strong> {error}<br />
              <span style={{ color: AC.textSoft }}>
                Check that <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> are set in your Vercel env,
                and that functions are deployed (they don't run under <code>npm run dev</code>; use <code>vercel dev</code>).
              </span>
            </Banner>
          )}

          {sharedPending ? (
            <div className="rounded-2xl text-center" style={{ background: AC.surface, border: `1px solid ${AC.border}`, borderRadius: AC.radius, padding: 40 }}>
              <RefreshCw size={20} className="mx-auto mb-2" style={{ color: AC.textMuted, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <div style={{ fontFamily: AC.font, fontSize: 13, color: AC.textMuted }}>
                {loading ? `Loading ${sectionNoun(section)}…` : `No ${sectionNoun(section)} loaded`}
              </div>
            </div>
          ) : (
            renderSection(section, {
              moms, momProfiles, places, events, sources, load, setMomProfiles, loading,
            })
          )}
        </div>
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
    </ConfirmProvider>
  );
};

// The header subtitle reflects the section you're on — its own data, not a
// global roll-up. Overview and Quick actions stay as the full cross-section
// roll-up since they act on everything.
function sectionSummary(section, { moms, momProfiles, places, events, sources }) {
  const count = (n, singular) => `${n} ${n === 1 ? singular : `${singular}s`}`;
  const all = `${count(moms.length, 'onboarding')} · ${count(momProfiles.length, 'profile')} · ${count(places.length, 'place')} · ${count(events.length, 'event')}`;
  switch (section) {
    case 'onboarding':
      return count(moms.length, 'onboarding');
    case 'mom-profiles':
      return count(momProfiles.length, 'profile');
    case 'places':
      return count(places.length, 'place');
    case 'events':
      return count(events.length, 'event');
    case 'featured':
      return `${count(places.length, 'place')} · ${count(events.length, 'event')}`;
    case 'sources':
      return sources ? count(sources.length, 'source') : '';
    case 'overview':
    case 'actions':
    default:
      return all;
  }
}

// What the current section is loading — drives the loading / empty copy so it
// reads "Loading mom profiles…" rather than a generic "Loading data…".
function sectionNoun(section) {
  switch (section) {
    case 'overview': return 'overview';
    case 'onboarding': return 'onboarding info';
    case 'mom-profiles': return 'mom profiles';
    case 'places': return 'places';
    case 'events': return 'events';
    case 'featured': return 'featured content';
    case 'sources': return 'sources';
    case 'actions': return 'data';
    default: return 'data';
  }
}

function renderSection(section, ctx) {
  const { moms, momProfiles, places, events, sources, load, setMomProfiles, loading } = ctx;
  switch (section) {
    case 'overview':
      return <Overview moms={moms} momProfiles={momProfiles} places={places} events={events} />;
    case 'onboarding':
      return <MomsReport rows={moms} momProfiles={momProfiles} onReload={load} />;
    case 'mom-profiles':
      return <MomProfilesSection
        rows={momProfiles}
        places={places || []}
        onPatch={(u) => setMomProfiles((prev) => prev.map((r) => (r.id === u.id ? u : r)))}
        onReload={load}
        reloading={loading}
      />;
    case 'places':
      return <PlacesManager rows={places || []} adminFetch={adminFetch} onReload={load} />;
    case 'events':
      return <EventsManager rows={events || []} places={places || []} adminFetch={adminFetch} onReload={load} />;
    case 'featured':
      return <WeeklyFavoriteManager adminFetch={adminFetch} places={places || []} events={events || []} onReload={load} />;
    case 'ingestion':
      return <IngestionManager adminFetch={adminFetch} />;
    case 'sources':
      return <SourcesManager rows={sources || []} adminFetch={adminFetch} onReload={load} />;
    case 'config':
      return <ConfigManager adminFetch={adminFetch} />;
    case 'users':
      return <UsersSection />;
    case 'deployments':
      return <DeploymentsSection />;
    case 'actions':
      return <QuickActions onReset={load} momsCount={moms.length} momProfilesCount={momProfiles.length} placesCount={places.length} eventsCount={events.length} />;
    default:
      return <Overview moms={moms} momProfiles={momProfiles} places={places} events={events} />;
  }
}
