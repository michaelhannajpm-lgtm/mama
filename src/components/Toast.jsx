import { C } from '../theme';

export const Toast = ({ msg }) => (
  <div className="absolute left-1/2 -translate-x-1/2 z-50" style={{
    bottom: 100, padding: '12px 18px', borderRadius: 999,
    background: C.ink, color: C.cream, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500,
    boxShadow:'0 16px 36px -10px rgba(0,0,0,.45)',
    animation: 'fadeIn .3s ease',
  }}>
    {msg}
  </div>
);
