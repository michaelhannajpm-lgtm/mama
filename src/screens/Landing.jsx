import { Heart, Users, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';

// ==========================================================================
// Landing — ported from the GoMama Expo prototype (C:\projects\GoMama).
// Hero image + headline + 4 feature buttons + "Let's Go Mama" primary CTA.
// Replaces the old animated Splash screen.
// ==========================================================================

const FeatureBtn = ({ icon: Icon, label, color, bg }) => (
  <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: bg, flex: '1 1 calc(50% - 4px)' }}>
    <div className="rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ width: 28, height: 28, background: '#fff' }}>
      <Icon size={14} style={{ color }}/>
    </div>
    <span className="text-[10.5px] leading-tight" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
      {label}
    </span>
  </div>
);

export const Landing = ({ onBegin, onSignIn }) => (
  <div className="h-full flex flex-col relative overflow-hidden" style={{ background: C.cream }}>
    <StatusBar/>

    {/* Hero photo */}
    <div style={{ height: 260, width: '100%', overflow: 'hidden', flexShrink: 0 }}>
      <img
        src="https://images.unsplash.com/photo-1542884748-2b87b36c6b90?w=900&auto=format&fit=crop"
        alt="Moms and kids at the park"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }}
      />
    </div>

    {/* Card body */}
    <div className="flex-1 flex flex-col px-5 pt-5 pb-6">
      <h1 style={{
        fontFamily: 'Fraunces', fontWeight: 600, fontSize: 28, lineHeight: 1.15,
        color: C.navy, letterSpacing: '-.02em', marginBottom: 16,
      }}>
        Your kid needs a{' '}
        <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>friend,</span>
        <br/>
        so do <span style={{ color: C.coralDeep, fontStyle: 'italic', fontWeight: 500 }}>you.</span>
      </h1>

      <div className="flex flex-wrap gap-2 mb-3">
        <FeatureBtn icon={Users}        label="Local Moms Meetups"        color={C.coralDeep} bg={C.coralSoft}/>
        <FeatureBtn icon={CalendarIcon} label="Kids Activities nearby"    color="#C46B3A"     bg={C.peach}/>
        <FeatureBtn icon={MapPin}       label="Places to go with kids"    color="#7B4FA8"     bg={C.lilac}/>
        <FeatureBtn icon={Heart}        label="Local Support & Resources" color="#5E7A3B"     bg={C.sage}/>
      </div>

      <div className="mt-auto">
        <button
          onClick={onBegin}
          className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', padding: '15px 24px',
            fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 700,
            boxShadow: '0 10px 22px -8px rgba(214,68,106,.55)',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Heart size={16} fill="currentColor"/>
          Let's Go Mama
        </button>

        <button
          onClick={onSignIn}
          className="w-full text-center mt-3"
          style={{
            background: 'transparent', border: 'none',
            fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
            padding: 6, cursor: 'pointer',
          }}
        >
          Already have an account?{' '}
          <span style={{ color: C.coralDeep, fontWeight: 700 }}>Log in</span>
        </button>
      </div>
    </div>
  </div>
);
