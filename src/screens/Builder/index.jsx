import { useEffect, useState } from 'react';
import { C } from '../../theme';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { sendPrompt, getSession, subscribeEvents } from '../../lib/builderClient';
import { SessionToolbar } from './SessionToolbar';
import { ChatPane } from './ChatPane';

export function BuilderPage() {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState('continue');
  const [events, setEvents] = useState([]);
  const [session, setSession] = useState(null); // builder_sessions row
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseReady()) { setAuthReady(true); return; }
    supabase.auth.getUser().then(({ data }) => { setAuthUser(data.user || null); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthUser(s?.user || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Subscribe to events when sessionId changes.
  useEffect(() => {
    if (!sessionId) { setEvents([]); setSession(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { session: s, events: hist } = await getSession(sessionId);
        if (cancelled) return;
        setSession(s);
        setEvents(hist);
      } catch (e) { setError(e.message); }
    })();
    const unsub = subscribeEvents(sessionId, (row) => {
      setEvents((prev) => prev.some((p) => p.id === row.id) ? prev : [...prev, row]);
      // Refresh session metadata (status, last_release_tag) on terminal events.
      if (['done','error','tag','deploy'].includes(row.kind)) {
        getSession(sessionId).then(({ session: s }) => setSession(s)).catch(() => {});
      }
    });
    return () => { cancelled = true; unsub(); };
  }, [sessionId]);

  // Reset busy when terminal event lands.
  useEffect(() => {
    const last = events[events.length - 1];
    if (last && (last.kind === 'done' || last.kind === 'error')) setBusy(false);
  }, [events]);

  const handleSend = async (text) => {
    setBusy(true); setError(null);
    try {
      const { session_id } = await sendPrompt({ prompt: text, sessionId, mode });
      if (!sessionId) setSessionId(session_id);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const handleNewSession = () => { setSessionId(null); setEvents([]); setSession(null); setError(null); };

  // ---- Renders ----
  if (!authReady) return <Centered>Loading…</Centered>;
  if (!authUser) return <Centered>Sign in via gomama.app first, then return to /builder.</Centered>;

  const deployUrl = (() => {
    // Last event of kind 'done' or 'deploy' with a url.
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.kind === 'done' && e.payload?.deployUrl) return e.payload.deployUrl;
      if (e.kind === 'deploy' && e.payload?.url) return e.payload.url;
    }
    return null;
  })();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.cream }}>
      <header style={{ padding: '12px 16px', borderBottom: `1px solid ${C.divider}`, background: C.paper }}>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, color: C.ink }}>
          Builder <span style={{ color: C.inkMuted, fontSize: 14, fontFamily: 'Albert Sans, sans-serif' }}>— gomama.app</span>
        </h1>
      </header>
      <SessionToolbar
        mode={mode}
        onModeChange={setMode}
        lastReleaseTag={session?.last_release_tag}
        status={session?.status}
        onNewSession={handleNewSession}
        deployUrl={deployUrl}
      />
      {error && <div style={{ padding: 8, background: '#FBE5E1', color: '#B23A48', fontSize: 13 }}>{error}</div>}
      <ChatPane events={events} onSend={handleSend} busy={busy} />
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Albert Sans, sans-serif', color: C.inkSoft }}>
      <div>{children}</div>
    </div>
  );
}
