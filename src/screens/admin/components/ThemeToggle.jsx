// ============================================================================
// ThemeToggle — 3-way segmented control for the console theme.
//   Light (Sun) · Dark (Moon) · System (Monitor)
//
// Controlled by useAdminTheme: `theme` is the user's preference, `setTheme`
// changes it. Lives in the console header. Styling uses AC tokens so the
// control itself themes along with everything else.
// ============================================================================
import { Sun, Moon, Monitor } from 'lucide-react';
import { AC } from '../admin-theme';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export const ThemeToggle = ({ theme, setTheme }) => (
  <div
    role="radiogroup"
    aria-label="Theme"
    className="flex items-center"
    style={{
      background: AC.surfaceSunken,
      border: `1px solid ${AC.border}`,
      borderRadius: AC.radiusSm,
      padding: 2,
      gap: 2,
    }}
  >
    {OPTIONS.map(({ value, icon: Icon, label }) => {
      const active = theme === value;
      return (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={active}
          title={label}
          aria-label={label}
          onClick={() => setTheme(value)}
          className="flex items-center justify-center transition-colors"
          style={{
            width: 28,
            height: 24,
            borderRadius: AC.radiusSm - 2,
            border: 'none',
            cursor: 'pointer',
            background: active ? AC.surface : 'transparent',
            color: active ? AC.accent : AC.textMuted,
            boxShadow: active ? AC.shadow : 'none',
          }}
        >
          <Icon size={14} />
        </button>
      );
    })}
  </div>
);
