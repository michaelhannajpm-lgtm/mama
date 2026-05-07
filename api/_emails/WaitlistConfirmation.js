// Waitlist confirmation email template — plain HTML strings for runtime safety.
// All copy lives in this file; api/_lib/email.js just consumes the exports.
//
// Why no React Email / JSX: Vercel's serverless runtime needs a build step to
// transpile JSX, and the entry chain here mixes .js / .ts files which broke
// auto-bundling. Plain string templates work in any Node ESM context with zero
// transpilation. If we ever want React-based emails, convert the entry api
// routes to .ts at the same time.

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Brand colors — keep in sync with src/theme.js
const C = {
  cream:    '#f6efe2',
  paper:    '#ffffff',
  ink:      '#2a1e22',
  inkSoft:  '#5c4a4f',
  inkMuted: '#8c7a7e',
  terra:    '#c8553d',
  divider:  '#efe6d2',
};

// Build the email body from props. Returns { html, text }.
// Edit copy here. Subject lives below as WAITLIST_CONFIRMATION_SUBJECT.
export const renderWaitlist = ({ firstName, city } = {}) => {
  const greeting  = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,';
  const cityHtml  = city
    ? `We'll email you the moment Go Mama is live in <strong>${escapeHtml(city)}</strong>.`
    : "We'll email you the moment Go Mama is live in your neighborhood.";
  const cityText  = city
    ? `We'll email you the moment Go Mama is live in ${city}.`
    : "We'll email you the moment Go Mama is live in your neighborhood.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>You're on the Go Mama list</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Albert Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${C.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:${C.paper};border-radius:14px;border:1px solid rgba(42,30,34,0.08);overflow:hidden;">
          <tr>
            <td style="padding:36px 36px 8px 36px;">
              <div style="font-family:'Fraunces',Georgia,serif;font-size:30px;font-weight:500;letter-spacing:-0.02em;line-height:1;">
                <span style="color:${C.ink};">Go </span><span style="color:${C.terra};font-style:italic;">Mama</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 8px 36px;">
              <h1 style="margin:0 0 12px 0;font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:500;letter-spacing:-0.01em;color:${C.ink};line-height:1.2;">
                You're on the list. <span style="font-style:italic;color:${C.terra};">Welcome, mama.</span>
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:${C.ink};">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:${C.inkSoft};">
                Thanks for joining the Go Mama waitlist. We're building something for moms who want
                <strong>real friendship</strong> — not endless chat — around the hours you can actually meet,
                shared values, kid-stage fit, and places you'd actually go.
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:${C.inkSoft};">${cityHtml}</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:${C.inkSoft};">In the meantime, you can preview the app today.</p>
              <p style="margin:0 0 8px 0;">
                <a href="https://gomama.app/preview"
                   style="display:inline-block;padding:14px 22px;border-radius:10px;background:${C.terra};color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
                  Preview Go Mama →
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 36px 36px;border-top:1px solid ${C.divider};">
              <p style="margin:0 0 6px 0;font-size:14px;color:${C.ink};">Talk soon,</p>
              <p style="margin:0;font-size:14px;color:${C.inkSoft};">The Go Mama team</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0 0;font-size:11px;color:${C.inkMuted};text-align:center;">
          You're receiving this because you joined the Go Mama waitlist at gomama.app.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    firstName ? `Hi ${firstName},` : 'Hi there,',
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

export const WAITLIST_CONFIRMATION_SUBJECT = "You're on the Go Mama list";
