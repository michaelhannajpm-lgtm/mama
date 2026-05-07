import { ArrowRight } from 'lucide-react';
import { C } from '../theme';
import { Sprig } from '../components/icons/Sprig';
import { StatusBar } from '../components/StatusBar';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const Screen1 = ({ onNext }) => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ background: C.cream }}>
    {/* Background atmosphere — z:0, never blocks pointer events */}
    <div className="absolute pointer-events-none" style={{
      top: -140, right: -100, width: 360, height: 360, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.rose}AA 0%, transparent 65%)`, zIndex: 0,
    }}/>
    <div className="absolute pointer-events-none" style={{
      bottom: -120, left: -120, width: 320, height: 320, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.sage}55 0%, transparent 65%)`, zIndex: 0,
    }}/>
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity: .35, mixBlendMode: 'multiply', zIndex: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .15 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}/>

    {/* Foreground */}
    <div style={{ position:'relative', zIndex: 1 }}>
      <StatusBar/>
    </div>
    <div style={{ position:'relative', zIndex: 1 }}>
      <StepHeader step={0} total={8} onBack={()=>{}} onSkip={onNext}/>
    </div>

    {/* Content — no scroll, justify-between pins social proof above CTA */}
    <div className="flex-1 px-7 overflow-hidden flex flex-col justify-between" style={{ position:'relative', zIndex: 1 }}>
      <div>
        {/* Masthead */}
        <div className="flex items-center gap-2.5 mb-3.5" style={{ animation: 'fadeInUp .6s ease both' }}>
          <div className="h-px flex-1" style={{ background: C.ink, opacity:.25 }}/>
          <div className="text-[9px] tracking-[.32em] uppercase" style={{ color: C.ink, fontFamily:'Albert Sans', fontWeight:700 }}>
            The Mama Report · No. 1
          </div>
          <div className="h-px flex-1" style={{ background: C.ink, opacity:.25 }}/>
        </div>

        {/* Hero headline — 34px, tighter */}
        <div className="relative" style={{ animation: 'fadeInUp .7s .1s ease both' }}>
          <h1 style={{ fontFamily:'Fraunces', fontWeight: 400, fontSize: 34, lineHeight: 1.02, letterSpacing:'-.02em', color: C.ink }}>
            Motherhood<br/>
            <span style={{ fontStyle:'italic', color: C.terracotta, fontWeight: 500, letterSpacing: 0 }}>shouldn't</span> feel<br/>
            this lonely.
          </h1>
          <Sprig style={{ position:'absolute', width: 38, top: -6, right: -6, opacity: .55 }} color={C.sageDark}/>
        </div>

        {/* Italic subtitle */}
        <p className="mt-2 text-[13px]" style={{ fontFamily:'Fraunces', fontStyle:'italic', color: C.inkSoft, lineHeight:1.4, fontWeight:400 }}>
          — and it doesn't have to.
        </p>

        {/* Two-stat editorial strip */}
        <div className="mt-3 grid grid-cols-2 gap-2" style={{ animation: 'fadeInUp .7s .25s ease both' }}>
          <div className="rounded-[14px] p-2.5" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            <div className="flex items-baseline gap-1">
              <div style={{ fontFamily:'Fraunces', fontSize: 28, fontWeight:500, color: C.terracotta, lineHeight:.9, letterSpacing:'-.04em' }}>9</div>
              <div style={{ fontFamily:'Fraunces', fontSize: 11, fontStyle:'italic', color: C.terracotta, fontWeight:400 }}>of 10 moms</div>
            </div>
            <div className="mt-1 text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.3 }}>
              feel lonely after kids
            </div>
          </div>
          <div className="rounded-[14px] p-2.5" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            <div className="flex items-baseline gap-1">
              <div style={{ fontFamily:'Fraunces', fontSize: 28, fontWeight:500, color: C.sageDark, lineHeight:.9, letterSpacing:'-.04em' }}>7</div>
              <div style={{ fontFamily:'Fraunces', fontSize: 11, fontStyle:'italic', color: C.sageDark, fontWeight:400 }}>of 10 moms</div>
            </div>
            <div className="mt-1 text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.3 }}>
              haven't made a mom friend since baby
            </div>
          </div>
        </div>

        {/* Empathy box — full problem description */}
        <div className="mt-3 rounded-2xl p-3.5 relative overflow-hidden" style={{
          background: C.paper, border: `1px solid ${C.divider}`, animation: 'fadeInUp .7s .35s ease both',
        }}>
          <div className="absolute pointer-events-none" style={{
            top: -30, right: -30, width: 70, height: 70, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.terracotta}1F 0%, transparent 70%)`,
          }}/>
          <div className="relative">
            <div style={{
              fontFamily:'Fraunces', fontSize: 15, fontWeight: 500,
              color: C.ink, letterSpacing:'-.01em', lineHeight: 1.3,
            }}>
              You love your kids deeply.
            </div>
            <div className="mt-1" style={{
              fontFamily:'Fraunces', fontStyle:'italic', fontSize: 13.5, fontWeight: 400,
              color: C.ink, lineHeight: 1.4,
            }}>
              But motherhood can still feel <span style={{ color: C.terracotta, fontWeight: 500 }}>isolating</span>.
            </div>
            <div className="mt-1.5 text-[11.5px]" style={{
              fontFamily:'Albert Sans', color: C.inkSoft, lineHeight: 1.45,
            }}>
              Days get busy. Texts go unanswered. Making real mom friends somehow feels harder than it should.
            </div>
          </div>
        </div>

        {/* Marketing line — Mama's promise. Sage-accented paper card */}
        <div className="mt-2.5 rounded-2xl p-3.5 relative overflow-hidden" style={{
          background: C.paper, border: `1px solid ${C.divider}`, animation: 'fadeInUp .7s .42s ease both',
        }}>
          <div className="absolute pointer-events-none" style={{
            top: -30, left: -30, width: 70, height: 70, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.sageDark}1F 0%, transparent 70%)`,
          }}/>
          <div className="relative" style={{
            fontFamily:'Fraunces', fontSize: 14.5, fontWeight: 500,
            color: C.ink, letterSpacing:'-.01em', lineHeight: 1.4,
          }}>
            <span style={{ fontStyle:'italic', color: C.sageDark }}>Mama</span> is built to make meetups <span style={{ color: C.terracotta }}>tailored</span> to mom's busy calendars.
          </div>
        </div>
      </div>

      {/* Social proof strip — pinned to bottom of content area */}
      <div className="flex items-center justify-center gap-2.5 pb-2" style={{ animation: 'fadeInUp .7s .5s ease both' }}>
        <div className="flex">
          {[
            'linear-gradient(135deg, #C8553D 0%, #D9A441 100%)',
            'linear-gradient(135deg, #7E9678 0%, #B5C9AB 100%)',
            'linear-gradient(135deg, #D9A441 0%, #C8553D 100%)',
            'linear-gradient(135deg, #B98EB6 0%, #C8553D 100%)',
            'linear-gradient(135deg, #5A7E55 0%, #7E9678 100%)',
          ].map((g, i) => (
            <div key={i} className="rounded-full" style={{
              width: 20, height: 20,
              background: g,
              marginLeft: i > 0 ? -6 : 0,
              border: `2px solid ${C.cream}`,
              zIndex: 5 - i,
            }}/>
          ))}
        </div>
        <div className="text-[10.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight: 500, lineHeight:1.35 }}>
          <span style={{ fontWeight:700, color: C.ink, fontFamily:'Fraunces' }}>12,847</span> moms joined this month
        </div>
      </div>
    </div>

    {/* Pinned bottom CTA */}
    <div className="px-7 pt-2 pb-6" style={{ position:'relative', zIndex: 1, background: C.cream, animation: 'fadeInUp .7s .55s ease both' }}>
      <PrimaryBtn onClick={onNext}>Begin <ArrowRight size={18}/></PrimaryBtn>
    </div>
  </div>
);
