// Email-sending helpers built on Resend.
//
// Required env vars (set in Vercel project settings + locally for `vercel dev`):
//   RESEND_API_KEY    — from https://resend.com → API Keys
//   EMAIL_FROM        — e.g. "Go Mama <hello@gomama.app>"
//                       (the domain must be verified in Resend's dashboard)
//
// Optional:
//   EMAIL_REPLY_TO    — defaults to the from address. Set to a monitored
//                       inbox if you want users to be able to reply.
//
// All helpers are fire-and-forget: they never throw. They log on failure and
// return { ok, skipped?, error? } so the caller can decide whether to surface
// it. A missing RESEND_API_KEY isn't an error — we just skip the send so the
// signup flow keeps working in environments where email isn't configured.

import { Resend } from 'resend';

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderWaitlistEmail = ({ firstName, city }) => {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,';
  const cityLine = city
    ? `We'll email you the moment Go Mama is live in <strong>${escapeHtml(city)}</strong>.`
    : "We'll email you the moment Go Mama is live in your neighborhood.";
  const cityText = city
    ? `We'll email you the moment Go Mama is live in ${city}.`
    : "We'll email you the moment Go Mama is live in your neighborhood.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>You're on the Go Mama list</title>
</head>
<body style="margin:0;padding:0;background:#f6efe2;font-family:'Albert Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2a1e22;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6efe2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:14px;border:1px solid rgba(42,30,34,0.08);overflow:hidden;">
          <tr>
            <td style="padding:36px 36px 8px 36px;">
              <div style="font-family:'Fraunces',Georgia,serif;font-size:30px;font-weight:500;letter-spacing:-0.02em;line-height:1;">
                <span style="color:#2a1e22;">Go </span><span style="color:#c8553d;font-style:italic;">Mama</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 8px 36px;">
              <h1 style="margin:0 0 12px 0;font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:500;letter-spacing:-0.01em;color:#2a1e22;line-height:1.2;">
                You're on the list. <span style="font-style:italic;color:#c8553d;">Welcome, mama.</span>
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#2a1e22;">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#5c4a4f;">
                Thanks for joining the Go Mama waitlist. We're building something for moms who want
                <strong>real friendship</strong> — not endless chat — around the hours you can actually meet,
                shared values, kid-stage fit, and places you'd actually go.
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#5c4a4f;">
                ${cityLine}
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#5c4a4f;">
                In the meantime, you can preview the app today.
              </p>
              <p style="margin:0 0 8px 0;">
                <a href="https://gomama.app/preview"
                   style="display:inline-block;padding:14px 22px;border-radius:10px;background:#c8553d;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
                  Preview Go Mama →
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 36px 36px;border-top:1px solid #efe6d2;">
              <p style="margin:0 0 6px 0;font-size:14px;color:#2a1e22;">Talk soon,</p>
              <p style="margin:0;font-size:14px;color:#5c4a4f;">The Go Mama team</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0 0;font-size:11px;color:#8c7a7e;text-align:center;">
          You're receiving this because you joined the Go Mama waitlist at gomama.app.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    '',
    "You're on the Go Mama list — thanks for joining.",
    '',
    "We're building something for moms who want real friendship — not endless chat — around the hours you can actually meet, shared values, kid-stage fit, and places you'd actually go.",
    '',
    cityText,
    '',
    'In the meantime, preview the app today: https://gomama.app/preview',
    '',
    'Talk soon,',
    'The Go Mama team',
    '',
    "You're receiving this because you joined the Go Mama waitlist at gomama.app.",
  ].join('\n');

  return { html, text };
};

// Send the waitlist confirmation email. Returns { ok, skipped?, error? }.
// Never throws — a missing API key or send failure is logged and the caller
// continues. The signup flow must not depend on this.
export const sendWaitlistConfirmation = async ({ email, firstName, city }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Go Mama <hello@gomama.app>';
  const replyTo = process.env.EMAIL_REPLY_TO || from;

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping waitlist confirmation send.');
    return { ok: false, skipped: true };
  }
  if (!email) return { ok: false, skipped: true };

  try {
    const resend = new Resend(apiKey);
    const { html, text } = renderWaitlistEmail({ firstName, city });
    const result = await resend.emails.send({
      from,
      to: [email],
      replyTo,
      subject: "You're on the Go Mama list",
      html,
      text,
    });
    if (result?.error) {
      console.error('[email] resend returned error', result.error);
      return { ok: false, error: result.error?.message || 'Resend error' };
    }
    return { ok: true, id: result?.data?.id };
  } catch (e) {
    console.error('[email] send threw', e);
    return { ok: false, error: e?.message || 'Network error' };
  }
};
