import { C } from '../theme';

// Small status dot for a mom avatar: online (green) / away (amber) / offline
// (gray). Render absolutely-positioned at the avatar's bottom-right inside a
// `position: relative` wrapper. `status` comes from derivePresence().
const COLORS = {
  online:  C.sageDark,   // green
  away:    C.saffron,    // amber
  offline: C.muted,      // gray
};
const LABELS = { online: 'Online', away: 'Away', offline: 'Offline' };

export const PresenceDot = ({ status = 'offline', size = 11, ring = '#fff', style }) => {
  const color = COLORS[status] || C.muted;
  return (
    <span
      title={LABELS[status] || 'Offline'}
      aria-label={LABELS[status] || 'Offline'}
      style={{
        position: 'absolute', right: 0, bottom: 0,
        width: size, height: size, borderRadius: size / 2,
        background: color, border: `2px solid ${ring}`,
        boxShadow: '0 1px 2px rgba(27,42,78,.25)',
        ...style,
      }}
    />
  );
};

// Inline (non-avatar) variant: a small dot + label, for headers/rows.
export const PresencePill = ({ status = 'offline', color = '#fff' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, color }}>
    <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS[status] || C.muted, boxShadow: '0 0 0 2px rgba(255,255,255,.35)' }}/>
    {LABELS[status] || 'Offline'}
  </span>
);
