import { ShieldCheck, Calendar as CalendarIcon, User, MessageCircle } from 'lucide-react';
import { C } from '../theme';

export const MatchCard = ({ mom, onSchedule, onProfile, onMessage }) => (
  <div className="rounded-[22px] overflow-hidden" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
    {/* Top: identity + match */}
    <div className="p-4 pb-3 flex items-start gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
        background: mom.hue, color:'#fff', fontFamily:'Fraunces', fontWeight:500, fontSize: 18,
      }}>{mom.name.split(' ').map(s=>s[0]).join('')}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div style={{ fontFamily:'Fraunces', fontSize: 17, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{mom.name}</div>
          {mom.verified && <ShieldCheck size={13} style={{ color: C.sageDark }}/>}
        </div>
        <div className="text-[12px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          {mom.type} · Kids {mom.kids} · {mom.distance}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mom.tags.map(t => (
            <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-full"
              style={{ background: C.creamSoft, color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:500, border:`1px solid ${C.divider}` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right">
        <div style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500, color: C.terracotta, lineHeight:1 }}>{mom.overlap}<span className="text-[11px]" style={{ color: C.inkMuted }}>%</span></div>
        <div className="text-[9px] tracking-[.12em] uppercase mt-0.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, fontWeight:600 }}>match</div>
      </div>
    </div>

    {/* Suggested slot strip */}
    <div className="mx-4 rounded-[14px] p-3 flex items-center gap-2.5" style={{ background: C.creamSoft, border: `1px dashed ${C.terracotta}55` }}>
      <CalendarIcon size={15} style={{ color: C.terracotta }}/>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.ink, fontWeight:600 }}>
          Both free · {mom.nextSlot}
        </div>
        <div className="text-[11px] truncate" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
          {mom.nextPlace}
        </div>
      </div>
    </div>

    {/* Action stack — schedule first, profile second, message third */}
    <div className="p-4 pt-3 space-y-2">
      <button onClick={onSchedule} className="w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.98]"
        style={{ height: 48, background: C.terracotta, color:'#fff', fontFamily:'Albert Sans', fontWeight:600, fontSize: 14.5, letterSpacing:'.02em' }}>
        <CalendarIcon size={16}/> Schedule meetup
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onProfile} className="rounded-xl flex items-center justify-center gap-1.5 transition-all"
          style={{ height: 40, background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500 }}>
          <User size={14}/> View profile
        </button>
        <button onClick={onMessage} className="rounded-xl flex items-center justify-center gap-1.5 transition-all"
          style={{ height: 40, background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500 }}>
          <MessageCircle size={14}/> Message
        </button>
      </div>
    </div>
  </div>
);
