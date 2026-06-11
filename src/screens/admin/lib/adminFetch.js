// ============================================================================
// Admin auth + fetch. The shared admin password is exchanged once (via
// /api/admin/login) for an HMAC-signed bearer token; only the token is stored
// and sent. A 401 from any call clears the token and signals the shell to fall
// back to the login gate via the `gm-admin-unauthorized` window event.
// (Lifted verbatim from the original AdminPage so behaviour is unchanged.)
// ============================================================================

const TOKEN_KEY = 'gm_admin_token';

export const getAdminToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setAdminToken = (t) => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
};
export const clearAdminToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

// fetch wrapper that attaches the bearer token and, on a 401, drops the token
// and signals the dashboard to fall back to login.
export const adminFetch = async (path, options = {}) => {
  const token = getAdminToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearAdminToken();
    window.dispatchEvent(new Event('gm-admin-unauthorized'));
  }
  return res;
};

// Fetch + parse one admin endpoint. Detects the `npm run dev` case where Vite
// serves the raw .js source instead of running the Vercel function, and
// surfaces a clear hint instead of JSON-parse noise.
export const fetchEndpoint = async (path, label) => {
  let res;
  try {
    res = await adminFetch(path);
  } catch (e) {
    throw new Error(`${label}: network error — ${e?.message || 'unreachable'}`);
  }
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      const j = JSON.parse(text);
      if (res.status >= 400) throw new Error(`${label} ${res.status}: ${j?.error || 'unknown'}`);
      return j;
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error(`${label}: response was not valid JSON`);
      throw e;
    }
  }
  if (text.trimStart().startsWith('//') || text.includes('export default async function')) {
    throw new Error("API routes don't run under `npm run dev`. Use `vercel dev` to serve them locally, or visit the deployed URL.");
  }
  throw new Error(`${label} ${res.status}: unexpected response (${ct || 'no content-type'})`);
};
