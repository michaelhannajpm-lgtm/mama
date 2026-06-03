import { useMemo, useState } from 'react';
import {
  Search, Bookmark, BookOpen, SlidersHorizontal, Star, ExternalLink,
} from 'lucide-react';
import { C } from '../../theme';
import { RESOURCES, RESOURCE_CATEGORIES, avgRating } from '../../data/resources';
import { Sheet } from '../../components/Sheet';

// ==========================================================================
// ResourcesTab — curated *challenge-based* support layer.
//   • 5 primary filters always visible: Parenting · Legal · Financial ·
//     Mental Health · Kid Health
//   • Sliders icon opens a sheet with ALL extended filters (postpartum,
//     sleep, hotlines, safety, etc.)
//   • Each card links out to the resource and surfaces peer reviews.
//
// Accent semantics stay aligned with the rest of the app:
//   coral   → mental health, postpartum, kid wellness, crisis
//   sage    → community-flavored (childcare, nutrition, self-care)
//   saffron → financial / discounts highlight
//   navy    → informational / educational
// ==========================================================================

const ACCENT_COLORS = {
  navy:    { fg: C.navy,      bg: C.paper,       ring: C.navy      },
  coral:   { fg: C.coralDeep, bg: C.coralSoft,   ring: C.coralDeep },
  sage:    { fg: C.sageDark,  bg: C.sage,        ring: C.sageDark  },
  saffron: { fg: '#8A6610',   bg: '#FFF4D6',     ring: C.saffron   },
};

const PRIMARY_CATS    = RESOURCE_CATEGORIES.filter(c => c.visible);
const EXTENDED_CATS   = RESOURCE_CATEGORIES.filter(c => !c.visible);
const findCat = (id) => RESOURCE_CATEGORIES.find(c => c.id === id);

// ─── Stars row ────────────────────────────────────────────────────────────
const StarsRow = ({ value, size = 11 }) => {
  if (value == null) return null;
  return (
    <div className="flex items-center" style={{ gap: 1 }}>
      {[1,2,3,4,5].map(i => {
        const filled = value >= i - 0.25;
        const half = !filled && value >= i - 0.75;
        return (
          <Star
            key={i}
            size={size}
            color={filled || half ? C.saffron : C.line}
            fill={filled ? C.saffron : 'none'}
            strokeWidth={1.8}
          />
        );
      })}
    </div>
  );
};

// ─── Resource card ────────────────────────────────────────────────────────
const ResourceCard = ({ resource, saved, onToggleSave }) => {
  const cat = findCat(resource.category);
  const accent = ACCENT_COLORS[cat?.accent || 'navy'];
  const Icon = cat?.icon || BookOpen;
  const rating = avgRating(resource);
  const reviewCount = resource.reviews?.length || 0;
  const featuredReview = resource.reviews?.[0];

  const cardBody = (
    <>
      <div className="flex items-start gap-3 pr-7">
        <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{
          width: 38, height: 38, background: accent.bg, color: accent.fg,
        }}>
          <Icon size={16}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9.5px] tracking-[.12em] uppercase flex items-center flex-wrap" style={{
            fontFamily: 'Albert Sans', fontWeight: 800, color: accent.fg, gap: 6,
          }}>
            <span>{cat?.label || 'Resource'}</span>
            {resource.badge && (
              <span className="px-1.5 py-0.5 rounded" style={{
                background: accent.bg, color: accent.fg, fontSize: 8.5, letterSpacing: '.04em',
              }}>
                {resource.badge.toUpperCase()}
              </span>
            )}
          </div>
          <div style={{
            fontFamily: 'Fraunces', fontWeight: 600, fontSize: 14,
            color: C.navy, letterSpacing: '-.01em', marginTop: 2, lineHeight: 1.2,
          }}>
            {resource.title}
          </div>
          <div className="text-[11px] mt-1" style={{ fontFamily: 'Albert Sans', color: C.inkSoft, lineHeight: 1.4 }}>
            {resource.summary}
          </div>

          {/* Reviews row */}
          {rating != null && (
            <div className="flex items-center gap-1.5 mt-2">
              <StarsRow value={rating}/>
              <span className="text-[10.5px]" style={{ fontFamily: 'Albert Sans', color: C.navy, fontWeight: 700 }}>
                {rating.toFixed(1)}
              </span>
              <span className="text-[10.5px]" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
                · {reviewCount} mom review{reviewCount === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Featured review snippet */}
          {featuredReview && (
            <div
              className="mt-1.5 pl-2"
              style={{
                borderLeft: `2px solid ${accent.bg}`,
                fontFamily: 'Albert Sans',
                fontStyle: 'italic',
                fontSize: 10.5,
                color: C.navySoft,
                lineHeight: 1.45,
              }}
            >
              "{featuredReview.text}"
              <span style={{ fontStyle: 'normal', color: C.muted, fontWeight: 600 }}>
                {' '}— {featuredReview.mom}{featuredReview.kids && featuredReview.kids !== '—' ? `, ${featuredReview.kids}` : ''}
              </span>
            </div>
          )}

          {/* Visit link affordance */}
          {resource.link && (
            <div className="mt-2 flex items-center gap-1" style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, color: accent.fg,
              letterSpacing: '.02em',
            }}>
              Visit resource
              <ExternalLink size={10}/>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }}
        aria-label={saved ? 'Unsave' : 'Save'}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 26, height: 26, borderRadius: 13,
          background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bookmark size={13} color={saved ? C.coralDeep : C.muted} fill={saved ? C.coralDeep : 'none'}/>
      </button>
    </>
  );

  const cardStyle = {
    background: C.paper,
    border: `1px solid ${C.divider}`,
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  };

  return resource.link ? (
    <a
      href={resource.link}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl mb-2 px-3 py-3 relative"
      style={cardStyle}
    >
      {cardBody}
    </a>
  ) : (
    <div className="rounded-2xl mb-2 px-3 py-3 relative" style={cardStyle}>
      {cardBody}
    </div>
  );
};

// ─── Filter sheet ─────────────────────────────────────────────────────────
const FilterSheet = ({ activeCat, onSelect, onClose }) => {
  const Section = ({ title, cats }) => (
    <div style={{ marginBottom: 16 }}>
      <div className="text-[10px] tracking-[.14em] uppercase mb-2 px-1" style={{
        fontFamily: 'Albert Sans', fontWeight: 800, color: C.navySoft,
      }}>
        {title}
      </div>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {cats.map(cat => {
          const active = activeCat === cat.id;
          const accent = ACCENT_COLORS[cat.accent || 'navy'];
          return (
            <button
              key={cat.id}
              onClick={() => { onSelect(cat.id); onClose(); }}
              className="flex items-center gap-1.5 rounded-full px-3 py-2"
              style={{
                background: active ? C.navy : C.paper,
                color:      active ? '#fff' : C.navy,
                border:    `1px solid ${active ? C.navy : C.divider}`,
                fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: active ? 'rgba(255,255,255,.15)' : accent.bg,
                  color: active ? '#fff' : accent.fg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <cat.icon size={12}/>
              </span>
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div style={{
          fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600,
          color: C.navy, letterSpacing: '-.01em', marginBottom: 4,
        }}>
          All filters
        </div>
        <div className="text-[11.5px] mb-5" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
          Every kind of support a mom might be looking for.
        </div>

        <button
          onClick={() => { onSelect(null); onClose(); }}
          className="rounded-full px-4 py-2 mb-5"
          style={{
            background: activeCat === null ? C.navy : C.paper,
            color:      activeCat === null ? '#fff' : C.navy,
            border:    `1px solid ${activeCat === null ? C.navy : C.divider}`,
            fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
          }}
        >
          Show all resources
        </button>

        <Section title="Top categories"   cats={PRIMARY_CATS}/>
        <Section title="More support"     cats={EXTENDED_CATS}/>
      </div>
    </Sheet>
  );
};

// ─── ResourcesTab ─────────────────────────────────────────────────────────
export const ResourcesTab = ({ savedItems = [], setSavedItems }) => {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const toggleSave = (id) => {
    setSavedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const isSaved = (id) => savedItems.includes(id);

  const activeCatObj  = activeCat ? findCat(activeCat) : null;
  const isExtendedActive = activeCatObj && !activeCatObj.visible;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter(r => {
      if (activeCat && r.category !== activeCat) return false;
      if (!q) return true;
      const hay = `${r.title} ${r.summary} ${(r.reviews || []).map(rv => rv.text).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeCat]);

  // Group by category when no filter is active and there's no search query.
  const grouped = useMemo(() => {
    if (activeCat || query) return null;
    const map = {};
    for (const cat of RESOURCE_CATEGORIES) map[cat.id] = [];
    for (const r of RESOURCES) {
      if (map[r.category]) map[r.category].push(r);
    }
    return map;
  }, [activeCat, query]);

  const orderedForGrouped = [...PRIMARY_CATS, ...EXTENDED_CATS];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-5 pt-3 pb-2">
        <div
          className="flex items-center gap-2 rounded-full px-3"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, height: 38 }}
        >
          <Search size={14} color={C.muted}/>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search support, guides, hotlines…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy,
            }}
          />
        </div>
      </div>

      {/* Category chips — 5 visible + sliders icon for extended */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCat(null)}
            className="flex items-center rounded-full px-3 py-1.5 flex-shrink-0"
            style={{
              background: activeCat === null ? C.navy : C.paper,
              color:      activeCat === null ? '#fff' : C.navy,
              border:    `1px solid ${activeCat === null ? C.navy : C.divider}`,
              fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
            }}
          >
            All
          </button>
          {PRIMARY_CATS.map(cat => {
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 flex-shrink-0"
                style={{
                  background: active ? C.navy : C.paper,
                  color:      active ? '#fff' : C.navy,
                  border:    `1px solid ${active ? C.navy : C.divider}`,
                  fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
                }}
              >
                <cat.icon size={12}/>
                {cat.label}
              </button>
            );
          })}

          {/* If an extended (non-visible) cat is active, surface it as a pill */}
          {isExtendedActive && (
            <button
              onClick={() => setActiveCat(null)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 flex-shrink-0"
              style={{
                background: C.coralDeep, color: '#fff',
                border: `1px solid ${C.coralDeep}`,
                fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
              }}
              aria-label={`Clear ${activeCatObj.label} filter`}
            >
              <activeCatObj.icon size={12}/>
              {activeCatObj.label} ×
            </button>
          )}

          {/* Sliders icon — opens the all-filters sheet */}
          <button
            onClick={() => setFilterSheetOpen(true)}
            aria-label="More filters"
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 30, height: 30,
              background: isExtendedActive ? C.coralDeep : C.paper,
              color: isExtendedActive ? '#fff' : C.navy,
              border: `1px solid ${isExtendedActive ? C.coralDeep : C.divider}`,
              marginLeft: 2,
            }}
          >
            <SlidersHorizontal size={13}/>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
        {filtered.length === 0 ? (
          <EmptyState/>
        ) : grouped ? (
          orderedForGrouped.map(cat => {
            const items = grouped[cat.id];
            if (!items?.length) return null;
            return (
              <div key={cat.id} style={{ marginTop: 12 }}>
                <div className="text-[10px] tracking-[.14em] uppercase mb-2 flex items-center gap-1.5" style={{
                  color: C.navySoft, fontFamily: 'Albert Sans', fontWeight: 800,
                }}>
                  <cat.icon size={11}/>
                  {cat.label}
                  <span style={{ color: C.muted, fontWeight: 600 }}>· {items.length}</span>
                </div>
                {items.map(r => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    saved={isSaved(r.id)}
                    onToggleSave={() => toggleSave(r.id)}
                  />
                ))}
              </div>
            );
          })
        ) : (
          filtered.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              saved={isSaved(r.id)}
              onToggleSave={() => toggleSave(r.id)}
            />
          ))
        )}
      </div>

      {filterSheetOpen && (
        <FilterSheet
          activeCat={activeCat}
          onSelect={setActiveCat}
          onClose={() => setFilterSheetOpen(false)}
        />
      )}
    </div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center" style={{ paddingTop: 60, gap: 8 }}>
    <BookOpen size={32} color={C.line}/>
    <div className="text-[14px]" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
      Nothing here yet
    </div>
    <div className="text-[11.5px] text-center px-6" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
      Try a different filter or search term.
    </div>
  </div>
);
