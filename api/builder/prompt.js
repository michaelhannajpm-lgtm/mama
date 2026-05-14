// POST /api/builder/prompt
// Body: { session_id?: uuid, mode: 'continue'|'fresh', prompt: string }
import { json, supabaseCreds, sbHeaders, readJsonBody, cleanText, isUuid } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';
import { dispatchClaudeBuilder } from '../_lib/githubDispatch.js';

const MAX_HISTORY_EVENTS = 60; // ~last 20 turns of prompt+commit+file_edit

const buildHistory = async (creds, sessionId) => {
  const url = `${creds.supabaseUrl}/rest/v1/builder_events?session_id=eq.${sessionId}&kind=in.(prompt,commit,file_edit,tag)&order=ts.asc&select=ts,kind,payload&limit=${MAX_HISTORY_EVENTS}`;
  const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
  if (!r.ok) return '';
  const rows = await r.json();
  const lines = rows.map((e) => {
    if (e.kind === 'prompt') return `[user] ${e.payload?.text || ''}`;
    if (e.kind === 'commit') return `[committed] ${e.payload?.sha?.slice(0, 7) || ''} ${e.payload?.message || ''}`;
    if (e.kind === 'tag') return `[tagged] ${e.payload?.tag || ''}`;
    if (e.kind === 'file_edit') return `[edited] ${e.payload?.path || ''}`;
    return '';
  }).filter(Boolean);
  return Buffer.from(lines.join('\n'), 'utf8').toString('base64');
};

const insertEvent = (creds, sessionId, kind, payload) =>
  fetch(`${creds.supabaseUrl}/rest/v1/builder_events`, {
    method: 'POST',
    headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=minimal' },
    body: JSON.stringify({ session_id: sessionId, kind, payload }),
  });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return;

  const body = readJsonBody(req) || {};
  const prompt = cleanText(body.prompt, 8000);
  const mode = body.mode === 'fresh' ? 'fresh' : 'continue';
  let sessionId = body.session_id;

  if (!prompt) return json(res, 400, { error: 'Prompt required' });
  if (sessionId && !isUuid(sessionId)) return json(res, 400, { error: 'Bad session_id' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  // 1) Create session if needed.
  if (!sessionId) {
    const r = await fetch(`${creds.supabaseUrl}/rest/v1/builder_sessions`, {
      method: 'POST',
      headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
      body: JSON.stringify({ created_by_email: user.email, mode }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase session create: ${t.slice(0, 200)}` });
    }
    const rows = await r.json();
    sessionId = rows?.[0]?.id;
  }

  // 2) Insert prompt event.
  await insertEvent(creds, sessionId, 'prompt', { text: prompt, by: user.email, mode });

  // 3) Bundle history (only in continue mode).
  const historyB64 = mode === 'continue' ? await buildHistory(creds, sessionId) : '';

  // 4) Dispatch workflow.
  const result = await dispatchClaudeBuilder({ prompt, sessionId, mode, historyB64 });
  if (!result.ok) {
    await insertEvent(creds, sessionId, 'error', { stage: 'dispatch', detail: result.error || 'unknown' });
    return json(res, 502, { error: 'Dispatch failed', detail: result.error });
  }

  await insertEvent(creds, sessionId, 'status', { stage: 'dispatched' });
  return json(res, 200, { session_id: sessionId, dispatched: true });
}
