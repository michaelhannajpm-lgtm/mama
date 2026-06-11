import { useState } from 'react';
import { ArrowRight, ChevronLeft, Check, Sparkles, X } from 'lucide-react';
import { C } from '../theme';
import { extractFamilyTags, HIGHLIGHT_TAGS } from '../lib/family-tags';
import { FAMILY_VALUES, ACTIVITIES } from '../data/matching-vocab';

// ==========================================================================
// InterestsPreferencesSheet — a 4-step "tell us about your family" flow.
// Opens as a FULL-SCREEN panel (header back arrow), not a bottom drawer, since
// each step holds many cards. One decision per screen, large tappable cards, a
// rewarding selected state, and a free-text step with live tag extraction.
//
// Step 1 selection has real rules so picks make sense:
//   • "Prefer not to say" is exclusive (clears everything else).
//   • Working / Stay-at-home / WFH are one work-situation — picking one drops
//     the others (radio-like).
//
// Persists on every step so progress is never lost:
//   momTypes (ids) · values (labels) · interests (labels) · bio · familyTags.
// ==========================================================================

// Step 1 — family type. ids match MOM_TYPES so selections feed matching.
const FAMILY_TYPES = [
  { id: 'working',       emoji: '💼', label: 'Working parent',          sub: 'Balancing career & family' },
  { id: 'sahm',          emoji: '🏠', label: 'Stay-at-home parent',     sub: 'Home with the kids' },
  { id: 'hybrid',        emoji: '💻', label: 'Hybrid / WFH',            sub: 'Work from home' },
  { id: 'solo',          emoji: '💪', label: 'Single parent',           sub: 'Doing it solo' },
  { id: 'new',           emoji: '🍼', label: 'New parent',              sub: 'Figuring it out' },
  { id: 'multi',         emoji: '👧', label: 'Parent of multiple',      sub: 'More than one' },
  { id: 'new_to_area',   emoji: '🧭', label: 'New to the area',         sub: 'Just moved here' },
  { id: 'multicultural', emoji: '🌎', label: 'Multicultural family',    sub: 'Diverse background' },
  { id: 'prefer_not',    emoji: '🤐', label: 'Prefer not to say',       sub: null },
];

// One-and-only-one "work situation". Picking any of these drops the others.
const WORK_GROUP = ['working', 'sahm', 'hybrid'];
const EXCLUSIVE = 'prefer_not'; // opts out of every other tag

const TYPES_CAP = 5;
const VALUES_CAP = 5;
const ACTS_CAP = 10;

const STEPS = [
  { key: 'types',  title: ['Tell us about your ', 'family'],          accent: 'family',
    subtitle: "This helps us introduce you to parents you'll actually enjoy meeting.", cap: TYPES_CAP },
  { key: 'values', title: ['What matters most to your ', 'family?'],  accent: 'family?',
    subtitle: 'The things you build your family around.', cap: VALUES_CAP },
  { key: 'acts',   title: ['What would you enjoy ', 'doing?'],        accent: 'doing?',
    subtitle: 'Pick what you’d love to do with other parents.', cap: ACTS_CAP },
  { key: 'about',  title: ['Describe your ', 'family'],               accent: 'family',
    subtitle: 'One sentence. Optional, but it helps us match you better.', cap: 0 },
];

const SelectCard = ({ emoji, label, sub, selected, disabled, onClick, big, compact }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="active:scale-[.97] transition-all"
    style={{
      position: 'relative', textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
      minHeight: compact ? 62 : big ? 88 : 72,
      background: selected ? C.coralSoft : C.paper,
      border: `1.5px solid ${selected ? C.coral : C.divider}`,
      borderRadius: compact ? 14 : 18, padding: compact ? '10px 9px' : '13px 13px',
      opacity: disabled ? 0.4 : 1,
      boxShadow: selected ? '0 8px 18px -12px rgba(214,68,106,.55)' : '0 4px 12px -10px rgba(27,42,78,.2)',
    }}
  >
    <div style={{ fontSize: compact ? 18 : big ? 22 : 20, lineHeight: 1 }}>{emoji}</div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: compact ? 11 : 13, fontWeight: 800, color: C.navy,
      marginTop: compact ? 5 : 7, paddingRight: compact ? 14 : 18, lineHeight: 1.15,
    }}>
      {label}
    </div>
    {sub && !compact && <div style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, marginTop: 1 }}>{sub}</div>}
    <span style={{
      position: 'absolute', top: compact ? 8 : 11, right: compact ? 8 : 11,
      width: compact ? 17 : 21, height: compact ? 17 : 21, borderRadius: 11,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? C.coral : 'transparent',
      border: `1.5px solid ${selected ? C.coral : C.divider}`,
    }}>
      {selected && <Check size={compact ? 10 : 12} color="#fff" strokeWidth={3} style={{ animation: 'popBadge .3s ease-out' }} />}
    </span>
  </button>
);

export const InterestsPreferencesSheet = ({ profile, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [momTypes, setMomTypes] = useState(profile?.momTypes || []);
  const [values, setValues] = useState(profile?.values || []);
  const [interests, setInterests] = useState(profile?.interests || []);
  const [about, setAbout] = useState(profile?.bio || '');
  const [dismissed, setDismissed] = useState([]); // tags the user removed — stay gone even if re-extracted

  const tags = extractFamilyTags(about).filter(t => !dismissed.includes(t));
  const removeTag = (t) => setDismissed(d => [...d, t]);

  const persist = (extra = {}) => onSave?.({ momTypes, values, interests, ...extra });

  // Generic capped toggle (values + activities).
  const toggleFrom = (list, setList, value, cap) => {
    const has = list.includes(value);
    if (has) return setList(list.filter(x => x !== value));
    if (cap && list.length >= cap) return;
    setList([...list, value]);
  };

  // Family-type toggle with the "make sense" rules.
  const toggleType = (id) => {
    setMomTypes(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (id === EXCLUSIVE) return [EXCLUSIVE];               // opting out clears all
      let next = prev.filter(x => x !== EXCLUSIVE);           // any real pick drops "prefer not"
      if (WORK_GROUP.includes(id)) next = next.filter(x => !WORK_GROUP.includes(x)); // one work-situation
      if (next.length >= TYPES_CAP) return prev;              // at the cap — ignore
      return [...next, id];
    });
  };

  // A type card is dimmed (not tappable) when picking it wouldn't make sense.
  const typeDisabled = (o) => {
    if (momTypes.includes(o.id)) return false;               // selected → toggle off allowed
    if (momTypes.includes(EXCLUSIVE)) return o.id !== EXCLUSIVE; // opted out → block the rest
    if (o.id === EXCLUSIVE) return false;                    // "prefer not" always available (swaps)
    if (WORK_GROUP.includes(o.id) && momTypes.some(x => WORK_GROUP.includes(x))) return false; // swaps in-group
    return momTypes.length >= TYPES_CAP;                     // otherwise just the cap
  };

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const selCount = s.key === 'types' ? momTypes.length
    : s.key === 'values' ? values.length
    : s.key === 'acts' ? interests.length : 0;

  // The values step is required — a mom must pick at least one before moving on.
  // (Other steps stay skippable.) `blocked` disables the CTA until she does.
  const mustSelect = s.key === 'values';
  const blocked = mustSelect && selCount === 0;

  const next = () => {
    if (blocked) return;
    if (isLast) {
      persist({ bio: about.trim(), settings: { ...(profile?.settings || {}), familyTags: tags } });
      onClose();
    } else {
      persist();
      setStep(step + 1);
    }
  };
  const back = () => (step === 0 ? onClose() : setStep(step - 1));

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: C.cream, animation: 'slideUp .3s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header — back arrow + eyebrow + step progress */}
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.divider}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={back} aria-label="Back" className="active:scale-[.94] transition-transform" style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronLeft size={18} color={C.navy} />
            </button>
            <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
              About your family
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="active:scale-[.94] transition-transform" style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={15} color={C.ink} />
          </button>
        </div>
        <div className="flex items-center gap-1.5" style={{ marginTop: 12 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 999, flex: 1,
              background: i <= step ? C.coral : C.divider, transition: 'background .25s',
            }} />
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 14, paddingBottom: 14 }}>
        <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em', lineHeight: 1.15 }}>
          {s.title[0]}<span style={{ fontStyle: 'italic', color: C.coral }}>{s.title[1]}</span>
        </h3>
        <p className="mt-1.5" style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
          {s.subtitle}{s.cap ? `  ·  ${selCount}/${s.cap}` : ''}
        </p>

        {/* ── Step 1: family types (rules apply) ───────────────── */}
        {s.key === 'types' && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FAMILY_TYPES.map(o => (
              <SelectCard key={o.id} big emoji={o.emoji} label={o.label} sub={o.sub}
                selected={momTypes.includes(o.id)}
                disabled={typeDisabled(o)}
                onClick={() => toggleType(o.id)} />
            ))}
          </div>
        )}

        {/* ── Step 2: values ───────────────────────────────────── */}
        {s.key === 'values' && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FAMILY_VALUES.map(o => (
              <SelectCard key={o.label} emoji={o.emoji} label={o.label}
                selected={values.includes(o.label)}
                disabled={!values.includes(o.label) && values.length >= VALUES_CAP}
                onClick={() => toggleFrom(values, setValues, o.label, VALUES_CAP)} />
            ))}
          </div>
        )}

        {/* ── Step 3: activities — 2-up grid (matches the values step) ── */}
        {s.key === 'acts' && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ACTIVITIES.map(o => (
              <SelectCard key={o.label} emoji={o.emoji} label={o.label}
                selected={interests.includes(o.label)}
                disabled={!interests.includes(o.label) && interests.length >= ACTS_CAP}
                onClick={() => toggleFrom(interests, setInterests, o.label, ACTS_CAP)} />
            ))}
          </div>
        )}

        {/* ── Step 4: free text + extracted tags ───────────────── */}
        {s.key === 'about' && (
          <div style={{ marginTop: 16 }}>
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value.slice(0, 250))}
              rows={4}
              autoFocus
              placeholder="We love playgrounds, church, and weekend adventures."
              style={{
                width: '100%', resize: 'none', borderRadius: 16, padding: 14,
                border: `1.5px solid ${C.divider}`, background: C.paper,
                fontFamily: 'Albert Sans', fontSize: 13.5, color: C.navy, outline: 'none', lineHeight: 1.5,
              }}
            />
            <div className="text-right" style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 4 }}>
              {about.length}/250
            </div>
            {tags.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
                  <Sparkles size={13} style={{ color: C.coralDeep }} />
                  <span style={{ fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800, color: C.navy }}>We picked up on…</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => {
                    const hot = HIGHLIGHT_TAGS.includes(t);
                    const bg = hot ? C.coralSoft : C.sage;
                    const fg = hot ? C.coralDeep : C.sageDark;
                    const xbg = hot ? 'rgba(214,68,106,.16)' : 'rgba(94,122,59,.16)';
                    return (
                      <span key={t} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: bg, color: fg, borderRadius: 999, padding: '5px 7px 5px 11px',
                        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: hot ? 800 : 700,
                        border: hot ? `1px solid ${C.coral}` : 'none',
                        animation: 'fadeInUp .3s ease-out',
                      }}>
                        {hot && <span aria-hidden>✦</span>}{t}
                        <button onClick={() => removeTag(t)} aria-label={`Remove ${t}`} style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: xbg, border: 'none', cursor: 'pointer',
                          color: fg, borderRadius: 999, width: 16, height: 16, padding: 0,
                        }}>
                          <X size={10} strokeWidth={3} />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <p style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                  Tap ✕ to drop any that don't fit. We use these to find parents like you — your words stay private.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — single coral CTA */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.divider}`, background: C.cream }}>
        <button onClick={next} disabled={blocked} className="w-full active:scale-[.99] transition-transform" style={{
          height: 52, borderRadius: 16, border: 'none', cursor: blocked ? 'default' : 'pointer',
          background: blocked ? C.divider : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
          color: blocked ? C.muted : '#fff',
          fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 700,
          boxShadow: blocked ? 'none' : '0 8px 18px -8px rgba(214,68,106,.55)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background .2s, color .2s',
        }}>
          {isLast ? 'Save my profile' : (blocked ? 'Pick at least one' : (!mustSelect && s.cap && selCount === 0 ? 'Skip for now' : 'Continue'))}
          {!isLast && !blocked && <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
};
