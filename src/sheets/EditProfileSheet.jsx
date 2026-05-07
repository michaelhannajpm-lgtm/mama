import { useState } from 'react';
import { X, Check, Instagram } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import {
  MOM_TYPES, VALUES, INTERESTS, KID_AGES,
} from '../data/taxonomy';

const Section = ({ title, hint, children }) => (
  <div className="mb-5">
    <div className="flex items-baseline justify-between mb-2">
      <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: C.ink, letterSpacing: '-.01em' }}>
        {title}
      </h3>
      {hint && (
        <div className="text-[10.5px]" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>{hint}</div>
      )}
    </div>
    <div className="rounded-[18px] p-4" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
      {children}
    </div>
  </div>
);

const Chip = ({ active, onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled}
    className="rounded-full px-3 py-1.5 text-[12px] flex items-center gap-1 transition-colors"
    style={{
      background: active ? C.terracotta : 'transparent',
      color: active ? '#fff' : (disabled ? C.inkMuted : C.ink),
      border: `1px solid ${active ? C.terracotta : C.divider}`,
      fontFamily: 'Albert Sans', fontWeight: active ? 600 : 500,
      opacity: disabled && !active ? 0.45 : 1,
    }}>
    {children}
  </button>
);

export const EditProfileSheet = ({ profile, setProfile, onClose }) => {
  const [draft, setDraft] = useState(() => ({
    bio: profile.bio || '',
    kidsAges: { ...(profile.kidsAges || {}) },
    primaryType: profile.momTypes?.[0] || null,
    values: [...(profile.values || [])],
    interests: [...(profile.interests || [])],
    socialLinks: { ...(profile.socialLinks || {}) },
  }));

  const toggleKidAge = (age) => {
    setDraft(d => {
      const next = { ...d.kidsAges };
      if (next[age]) delete next[age]; else next[age] = 1;
      return { ...d, kidsAges: next };
    });
  };

  const setPrimaryType = (id) => setDraft(d => ({ ...d, primaryType: d.primaryType === id ? null : id }));

  const toggleValue = (v) => setDraft(d => {
    if (d.values.includes(v)) return { ...d, values: d.values.filter(x => x !== v) };
    if (d.values.length >= 3) return d;
    return { ...d, values: [...d.values, v] };
  });

  const toggleInterest = (label) => setDraft(d => ({
    ...d,
    interests: d.interests.includes(label) ? d.interests.filter(x => x !== label) : [...d.interests, label],
  }));

  const setSocial = (key, value) => setDraft(d => ({
    ...d,
    socialLinks: { ...d.socialLinks, [key]: value },
  }));

  const handleSave = () => {
    setProfile(p => ({
      ...p,
      bio: draft.bio.trim(),
      kidsAges: draft.kidsAges,
      momTypes: draft.primaryType ? [draft.primaryType] : [],
      values: draft.values,
      interests: draft.interests,
      socialLinks: draft.socialLinks,
    }));
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b" style={{ borderColor: C.divider, background: C.cream }}>
        <button onClick={onClose} aria-label="Close" className="rounded-full p-2 -ml-2" style={{ color: C.inkSoft }}>
          <X size={18}/>
        </button>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: C.ink, letterSpacing: '-.01em' }}>
          Profile
        </h2>
        <button onClick={handleSave}
          className="rounded-full px-3 py-1.5 flex items-center gap-1"
          style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Check size={13}/> Save
        </button>
      </div>

      <div className="px-5 pt-4 pb-8 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Bio */}
        <Section title="About you" hint={`${draft.bio.length}/280`}>
          <textarea
            value={draft.bio}
            onChange={e => setDraft(d => ({ ...d, bio: e.target.value.slice(0, 280) }))}
            placeholder="A line or two about you — moms read this first."
            rows={3}
            className="w-full bg-transparent outline-none text-[14px] resize-none"
            style={{ fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5 }}
          />
        </Section>

        {/* Kids */}
        <Section title="Your kids" hint="Tap age ranges that apply">
          <div className="flex flex-wrap gap-2">
            {KID_AGES.map(age => (
              <Chip key={age} active={!!draft.kidsAges[age]} onClick={() => toggleKidAge(age)}>
                {age}
              </Chip>
            ))}
          </div>
        </Section>

        {/* Mom type — single select */}
        <Section title="You are…" hint="Pick one that fits best">
          <div className="flex flex-wrap gap-2">
            {MOM_TYPES.filter(t => t.id !== 'prefer_not').map(t => (
              <Chip key={t.id} active={draft.primaryType === t.id} onClick={() => setPrimaryType(t.id)}>
                <t.icon size={11}/> {t.label}
              </Chip>
            ))}
          </div>
        </Section>

        {/* Values — max 3 */}
        <Section title="What matters to you" hint={`${draft.values.length}/3`}>
          <div className="flex flex-wrap gap-2">
            {VALUES.map(v => {
              const active = draft.values.includes(v);
              const atMax = draft.values.length >= 3 && !active;
              return (
                <Chip key={v} active={active} onClick={() => toggleValue(v)} disabled={atMax}>
                  {v}
                </Chip>
              );
            })}
          </div>
        </Section>

        {/* Interests */}
        <Section title="Things you love">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(it => (
              <Chip key={it.label} active={draft.interests.includes(it.label)} onClick={() => toggleInterest(it.label)}>
                <it.icon size={11}/> {it.label}
              </Chip>
            ))}
          </div>
        </Section>

        {/* Social — optional */}
        <Section title="Social" hint="Optional · helps moms verify it's really you">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-xl px-3" style={{
              background: C.cream, border: `1px solid ${C.divider}`, height: 42,
            }}>
              <Instagram size={15} style={{ color: C.inkSoft }}/>
              <input
                value={draft.socialLinks.instagram || ''}
                onChange={e => setSocial('instagram', e.target.value)}
                placeholder="@yourhandle"
                className="flex-1 bg-transparent outline-none text-[13px]"
                style={{ fontFamily: 'Albert Sans', color: C.ink }}
              />
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-3" style={{
              background: C.cream, border: `1px solid ${C.divider}`, height: 42,
            }}>
              <span className="text-[13px]" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.inkSoft, width: 15, textAlign: 'center' }}>♪</span>
              <input
                value={draft.socialLinks.tiktok || ''}
                onChange={e => setSocial('tiktok', e.target.value)}
                placeholder="TikTok @handle"
                className="flex-1 bg-transparent outline-none text-[13px]"
                style={{ fontFamily: 'Albert Sans', color: C.ink }}
              />
            </div>
          </div>
        </Section>

        <div className="text-[11px] mt-2 mb-1 text-center" style={{ fontFamily: 'Albert Sans', color: C.inkMuted }}>
          Changes save when you tap <strong style={{ color: C.ink }}>Save</strong> at the top.
        </div>
      </div>
    </Sheet>
  );
};
