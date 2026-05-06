import { X } from 'lucide-react';
import { C } from '../theme';

export const Sheet = ({ children, onClose, tall, dark }) => (
  <div className="absolute inset-0 z-40" style={{ background:'rgba(20,14,16,.45)' }} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} className="absolute left-0 right-0 bottom-0 overflow-hidden"
      style={{
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        background: dark ? C.ink : C.cream,
        maxHeight: tall ? '88%' : '78%',
        animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)'
      }}>
      <div className="flex justify-center pt-3 pb-2">
        <div style={{ width: 38, height: 4, borderRadius: 4, background: dark ? '#3a2f33' : C.divider }}/>
      </div>
      <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: dark ? '#2f2528' : C.paper, color: dark ? C.cream : C.ink, border: `1px solid ${dark ? '#3a2f33' : C.divider}` }}>
        <X size={14}/>
      </button>
      <div className="overflow-y-auto" style={{ maxHeight: tall ? 'calc(88vh - 50px)' : 'calc(78vh - 50px)', scrollbarWidth:'none' }}>
        {children}
      </div>
    </div>
  </div>
);
