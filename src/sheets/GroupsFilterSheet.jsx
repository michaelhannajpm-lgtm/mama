import { useState } from 'react';
import { RotateCcw, Home, TreePine, DollarSign, Baby } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { KID_AGES, DAYS, TIME_WINDOWS } from '../data/taxonomy';

const DISTANCE_PRESETS = [
  { val: 1,  label: '< 1 mi' },
  { val: 3,  label: '< 3 mi' },
  { val: 5,  label: '< 5 mi' },
  { val: 10, label: '< 10 mi' },
  { val: null, label: 'Any' },
];

const GROUP_SIZES = [
  { id: 'small', label: 'Small · < 8 going' },
  { id: 'mid',   label: 'Medium · 8–15'    },
  { id: 'large', label: 'Large · 15+'      },
];

const COST = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
];

const VENUE = [
  { id: 'indoor',  label: 'Indoor',  icon: Home     },
  { id: 'outdoor', label: 'Outdoor', icon: TreePine },
];

const Chip = ({ active, onClick, children, accent = C.sageDark, icon: Icon }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97] flex items-center gap-1.5"
    style={{
      padding: '8px 12px',
      background: active ? accent : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}
  >
    {Icon && <Icon size={13}/>}
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

const Toggle = ({ active, onClick, icon: Icon, title, sub }) => (
  <button
    onClick={onClick}
    className="w-full rounded-2xl flex items-center gap-2.5 transition-all"
    style={{
      padding: '12px 14px',
      background: active ? C.sage : C.paper,
      border: `1px solid ${active ? C.sageDark : C.divider}`,
      textAlign: 'left',
    }}
  >
    {Icon && <Icon size={18} color={active ? C.sageDark : C.muted}/>}
    <div className="flex-1">
      <div
        style={{
          fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy,
        }}
      >
        {title}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted, marginTop: 1,
          }}
        >
          {sub}
        </div>
      )}
    </div>
    <div
      style={{
        width: 36, height: 22, borderRadius: 11,
        background: active ? C.sageDark : C.divider,
        position: 'relative',
        transition: 'background .2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2, left: active ? 16 : 2,
          width: 18, height: 18, borderRadius: 9,
          background: '#fff',
          transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.18)',
        }}
      />
    </div>
  </button>
);

export const GroupsFilterSheet = ({ filters, setFilters, onClose }) => {
  const [draft, setDraft] = useState(filters);

  const toggleArr = (key, val) => {
    setDraft(d => {
      const cur = d[key] || [];
      return { ...d, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };

  const setOne = (key, val) => setDraft(d => ({ ...d, [key]: val }));
  const setBool = (key, v) => setDraft(d => ({ ...d, [key]: v }));

  const reset = () => {
    setDraft({
      days: [], times: [], kidAges: [], sizes: [], venues: [], costs: [],
      distance: null, strollerOk: false, recurringOnly: false,
    });
  };

  const apply = () => {
    setFilters(draft);
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Refine meetups
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Find a <span style={{ fontStyle: 'italic', color: C.sageDark }}>fit</span> for your week
        </h3>

        {/* Day */}
        <div className="mt-5">
          <SectionLabel>Day</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(d => (
              <Chip
                key={d}
                active={draft.days.includes(d)}
                onClick={() => toggleArr('days', d)}
              >
                {d}
              </Chip>
            ))}
          </div>
        </div>

        {/* Time of day */}
        <div className="mt-5">
          <SectionLabel>Time of day</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {TIME_WINDOWS.map(w => (
              <Chip
                key={w.id}
                active={draft.times.includes(w.id)}
                onClick={() => toggleArr('times', w.id)}
              >
                {w.emoji} {w.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Kid ages */}
        <div className="mt-5">
          <SectionLabel>For these kid ages</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {KID_AGES.map(a => (
              <Chip
                key={a}
                active={draft.kidAges.includes(a)}
                onClick={() => toggleArr('kidAges', a)}
              >
                {a}
              </Chip>
            ))}
          </div>
        </div>

        {/* Venue */}
        <div className="mt-5">
          <SectionLabel>Venue</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {VENUE.map(v => (
              <Chip
                key={v.id}
                active={draft.venues.includes(v.id)}
                onClick={() => toggleArr('venues', v.id)}
                icon={v.icon}
              >
                {v.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Cost */}
        <div className="mt-5">
          <SectionLabel>Cost</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {COST.map(c => (
              <Chip
                key={c.id}
                active={draft.costs.includes(c.id)}
                onClick={() => toggleArr('costs', c.id)}
                icon={c.id === 'free' ? DollarSign : null}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Group size */}
        <div className="mt-5">
          <SectionLabel>Group size</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {GROUP_SIZES.map(g => (
              <Chip
                key={g.id}
                active={draft.sizes.includes(g.id)}
                onClick={() => toggleArr('sizes', g.id)}
              >
                {g.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div className="mt-5">
          <SectionLabel>Distance</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_PRESETS.map(d => (
              <Chip
                key={d.label}
                active={draft.distance === d.val}
                onClick={() => setOne('distance', d.val)}
                accent={C.navy}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Stroller + recurring toggles */}
        <div className="mt-5 space-y-2">
          <Toggle
            active={draft.strollerOk}
            onClick={() => setBool('strollerOk', !draft.strollerOk)}
            icon={Baby}
            title="Stroller-friendly"
            sub="Easy access, paved or smooth ground"
          />
          <Toggle
            active={draft.recurringOnly}
            onClick={() => setBool('recurringOnly', !draft.recurringOnly)}
            title="Recurring meetups only"
            sub="Weekly groups where you'll see the same moms"
          />
        </div>

        {/* Footer */}
        <div className="mt-7 flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-2xl flex items-center justify-center gap-1.5"
            style={{
              height: 50, padding: '0 16px',
              background: C.paper,
              border: `1px solid ${C.divider}`,
              color: C.navy,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13,
            }}
          >
            <RotateCcw size={14}/> Reset
          </button>
          <button
            onClick={apply}
            className="flex-1 rounded-2xl flex items-center justify-center"
            style={{
              height: 50,
              background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: '0 6px 16px -6px rgba(94,122,59,.55)',
            }}
          >
            Apply filters
          </button>
        </div>
      </div>
    </Sheet>
  );
};
