import { useState } from 'react';
import { X, SlidersHorizontal, ArrowUpDown, Crown } from 'lucide-react';
import { C } from '../theme';

// ==========================================================================
// SeeAllSheet — full-frame overlay that backs every "See all" link in the
// MainApp tabs. Renders a sticky header (back + title + advanced-filter
// button), a horizontally-scrolling quick-filter pill row, then a grid
// of the section's items rendered via the `renderItem` render prop.
//
// Filters at the top come in two flavors:
//   • `quickFilters` — toggleable chip row (visual only in the prototype)
//   • `onOpenAdvancedFilter` — opens the same sliders sheet the tab uses
//
// The sheet covers the whole phone-frame body (excluding StatusBar +
// tab bar) so card clicks can still open EventDetail / PlaceDetail /
// MomDetail above this sheet, the same way they do on the tab itself.
// ==========================================================================

export const SeeAllSheet = ({
  title,
  subtitle,
  items = [],
  renderItem,
  columns = 2,
  gap = 10,
  layout = 'grid', // 'grid' | 'wrap' | 'list'
  quickFilters = [],
  activeQuickFilter = null,
  onQuickFilter = null,
  // (item, activeIds[]) => boolean — applies the active quick-filter chips.
  // Defaults to a no-op so callers that don't pass it keep all items.
  matchQuickFilter = () => true,
  onOpenAdvancedFilter,
  advancedFilterCount = 0,
  lockedPremium = false,
  sortLabel = 'Best match',
  accent = C.coral,
  onClose,
}) => {
  const [active, setActive] = useState(new Set());
  const toggle = (id) => setActive(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const activeIds = [...active];
  const shown = activeIds.length ? items.filter(it => matchQuickFilter(it, activeIds)) : items;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{
        background: C.cream,
        animation: 'slideUp .3s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {/* Header */}
      <div
        className="px-5"
        style={{
          paddingTop: 10, paddingBottom: 10,
          background: `linear-gradient(180deg, ${accent}11 0%, ${C.cream} 100%)`,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full flex items-center justify-center active:scale-[.95] transition-transform"
            style={{
              width: 34, height: 34,
              background: C.paper, border: `1px solid ${C.divider}`,
              color: C.navy, cursor: 'pointer',
            }}
          >
            <X size={16}/>
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700,
              color: C.navy, letterSpacing: '-.01em', lineHeight: 1.1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 11, color: C.muted,
                marginTop: 2, lineHeight: 1.3,
              }}>
                {subtitle}
              </div>
            )}
          </div>
          {onOpenAdvancedFilter && (
            <FilterIconBtn
              count={advancedFilterCount}
              locked={lockedPremium}
              onClick={onOpenAdvancedFilter}
            />
          )}
        </div>

        {/* Quick-filter chip row */}
        {quickFilters.length > 0 && (
          <div
            className="flex gap-1.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none', marginTop: 10, paddingBottom: 2 }}
          >
            {quickFilters.map(f => {
              const Icon = f.icon;
              const controlled = typeof onQuickFilter === 'function';
              // activeQuickFilter accepts either a single id (legacy single-
              // select) or a Set/array of ids (multi-select chip row).
              const activeMulti = activeQuickFilter && typeof activeQuickFilter === 'object'
                && (activeQuickFilter instanceof Set
                    ? activeQuickFilter
                    : (Array.isArray(activeQuickFilter) ? new Set(activeQuickFilter) : null));
              const isActive = controlled
                ? (activeMulti ? activeMulti.has(f.id) : activeQuickFilter === f.id)
                : active.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => (controlled ? onQuickFilter(f.id) : toggle(f.id))}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 16,
                    background: isActive ? C.coral : C.paper,
                    color: isActive ? '#fff' : C.navy,
                    border: `1px solid ${isActive ? C.coral : C.divider}`,
                    cursor: 'pointer',
                    fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                  }}
                >
                  {Icon && <Icon size={11.5}/>}
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items grid */}
      <div
        className="flex-1 overflow-y-auto px-5"
        style={{ scrollbarWidth: 'none', paddingTop: 14, paddingBottom: 20 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, fontWeight: 600 }}>
            {shown.length} {shown.length === 1 ? 'result' : 'results'}
          </div>
          <button
            onClick={() => {}}
            className="flex items-center gap-1 active:scale-[.97] transition-transform"
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy,
            }}
          >
            <ArrowUpDown size={11}/> {sortLabel}
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="text-center" style={{ paddingTop: 28, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.muted }}>
            No results match these filters.
          </div>
        ) : layout === 'wrap' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap }}>
            {shown.map(item => renderItem(item))}
          </div>
        ) : layout === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {shown.map(item => renderItem(item))}
          </div>
        ) : (
          <div
            className={`grid grid-cols-${columns}`}
            style={{ gap, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {shown.map(item => renderItem(item))}
          </div>
        )}
      </div>
    </div>
  );
};

const FilterIconBtn = ({ count = 0, locked = false, onClick }) => (
  <button
    onClick={onClick}
    aria-label={locked ? 'Advanced filters · Plus' : 'Open advanced filters'}
    className="relative flex-shrink-0 flex items-center justify-center rounded-full"
    style={{
      width: 34, height: 34,
      background: count > 0 ? C.coral : C.paper,
      color: count > 0 ? '#fff' : C.navy,
      border: `1px solid ${count > 0 ? C.coral : C.divider}`,
      cursor: 'pointer',
    }}
  >
    <SlidersHorizontal size={14}/>
    {locked ? (
      <span
        className="absolute"
        style={{
          top: -4, right: -4,
          width: 16, height: 16, borderRadius: 8,
          background: C.saffron, color: C.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${C.cream}`,
        }}
      >
        <Crown size={9}/>
      </span>
    ) : count > 0 && (
      <span
        className="absolute"
        style={{
          top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8,
          background: C.coralDeep, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${C.cream}`,
        }}
      >
        {count > 9 ? '9+' : count}
      </span>
    )}
  </button>
);
