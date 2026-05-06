import { C } from '../../theme';

export const Sprig = ({ className='', style={}, color=C.sage }) => (
  <svg viewBox="0 0 60 60" className={className} style={style} fill="none">
    <path d="M30 8 C30 28, 30 40, 30 54" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M30 18 C24 14, 18 14, 14 18 C20 22, 26 22, 30 20"   fill={color} opacity=".55"/>
    <path d="M30 26 C36 22, 42 22, 46 26 C40 30, 34 30, 30 28"  fill={color} opacity=".55"/>
    <path d="M30 36 C25 33, 20 33, 16 37 C22 40, 27 40, 30 38"  fill={color} opacity=".55"/>
  </svg>
);
