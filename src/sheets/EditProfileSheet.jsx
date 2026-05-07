import { useState } from 'react';
import { Check, Plus, Minus, X } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Pill } from '../components/Pill';
import {
  MOM_TYPES, VALUES, VALUE_NO_PREF, INTERESTS, INTEREST_NO_PREF, KID_AGES,
} from '../data/taxonomy';

export const EditProfileSheet = ({ profile, setProfile, onClose }) => {
  const [draft, setDraft] = useState(() => ({
    kidsAges: { ...(profile.kidsAges || {}) },
    momTypes: [...(profile.momTypes || [])],
    values:   [...(profile.values   || [])],
    interests:[...(profile.interests|| [])],
    bio:      profile.bio || '',
  }));

  const incKid = (age) => {
    const cur = draft.kidsAges[age] || 0;
    if (cur >= 5) return;
    setDraft(d => ({ ...d, kidsAges: { ...d.kidsAges, [age]: cur + 1 } }));
  };
  const decKid = (age) => {
    setDraft(d => {
      const next = { ...d.kidsAges };
      const c = (next[age] || 0) - 1;
      if (c <= 0) delete next[age]; else next[age] = c;
      return { ...d, kidsAges: next };
    });
  };

  const toggleMomType = (id) =>
    setDraft(d => ({ ...d, momTypes: d.momTypes.includes(id) ? d.momTypes.filter(x=>x!==id) : [...d.momTypes, id] }));

  const toggleValue = (v) => setDraft(d => {
    if (d.values.includes(v)) return { ...d, values: d.values.filter(x=>x!==v) };
    if (v === VALUE_NO_PREF) return { ...d, values: [VALUE_NO_PREF] };
    const cleaned = d.values.filter(x => x !== VALUE_NO_PREF);
    if (cleaned.length >= 3) return d;
    return { ...d, values: [...cleaned, v] };
  });

  const toggleInterest = (v) => setDraft(d => {
    if (d.interests.includes(v)) return { ...d, interests: d.interests.filter(x=>x!==v) };
    if (v === INTEREST_NO_PREF) return { ...d, interests: [INTEREST_NO_PREF] };
    const cleaned = d.interests.filter(x => x !== INTEREST_NO_PREF);
    return { ...d, interests: [...cleaned, v] };
  });

  const handleSave = () => {
    setProfile(p => ({ ...p, ...draft }));
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500, color: C.ink, letterSpacing:'-.02em' }}>
            Edit your profile
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5" style={{ background: C.creamSoft, color: C.inkSoft }}>
            <X size={16}/>
          </button>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <div className="text-[11px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Bio
          </div>
          <textarea
            value={draft.bio}
            onChange={e => setDraft(d => ({ ...d, bio: e.target.value.slice(0, 280) }))}
            placeholder="A line or two about you — moms read this first."
            rows={3}
            className="w-full rounded-2xl px-3 py-2 text-[13.5px] outline-none resize-none"
            style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans' }}
          />
          <div className="text-[10.5px] mt-1" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
            {draft.bio.length}/280
          </div>
        </div>

        {/* Kids */}
        <div className="mb-4">
          <div className="text-[11px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Kids · ages
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KID_AGES.map(age => {
              const count = draft.kidsAges[age] || 0;
              const active = count > 0;
              return (
                <div key={age} className="flex items-center rounded-full" style={{
                  background: active ? C.terracotta : C.paper,
                  color: active ? '#fff' : C.ink,
                  border: `1px solid ${active ? C.terracotta : C.divider}`,
                }}>
                  <button onClick={() => decKid(age)} disabled={!count} className="px-2 py-1.5" aria-label={`Remove one ${age}`}>
                    <Minus size={11}/>
                  </button>
                  <div className="px-1 text-[12px]" style={{ fontFamily:'Albert Sans', fontWeight:500 }}>
                    {age}{count > 0 ? ` · ${count}` : ''}
                  </div>
                  <button onClick={() => incKid(age)} className="px-2 py-1.5" aria-label={`Add one ${age}`}>
                    <Plus size={11}/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mom types */}
        <div className="mb-4">
          <div className="text-[11px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            You are a…
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MOM_TYPES.map(t => (
              <Pill key={t.id} active={draft.momTypes.includes(t.id)} onClick={() => toggleMomType(t.id)}>
                <t.icon size={11}/> {t.label}
              </Pill>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mb-4">
          <div className="text-[11px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Values · pick up to 3
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map(v => (
              <Pill key={v} active={draft.values.includes(v)} onClick={() => toggleValue(v)}>
                {v}
              </Pill>
            ))}
            <Pill active={draft.values.includes(VALUE_NO_PREF)} onClick={() => toggleValue(VALUE_NO_PREF)}>
              {VALUE_NO_PREF}
            </Pill>
          </div>
        </div>

        {/* Interests */}
        <div className="mb-5">
          <div className="text-[11px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Interests
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map(it => (
              <Pill key={it.label} active={draft.interests.includes(it.label)} onClick={() => toggleInterest(it.label)}>
                <it.icon size={11}/> {it.label}
              </Pill>
            ))}
            <Pill active={draft.interests.includes(INTEREST_NO_PREF)} onClick={() => toggleInterest(INTEREST_NO_PREF)}>
              {INTEREST_NO_PREF}
            </Pill>
          </div>
        </div>

        <button onClick={handleSave} className="w-full rounded-2xl flex items-center justify-center gap-2" style={{
          height: 48, background: C.ink, color: C.cream,
          fontFamily:'Albert Sans', fontWeight:600, fontSize: 13.5,
        }}>
          <Check size={15}/> Save changes
        </button>
      </div>
    </Sheet>
  );
};
