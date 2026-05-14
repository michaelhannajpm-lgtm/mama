// Builder client: thin wrappers around the /api/builder/* endpoints + Supabase Realtime subscription.
import { supabase } from './supabase';

const authHeaders = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${session.access_token}` };
};

export const sendPrompt = async ({ prompt, sessionId, mode }) => {
  const headers = { ...(await authHeaders()), 'content-type': 'application/json' };
  const r = await fetch('/api/builder/prompt', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, session_id: sessionId, mode }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
};

export const listSessions = async () => {
  const headers = await authHeaders();
  const r = await fetch('/api/builder/sessions', { headers });
  if (!r.ok) throw new Error('Failed to list sessions');
  return r.json();
};

export const getSession = async (id) => {
  const headers = await authHeaders();
  const r = await fetch(`/api/builder/sessions?id=${encodeURIComponent(id)}`, { headers });
  if (!r.ok) throw new Error('Failed to load session');
  return r.json();
};

// Subscribe to new events for a given session_id via Supabase Realtime.
// Returns an unsubscribe function.
export const subscribeEvents = (sessionId, onEvent) => {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`builder_events:${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'builder_events', filter: `session_id=eq.${sessionId}` },
      (payload) => onEvent(payload.new)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};
