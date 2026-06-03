import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// ActivitiesFilterSheet — advanced filters for the "Things to do" sub-view.
// Mirrors MeetupsFilterSheet structure: local draft → Apply commits to
// parent. All sections are multi-select chip rows except distance.
// ==========================================================================

const COST_OPTS    = ['Free', 'Paid'];
const SETTING_OPTS = ['Indoor', 'Outdoor'];
const DAY_OPTS     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const TIME_OPTS    = [
  { id: 'morning',   label: 'Morning'   },
  { id: 'noon',      label: 'Midday'    },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'night-owl', label: 'Evening'   },
];
const AGE_OPTS     = ['Under 1', '1–3', '3–5', '5–8', '8+'];
const TYPE_OPTS    = [
  'Storytime','Music','Yoga','Playgroup','Stroller walk',
  'Park','Brunch','Art','Class','Splash pad',
];
const AMENITY_OPTS = [
  'Stroller-friendly','Drop-off welcome','Childcare on-site','Recurring','Verified',
];
const DISTANCE_PRESETS = [
  { val: 1,  label: '< 1 mi' },
  { val: 3,  label: '< 3 mi' },
  { val: 5,  label: '< 5 mi' },
  { val: 10, label: '< 10 mi' },
  { val: null, label: 'Any' },
];

export const ACTIVITIES_FILTER_DEFAULT = {
  cost: [], setting: [], days: [], times: [], ages: [],
  types: [], amenities: [], distance: null,
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

export const ActivitiesFilterSheet = ({ filters, setFilters, onClose }) => {
  const [draft, setDraft] = useState(filters);

  const toggleArr = (key, val) => {
    setDraft(d => {
      const cur = d[key] || [];
      return { ...d, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };
  const setDist = (val) => setDraft(d => ({ ...d, distance: val }));

  const reset = () => setDraft(ACTIVITIES_FILTER_DEFAULT);
  const apply = () => { setFilters(draft); onClose(); };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Refine activities
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Find <span style={{ fontStyle: 'italic', color: C.coral }}>your</span> kind of day
        </h3>

        <div className="mt-5">
          <SectionLabel>Cost</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {COST_OPTS.map(c => (
              <Chip key={c} active={draft.cost.includes(c)} onClick={() => toggleArr('cost', c)} accent={C.coral}>{c}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Setting</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {SETTING_OPTS.map(s => (
              <Chip key={s} active={draft.setting.includes(s)} onClick={() => toggleArr('setting', s)} accent={C.sageDark}>{s}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Day</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {DAY_OPTS.map(d => (
              <Chip key={d} active={draft.days.includes(d)} onClick={() => toggleArr('days', d)} accent={C.navy}>{d}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Time of day</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {TIME_OPTS.map(t => (
              <Chip key={t.id} active={draft.times.includes(t.id)} onClick={() => toggleArr('times', t.id)} accent={C.sageDark}>{t.label}</Chip>
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
          <SectionLabel>Activity type</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTS.map(t => (
              <Chip key={t} active={draft.types.includes(t)} onClick={() => toggleArr('types', t)} accent={C.coral}>{t}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionLabel>Must-haves</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {AMENITY_OPTS.map(a => (
              <Chip key={a} active={draft.amenities.includes(a)} onClick={() => toggleArr('amenities', a)} accent={C.sageDark}>{a}</Chip>
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
