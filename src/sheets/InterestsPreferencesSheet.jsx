import { useState } from 'react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { MOM_TYPES, VALUES, INTERESTS } from '../data/taxonomy';

// ==========================================================================
// InterestsPreferencesSheet — edit mom-types / values / interests. On Save it
// calls onSave({ momTypes, values, interests }) which persists via the API and
// updates local profile state.
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
  const [saving, setSaving] = useState(false);

  const toggle = (list, set, val) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const save = async () => {
    setSaving(true);
    await onSave?.({ momTypes, values, interests });
    setSaving(false);
    onClose();
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
              <Chip key={m.id} active={momTypes.includes(m.id)} onClick={() => toggle(momTypes, setMomTypes, m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label>Values</Label>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map(v => (
              <Chip key={v} active={values.includes(v)} onClick={() => toggle(values, setValues, v)}>{v}</Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label>Interests</Label>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map(i => (
              <Chip key={i.label} active={interests.includes(i.label)} onClick={() => toggle(interests, setInterests, i.label)}>
                {i.label}
              </Chip>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-7 w-full rounded-2xl flex items-center justify-center"
          style={{
            height: 50,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)', cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Sheet>
  );
};
