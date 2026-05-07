import {
  MapPin, Lock, ShieldCheck, Star, MessageCircle, Calendar as CalendarIcon,
} from 'lucide-react';
import { C } from '../../theme';
import { Sprig } from '../../components/icons/Sprig';
import { MOM_TYPES } from '../../data/taxonomy';

// -- You --
export const YouTab = ({ profile, prefs, location, distance, restart }) => {
  const momTypeLabel = profile.momTypes
    .filter(id => id !== 'prefer_not')
    .map(id => MOM_TYPES.find(m=>m.id===id)?.label)
    .filter(Boolean)
    .slice(0,2)
    .join(' & ') || 'Mom';

  const kidsLabel = Object.entries(profile.kidsAges || {})
    .map(([age, count]) => `${count} × ${age}`)
    .join(', ') || '—';

  const distanceLabel = distance === 'any' ? 'anywhere' : distance ? `within ${distance} mi` : '';

  return (
  <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
    <div className="mb-4">
      <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
        You
      </h1>
    </div>

    <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#E8B4A0,#C8553D)', color:'#fff' }}>
      <Sprig style={{ position:'absolute', width: 60, top: 8, right: 8, opacity: .4 }} color="#fff"/>
      <div className="text-[10.5px] tracking-[.18em] uppercase opacity-80" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>You · preview mode</div>
      <div className="mt-1" style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500 }}>
        {momTypeLabel}
      </div>
      <div className="mt-0.5 text-[12.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
        Kids: {kidsLabel}
      </div>
      {location && (
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
          <MapPin size={11}/> {location}{distanceLabel ? ` · ${distanceLabel}` : ''}
        </div>
      )}
      <div className="mt-1 text-[12px] opacity-85" style={{ fontFamily:'Albert Sans' }}>
        {profile.values.slice(0,3).join(' · ') || 'Set your values'}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.92 }}>
        <Lock size={11}/> Sign up to save · keep using free
      </div>
    </div>

    <div className="rounded-[18px] divide-y" style={{ background: C.paper, border:`1px solid ${C.divider}`, borderColor: C.divider }}>
      {[
        { l:'Verified · phone & social media', tag:'Plus', icon: ShieldCheck },
        { l:'Full profile in groups',    tag:'Plus', icon: Star },
        { l:'Unlimited messages',        tag:'Plus', icon: MessageCircle },
        { l:'Calendar & places',         tag:'Free', icon: CalendarIcon },
      ].map((r,i)=>(
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <r.icon size={16} style={{ color: C.ink }}/>
          <div className="flex-1 text-[13.5px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>{r.l}</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
            background: r.tag==='Plus' ? C.ink : C.creamSoft,
            color: r.tag==='Plus' ? C.saffron : C.inkSoft,
            fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'.06em'
          }}>{r.tag.toUpperCase()}</span>
        </div>
      ))}
    </div>

    <button onClick={restart} className="mt-4 w-full text-[12.5px] py-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
      ↺ Restart prototype tour
    </button>
  </div>
  );
};
