import { useState } from 'react';
import {
  RotateCcw, MapPin, Baby, Sparkles, ShieldCheck,
  CalendarDays, Clock, Heart, Compass,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import {
  KID_AGES, MOM_TYPES, VALUES, INTERESTS, DAYS, TIME_WINDOWS,
} from '../data/taxonomy';
import { GROUP_NEIGHBORHOODS } from '../data/discussions';

// ==========================================================================
// MomsAdvancedFilterSheet — Plus-gated drawer that narrows the "Recommended
// Moms for you" See-all. Mirrors GroupsAdvancedFilterSheet structurally
// (coral accent for moms, sage for groups). Categories cover everything a
// mom actually searches for: distance, kid age, stage, interests, values,
// neighborhood, availability (day + time), and verified-only.
// Draft state is local so taps don't re-render the list until "Apply".
// ==========================================================================

export const MOMS_FILTER_DEFAULT = {
  distanceMi: null,         // 1 | 3 | 5 | 10 | 25 (null = any)
  kidAges:     [],           // taxonomy KID_AGES
  momTypes:    [],           // taxonomy MOM_TYPES ids
  interests:   [],           // taxonomy INTERESTS labels
  values:      [],           // taxonomy VALUES
  neighborhoods: [],         // GROUP_NEIGHBORHOODS
  days:        [],           // taxonomy DAYS
  times:       [],           // taxonomy TIME_WINDOWS ids
  verifiedOnly: true,
};

export const momsFilterCount = (f) => {
  if (!f) return 0;
  return (f.distanceMi != null ? 1 : 0)
    + (f.kidAges?.length || 0)
    + (f.momTypes?.length || 0)
    + (f.interests?.length || 0)
    + (f.values?.length || 0)
    + (f.neighborhoods?.length || 0)
    + (f.days?.length || 0)
    + (f.times?.length || 0)
    + (f.verifiedOnly === false ? 1 : 0);
};

const DISTANCE_OPTIONS = [
  { id: 1,  label: '< 1 mi' },
  { id: 3,  label: '< 3 mi' },
  { id: 5,  label: '< 5 mi' },
  { id: 10, label: '< 10 mi' },
  { id: 25, label: '< 25 mi' },
];

const Chip = ({ active, onClick, children, accent = C.coralDeep, icon: Icon }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97] flex items-center gap-1.5"
    style={{
      padding: '7px 12px',
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

const SectionLabel = ({ icon: Icon, children }) => (
  <div
    className="uppercase flex items-center gap-1.5"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 8,
    }}
  >
    {Icon && <Icon size={11}/>}
    {children}
  </div>
);

export const MomsAdvancedFilterSheet = ({ filters, setFilters, onClose }) => {
  const [draft, setDraft] = useState({ ...MOMS_FILTER_DEFAULT, ...filters });

  const toggleArr = (key, val) => {
    setDraft(d => {
      const cur = d[key] || [];
      return { ...d, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };
  const setOne = (key, val) => setDraft(d => ({ ...d, [key]: d[key] === val ? null : val }));

  const reset = () => setDraft(MOMS_FILTER_DEFAULT);
  const apply = () => { setFilters(draft); onClose(); };

  const count = momsFilterCount(draft);

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Refine matches
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Find your <span style={{ fontStyle: 'italic', color: C.coralDeep }}>people</span>
        </h3>

        {/* Distance */}
        <div className="mt-5">
          <SectionLabel icon={MapPin}>Distance from you</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_OPTIONS.map(d => (
              <Chip
                key={d.id}
                active={draft.distanceMi === d.id}
                onClick={() => setOne('distanceMi', d.id)}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Verified only */}
        <div className="mt-5">
          <SectionLabel icon={ShieldCheck}>Trust signal</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={draft.verifiedOnly}
              onClick={() => setDraft(d => ({ ...d, verifiedOnly: !d.verifiedOnly }))}
              icon={ShieldCheck}
            >
              Verified moms only
            </Chip>
          </div>
        </div>

        {/* Kid ages */}
        <div className="mt-5">
          <SectionLabel icon={Baby}>Kid age</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {KID_AGES.map(a => (
              <Chip
                key={a}
                active={draft.kidAges.includes(a)}
                onClick={() => toggleArr('kidAges', a)}
              >
                {a} yrs
              </Chip>
            ))}
          </div>
        </div>

        {/* Mom stage */}
        <div className="mt-5">
          <SectionLabel icon={Sparkles}>Mom stage</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {MOM_TYPES.map(t => (
              <Chip
                key={t.id}
                active={draft.momTypes.includes(t.id)}
                onClick={() => toggleArr('momTypes', t.id)}
                icon={t.icon}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="mt-5">
          <SectionLabel icon={Heart}>Interests</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map(i => (
              <Chip
                key={i.label}
                active={draft.interests.includes(i.label)}
                onClick={() => toggleArr('interests', i.label)}
                icon={i.icon}
              >
                {i.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mt-5">
          <SectionLabel icon={Compass}>Values</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map(v => (
              <Chip
                key={v}
                active={draft.values.includes(v)}
                onClick={() => toggleArr('values', v)}
              >
                {v}
              </Chip>
            ))}
          </div>
        </div>

        {/* Availability — days */}
        <div className="mt-5">
          <SectionLabel icon={CalendarDays}>Free days</SectionLabel>
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

        {/* Availability — time windows */}
        <div className="mt-5">
          <SectionLabel icon={Clock}>Free times</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {TIME_WINDOWS.map(t => (
              <Chip
                key={t.id}
                active={draft.times.includes(t.id)}
                onClick={() => toggleArr('times', t.id)}
              >
                <span style={{ marginRight: 2 }}>{t.emoji}</span> {t.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Neighborhood */}
        <div className="mt-5">
          <SectionLabel icon={MapPin}>Neighborhood</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {GROUP_NEIGHBORHOODS.map(n => (
              <Chip
                key={n}
                active={draft.neighborhoods.includes(n)}
                onClick={() => toggleArr('neighborhoods', n)}
                accent={C.navy}
              >
                {n}
              </Chip>
            ))}
          </div>
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
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)',
            }}
          >
            Apply{count ? ` · ${count}` : ''}
          </button>
        </div>
      </div>
    </Sheet>
  );
};
