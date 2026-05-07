import { C } from '../theme';

// ---------- Status Bar ----------
export const StatusBar = ({ light=false }) => (
  <div className="flex items-center justify-between px-7 pt-3" style={{ height: 44, color: light ? '#fff' : C.ink }}>
    <span className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>9:41</span>
    <div className="flex items-center gap-1">
      <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><path d="M8 8.5c.7 0 1.3.6 1.3 1.3M5.4 6.1a3.5 3.5 0 0 1 5.2 0M2.8 3.5a7 7 0 0 1 10.4 0"/></svg>
      <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="3" width="2" height="5" rx="1"/><rect x="3" y="2" width="2" height="6" rx="1"/><rect x="6" y="1" width="2" height="7" rx="1"/><rect x="9" y="0" width="2" height="8" rx="1"/></svg>
      <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="18" height="10" rx="2.5" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="20" y="3.5" width="1.2" height="4" rx=".5" fill="currentColor"/></svg>
    </div>
  </div>
);
