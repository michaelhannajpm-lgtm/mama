import { C } from '../theme';

// ---------- Reusable Bits ----------
export const Pill = ({ active, children, onClick, size='md' }) => (
  <button onClick={onClick}
    className="transition-all"
    style={{
      padding: size==='sm' ? '7px 12px' : '10px 16px',
      borderRadius: 999, fontSize: size==='sm' ? 12.5 : 14,
      fontFamily: 'Albert Sans', fontWeight: 500,
      border: `1px solid ${active ? C.ink : C.divider}`,
      background: active ? C.ink : C.paper,
      color: active ? C.cream : C.ink,
    }}>
    {children}
  </button>
);
