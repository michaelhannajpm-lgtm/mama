import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// PlacesFilterSheet — advanced filters for the "Places" sub-view.
//
// Live-apply: every chip tap commits straight to the parent (no draft, no
// "Apply" step). The parent re-filters underneath in real time. A single
// sticky CTA ("Show N places") reflects the live match count and just closes
// the sheet to reveal the results. "Clear all" lives quietly in the header and
// only appears when something is selected.
// ==========================================================================

const DISTANCE_PRESETS = [
  { val: 1,  label: '< 1 mi' },
  { val: 3,  label: '< 3 mi' },
  { val: 5,  label: '< 5 mi' },
  { val: 10, label: '< 10 mi' },
  { val: null, label: 'Any' },
];

const CATEGORY_OPTS = [
  'Events',
  'Meetups',
  'Top local picks',
  'Kids programs',
  'Schools & childcare',
  'Health & wellness',
];
const AMENITY_OPTS = [
  'Stroller-friendly', 'Nursing room', 'Restrooms', 'Café', 'Indoor', 'Outdoor',
];
const AGE_OPTS = ['Under 1', '1–3', '3–5', '5–8', '8+'];

// Cost + parking fields are kept on the model (empty) for back-compat, but are
// no longer surfaced in the drawer.
export const PLACES_FILTER_DEFAULT = {
  categories: [], distance: null, cost: [], amenities: [], parking: [], ages: [],
};

// Count of the visible, user-facing selections (drives "Clear all").
const activeCount = (f) =>
  (f.categories?.length || 0) +
  (f.amenities?.length || 0) +
  (f.ages?.length || 0) +
  (f.distance != null ? 1 : 0);

const Chip = ({ active, onClick, children, accent = C.navy }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97]"
    style={{
      padding: '8px 12px',
      background: active ? accent : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const SectionLabel = ({ children }) => (
  <div
    className="uppercase"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 8,
    }}
  >
    {children}
  </div>
);

export const PlacesFilterSheet = ({ filters, setFilters, onClose, resultCount = null }) => {
  // Live-apply: write straight to the parent on every tap.
  const toggleArr = (key, val) => {
    const cur = filters[key] || [];
    setFilters({
      ...filters,
      [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val],
    });
  };
  const setDist = (val) => setFilters({ ...filters, distance: val });
  const clearAll = () => setFilters(PLACES_FILTER_DEFAULT);

  const anyActive = activeCount(filters) > 0;

  // CTA copy reflects the live count. null = parent didn't supply one.
  const ctaLabel =
    resultCount == null ? 'Done'
      : resultCount === 0 ? 'No places match'
        : `Show ${resultCount} ${resultCount === 1 ? 'place' : 'places'}`;
  const ctaEmpty = resultCount === 0;

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1" style={{ paddingBottom: 0 }}>
        {/* Header: title block + quiet Clear-all (only when something is set) */}
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[11px] tracking-[.18em] uppercase"
              style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
            >
              Refine places
            </div>
            <h3
              className="mt-1.5"
              style={{
                fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
                color: C.navy, letterSpacing: '-.02em',
              }}
            >
              Find the <span style={{ fontStyle: 'italic', color: C.coral }}>right</span> spot
            </h3>
          </div>
          {anyActive && (
            <button
              onClick={clearAll}
              className="active:scale-[.96] transition-transform"
              style={{
                marginTop: 2, padding: '6px 10px', borderRadius: 999,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: C.coralDeep, fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="mt-5">
          <SectionLabel>Category</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTS.map(c => (
              <Chip
                key={c}
                active={(filters.categories || []).includes(c)}
                onClick={() => toggleArr('categories', c)}
                accent={C.coral}
              >
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Distance</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_PRESETS.map(d => (
              <Chip
                key={d.label}
                active={filters.distance === d.val}
                onClick={() => setDist(d.val)}
                accent={C.navy}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Amenities</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {AMENITY_OPTS.map(a => (
              <Chip key={a} active={(filters.amenities || []).includes(a)} onClick={() => toggleArr('amenities', a)} accent={C.sageDark}>{a}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5" style={{ paddingBottom: 16 }}>
          <SectionLabel>Kid ages</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {AGE_OPTS.map(a => (
              <Chip key={a} active={(filters.ages || []).includes(a)} onClick={() => toggleArr('ages', a)} accent={C.coral}>{a}</Chip>
            ))}
          </div>
        </div>

        {/* Sticky live CTA — stays pinned to the bottom of the scroll area as
            chips scroll. Filtering already happened live, so this just reveals
            the results. */}
        <div
          style={{
            position: 'sticky', bottom: 0,
            background: C.cream,
            margin: '0 -20px', padding: '12px 20px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
            borderTop: `1px solid ${C.divider}`,
          }}
        >
          <button
            onClick={onClose}
            className="w-full rounded-2xl flex items-center justify-center active:scale-[.99] transition-transform"
            style={{
              height: 52,
              background: ctaEmpty
                ? C.paper
                : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: ctaEmpty ? C.muted : '#fff',
              border: ctaEmpty ? `1px solid ${C.divider}` : 'none',
              fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 14.5,
              letterSpacing: '.005em',
              boxShadow: ctaEmpty ? 'none' : '0 8px 20px -8px rgba(214,68,106,.55)',
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
};
