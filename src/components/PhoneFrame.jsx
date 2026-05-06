import { C } from '../theme';

// ---------- Layout: Phone Frame ----------
export const PhoneFrame = ({ children }) => (
  <div className="relative" style={{
    width: 'min(390px, calc(100vw - 16px))',
    height: 'min(820px, calc(100vh - 24px))',
    maxHeight: 820,
    borderRadius: 54, padding: 12,
    background: '#1B1517',
    boxShadow: '0 40px 80px -20px rgba(42,30,34,.45), 0 0 0 1px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.06)',
  }}>
    <div className="relative w-full h-full overflow-hidden" style={{
      borderRadius: 42, background: C.cream,
    }}>
      {/* Notch */}
      <div className="absolute left-1/2 -translate-x-1/2 z-50" style={{
        top: 10, width: 110, height: 30, borderRadius: 20, background: '#1B1517'
      }}/>
      {children}
    </div>
  </div>
);
