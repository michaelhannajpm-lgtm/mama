import { json } from '../_lib/supabase.js';

// ==========================================================================
// DEPRECATED — password signup has been removed.
//
// Go Mama is now passwordless. Account creation happens client-side via
// Supabase OTP (supabase.auth.signInWithOtp → verifyOtp); see
// src/lib/onboarding.js (sendOtp / verifyOtp). The onboarding_profiles +
// mom_profiles rows are then created by /api/onboarding/promote on the
// SIGNED_IN event — the same path OAuth uses.
//
// This endpoint is kept only so old clients fail loudly instead of silently
// creating password accounts. It can be deleted once no cached client calls it.
// ==========================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  return json(res, 410, {
    error: 'Password signup has been removed. Use the passwordless code flow (OTP).',
    code: 'signup_deprecated',
  });
}
