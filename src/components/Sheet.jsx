import { X } from 'lucide-react';
import { C } from '../theme';

// Full-screen panel. Every drawer in the app renders through this, so they all
// share one behavior: a full-screen surface that covers the screen behind it,
// with a floating X (top-right) that closes back to that screen.
//
// (Was a bottom drawer until 2026-06-11; promoted to full-screen so every sheet
// reads as its own screen and always offers an obvious exit.)
//
// Props:
//   `dark`      — dark surface (premium).
//   `bleedTop`  — let a hero image fill the very top edge, with the X floating
//                 over it (use for sheets that open with a colored/photo header).
//   `hideClose` — omit the X (the caller renders its own close affordance).
//   `tall`      — accepted for backwards-compat and ignored; panels are always
//                 full height now.
export const Sheet = ({ children, onClose, tall, dark, hideClose, bleedTop }) => {
  void tall;
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden"
      style={{ background: dark ? C.ink : C.cream, animation: 'slideUp .3s cubic-bezier(.2,.8,.2,1)' }}
    >
      {/* Floating close — top-right, above all content (zIndex) so a hero or
          colored header can never paint over it. */}
      {!hideClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 w-8 h-8 rounded-full flex items-center justify-center active:scale-[.94] transition-transform"
          style={{
            top: 12, zIndex: 6,
            background: dark ? '#2f2528' : C.paper,
            color: dark ? C.cream : C.ink,
            border: `1px solid ${dark ? '#3a2f33' : C.divider}`,
            boxShadow: bleedTop ? '0 2px 8px rgba(27,42,78,.22)' : 'none',
          }}
        >
          <X size={14}/>
        </button>
      )}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: 'none',
          paddingTop: bleedTop ? 0 : 14,
          // 24px breathing room + the iOS safe-area inset so the final CTA
          // never sits flush with the home indicator.
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </div>
    </div>
  );
};
