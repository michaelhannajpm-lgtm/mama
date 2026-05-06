import { C } from '../../theme';

export const Sun3 = ({ className='', style={}, color=C.saffron }) => (
  <svg viewBox="0 0 80 80" className={className} style={style} fill="none">
    <circle cx="40" cy="40" r="14" fill={color} opacity=".85"/>
    {Array.from({length:12}).map((_,i)=>{
      const a = (i/12)*Math.PI*2;
      const x1 = 40+Math.cos(a)*22, y1 = 40+Math.sin(a)*22;
      const x2 = 40+Math.cos(a)*30, y2 = 40+Math.sin(a)*30;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    })}
  </svg>
);
