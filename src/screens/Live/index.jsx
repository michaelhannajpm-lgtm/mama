import { useEffect, useState } from 'react';
import { C } from '../../theme';
import { supabase, isSupabaseReady } from '../../lib/supabase';

export function LivePage() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseReady()) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch('/api/live/versions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        const data = await r.json();
        setVersions(data.versions || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [authed]);

  if (!authReady) return <Centered>Loading…</Centered>;
  if (!authed) return <Centered>Sign in via gomama.app first.</Centered>;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: 24, fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', color: C.ink, marginBottom: 4 }}>Live versions</h1>
        <p style={{ color: C.inkSoft, marginTop: 0 }}>Pick a release to open its preview in a new tab.</p>
        {loading && <div style={{ color: C.inkMuted }}>Loading versions…</div>}
        {error && <div style={{ color: '#B23A48' }}>{error}</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {versions.map((v) => (
            <li key={v.tag} style={{
              padding: 12, marginBottom: 8, background: C.paper,
              border: `1px solid ${C.divider}`, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: C.ink }}>{v.tag}</div>
                <div style={{ color: C.inkMuted, fontSize: 12 }}>sha {v.sha?.slice(0, 7)} · {v.state}</div>
              </div>
              {v.deployUrl ? (
                <a href={v.deployUrl} target="_blank" rel="noreferrer"
                   style={{ background: C.terracotta, color: 'white', padding: '6px 12px', borderRadius: 4, textDecoration: 'none' }}>
                  Open ↗
                </a>
              ) : (
                <span style={{ color: C.inkMuted, fontSize: 12 }}>no deploy</span>
              )}
            </li>
          ))}
          {!loading && versions.length === 0 && (
            <li style={{ color: C.inkMuted }}>No release-N tags yet. Send a prompt at /builder to create one.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: C.inkSoft }}>{children}</div>;
}
