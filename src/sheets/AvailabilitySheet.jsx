import { useRef, useState } from 'react';
import { Check, SlidersHorizontal, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { C } from '../theme';
import { DAYS, TIME_WINDOWS } from '../data/taxonomy';

// ==========================================================================
// AvailabilitySheet — recurring-pattern availability capture.
//
// Step 1 (typical): two groups — Weekdays (Mon–Fri) and Weekends (Sat–Sun) —
// each with four large time-block cards. Selecting a block applies it to every
// day in the group, so a full week is ~2–8 taps instead of 28.
//
// Step 2 (customize): a 7×4 tap-or-drag grid for exceptions / unique days,
// overriding the recurring defaults cell by cell.
//
// Selections persist as `Day-window` slot strings (e.g. "Mon-morning") — the
// shape the matching engine reads (prefs.slots / mom_profiles.free_slots).
// ==========================================================================

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];
const DAY_ABBR = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F', Sat: 'S', Sun: 'S' };

// Friendly names for the four canonical windows (IDs come from taxonomy and
// stay stable so matching keeps working). label = the time range, emoji = mood.
const WINDOW_NAME = { morning: 'Morning', noon: 'Midday', afternoon: 'Afternoon', 'night-owl': 'Evening' };

const slotKey = (day, win) => `${day}-${win}`;

export const AvailabilitySheet = ({ slots = [], onSave, onClose }) => {
  const [view, setView] = useState('typical'); // 'typical' | 'custom'
  const selRef = useRef(new Set(slots));
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  // Update local selection; persist only when asked (drag defers to pointer-up).
  const apply = (nextSet, persist = true) => {
    selRef.current = nextSet;
    rerender();
    if (persist) onSave?.([...nextSet]);
  };
  const sel = selRef.current;

  // ── Recurring group cards ────────────────────────────────────────────────
  // A group/window is 'on' (every day), 'partial' (some), or 'off' (none).
  const groupState = (days, win) => {
    const n = days.filter(d => sel.has(slotKey(d, win))).length;
    return n === 0 ? 'off' : n === days.length ? 'on' : 'partial';
  };
  const toggleGroup = (days, win) => {
    const turnOn = groupState(days, win) !== 'on';
    const next = new Set(sel);
    days.forEach(d => { const k = slotKey(d, win); if (turnOn) next.add(k); else next.delete(k); });
    apply(next, true);
  };

  // ── Custom grid: tap + drag-paint ────────────────────────────────────────
  const painting = useRef(null); // the target on/off value while dragging
  const paint = (day, win, target) => {
    const k = slotKey(day, win);
    const next = new Set(sel);
    if (target) next.add(k); else next.delete(k);
    apply(next, false); // defer persistence to pointer-up
  };
  const onCellDown = (day, win) => (e) => {
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    const target = !sel.has(slotKey(day, win));
    painting.current = target;
    paint(day, win, target);
  };
  const onCellEnter = (day, win) => () => {
    if (painting.current == null) return;
    paint(day, win, painting.current);
  };
  const endPaint = () => {
    if (painting.current == null) return;
    painting.current = null;
    onSave?.([...selRef.current]); // one write per drag
  };

  const totalSelected = sel.size;

  // ── Recurring group section ──────────────────────────────────────────────
  const GroupSection = ({ title, hint, days }) => (
    <div style={{ marginTop: 18 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 800, color: C.navy }}>{title}</div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, fontWeight: 600 }}>{hint}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {TIME_WINDOWS.map(w => {
          const st = groupState(days, w.id);
          const on = st === 'on';
          const partial = st === 'partial';
          return (
            <button
              key={w.id}
              onClick={() => toggleGroup(days, w.id)}
              className="active:scale-[.98] transition-transform"
              style={{
                position: 'relative', textAlign: 'left', cursor: 'pointer', minHeight: 86,
                background: on ? C.coralSoft : C.paper,
                border: `1.5px solid ${on || partial ? C.coral : C.divider}`,
                borderRadius: 18, padding: '13px 14px',
                boxShadow: on
                  ? '0 8px 18px -12px rgba(214,68,106,.55)'
                  : '0 4px 12px -10px rgba(27,42,78,.22)',
              }}
            >
              <div style={{ fontSize: 19, lineHeight: 1 }}>{w.emoji}</div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 800, color: C.navy, marginTop: 7 }}>
                {WINDOW_NAME[w.id] || w.label}
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 1 }}>{w.label}</div>
              {partial && (
                <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, color: C.coralDeep, fontWeight: 800, marginTop: 3 }}>
                  Some days
                </div>
              )}
              <span style={{
                position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? C.coral : 'transparent',
                border: `1.5px solid ${on || partial ? C.coral : C.divider}`,
              }}>
                {on && <Check size={13} color="#fff" strokeWidth={3} />}
                {partial && <span style={{ width: 8, height: 8, borderRadius: 4, background: C.coral }} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-40" style={{ background: 'rgba(20,14,16,.45)' }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="absolute left-0 right-0 bottom-0 flex flex-col overflow-hidden"
      style={{
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: C.cream, maxHeight: '90%',
        animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)',
      }}>
      {/* Header — context-aware back arrow (custom → typical, typical → close)
          + eyebrow. Content-sized drawer, matching the Interests sheet. */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.divider}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => (view === 'custom' ? setView('typical') : onClose())} aria-label="Back" className="active:scale-[.94] transition-transform" style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronLeft size={18} color={C.navy} />
            </button>
            <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
              {view === 'custom' ? 'Customize days' : 'Your week'}
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
      </div>

      {/* Scrollable body — shrink-wraps short content; scrolls only past the cap. */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {view === 'typical' ? (
        <div className="px-5 pt-3 pb-6">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
            When are you usually <span style={{ fontStyle: 'italic', color: C.coral }}>free</span>?
          </h3>
          <p className="mt-1.5" style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
            Pick your typical times — we'll repeat them every week. Fine-tune any day below.
          </p>

          <GroupSection title="Weekdays" hint="Mon–Fri" days={WEEKDAYS} />
          <GroupSection title="Weekends" hint="Sat & Sun" days={WEEKENDS} />

          {/* Step 2 entry */}
          <button
            onClick={() => setView('custom')}
            className="active:scale-[.99] transition-transform"
            style={{
              marginTop: 18, width: '100%', background: C.paper, border: `1px solid ${C.divider}`,
              borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 4px 12px -10px rgba(27,42,78,.22)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 12, background: C.lilac, color: '#5E4A8A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <SlidersHorizontal size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800, color: C.navy }}>Customize specific days</div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 2 }}>Add exceptions or a unique schedule</div>
            </div>
            <ChevronRight size={16} color={C.muted} />
          </button>

          <div className="mt-5 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted }}>
            {totalSelected
              ? `${totalSelected} time${totalSelected === 1 ? '' : 's'} a week · saved automatically`
              : 'Tap the times you’re usually free — saved automatically.'}
          </div>
        </div>
      ) : (
        <div className="px-5 pt-3 pb-6">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
            Customize <span style={{ fontStyle: 'italic', color: C.coral }}>specific days</span>
          </h3>
          <p className="mt-1.5" style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
            Tap a cell — or drag across several — to override your usual week.
          </p>

          {/* Grid */}
          <div
            onPointerUp={endPaint}
            onPointerLeave={endPaint}
            style={{ marginTop: 16, userSelect: 'none', touchAction: 'none' }}
          >
            {/* Column header */}
            <div style={{ display: 'flex', gap: 5, paddingLeft: 70, marginBottom: 6 }}>
              {DAYS.map(d => (
                <div key={d} style={{
                  flex: 1, textAlign: 'center', fontFamily: 'Albert Sans', fontSize: 10.5,
                  fontWeight: 800, color: (d === 'Sat' || d === 'Sun') ? C.coralDeep : C.muted,
                }}>
                  {DAY_ABBR[d]}
                </div>
              ))}
            </div>

            {TIME_WINDOWS.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <div style={{
                  width: 65, flexShrink: 0, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy,
                }}>
                  {WINDOW_NAME[w.id] || w.label}
                </div>
                {DAYS.map(d => {
                  const active = sel.has(slotKey(d, w.id));
                  return (
                    <button
                      key={d}
                      onPointerDown={onCellDown(d, w.id)}
                      onPointerEnter={onCellEnter(d, w.id)}
                      aria-pressed={active}
                      aria-label={`${d} ${WINDOW_NAME[w.id] || w.label}`}
                      style={{
                        flex: 1, height: 36, borderRadius: 9, cursor: 'pointer',
                        background: active ? C.coral : C.cream,
                        border: `1px solid ${active ? C.coral : C.divider}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background .12s',
                      }}
                    >
                      {active && <Check size={13} color="#fff" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {totalSelected === 0 && (
            <div className="mt-4 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
              Nothing set yet — tap any cell to mark when you're free,<br />or go back and pick a typical week first.
            </div>
          )}
        </div>
      )}
      </div>

      {/* Footer — single coral CTA. Availability auto-saves, so the button is
          just a clear exit: from the custom grid it returns to the typical
          week; from the typical view it closes the panel. */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.divider}`, background: C.cream }}>
        <button
          onClick={() => (view === 'custom' ? setView('typical') : onClose())}
          className="w-full active:scale-[.99] transition-transform"
          style={{
            height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`, color: '#fff',
            fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 700,
            boxShadow: '0 8px 18px -8px rgba(214,68,106,.55)',
          }}
        >
          Done
        </button>
      </div>
    </div>
    </div>
  );
};
