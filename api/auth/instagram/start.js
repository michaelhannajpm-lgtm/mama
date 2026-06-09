// GET /api/auth/instagram/start?return=<url>
// Begins the Meta Instagram OAuth flow. Gated on INSTAGRAM_APP_ID — when unset
// it returns a JSON "not configured" message (200, so the client can show it)
// instead of redirecting nowhere.
//
// Setup to make this live:
//   • Create a Meta app with the Instagram product.
//   • Set env: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET.
//   • Add <origin>/api/auth/instagram/callback to the app's Valid OAuth URIs.
export default function handler(req, res) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const ret = typeof req.query?.return === 'string' ? req.query.return : '/';

  if (!appId) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Instagram sign-in is not configured yet' }));
    return;
  }

  const origin = `https://${req.headers.host}`;
  const redirectUri = `${origin}/api/auth/instagram/callback`;
  const state = Buffer.from(JSON.stringify({ ret })).toString('base64url');
  const authUrl =
    'https://www.instagram.com/oauth/authorize' +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&scope=instagram_business_basic' +
    '&response_type=code' +
    `&state=${state}`;

  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  res.end();
}
