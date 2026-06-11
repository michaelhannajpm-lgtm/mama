import { C } from '../theme';

// Shown for the brief moment on launch while we check for a persisted session.
// Only ever rendered when a stored Supabase token exists (see hasStoredSession)
// — so a returning mom sees the quiet brand mark, not the Landing screen,
// before she drops into her home. New visitors skip this entirely and get
// Landing instantly. No spinner, no copy: just the logo, calm, resolving
// forward in a blink.
export const AuthLoading = () => (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{ background: C.cream }}
  >
    <img
      src="/gomama-logo.png"
      alt="Go Mama"
      style={{
        height: 84, width: 'auto',
        mixBlendMode: 'multiply',
        animation: 'fadeIn 0.4s ease-out',
      }}
    />
  </div>
);
