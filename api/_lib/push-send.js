// Server-side Web Push sender. Wraps the `web-push` library with our VAPID
// credentials and the push_subscriptions table. Used by api/push/send.js.
//
// Env: VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or URL).
// Degrades to a no-op when the keypair isn't configured.
import webpush from 'web-push';
import { sbHeaders } from './supabase.js';

let configured = null;
const ensureConfigured = () => {
  if (configured !== null) return configured;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@gomama.app';
  if (!publicKey || !privateKey) { configured = false; return false; }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
};

// Is push delivery wired up? (false when VAPID env is missing.)
export const pushConfigured = () => ensureConfigured();

// Master + per-category gate. `settings` is mom_profiles.settings.notifications.
// Master must be explicitly on; an unset category defaults to on.
export const notifyAllowed = (notifSettings, category) => {
  const n = notifSettings || {};
  if (n.enabled !== true) return false;
  if (category && n[category] === false) return false;
  return true;
};

// Load a user's push subscriptions.
const fetchSubscriptions = async (creds, authUserId) => {
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/push_subscriptions?auth_user_id=eq.${authUserId}&select=endpoint,p256dh,auth`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  if (!r.ok) return [];
  return r.json().catch(() => []);
};

// Delete a subscription whose endpoint the push service has retired (404/410).
const pruneSubscription = async (creds, endpoint) => {
  try {
    await fetch(
      `${creds.supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      { method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }) },
    );
  } catch { /* best-effort */ }
};

// Send `payload` (a plain object) to every subscription a user has. Returns
// { sent, pruned, skipped }. Never throws — push delivery is best-effort.
export const sendToUser = async (creds, authUserId, payload) => {
  if (!ensureConfigured() || !authUserId) return { sent: 0, pruned: 0, skipped: true };
  const subs = await fetchSubscriptions(creds, authUserId);
  const body = JSON.stringify(payload);
  let sent = 0, pruned = 0;
  await Promise.all(subs.map(async (s) => {
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(subscription, body);
      sent += 1;
    } catch (err) {
      // 404/410 = the browser unsubscribed or the endpoint expired → prune.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await pruneSubscription(creds, s.endpoint);
        pruned += 1;
      } else {
        console.error('push send failed', err?.statusCode, err?.body || err?.message);
      }
    }
  }));
  return { sent, pruned, skipped: false };
};
