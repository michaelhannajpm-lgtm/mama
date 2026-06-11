import { useState } from 'react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// ToggleSettingsSheet — reusable drawer of labeled on/off switches. Used for
// Notifications and Privacy. `items` is [{ key, label, sub, default }]. On Save
// it calls onSave(nextValues) which persists (settings jsonb) via the API.
// ==========================================================================

const Switch = ({ on, onClick, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    aria-pressed={on}
    disabled={disabled}
    style={{
      width: 44, height: 26, borderRadius: 999, flexShrink: 0,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      background: on ? C.coral : C.divider, border: 'none', padding: 2,
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .2s',
    }}
  >
    <span style={{
      width: 22, height: 22, borderRadius: 999, background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'all .2s',
    }}/>
  </button>
);

export const ToggleSettingsSheet = ({ eyebrow, title, accentWord, items = [], values = {}, onSave, onClose, disabledKeys = [], disabledNote }) => {
  const disabled = new Set(disabledKeys);
  // A disabled toggle (e.g. Discoverable with no photo yet) always reads false.
  const init = items.reduce((o, it) => { o[it.key] = disabled.has(it.key) ? false : (values[it.key] ?? it.default ?? false); return o; }, {});
  const [draft, setDraft] = useState(init);
  const [saving, setSaving] = useState(false);

  const flip = (key) => { if (disabled.has(key)) return; setDraft(d => ({ ...d, [key]: !d[key] })); };

  const save = async () => {
    setSaving(true);
    await onSave?.(draft);
    setSaving(false);
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          {eyebrow}
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          {title}{accentWord && <> <span style={{ fontStyle: 'italic', color: C.coral }}>{accentWord}</span></>}
        </h3>

        <div className="mt-5" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
          {items.map((it, i) => (
            <div key={it.key} className="flex items-center gap-3" style={{
              padding: '13px 14px', borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>{it.label}</div>
                {it.sub && <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 2 }}>{it.sub}</div>}
                {disabled.has(it.key) && disabledNote && (
                  <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.coralDeep, fontWeight: 700, marginTop: 3 }}>{disabledNote}</div>
                )}
              </div>
              <Switch on={!!draft[it.key]} onClick={() => flip(it.key)} disabled={disabled.has(it.key)}/>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full rounded-2xl flex items-center justify-center"
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
