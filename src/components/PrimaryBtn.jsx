import { C } from '../theme';

export const PrimaryBtn = ({ children, onClick, disabled, variant='dark' }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full transition-all active:scale-[.98]"
    style={{
      height: 56, borderRadius: 18,
      background: disabled ? '#D8CCB6' : (variant==='dark' ? C.ink : C.terracotta),
      color: variant==='dark' ? C.cream : '#fff',
      fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 15.5,
      letterSpacing: '.02em',
      boxShadow: disabled ? 'none' : '0 12px 24px -10px rgba(42,30,34,.45)',
      display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
    }}>
    {children}
  </button>
);
