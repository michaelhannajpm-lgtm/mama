import { useState } from 'react';
import { RotateCcw, MapPin, Baby, Sparkles, MessageSquare } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { KID_AGES } from '../data/taxonomy';
import {
  GROUP_TOPICS, GROUP_MOM_STAGES, GROUP_NEIGHBORHOODS,
} from '../data/discussions';

// ==========================================================================
// GroupsAdvancedFilterSheet — Plus-gated drawer that lets a mom narrow the
// "Popular Mom Groups" See-all by Topic / Kid age / Mom stage / Neighborhood.
// Draft state is local so taps don't re-render the underlying list until
// "Apply" is pressed.
// ==========================================================================

export const GROUPS_FILTER_DEFAULT = {
  topics: [],
  kidAges: [],
  momStages: [],
  neighborhoods: [],
};

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

export const GroupsAdvancedFilterSheet = ({ filters, setFilters, onClose }) => {
  const [draft, setDraft] = useState({ ...GROUPS_FILTER_DEFAULT, ...filters });

  const toggleArr = (key, val) => {
    setDraft(d => {
      const cur = d[key] || [];
      return { ...d, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };

  const reset = () => setDraft(GROUPS_FILTER_DEFAULT);
  const apply = () => { setFilters(draft); onClose(); };

  const count =
    draft.topics.length + draft.kidAges.length +
    draft.momStages.length + draft.neighborhoods.length;

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Refine groups
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Find your <span style={{ fontStyle: 'italic', color: C.sageDark }}>circle</span>
        </h3>

        {/* Topics */}
        <div className="mt-5">
          <SectionLabel icon={MessageSquare}>Topics moms discuss</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {GROUP_TOPICS.map(t => (
              <Chip
                key={t.id}
                active={draft.topics.includes(t.id)}
                onClick={() => toggleArr('topics', t.id)}
              >
                {t.label}
              </Chip>
            ))}
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
            {GROUP_MOM_STAGES.map(s => (
              <Chip
                key={s.id}
                active={draft.momStages.includes(s.id)}
                onClick={() => toggleArr('momStages', s.id)}
              >
                {s.label}
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
              background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: '0 6px 16px -6px rgba(94,122,59,.55)',
            }}
          >
            Apply{count ? ` · ${count}` : ''}
          </button>
        </div>
      </div>
    </Sheet>
  );
};
