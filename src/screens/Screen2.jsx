import {
  ArrowRight, MapPin, Calendar as CalendarIcon, User, Users,
} from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const Screen2 = ({ onNext, onBack }) => (
  <div className="h-full flex flex-col" style={{ background: C.cream }}>
    <StatusBar/>
    <StepHeader step={0} total={7} onBack={onBack} onSkip={onNext}/>

    <div className="flex-1 px-7 flex flex-col">
      <div className="mt-1">
        <div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
          How Mama works
        </div>
        <h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 30, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
          You. Time. Place. <span style={{ fontStyle:'italic', color: C.sageDark }}>Match.</span>
        </h2>
      </div>

      {/* 4-step illustrated rows */}
      <div className="mt-5 space-y-2.5">
        {[
          { n:'01', icon: User,         title:'Tell us about you',    body:'Kid ages, mom type, values, interests — so matches actually fit.',         tone: C.terracotta },
          { n:'02', icon: CalendarIcon, title:'Pick a time',          body:'Tap your free hours based on your weekly calendar availability.',          tone: C.sageDark    },
          { n:'03', icon: MapPin,       title:'Pick a place',         body:'Choose from suggested cafés, parks & playgrounds — or add your own spot.', tone: C.saffron     },
          { n:'04', icon: Users,        title:'Match — 1:1 or group', body:'Auto-schedule a one-on-one with another mama, or RSVP to a group meetup.', tone: C.terracotta  },
        ].map((s, i)=>(
          <div key={i} className="flex items-stretch gap-3 rounded-[18px] p-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            <div className="flex flex-col items-center" style={{ width: 44 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.tone}1A`, color: s.tone }}>
                <s.icon size={17}/>
              </div>
              <div className="mt-1 text-[9px] tracking-[.2em]" style={{ color: C.inkMuted, fontFamily:'Albert Sans', fontWeight:600 }}>{s.n}</div>
            </div>
            <div className="flex-1 pt-0.5">
              <div style={{ fontFamily:'Fraunces', fontSize: 16, fontWeight:500, color: C.ink, letterSpacing:'-.01em' }}>{s.title}</div>
              <div className="mt-0.5 text-[12px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.4 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-8">
        <PrimaryBtn onClick={onNext}>Continue <ArrowRight size={18}/></PrimaryBtn>
      </div>
    </div>
  </div>
);
