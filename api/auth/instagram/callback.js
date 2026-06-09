// GET /api/auth/instagram/callback?code=&state=
// Exchanges the Instagram OAuth code for a token, reads the username, and
// redirects back to the app with ?ig=<username> so the client can persist it
// to social_links and recompute verification. Failures redirect back cleanly.
export default async function handler(req, res) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  const { code, state } = req.query || {};

  let ret = '/';
  try { ret = JSON.parse(Buffer.from(String(state || ''), 'base64url').toString()).ret || '/'; } catch { /* keep default */ }

  const bounce = (extra) => {
    const sep = ret.includes('?') ? '&' : '?';
    res.statusCode = 302;
    res.setHeader('Location', extra ? `${ret}${sep}${extra}` : ret);
    res.end();
  };

  if (!appId || !secret || !code) return bounce();

  const origin = `https://${req.headers.host}`;
  const redirectUri = `${origin}/api/auth/instagram/callback`;

  try {
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId, client_secret: secret, grant_type: 'authorization_code',
        redirect_uri: redirectUri, code: String(code),
      }),
    });
    const tok = await tokenRes.json().catch(() => ({}));
    if (!tok.access_token) return bounce('ig_error=token');

    const meRes = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${tok.access_token}`);
    const me = await meRes.json().catch(() => ({}));
    return me.username ? bounce(`ig=${encodeURIComponent(me.username)}`) : bounce('ig_error=username');
  } catch {
    return bounce('ig_error=network');
  }
}
