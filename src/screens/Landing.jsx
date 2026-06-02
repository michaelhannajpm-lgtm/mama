import { Heart, Users, Calendar, MapPin, Leaf, Search } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';

// ==========================================================================
// Landing — composed hero (logo + headline + subhead + moms photo) on top,
// 4 pastel feature rows + coral "Find My Village" CTA below. Sized to fit
// iPhone SE (375x667) with no scroll; flex spacer + safe-area-aware CTA
// padding handle larger phones and the iOS home indicator.
// ==========================================================================

const BG = '#FBEEEA';

export const Landing = ({ onBegin, onSignIn }) => (
  <div
    className="flex flex-col relative"
    style={{
      height: '100%',
      minHeight: 0,
      width: '100%',
      background: BG,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}
  >
    <StatusBar/>

    <img
      src="/landing-top.png"
      alt="Go Mama — Your kid needs a friend, and so do you."
      style={{
        width: '100%',
        height: 'auto',
        maxHeight: 'min(42dvh, 280px)',
        objectFit: 'contain',
        objectPosition: 'center top',
        display: 'block',
        flexShrink: 0,
      }}
    />

    <div style={{ padding: 'clamp(8px, 1.2dvh, 14px) 22px 0' }}>
      <FeatureRow icon={Users}    iconBg={C.coralSoft} iconColor={C.coral}    title="Meet Moms Like You"     body="Find local moms who get your stage of life."/>
      <FeatureRow icon={Calendar} iconBg={C.peach}     iconColor={C.saffron}  title="Fun Things To Do"       body="Activities, classes, and events for kids."/>
      <FeatureRow icon={MapPin}   iconBg={C.lilac}     iconColor="#7E5BAE"    title="Best Local Spots"       body="Discover places moms and kids love."/>
      <FeatureRow icon={Leaf}     iconBg={C.sage}      iconColor={C.sageDark} title="Support Made For You"   body="Resources matched to your family's needs."/>
    </div>

    <div className="flex-1" style={{ minHeight: 4 }}/>

    <div
      style={{
        padding: '10px 22px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
        position: 'relative',
      }}
    >
      <Heart size={10} style={{ position: 'absolute', left: 14, top: 18, color: C.coralSoft }} fill="currentColor"/>
      <Heart size={10} style={{ position: 'absolute', right: 14, top: 18, color: C.coralSoft }} fill="currentColor"/>

      <button
        onClick={onBegin}
        className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
        style={{
          background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff', padding: '13px 24px',
          fontFamily: 'Albert Sans', fontSize: 15, fontWeight: 700,
          boxShadow: '0 14px 28px -12px rgba(214,68,106,.7)',
          border: 'none', cursor: 'pointer',
        }}
      >
        <Search size={17} strokeWidth={2.4}/>
        Find My Village
      </button>

      <button
        onClick={onSignIn}
        className="w-full text-center"
        style={{
          background: 'transparent', border: 'none',
          fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navySoft,
          padding: '8px 6px 0', cursor: 'pointer',
        }}
      >
        Already have an account?{' '}
        <span style={{ color: C.coral, fontWeight: 700 }}>Log in</span>
      </button>
    </div>
  </div>
);

const FeatureRow = ({ icon: Icon, iconBg, iconColor, title, body }) => (
  <div className="flex items-center" style={{ gap: 12, padding: 'clamp(4px, 0.6dvh, 7px) 0' }}>
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: 38, height: 38, borderRadius: 12, background: iconBg }}
    >
      <Icon size={19} style={{ color: iconColor }} strokeWidth={2}/>
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, lineHeight: 1.35, color: C.navySoft, marginTop: 2 }}>
        {body}
      </div>
    </div>
  </div>
);
