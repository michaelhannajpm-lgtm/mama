import { C } from '../theme';

// Small toggle chip used on every mom-listing surface to filter the list to
// only moms who are currently online. Shared so Home + Connect stay consistent.
export const OnlineFilterToggle = ({ active, onToggle }) => (
  <button
    onClick={onToggle}
    aria-pressed={active}
    className="inline-flex items-center active:scale-[.97] transition-transform"
    style={{
      gap: 6, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
      background: active ? C.sage : C.paper,
      border: `1px solid ${active ? C.sageDark : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
      color: active ? C.sageDark : C.navySoft,
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: 4, background: C.sageDark, flexShrink: 0 }}/>
    {active ? 'Online only' : 'Online'}
  </button>
);
