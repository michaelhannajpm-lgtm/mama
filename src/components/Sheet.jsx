import { X } from 'lucide-react';
import { C } from '../theme';

// Bottom drawer that shrink-wraps its content. Small sheets render as a short
// half-height drawer; long sheets grow and scroll up to a max. Every drawer in
// the app renders through this, so they all share one behavior: a scrim behind
// (tap to close), a rounded bottom panel sized to its content, and a floating
// X (top-right) that closes back to the screen behind it.
//
// (Was briefly promoted to full-screen on 2026-06-11; reverted the same day —
// forcing every sheet full-screen made small edits like "change your phone"
// feel like a jarring context switch. Content-sizing is back: small = half,
// not full.)
//
// Props:
//   `tall`      — raise the height cap from 82% to 92% for content-heavy sheets
//                 (advanced filters, rich detail). Short content still
//                 shrink-wraps; this only lifts the ceiling.
//   `dark`      — dark surface (premium).
//   `bleedTop`  — let a hero image fill the very top edge, with the X floating
//                 over it (use for sheets that open with a colored/photo header).
//   `hideClose` — omit the X (the caller renders its own close affordance).
export const Sheet = ({ children, onClose, tall, dark, hideClose, bleedTop }) => {
  // The panel itself is content-sized (no fixed height) and only capped by
  // maxHeight, so a 2-row sheet is short and a long one scrolls. `tall` lifts
  // the cap; the inner scroller adds bottom safe-area padding so the last CTA
  // always clears the iOS home indicator.
  const maxVh = tall ? '92vh' : '82vh';
  return (
    <div className="absolute inset-0 z-40" style={{ background: 'rgba(20,14,16,.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="absolute left-0 right-0 bottom-0 overflow-hidden"
        style={{
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          background: dark ? C.ink : C.cream,
          maxHeight: tall ? '92%' : '82%',
          animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)',
        }}>
        {/* Drag handle. Floats over the content in bleedTop mode so the hero
            reaches the top edge; otherwise occupies a small strip above it. */}
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
        {!hideClose && (
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-3 w-8 h-8 rounded-full flex items-center justify-center active:scale-[.94] transition-transform"
            style={{
              zIndex: 4,
              background: dark ? '#2f2528' : C.paper,
              color: dark ? C.cream : C.ink,
              border: `1px solid ${dark ? '#3a2f33' : C.divider}`,
              boxShadow: bleedTop ? '0 2px 8px rgba(27,42,78,.22)' : 'none',
            }}>
            <X size={14}/>
          </button>
        )}
        <div className="overflow-y-auto"
          style={{
            maxHeight: bleedTop ? maxVh : `calc(${maxVh} - 50px)`,
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
