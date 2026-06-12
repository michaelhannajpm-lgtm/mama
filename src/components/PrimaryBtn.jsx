import { C } from '../theme';

// The app's primary call-to-action. Full-width, rounded, with the standard
// press-scale. Two color variants (dark navy / coral) and three sizes so the
// 25+ bottom-sheet CTAs can share one button instead of each re-rolling its
// own height/radius/disabled treatment.
//
//   variant — 'dark' (navy ink) | 'terracotta' (coral). Default dark.
//   size    — 'sm' (48) | 'md' (52) | 'lg' (56). Default lg, matching the
//             original height so existing call sites are unchanged.
const SIZES = {
  sm: { height: 48, radius: 16, fontSize: 14.5 },
  md: { height: 52, radius: 18, fontSize: 15 },
  lg: { height: 56, radius: 18, fontSize: 15.5 },
};

export const PrimaryBtn = ({ children, onClick, disabled, variant = 'dark', size = 'lg', type = 'button' }) => {
  const s = SIZES[size] || SIZES.lg;
  return (
    <button onClick={onClick} disabled={disabled} type={type}
      className="w-full transition-all active:scale-[.98]"
      style={{
        height: s.height, borderRadius: s.radius,
        background: disabled ? C.btnDisabled : (variant === 'dark' ? C.ink : C.terracotta),
        color: disabled ? C.cream : (variant === 'dark' ? C.cream : '#fff'),
        fontFamily: 'Albert Sans', fontWeight: 600, fontSize: s.fontSize,
        letterSpacing: '.02em',
        boxShadow: disabled ? 'none' : '0 12px 24px -10px rgba(42,30,34,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
      {children}
    </button>
  );
};
