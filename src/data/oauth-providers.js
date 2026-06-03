// OAuth provider catalogue.
//
// Google, Apple, and Facebook are shown by default on Account + Login.
// Each tap calls supabase.auth.signInWithOAuth(provider) — for the handshake
// to complete, the matching provider must also be enabled in
// Supabase Dashboard → Authentication → Providers. If it isn't, the user
// sees a friendly error and the rest of the email/phone flow still works.
//
// To hide a button without removing it, set VITE_OAUTH_<ID>=0:
//   VITE_OAUTH_GOOGLE=0    → hide Google
//   VITE_OAUTH_FACEBOOK=0  → hide Facebook
//   VITE_OAUTH_APPLE=0     → hide Apple

export const ALL_PROVIDERS = [
  { id: 'google',   label: 'Continue with Google',   bg: '#FFFFFF', fg: '#1F1F1F', border: '#DADCE0', envKey: 'VITE_OAUTH_GOOGLE'   },
  { id: 'facebook', label: 'Continue with Facebook', bg: '#1877F2', fg: '#FFFFFF', border: '#1877F2', envKey: 'VITE_OAUTH_FACEBOOK' },
  { id: 'apple',    label: 'Continue with Apple',    bg: '#000000', fg: '#FFFFFF', border: '#000000', envKey: 'VITE_OAUTH_APPLE'    },
];

const isExplicitlyDisabled = (v) => v === '0' || v === 'false' || v === 'no' || v === false;

export const ENABLED_PROVIDERS = ALL_PROVIDERS.filter(
  (p) => !isExplicitlyDisabled(import.meta.env[p.envKey])
);
