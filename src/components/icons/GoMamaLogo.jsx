import { C } from '../../theme';

// GoMamaLogo — round seal mark with a mom + child silhouette, terracotta + sage,
// topped by a small heart in saffron. Reads as "family" at any size.
export const GoMamaLogo = ({ size = 84, className = '', style = {} }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style}>
    {/* Outer dotted ring — wax-seal feel */}
    <circle cx="50" cy="50" r="48" fill="none" stroke={C.ink} strokeWidth="0.5"
            strokeDasharray="0.6 2.6" opacity="0.4"/>
    {/* Inner thin ring */}
    <circle cx="50" cy="50" r="44" fill="none" stroke={C.ink} strokeWidth="0.4" opacity="0.22"/>
    {/* Cream interior */}
    <circle cx="50" cy="50" r="42" fill={C.creamSoft}/>

    {/* Tiny heart above the family — saffron */}
    <path d="M 50 22
             c -2.4 -3 -6.5 -3 -6.5 0.8
             c 0 2.6 2.6 4.6 6.5 7.5
             c 3.9 -2.9 6.5 -4.9 6.5 -7.5
             c 0 -3.8 -4.1 -3.8 -6.5 -0.8 Z"
          fill={C.saffron}/>

    {/* Mom — taller figure on the left (terracotta) */}
    {/* Head */}
    <circle cx="40" cy="42" r="7" fill={C.terracotta} opacity="0.94"/>
    {/* Body — rounded shoulders + dress shape, hand resting on the child's shoulder */}
    <path d="M 33 50
             Q 32 58 32 66
             Q 32 76 35 80
             L 49 80
             L 50 60
             Q 50 54 47 50
             Z"
          fill={C.terracotta} opacity="0.92"/>

    {/* Child — shorter figure on the right (sage) */}
    {/* Head */}
    <circle cx="60" cy="55" r="5" fill={C.sageDark} opacity="0.95"/>
    {/* Body — chubbier, shorter */}
    <path d="M 54 61
             Q 53 70 54 76
             Q 55 80 56 80
             L 66 80
             Q 67 80 67 76
             Q 68 67 67 61
             Z"
          fill={C.sageDark} opacity="0.92"/>

    {/* Subtle warm glow under the family — soft shadow puddle */}
    <ellipse cx="50" cy="82" rx="22" ry="1.5" fill={C.ink} opacity="0.07"/>
  </svg>
);
