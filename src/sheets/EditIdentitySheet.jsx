import { useState } from 'react';
import { Check, AtSign } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { updateMomProfile } from '../lib/onboarding';

// ==========================================================================
// EditIdentitySheet — edit display name + unique @handle (mom_profiles
// display_name / username). The handle is normalized (lowercase a-z0-9_, 3-30)
// and enforced unique by the DB; a clash surfaces as "handle already taken".
// ==========================================================================

const normHandle = (raw) => String(raw || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

const Field = ({ children }) => (
  <div className="rounded-[14px]" style={{ background: C.paper, border: `1px solid ${C.divider}`, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8, height: 46 }}>
    {children}
  </div>
);

export const EditIdentitySheet = ({ displayName = '', username = '', seedMomId, onSaved, flash, onClose }) => {
  const [name, setName] = useState(displayName);
  const [handle, setHandle] = useState(username);
  const [saving, setSaving] = useState(false);

  const cleanName = name.trim();
  const cleanHandle = normHandle(handle);
  const nameOk = cleanName.length >= 1;
  const handleOk = cleanHandle.length >= 3;
  const canSave = nameOk && handleOk && !saving;

  const save = async () => {
    if (!canSave) return;
    const patch = {};
    if (cleanName !== displayName) patch.display_name = cleanName;
    if (cleanHandle !== username) patch.username = cleanHandle;
    if (Object.keys(patch).length === 0) { onClose(); return; }

    setSaving(true);
    try {
      await updateMomProfile(patch, { seedMomId });
      onSaved?.({ displayName: cleanName, username: cleanHandle });
      flash?.('✦ Profile updated');
      onClose();
    } catch (e) {
      flash?.(e?.status === 409 ? 'That handle is already taken' : (e?.message || 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Your identity
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Name &amp; <span style={{ fontStyle: 'italic', color: C.coral }}>handle</span>
        </h3>

        <div className="mt-5">
          <div className="uppercase" style={{ fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em', color: C.muted, fontWeight: 700, marginBottom: 8 }}>
            Display name
          </div>
          <Field>
            <input
              value={name}
              onChange={e => setName(e.target.value.slice(0, 60))}
              placeholder="e.g. Sara K."
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ fontFamily: 'Albert Sans', color: C.navy }}
            />
          </Field>
        </div>

        <div className="mt-5">
          <div className="uppercase" style={{ fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em', color: C.muted, fontWeight: 700, marginBottom: 8 }}>
            Handle
          </div>
          <Field>
            <AtSign size={15} color={C.muted}/>
            <input
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect="off"
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ fontFamily: 'Albert Sans', color: C.navy }}
            />
          </Field>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 6 }}>
            {cleanHandle ? `@${cleanHandle}` : 'Letters, numbers, underscores · 3–30 chars'} · must be unique
          </div>
        </div>

        <button
          onClick={save}
          disabled={!canSave}
          className="mt-7 w-full rounded-2xl flex items-center justify-center gap-1.5 active:scale-[.99] transition-transform"
          style={{
            height: 52,
            background: canSave ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : C.paper,
            color: canSave ? '#fff' : C.muted,
            border: canSave ? 'none' : `1px solid ${C.divider}`,
            fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 14,
            boxShadow: canSave ? '0 8px 20px -8px rgba(214,68,106,.55)' : 'none',
            cursor: canSave ? 'pointer' : 'default',
          }}
        >
          <Check size={15}/> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  );
};
