import { ShieldCheck } from 'lucide-react';
import { C } from '../theme';

export const MiniMatchCard = ({ mom }) => (
  <div className="rounded-[18px] p-3 flex items-center gap-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px]" style={{
      background: mom.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500
    }}>{mom.name.split(' ').map(s=>s[0]).join('')}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500, color: C.ink }}>{mom.name}</div>
        {mom.verified && <ShieldCheck size={12} style={{ color: C.sageDark }}/>}
      </div>
      <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
        Kids {mom.kids} · {mom.distance}
      </div>
    </div>
    <div className="text-right">
      <div style={{ fontFamily:'Fraunces', fontSize: 18, fontWeight:500, color: C.terracotta }}>{mom.overlap}<span className="text-[11px]" style={{ color: C.inkMuted }}>%</span></div>
      <div className="text-[9.5px] tracking-[.1em] uppercase" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>match</div>
    </div>
  </div>
);
