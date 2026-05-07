import { C } from '../../theme';
import { MiniMatchCard } from '../../components/MiniMatchCard';
import { SAMPLE_MOMS } from '../../data/moms';

export const MatchesTab = ({ openSchedule, openProfile, openMessage }) => (
  <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
    <div className="mb-4">
      <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
        Your <span style={{ fontStyle:'italic', color: C.terracotta }}>matches</span>
      </h1>
    </div>
    <div className="space-y-2.5">
      {SAMPLE_MOMS.map(m => (
        <button key={m.id} onClick={()=>openProfile(m)} className="w-full text-left">
          <MiniMatchCard mom={m}/>
        </button>
      ))}
    </div>
  </div>
);
