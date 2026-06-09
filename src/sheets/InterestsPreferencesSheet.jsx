import { useState } from 'react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { MOM_TYPES, VALUES, INTERESTS } from '../data/taxonomy';

// ==========================================================================
// InterestsPreferencesSheet — edit mom-types / values / interests. Auto-saves:
// every chip tap calls onSave({ <field>: next }) which persists via the API and
// updates local profile state. No Save button — close when done.
// ==========================================================================

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97]"
    style={{
      padding: '8px 13px',
      background: active ? C.coral : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? C.coral : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const Label = ({ children }) => (
  <div className="uppercase" style={{
    fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
    color: C.muted, fontWeight: 700, marginBottom: 8,
  }}>
    {children}
  </div>
);

export const InterestsPreferencesSheet = ({ profile, onSave, onClose }) => {
  const [momTypes, setMomTypes] = useState(profile?.momTypes || []);
  const [values, setValues]     = useState(profile?.values || []);
  const [interests, setInterests] = useState(profile?.interests || []);

  // Auto-save: each toggle updates local state and persists just that field.
  const toggleMom = (val) => {
    const next = momTypes.includes(val) ? momTypes.filter(x => x !== val) : [...momTypes, val];
    setMomTypes(next);
    onSave?.({ momTypes: next });
  };
  const toggleValue = (val) => {
    const next = values.includes(val) ? values.filter(x => x !== val) : [...values, val];
    setValues(next);
    onSave?.({ values: next });
  };
  const toggleInterest = (val) => {
    const next = interests.includes(val) ? interests.filter(x => x !== val) : [...interests, val];
    setInterests(next);
    onSave?.({ interests: next });
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          About you
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Interests &amp; <span style={{ fontStyle: 'italic', color: C.coral }}>preferences</span>
        </h3>

        <div className="mt-5">
          <Label>Mom type</Label>
          <div className="flex flex-wrap gap-1.5">
            {MOM_TYPES.map(m => (
              <Chip key={m.id} active={momTypes.includes(m.id)} onClick={() => toggleMom(m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label>Values</Label>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map(v => (
              <Chip key={v} active={values.includes(v)} onClick={() => toggleValue(v)}>{v}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label>Interests</Label>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map(i => (
              <Chip key={i.label} active={interests.includes(i.label)} onClick={() => toggleInterest(i.label)}>
                {i.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-7 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted }}>
          Changes save automatically.
        </div>
      </div>
    </Sheet>
  );
};
