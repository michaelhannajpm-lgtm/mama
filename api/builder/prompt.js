// POST /api/builder/prompt
// Body: { session_id?: uuid, mode: 'continue'|'fresh', prompt: string }
// - If session_id missing: create a new session.
// - Insert a 'prompt' event for the user message.
// - (Task 8 will append: dispatch the GitHub Action.)
import { json, supabaseCreds, sbHeaders, readJsonBody, cleanText, isUuid } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';

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
  const er = await fetch(`${creds.supabaseUrl}/rest/v1/builder_events`, {
    method: 'POST',
    headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
    body: JSON.stringify({
      session_id: sessionId,
      kind: 'prompt',
      payload: { text: prompt, by: user.email, mode },
    }),
  });
  if (!er.ok) {
    const t = await er.text().catch(() => '');
    return json(res, 502, { error: `Supabase event insert: ${t.slice(0, 200)}` });
  }

  // 3) (Task 8) dispatch workflow with history.
  // For now: just return the session id.
  return json(res, 200, { session_id: sessionId, dispatched: false });
}
