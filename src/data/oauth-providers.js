// OAuth provider catalogue + env-driven filter.
//
// The full list of providers we *could* offer. Whether each shows in the UI
// depends on whether you've configured it in your Supabase project AND set
// the matching VITE_OAUTH_* env var to a truthy value.
//
//   VITE_OAUTH_GOOGLE=1      → "Continue with Google" button
//   VITE_OAUTH_FACEBOOK=1    → "Continue with Facebook" button
//   VITE_OAUTH_APPLE=1       → "Continue with Apple" button
//
// Default behavior: every flag is OFF, so the OAuth row is hidden and only
// email/phone + password is shown. As you enable providers in
// Supabase Dashboard → Authentication → Providers, flip the matching flag.

export const ALL_PROVIDERS = [
  { id: 'google',   label: 'Continue with Google',   bg: '#FFFFFF', fg: '#1F1F1F', border: '#DADCE0', envKey: 'VITE_OAUTH_GOOGLE'   },
  { id: 'facebook', label: 'Continue with Facebook', bg: '#1877F2', fg: '#FFFFFF', border: '#1877F2', envKey: 'VITE_OAUTH_FACEBOOK' },
  { id: 'apple',    label: 'Continue with Apple',    bg: '#000000', fg: '#FFFFFF', border: '#000000', envKey: 'VITE_OAUTH_APPLE'    },
];

const truthy = (v) => v === true || v === '1' || v === 'true' || v === 'yes';

export const ENABLED_PROVIDERS = ALL_PROVIDERS.filter(p => truthy(import.meta.env[p.envKey]));
