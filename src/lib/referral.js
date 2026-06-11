// Referral helpers — capturing an incoming invite code, remembering the current
// mom's own code, and building shareable invite links. A referral code IS the
// mom's username (unique + immutable), so links look like `<origin>/?ref=jane`.
//
// Two localStorage keys:
//   mama:ref — a code captured from SOMEONE ELSE's invite link, held until the
//              new mom finishes signup (then attributed + cleared).
//   mama:me  — the current mom's OWN username, so any invite button can build
//              her link without prop-drilling the account object everywhere.

const REF_KEY = 'mama:ref';
const ME_KEY = 'mama:me';

// Match the server's username storage form: lowercase, [a-z0-9_], <=30 chars.
const norm = (raw) => String(raw || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

// On app load: pull ?ref=CODE out of the URL, stash it, and clean the address
// bar so the code survives the OAuth round-trip without lingering in history.
export const captureIncomingRef = () => {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ref');
    if (!raw) return;
    const code = norm(raw);
    if (code) localStorage.setItem(REF_KEY, code);
    params.delete('ref');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  } catch { /* ignore */ }
};

// The stashed incoming code (or null). Read by promoteSession to attribute.
export const peekIncomingRef = () => {
  try { return localStorage.getItem(REF_KEY) || null; } catch { return null; }
};

export const clearIncomingRef = () => {
  try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
};

// Remember the current mom's own username so invite buttons can build her link.
export const rememberMyCode = (username) => {
  const code = norm(username);
  try { if (code) localStorage.setItem(ME_KEY, code); } catch { /* ignore */ }
};

export const myCode = () => {
  try { return localStorage.getItem(ME_KEY) || null; } catch { return null; }
};

// Build an invite URL for a given code, falling back to the bare origin when
// there's no code yet (anonymous / seeded demo session).
export const inviteUrl = (code) => {
  const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://gomama.app';
  const c = norm(code);
  return c ? `${origin}/?ref=${encodeURIComponent(c)}` : origin;
};
