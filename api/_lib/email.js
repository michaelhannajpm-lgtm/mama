// Email-sending helpers built on Resend.
//
// Email content + subject lines live in the api/_emails/ folder as React
// Email components. This file just:
//   - reads env config
//   - renders the component to HTML + plain-text
//   - hands it to Resend
//
// Required env vars (set in Vercel project settings + locally for `vercel dev`):
//   RESEND_API_KEY   — from https://resend.com → API Keys
//   EMAIL_FROM       — e.g. "Go Mama <hello@gomama.app>"
//                      (the domain must be verified in Resend's dashboard)
//
// Optional:
//   EMAIL_REPLY_TO   — defaults to EMAIL_FROM. Set to a monitored inbox if you
//                      want users to be able to reply.
//
// All helpers are fire-and-forget: they never throw. Missing RESEND_API_KEY
// isn't an error — we just skip the send.

import * as React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import {
  WaitlistConfirmation,
  renderWaitlistText,
  WAITLIST_CONFIRMATION_SUBJECT,
} from '../_emails/WaitlistConfirmation.tsx';

// Send the waitlist confirmation. Returns { ok, skipped?, error? }.
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
    const element = React.createElement(WaitlistConfirmation, { firstName, city });
    const html = await render(element);
    const text = renderWaitlistText({ firstName, city });

    const result = await resend.emails.send({
      from,
      to: [email],
      replyTo,
      subject: WAITLIST_CONFIRMATION_SUBJECT,
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
