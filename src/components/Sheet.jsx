import { useEffect, useRef } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { C } from '../theme';

// Bottom drawer that shrink-wraps its content. Small sheets render as a short
// half-height drawer; long sheets grow and scroll up to a max. Every drawer in
// the app renders through this, so they all share one behavior: a scrim behind
// (tap to close), a rounded bottom panel sized to its content, and a floating
// X (top-right) that closes back to the screen behind it.
//
// (Was briefly promoted to full-screen for EVERY sheet on 2026-06-11; reverted
// the same day — forcing small edits like "change your phone" full-screen felt
// like a jarring context switch. Content-sizing is the default: small = half,
// not full. Full-screen is now an explicit per-sheet OPT-IN via `fullScreen`,
// used only for the Home-tab detail "screens" — mom / event / place — where a
// rich, immersive view reads as a screen rather than a popover.)
//
// Accessibility (hardened 2026-06-12): the panel is a real `role="dialog"`
// with `aria-modal`, it traps Tab focus inside itself, closes on Escape, moves
// focus in on open and restores it on close, and exposes a ≥44pt close target.
// Because every sheet renders through here, that one change covers all of them.
//
// Props:
//   `tall`       — raise the height cap from 82% to 92% for content-heavy sheets
//                  (advanced filters, rich detail). Short content still
//                  shrink-wraps; this only lifts the ceiling.
//   `dark`       — dark surface (premium).
//   `bleedTop`   — let a hero image fill the very top edge, with the close
//                  affordance floating over it (sheets with a photo/color hero).
//   `hideClose`  — omit the close button (the caller renders its own).
//   `fullScreen` — fill the whole phone (no rounded top, no scrim gap) and swap
//                  the top-right X for a top-LEFT back arrow (←). This is the
//                  "it's a screen, not a drawer" treatment for Home-tab details.
//   `label`      — accessible name for the dialog (aria-label). Pass a short
//                  description of what the sheet is for (e.g. "Create account").
export const Sheet = ({ children, onClose, tall, dark, hideClose, bleedTop, fullScreen, label }) => {
  // The panel itself is content-sized (no fixed height) and only capped by
  // maxHeight, so a 2-row sheet is short and a long one scrolls. `tall` lifts
  // the cap; the inner scroller adds bottom safe-area padding so the last CTA
  // always clears the iOS home indicator. `fullScreen` pins the panel to the
  // full phone height instead.
  const maxVh = tall ? '92vh' : '82vh';

  const panelRef = useRef(null);
  // Modal behavior: focus in on open / restore on close, Escape-to-close, and
  // a Tab focus trap so keyboard + screen-reader users can't wander behind the
  // scrim. Capture-phase listener so it wins over anything in the content.
  useEffect(() => {
    const panel = panelRef.current;
    const prevFocus = document.activeElement;
    // Focus the panel container itself (not the first input) so opening a sheet
    // never auto-pops the mobile keyboard; Tab from here still walks the content.
    panel?.focus();

    const focusablesIn = (root) => [...root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.offsetParent !== null);

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const f = focusablesIn(panel);
      if (!f.length) { e.preventDefault(); panel.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // Restore focus to whatever opened the sheet (a tab, a card, a CTA).
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-40" style={{ background: 'rgba(20,14,16,.45)' }} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={`absolute overflow-hidden outline-none ${fullScreen ? 'inset-0' : 'left-0 right-0 bottom-0'}`}
        style={{
          borderTopLeftRadius: fullScreen ? 0 : 28,
          borderTopRightRadius: fullScreen ? 0 : 28,
          background: dark ? C.ink : C.cream,
          height: fullScreen ? '100%' : undefined,
          maxHeight: fullScreen ? '100%' : (tall ? '92%' : '82%'),
          animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)',
        }}>
        {/* Drag handle — only in drawer mode. Floats over the content in
            bleedTop mode so the hero reaches the top edge; otherwise occupies a
            small strip above it. Full-screen has a back arrow instead. */}
        {!fullScreen && (
          <div
            className="flex justify-center pt-3 pb-2"
            style={bleedTop
              ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, pointerEvents: 'none' }
              : undefined}
          >
            <div style={{
              width: 38, height: 4, borderRadius: 4,
              background: bleedTop ? 'rgba(255,255,255,.9)' : (dark ? '#3a2f33' : C.divider),
              boxShadow: bleedTop ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
            }}/>
          </div>
        )}
        {!hideClose && (fullScreen ? (
          // Full-screen: a back arrow, top-left, neutral (never coral — the one
          // accent belongs to the screen's CTA). White circle over a hero so it
          // stays legible on photos. Outer button is a 44pt touch target; the
          // visible circle sits inside it.
          <button onClick={onClose} aria-label="Back" className="absolute left-2 top-2 w-11 h-11 flex items-center justify-center active:scale-[.94] transition-transform"
            style={{ zIndex: 4, background: 'transparent', border: 'none' }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{
              background: dark ? '#2f2528' : (bleedTop ? 'rgba(255,255,255,.92)' : C.paper),
              color: dark ? C.cream : C.ink,
              border: bleedTop ? 'none' : `1px solid ${dark ? '#3a2f33' : C.divider}`,
              boxShadow: bleedTop ? '0 2px 8px rgba(27,42,78,.22)' : 'none',
            }}>
              <ArrowLeft size={18}/>
            </span>
          </button>
        ) : (
          <button onClick={onClose} aria-label="Close" className="absolute right-2 top-1.5 w-11 h-11 flex items-center justify-center active:scale-[.94] transition-transform"
            style={{ zIndex: 4, background: 'transparent', border: 'none' }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{
              background: dark ? '#2f2528' : C.paper,
              color: dark ? C.cream : C.ink,
              border: `1px solid ${dark ? '#3a2f33' : C.divider}`,
              boxShadow: bleedTop ? '0 2px 8px rgba(27,42,78,.22)' : 'none',
            }}>
              <X size={14}/>
            </span>
          </button>
        ))}
        <div className="overflow-y-auto"
          style={{
            maxHeight: fullScreen ? '100%' : (bleedTop ? maxVh : `calc(${maxVh} - 50px)`),
            scrollbarWidth: 'none',
            // 24px breathing room + the iOS safe-area inset so the final
            // CTA never sits flush with the home indicator.
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          }}>
          {children}
        </div>
      </div>
    </div>
  );
};
