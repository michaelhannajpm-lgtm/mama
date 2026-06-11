// ============================================================================
// The dark operator rail. Grouped, deep-linked navigation that scales as new
// sections are added — add an entry to NAV_GROUPS (in nav.js) and it appears
// here and routes automatically. Collapsible to an icon rail.
// ============================================================================
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { AC } from '../admin-theme';
import { NAV_GROUPS } from '../nav';

export const Sidebar = ({ current, onNavigate, collapsed, onToggleCollapse }) => {
  const width = collapsed ? AC.railWidthCollapsed : AC.railWidth;
  return (
    <aside style={{
      width, minWidth: width, background: AC.railBg, color: AC.railText,
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0,
      height: '100vh', transition: 'width .16s ease', overflow: 'hidden',
    }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5" style={{ height: AC.headerHeight, padding: '0 16px', borderBottom: `1px solid ${AC.railBorder}` }}>
        <div className="flex items-center justify-center shrink-0" style={{
          width: 30, height: 30, borderRadius: 8, background: AC.accent,
          color: '#fff', fontFamily: AC.brandFont, fontSize: 17, fontWeight: 600,
        }}>M</div>
        {!collapsed && (
          <div style={{ fontFamily: AC.brandFont, fontSize: 17, fontWeight: 500, color: '#fff', letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
            Go Mama <span style={{ fontStyle: 'italic', color: AC.accent }}>Console</span>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 admin-rail-scroll" style={{ overflowY: 'auto', padding: '10px 8px' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div className="uppercase" style={{
                padding: '4px 10px', fontFamily: AC.font, fontSize: 10, fontWeight: 700,
                letterSpacing: '.14em', color: AC.railMuted,
              }}>
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className="w-full flex items-center"
                  style={{
                    gap: 10, padding: collapsed ? '9px 0' : '8px 10px', margin: '1px 0',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: AC.radiusSm, position: 'relative',
                    background: active ? AC.railActiveBg : 'transparent',
                    color: active ? AC.railTextActive : AC.railText,
                    fontFamily: AC.font, fontSize: 13, fontWeight: active ? 600 : 500,
                    cursor: 'pointer', transition: 'background .12s, color .12s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = AC.railHover; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {active && (
                    <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 3, background: AC.railActiveBar }} />
                  )}
                  <item.icon size={16} style={{ color: active ? AC.accent : 'currentColor', flexShrink: 0 }} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: open app + collapse toggle */}
      <div style={{ borderTop: `1px solid ${AC.railBorder}`, padding: 8 }}>
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center"
          style={{
            gap: 10, padding: collapsed ? '9px 0' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: AC.radiusSm, color: AC.railText, fontFamily: AC.font, fontSize: 12.5, textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = AC.railHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <ExternalLink size={15} style={{ flexShrink: 0 }} />
          {!collapsed && 'Open the app'}
        </a>
        <button onClick={onToggleCollapse}
          className="w-full flex items-center"
          style={{
            gap: 10, padding: collapsed ? '9px 0' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: AC.radiusSm, color: AC.railMuted, fontFamily: AC.font, fontSize: 12.5, cursor: 'pointer', background: 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = AC.railHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <ChevronLeft size={15} style={{ flexShrink: 0, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .16s' }} />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
};
