// Social verification — link a real Meta account (Instagram / Facebook) and
// derive the "verified mom" state from it.
//
// Facebook uses Supabase's native OAuth via linkIdentity() (real OAuth).
//   REQUIRES, in the Supabase dashboard:
//     • Auth → Providers → Facebook: enabled, with the Meta App ID + Secret.
//     • Auth → enable "Manual Linking" (so linkIdentity is allowed).
//     • The Meta app's Valid OAuth Redirect URIs must include the Supabase
//       callback (https://<project>.supabase.co/auth/v1/callback).
//
// Instagram has no native Supabase provider, so it goes through the custom
// route /api/auth/instagram/start (Meta Instagram OAuth), which is gated on
// INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET env vars. Until those are set the
// button surfaces a "needs setup" message instead of failing silently.
import { supabase, isSupabaseReady } from './supabase';

// Providers (e.g. ['facebook']) currently linked to the signed-in user.
export const getLinkedProviders = async () => {
  if (!isSupabaseReady()) return [];
  try {
    const { data } = await supabase.auth.getUser();
    const ids = data?.user?.identities || [];
    return ids.map(i => i.provider);
  } catch { return []; }
};

// Real Meta OAuth for Facebook via Supabase. Redirects out to Facebook and
// back to the current page; throws if the provider/manual-linking isn't set up.
//
// Two cases:
//   • Already signed in → linkIdentity() attaches Facebook as an extra identity.
//     (linkIdentity targets the GoTrue *user* endpoint, so it NEEDS a session —
//     without one the anon JWT has no `sub` claim and GoTrue rejects with
//     "invalid claim: missing sub claim".)
//   • Not signed in → signInWithOAuth() signs the user in *with* Facebook, which
//     also creates the Facebook identity. So a brand-new user verifies in one
//     step instead of being dead-ended at "sign in first".
// Both redirect out to Facebook and back to the current page.
export const linkFacebook = async () => {
  if (!isSupabaseReady()) throw new Error('Auth not configured');

  const options = {
    redirectTo: window.location.origin + window.location.pathname,
    scopes: 'public_profile',
  };
  const { data: sessionData } = await supabase.auth.getSession();

  const { data, error } = sessionData?.session
    ? await supabase.auth.linkIdentity({ provider: 'facebook', options })
    : await supabase.auth.signInWithOAuth({ provider: 'facebook', options });
  if (error) throw error;
  return data;
};

// Kick off the custom Instagram OAuth flow (server route handles the redirect
// + token exchange). Returns to the current page on success.
export const linkInstagram = async () => {
  const back = encodeURIComponent(window.location.origin + window.location.pathname);
  const res = await fetch(`/api/auth/instagram/start?return=${back}`, { redirect: 'manual' });
  // The route 302s to Meta when configured; if it returns JSON, it's not set up.
  if (res.type === 'opaqueredirect' || res.status === 302) {
    window.location.href = `/api/auth/instagram/start?return=${back}`;
    return;
  }
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || 'Instagram sign-in is not configured yet');
};

// Verified = at least one social linked AND a real photo on file.
export const computeVerified = ({ instagram, facebook, photo }) =>
  !!((instagram || facebook) && photo);
