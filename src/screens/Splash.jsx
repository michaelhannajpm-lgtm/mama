import { ArrowRight } from 'lucide-react';
import { C } from '../theme';
import { MamaLogo } from '../components/icons/MamaLogo';
import { StatusBar } from '../components/StatusBar';
import { PrimaryBtn } from '../components/PrimaryBtn';

export const Splash = ({ onBegin }) => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ background: C.cream }}>
    {/* Atmosphere — same washes as Screen 1, turned up so it dominates */}
    <div className="absolute pointer-events-none" style={{
      top: -160, right: -120, width: 420, height: 420, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.rose}CC 0%, transparent 60%)`, zIndex: 0,
    }}/>
    <div className="absolute pointer-events-none" style={{
      bottom: -140, left: -140, width: 380, height: 380, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.sage}66 0%, transparent 60%)`, zIndex: 0,
    }}/>
    <div className="absolute pointer-events-none" style={{
      top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 280, height: 280, borderRadius: '50%',
      background: `radial-gradient(circle, ${C.saffron}22 0%, transparent 70%)`, zIndex: 0,
    }}/>
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity: .35, mixBlendMode: 'multiply', zIndex: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .15 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}/>

    <div style={{ position:'relative', zIndex: 1 }}>
      <StatusBar/>
    </div>

    {/* Hero — logo + wordmark + moto, vertically centered */}
    <div className="flex-1 flex flex-col items-center justify-center px-7" style={{ position:'relative', zIndex: 1 }}>
      {/* Logo mark */}
      <div style={{ animation: 'fadeInUp .8s .1s ease both' }}>
        <MamaLogo size={88}/>
      </div>

      {/* Wordmark — smaller than before, sits under the logo */}
      <div className="relative mt-3" style={{ animation: 'fadeInUp .8s .2s ease both' }}>
        <h1 className="text-center" style={{
          fontFamily:'Fraunces', fontWeight: 400, fontSize: 64, lineHeight: 1,
          letterSpacing:'-.04em', color: C.ink,
        }}>
          Mam<span style={{ fontStyle:'italic', color: C.terracotta, fontWeight: 500 }}>a</span>
        </h1>
      </div>

      {/* Em-dash divider */}
      <div className="flex items-center justify-center gap-3 mt-4" style={{ animation: 'fadeInUp .7s .35s ease both' }}>
        <div className="h-px w-10" style={{ background: C.ink, opacity:.3 }}/>
        <div style={{ color: C.inkMuted, fontFamily:'Fraunces', fontSize: 14, lineHeight: 1 }}>⸻</div>
        <div className="h-px w-10" style={{ background: C.ink, opacity:.3 }}/>
      </div>

      {/* Moto — primary line */}
      <div className="mt-3 text-center" style={{ animation: 'fadeInUp .7s .45s ease both' }}>
        <div style={{
          fontFamily:'Fraunces', fontSize: 19, fontWeight: 400, fontStyle:'italic',
          color: C.ink, letterSpacing:'-.01em', lineHeight: 1.3,
        }}>
          Your kids need <span style={{ color: C.sageDark, fontWeight: 500 }}>friends</span>,<br/>
          and so do <span style={{ color: C.terracotta, fontWeight: 500 }}>you</span>.
        </div>
      </div>

      {/* Moto — promise line */}
      <div className="mt-3 text-center" style={{ animation: 'fadeInUp .7s .55s ease both' }}>
        <div style={{
          fontFamily:'Fraunces', fontSize: 14, fontWeight: 400,
          color: C.inkSoft, letterSpacing:'-.005em', lineHeight: 1.4,
        }}>
          <span style={{ fontStyle:'italic', color: C.terracotta, fontWeight: 500 }}>Mama</span> will make it happen.
        </div>
      </div>
    </div>

    {/* Bottom — cover-lines + CTA */}
    <div className="px-7 pb-6" style={{ position:'relative', zIndex: 1, animation: 'fadeInUp .7s .65s ease both' }}>
      {/* Cover-line strip */}
      <div className="flex items-center justify-center gap-2 mb-4 text-[9px] tracking-[.32em] uppercase" style={{
        fontFamily:'Albert Sans', color: C.inkMuted, fontWeight: 600,
      }}>
        <span>Friendship</span>
        <span style={{ opacity:.4 }}>·</span>
        <span>Time</span>
        <span style={{ opacity:.4 }}>·</span>
        <span>Place</span>
        <span style={{ opacity:.4 }}>·</span>
        <span>Match</span>
      </div>

      <PrimaryBtn onClick={onBegin}>Begin <ArrowRight size={18}/></PrimaryBtn>

      <div className="mt-3 text-center text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
        Already a Mama? <span style={{ color: C.terracotta, fontWeight: 600, textDecoration: 'underline' }}>Sign in</span>
      </div>
    </div>
  </div>
);
