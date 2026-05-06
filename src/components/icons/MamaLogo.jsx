import { C } from '../../theme';

// MamaLogo — round seal mark · two leaves form a heart, terracotta + sage
export const MamaLogo = ({ size = 84, className = '', style = {} }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style}>
    {/* Outer dotted ring — wax-seal feel */}
    <circle cx="50" cy="50" r="48" fill="none" stroke={C.ink} strokeWidth="0.5"
            strokeDasharray="0.6 2.6" opacity="0.4"/>
    {/* Inner thin ring */}
    <circle cx="50" cy="50" r="44" fill="none" stroke={C.ink} strokeWidth="0.4" opacity="0.22"/>
    {/* Cream interior */}
    <circle cx="50" cy="50" r="42" fill={C.creamSoft}/>

    {/* Two leaves curling inward to form a heart */}
    {/* Left leaf — terracotta */}
    <path d="M 50 76 C 38 70 25 60 23 45 C 22 33 31 26 40 30 C 47 33 50 41 50 50 Z"
          fill={C.terracotta} opacity="0.92"/>
    {/* Right leaf — sage */}
    <path d="M 50 76 C 62 70 75 60 77 45 C 78 33 69 26 60 30 C 53 33 50 41 50 50 Z"
          fill={C.sageDark} opacity="0.92"/>
    {/* Center vein down the middle */}
    <line x1="50" y1="32" x2="50" y2="74" stroke={C.cream} strokeWidth="0.7" opacity="0.55"/>
    {/* Stem rising at the top */}
    <path d="M 50 32 L 50 22" stroke={C.ink} strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    {/* Saffron berry/dot at top of stem */}
    <circle cx="50" cy="20" r="2" fill={C.saffron}/>
  </svg>
);
