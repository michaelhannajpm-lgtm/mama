import { C } from '../theme';

// A single grayed placeholder block with a soft shimmer sweep. Compose these to
// mirror the footprint of whatever real element will replace them, so content
// swaps in with zero layout shift. Neutral by design — a loading state should
// rest the eye, never grab it, so this never uses coral (see C.skeleton).
//
//   <Skeleton w={120} h={14} radius={7} />
//
// `w`/`h` accept a number (px) or any CSS length string.
export const Skeleton = ({ w = '100%', h = 12, radius = 8, style = {} }) => (
  <span
    aria-hidden
    style={{
      display: 'block',
      width: w,
      height: h,
      borderRadius: radius,
      background: `linear-gradient(90deg, ${C.skeleton} 0%, ${C.skeletonSheen} 50%, ${C.skeleton} 100%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }}
  />
);
