// POST /api/admin/otp/start — request an email login code.
//
// Body: { email }
// Always responds 200 { ok: true } (no admin enumeration). If the email is on
// the allowlist, Supabase Auth emails a 6-digit code (the same email-OTP path
// the phone app uses) — so there's no separate mail provider or code store.
// Supabase owns delivery, the code, its expiry, and resend rate-limiting.
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../../_lib/supabase.js';
import { findAdmin } from '../../_lib/admin-auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds || !process.env.ADMIN_SESSION_SECRET) {
    return json(res, 503, { error: 'Admin auth not configured' });
  }

  const body = readJsonBody(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  // Generic response regardless of outcome — never reveal who is an admin.
  const generic = () => json(res, 200, { ok: true });
  if (!email || !email.includes('@')) return generic();

  try {
    const admin = await findAdmin(email);
    if (!admin) return generic(); // not an admin → say nothing, send nothing

    // Ask Supabase Auth to email a one-time code. create_user lets an admin who
    // isn't yet an app user receive a code. Errors (incl. rate limits) are
    // swallowed so the response stays generic.
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey),
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('[otp/start] supabase', r.status, t.slice(0, 200));
    }
    return generic();
  } catch (e) {
    console.error('[otp/start] error', e?.message);
    return generic();
  }
}
