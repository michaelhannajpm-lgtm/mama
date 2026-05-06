import { ArrowLeft } from 'lucide-react';
import { C } from '../theme';
import { Dot } from './Dot';

export const StepHeader = ({ step, total, onBack, onSkip }) => (
  <div className="flex items-center justify-between px-6 pt-2 pb-4">
    <button onClick={onBack} disabled={step===0} className="w-9 h-9 flex items-center justify-center rounded-full"
      style={{ background: step===0 ? 'transparent' : C.paper, color: step===0 ? 'transparent' : C.ink, border: step===0?'none':`1px solid ${C.divider}` }}>
      <ArrowLeft size={16}/>
    </button>
    <div className="flex gap-1.5">
      {Array.from({length: total}).map((_,i)=> <Dot key={i} on={i===step}/>)}
    </div>
    <button onClick={onSkip} className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
      {step < total-1 ? 'Skip' : ''}
    </button>
  </div>
);
