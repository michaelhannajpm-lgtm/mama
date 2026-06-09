import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// PlacesFilterSheet — advanced filters for the "Places" sub-view.
// Local draft → Apply commits to parent. All sections are multi-select
// chip rows except distance.
// ==========================================================================

const DISTANCE_PRESETS = [
  { val: 1,  label: '< 1 mi' },
  { val: 3,  label: '< 3 mi' },
  { val: 5,  label: '< 5 mi' },
  { val: 10, label: '< 10 mi' },
  { val: null, label: 'Any' },
];

const CATEGORY_OPTS = [
  'Top places',
  'Fun & entertainment',
  'Schools & childcare',
  'Extracurricular & camps',
  'Health & wellness',
];
// Only filters backed by real place data are shown. (Highchairs / Changing
// table / Free WiFi / Membership / Sliding scale / Visit-style were removed —
// no DB field backs them yet.)
const COST_OPTS    = ['Free', 'Paid'];
const AMENITY_OPTS = [
  'Stroller-friendly', 'Nursing room', 'Restrooms', 'Café', 'Indoor', 'Outdoor',
];
const PARKING_OPTS = ['Free lot', 'Paid lot', 'Street parking'];
const AGE_OPTS     = ['Under 1','1–3','3–5','5–8','8+'];

export const PLACES_FILTER_DEFAULT = {
  categories: [], distance: null, cost: [], amenities: [], parking: [], ages: [],
};

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

export const PlacesFilterSheet = ({ filters, setFilters, onClose }) => {
  const [draft, setDraft] = useState(filters);

  const toggleArr = (key, val) => {
    setDraft(d => {
      const cur = d[key] || [];
      return { ...d, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };
  const setDist = (val) => setDraft(d => ({ ...d, distance: val }));

  const reset = () => setDraft(PLACES_FILTER_DEFAULT);
  const apply = () => { setFilters(draft); onClose(); };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
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

        <div className="mt-5">
          <SectionLabel>Category</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTS.map(c => (
              <Chip
                key={c}
                active={(draft.categories || []).includes(c)}
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
                active={draft.distance === d.val}
                onClick={() => setDist(d.val)}
                accent={C.navy}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Cost</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {COST_OPTS.map(c => (
              <Chip key={c} active={draft.cost.includes(c)} onClick={() => toggleArr('cost', c)} accent={C.coral}>{c}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Amenities</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {AMENITY_OPTS.map(a => (
              <Chip key={a} active={draft.amenities.includes(a)} onClick={() => toggleArr('amenities', a)} accent={C.sageDark}>{a}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Parking</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {PARKING_OPTS.map(p => (
              <Chip key={p} active={draft.parking.includes(p)} onClick={() => toggleArr('parking', p)} accent={C.navy}>{p}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Kid ages</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {AGE_OPTS.map(a => (
              <Chip key={a} active={draft.ages.includes(a)} onClick={() => toggleArr('ages', a)} accent={C.coral}>{a}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-7 flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-2xl flex items-center justify-center gap-1.5"
            style={{
              height: 50, padding: '0 16px',
              background: C.paper, border: `1px solid ${C.divider}`,
              color: C.navy, fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13,
            }}
          >
            <RotateCcw size={14}/> Reset
          </button>
          <button
            onClick={apply}
            className="flex-1 rounded-2xl flex items-center justify-center"
            style={{
              height: 50,
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff', fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)',
            }}
          >
            Apply filters
          </button>
        </div>
      </div>
    </Sheet>
  );
};
