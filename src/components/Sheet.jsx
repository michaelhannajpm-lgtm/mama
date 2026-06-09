import { X } from 'lucide-react';
import { C } from '../theme';

// Bottom drawer. The drag handle + close button always float ABOVE the content
// (zIndex) so a colored/photo hero can never paint over the close button.
//
// `bleedTop`: let the content's hero fill the very top edge (single cohesive
// layer) with the handle + X floating over it — use for sheets that open with a
// colored/photo header. Without it, content sits below a small handle strip
// (the default, right for text-first sheets).
export const Sheet = ({ children, onClose, tall, dark, hideClose, bleedTop }) => {
  const maxVh = tall ? '88vh' : '78vh';
  return (
    <div className="absolute inset-0 z-40" style={{ background: 'rgba(20,14,16,.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="absolute left-0 right-0 bottom-0 overflow-hidden"
        style={{
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          background: dark ? C.ink : C.cream,
          maxHeight: tall ? '88%' : '78%',
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
          <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 rounded-full flex items-center justify-center"
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
          style={{ maxHeight: bleedTop ? maxVh : `calc(${maxVh} - 50px)`, scrollbarWidth: 'none' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
