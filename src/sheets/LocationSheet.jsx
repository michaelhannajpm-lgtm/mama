import { useState } from 'react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { NeighborhoodPicker } from '../components/NeighborhoodPicker';

// ==========================================================================
// LocationSheet — update neighborhood (onboarding-style picker) + travel
// radius. On Save calls onSave({ location, locationGeo, distance }) which
// updates app state and persists (neighborhood / city / home_lat·lng /
// distance_miles) via the API.
// ==========================================================================

const RADIUS_STOPS = [1, 3, 5, 10, 15, 25];

const Label = ({ children }) => (
  <div className="uppercase" style={{
    fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
    color: C.muted, fontWeight: 700, marginBottom: 8,
  }}>
    {children}
  </div>
);

export const LocationSheet = ({ location, locationGeo, distance, onSave, onClose }) => {
  const [geo, setGeo] = useState(locationGeo || null);
  const [label, setLabel] = useState(location || '');
  const [radius, setRadius] = useState(distance ?? 5);
  const [saving, setSaving] = useState(false);

  const onSelect = (entry) => { setGeo(entry); setLabel(entry?.label || ''); };
  const save = async () => {
    setSaving(true);
    await onSave?.({ location: label, locationGeo: geo, distance: radius });
    setSaving(false);
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Where you are
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Your <span style={{ fontStyle: 'italic', color: C.coral }}>location</span>
        </h3>

        <div className="mt-5">
          <Label>Neighborhood</Label>
          <NeighborhoodPicker value={geo} onSelect={onSelect}/>
        </div>

        <div className="mt-5">
          <Label>How far you’ll travel</Label>
          <div className="flex flex-wrap gap-1.5">
            {RADIUS_STOPS.map(r => {
              const active = radius === r;
              return (
                <button key={r} onClick={() => setRadius(r)} style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: active ? C.coral : C.paper, color: active ? '#fff' : C.navy,
                  border: `1px solid ${active ? C.coral : C.divider}`,
                  fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {r === 25 ? '25+ mi' : `${r} mi`}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="mt-7 w-full rounded-2xl flex items-center justify-center"
          style={{
            height: 50, background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)', cursor: saving ? 'default' : 'pointer',
          }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Sheet>
  );
};
