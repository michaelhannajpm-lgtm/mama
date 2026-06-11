// POST /api/push/send — internal push fan-out. Called by the messages-insert
// database trigger (pg_net) with a shared secret, NOT by browsers. Looks up the
// event's recipients, checks each one's notification settings, and delivers a
// Web Push via api/_lib/push-send.js.
//
// Auth: x-push-secret header must equal PUSH_HOOK_SECRET.
// Body: { type: 'message', message_id }   (extensible to other event types)
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { sendToUser, notifyAllowed, pushConfigured } from '../_lib/push-send.js';

const fetchOne = async (creds, path) => {
  const r = await fetch(`${creds.supabaseUrl}/rest/v1/${path}`, { headers: sbHeaders(creds.serviceRoleKey) });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
};
const fetchMany = async (creds, path) => {
  const r = await fetch(`${creds.supabaseUrl}/rest/v1/${path}`, { headers: sbHeaders(creds.serviceRoleKey) });
  if (!r.ok) return [];
  return r.json().catch(() => []);
};

const snippet = (text, max = 120) => {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// Fan a new chat message out to every participant except its author.
const handleMessage = async (creds, messageId) => {
  const message = await fetchOne(creds,
    `messages?id=eq.${messageId}&select=id,conversation_id,author_id,author_name,body,deleted_at`);
  if (!message || message.deleted_at) return { ok: true, skipped: 'no-message' };

  const convo = await fetchOne(creds,
    `conversations?id=eq.${message.conversation_id}&select=id,kind,title`);
  const isGroup = convo?.kind === 'group' || convo?.kind === 'subject';
  const category = isGroup ? 'groups' : 'messages';

  const participants = await fetchMany(creds,
    `conversation_participants?conversation_id=eq.${message.conversation_id}&user_id=neq.${message.author_id}&select=user_id`);
  if (!participants.length) return { ok: true, skipped: 'no-recipients' };

  const title = isGroup
    ? (convo?.title || 'New group message')
    : (message.author_name || 'New message');
  const payload = {
    title,
    body: isGroup && message.author_name
      ? `${message.author_name}: ${snippet(message.body)}`
      : snippet(message.body),
    url: '/prototype',
    tag: `conversation-${message.conversation_id}`,
  };

  let delivered = 0;
  for (const p of participants) {
    const mom = await fetchOne(creds,
      `mom_profiles?auth_user_id=eq.${p.user_id}&select=settings`);
    if (!notifyAllowed(mom?.settings?.notifications, category)) continue;
    const { sent } = await sendToUser(creds, p.user_id, payload);
    delivered += sent;
  }
  return { ok: true, recipients: participants.length, delivered };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.PUSH_HOOK_SECRET;
  if (!secret || req.headers['x-push-secret'] !== secret) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });
  if (!pushConfigured()) return json(res, 200, { ok: true, skipped: 'push-not-configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  try {
    if (body.type === 'message' && body.message_id) {
      return json(res, 200, await handleMessage(creds, body.message_id));
    }
    return json(res, 400, { error: 'Unsupported event type' });
  } catch (e) {
    console.error('push/send threw', e);
    return json(res, 502, { error: e?.message || 'Send failed' });
  }
}
