import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { C } from '../theme';
import { KID_AGES } from '../data/taxonomy';

// ==========================================================================
// KidsSheet — per-child family details, mirroring the warm card style of
// onboarding. Each child is a card: optional name, an age band, and an
// optional gender. Richer than the old counts-only editor.
//
// Persistence: derives kids_ages counts (for matching / "Mom of N" / the
// completion step) AND stores the full per-child list in settings.kids so the
// names + genders survive. onSave({ kidsAges, settings }).
// ==========================================================================

const STAGE_EMOJI = { '0–1': '👶', '1–3': '🧒', '3–5': '🧒', '5–8': '🧒', '8–12': '🧑', '12–18': '🧑' };
const childEmoji = (c) => (c.gender === 'boy' ? '👦' : c.gender === 'girl' ? '👧' : (STAGE_EMOJI[c.age] || '🧒'));
const avatarBg = (c) => (c.gender === 'girl' ? C.coralSoft : c.gender === 'boy' ? C.lilac : C.peach);

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97]"
    style={{
      padding: '7px 13px',
      background: active ? C.coral : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? C.coral : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const FieldLabel = ({ children }) => (
  <div className="uppercase" style={{
    fontFamily: 'Albert Sans', fontSize: 10, letterSpacing: '.14em', color: C.muted, fontWeight: 700, marginBottom: 7,
  }}>
    {children}
  </div>
);

export const KidsSheet = ({ profile, onSave, onClose }) => {
  const idRef = useRef(0);
  const newId = () => ++idRef.current;

  // Seed from settings.kids (rich) if present, else reconstruct generic children
  // from the kids_ages counts so nothing is lost on first open of the new sheet.
  const initKids = () => {
    const rich = profile?.settings?.kids;
    if (Array.isArray(rich) && rich.length) {
      return rich.map(c => ({ id: newId(), age: c.age || '1–3', name: c.name || '', gender: c.gender || null }));
    }
    const out = [];
    Object.entries(profile?.kidsAges || {}).forEach(([age, n]) => {
      for (let i = 0; i < (Number(n) || 0); i++) out.push({ id: newId(), age, name: '', gender: null });
    });
    return out;
  };

  const [kids, setKids] = useState(initKids);
  const [saving, setSaving] = useState(false);

  const addChild = () => setKids(k => [...k, { id: newId(), age: '1–3', name: '', gender: null }]);
  const removeChild = (id) => setKids(k => k.filter(c => c.id !== id));
  const updateChild = (id, patch) => setKids(k => k.map(c => (c.id === id ? { ...c, ...patch } : c)));

  const save = async () => {
    setSaving(true);
    const kidsAges = {};
    kids.forEach(c => { if (c.age) kidsAges[c.age] = (kidsAges[c.age] || 0) + 1; });
    // Strip the local React id before persisting the rich list.
    const cleanKids = kids.map(({ age, name, gender }) => ({ age, name: name.trim(), gender: gender || null }));
    await onSave?.({ kidsAges, settings: { ...(profile?.settings || {}), kids: cleanKids } });
    setSaving(false);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: C.cream, animation: 'slideUp .3s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header — back arrow + eyebrow. Full-screen panel, matching the
          Interests sheet. */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.divider}` }}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
            Your family
          </div>
          <button onClick={onClose} aria-label="Close" className="active:scale-[.94] transition-transform" style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={15} color={C.ink} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 14, paddingBottom: 14 }}>
        <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Your <span style={{ fontStyle: 'italic', color: C.coral }}>kids</span>
        </h3>
        <p style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
          A little about each one helps us match you with moms whose kids are the same age.
        </p>

        {/* Child cards */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kids.map((c, i) => (
            <div key={c.id} style={{
              background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 14,
              boxShadow: '0 4px 12px -10px rgba(27,42,78,.22)',
            }}>
              {/* Header row: avatar · name · remove */}
              <div className="flex items-center gap-3">
                <div style={{
                  width: 42, height: 42, borderRadius: 21, background: avatarBg(c), flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
                }}>
                  {childEmoji(c)}
                </div>
                <input
                  value={c.name}
                  onChange={e => updateChild(c.id, { name: e.target.value })}
                  placeholder={`Add a name (optional)`}
                  maxLength={24}
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700, color: C.navy, minWidth: 0 }}
                />
                <button onClick={() => removeChild(c.id)} aria-label="Remove child" style={{
                  width: 28, height: 28, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                  background: C.cream, border: `1px solid ${C.divider}`, color: C.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={13} />
                </button>
              </div>

              {/* Age */}
              <div style={{ marginTop: 13 }}>
                <FieldLabel>Age</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {KID_AGES.map(a => (
                    <Chip key={a} active={c.age === a} onClick={() => updateChild(c.id, { age: a })}>{a}</Chip>
                  ))}
                </div>
              </div>

              {/* Gender (optional) */}
              <div style={{ marginTop: 13 }}>
                <FieldLabel>Gender · optional</FieldLabel>
                <div className="flex gap-2">
                  {[['boy', '👦', 'Boy'], ['girl', '👧', 'Girl']].map(([g, emoji, label]) => {
                    const active = c.gender === g;
                    return (
                      <button
                        key={g}
                        onClick={() => updateChild(c.id, { gender: active ? null : g })}
                        className="flex items-center justify-center gap-1.5 transition-all active:scale-[.98]"
                        style={{
                          flex: 1, height: 40, borderRadius: 12, cursor: 'pointer',
                          background: active ? C.coralSoft : C.paper,
                          border: `1.5px solid ${active ? C.coral : C.divider}`,
                          fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
                          color: active ? C.coralDeep : C.navy,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{emoji}</span> {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add a child */}
        <button onClick={addChild} className="active:scale-[.99] transition-transform" style={{
          marginTop: 12, width: '100%', borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
          background: 'transparent', border: `1.5px dashed ${C.coral}`, color: C.coralDeep,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 800,
        }}>
          <Plus size={16} /> {kids.length ? 'Add another child' : 'Add your first child'}
        </button>

        {kids.length === 0 && (
          <p className="text-center" style={{ marginTop: 12, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
            Tell us about your littles — just their age is enough to start.
          </p>
        )}
      </div>

      {/* Footer — single coral CTA */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.divider}`, background: C.cream }}>
        <button onClick={save} disabled={saving}
          className="w-full rounded-2xl flex items-center justify-center active:scale-[.99] transition-transform"
          style={{
            height: 52, border: 'none', borderRadius: 16,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14.5,
            boxShadow: '0 8px 18px -8px rgba(214,68,106,.55)', cursor: saving ? 'default' : 'pointer',
          }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};
