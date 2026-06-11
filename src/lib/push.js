import { supabase, isSupabaseReady } from './supabase';

// ── Web push opt-in ────────────────────────────────────────────────────────
// requestPushPermission() fires the real browser permission prompt and, when a
// VAPID public key + service worker are available, subscribes the browser and
// stores the subscription server-side. It degrades gracefully: with no VAPID
// key configured (the state until the push-sending work ships), the prompt
// still fires and the caller still persists the opt-in preference — we just
// skip the subscribe step.
//
// Returns { ok, reason } where ok=true means "the user granted permission".
// reason ∈ 'unsupported' | 'denied' | 'default' on the not-ok paths.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const pushSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

const isIOS = () =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.navigator?.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches === true);

// A human hint for why turning notifications on didn't work, tuned to the
// platform — so a stuck "Allow notifications" toggle explains itself instead of
// silently refusing to move.
export const pushBlockedHint = (reason) => {
  if (isIOS() && !isStandalone()) {
    return 'On iPhone, add Go Mama to your Home Screen (Share → Add to Home Screen), then turn this on.';
  }
  if (reason === 'denied') {
    return 'Notifications are blocked — allow them for Go Mama in your browser settings.';
  }
  if (reason === 'unsupported') return "This browser can't show notifications.";
  return "Couldn't turn on notifications — please try again.";
};

export const requestPushPermission = async () => {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); }
    catch { return { ok: false, reason: 'default' }; }
  }
  if (perm !== 'granted') return { ok: false, reason: perm === 'denied' ? 'denied' : 'default' };

  // Best-effort subscription — never blocks the opt-in on this succeeding.
  try { await subscribeToPush(); } catch { /* lights up once VAPID is configured */ }
  return { ok: true };
};

// Register the SW, subscribe via PushManager, and POST the subscription. No-op
// when VAPID isn't configured or the platform lacks service-worker/push.
const subscribeToPush = async () => {
  if (!VAPID_PUBLIC_KEY) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!isSupabaseReady()) return;

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const access_token = (await supabase.auth.getSession()).data?.session?.access_token || null;
  if (!access_token) return;

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token, subscription: subscription.toJSON() }),
  });
};

// Show a notification straight from the page (no server round-trip) — the
// reliable fallback so a "test" always surfaces something when permission is
// granted but no server subscription exists yet.
const showLocalTestNotification = async () => {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = (await navigator.serviceWorker.getRegistration())
      || (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    await reg.showNotification('Go Mama ✦', {
      body: "It's working — this is a test notification.",
      icon: '/gomama-logo.png',
      tag: 'gomama-test',
    });
    return true;
  } catch { return false; }
};

// "Send a test notification" — ensures permission (prompting/subscribing as
// needed), tries a real server push to the user's own devices, and falls back
// to a local notification so the user always sees one. Returns
// { ok, reason?, sent } — ok=false means permission isn't granted.
export const sendTestPush = async () => {
  const perm = await requestPushPermission();
  if (!perm.ok) return { ok: false, reason: perm.reason, sent: 0 };

  let sent = 0;
  try {
    const access_token = isSupabaseReady()
      ? (await supabase.auth.getSession()).data?.session?.access_token || null
      : null;
    if (access_token) {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token }),
      });
      const j = await res.json().catch(() => ({}));
      sent = j.sent || 0;
    }
  } catch { /* fall through to local */ }

  if (sent === 0) await showLocalTestNotification();
  return { ok: true, sent };
};
