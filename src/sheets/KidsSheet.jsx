import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { KID_AGES } from '../data/taxonomy';

// ==========================================================================
// KidsSheet — edit kid age-band counts. On Save calls onSave({ kidsAges })
// which persists kids_ages via the API and updates local profile state.
// ==========================================================================

export const KidsSheet = ({ profile, onSave, onClose }) => {
  const [kidsAges, setKidsAges] = useState({ ...(profile?.kidsAges || {}) });
  const [saving, setSaving] = useState(false);

  const inc = (age) => setKidsAges(k => ({ ...k, [age]: Math.min(5, (k[age] || 0) + 1) }));
  const dec = (age) => setKidsAges(k => {
    const n = { ...k }; const v = (n[age] || 0) - 1;
    if (v <= 0) delete n[age]; else n[age] = v;
    return n;
  });

  const total = Object.values(kidsAges).reduce((s, n) => s + n, 0);
  const save = async () => { setSaving(true); await onSave?.({ kidsAges }); setSaving(false); onClose(); };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Your family
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Your <span style={{ fontStyle: 'italic', color: C.coral }}>kids</span>
        </h3>
        <p style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, marginTop: 4 }}>
          {total} {total === 1 ? 'kid' : 'kids'} · use +/- to set ages
        </p>

        <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
          {KID_AGES.map(age => {
            const count = kidsAges[age] || 0;
            const active = count > 0;
            return (
              <div key={age} className="rounded-full flex items-center overflow-hidden" style={{
                background: active ? C.coral : C.paper, color: active ? '#fff' : C.navy,
                border: `1px solid ${active ? C.coral : C.divider}`, fontFamily: 'Albert Sans',
              }}>
                <button onClick={() => dec(age)} disabled={!active} aria-label={`Remove ${age}`}
                  className="w-8 h-8 flex items-center justify-center" style={{ opacity: active ? 1 : 0.35 }}>
                  <Minus size={12}/>
                </button>
                <button onClick={() => inc(age)} className="h-8 px-1.5 flex items-center gap-1" aria-label={`Add ${age}`}>
                  <span className="text-[12px]" style={{ fontWeight: 600 }}>{age}</span>
                  {active && (
                    <span className="text-[11px] px-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.22)', fontWeight: 700 }}>
                      {count}
                    </span>
                  )}
                </button>
                <button onClick={() => inc(age)} disabled={count >= 5} aria-label={`Add one ${age}`}
                  className="w-8 h-8 flex items-center justify-center" style={{ opacity: count >= 5 ? 0.35 : 1 }}>
                  <Plus size={12}/>
                </button>
              </div>
            );
          })}
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
