import { Heart, Users, Calendar, MapPin, Leaf, Search } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';

// ==========================================================================
// Landing — top half is a single composed hero image (logo + headline +
// subhead + moms photo, all baked in). Below it: 4 pastel feature rows
// and the coral "Find My Village" CTA. Page background matches the warm
// pink-cream wall tone inside the hero so the seam is invisible.
// ==========================================================================

const BG = '#FBEEEA'; // warm pink-cream — matches the wall in landing-top.png

export const Landing = ({ onBegin, onSignIn }) => (
  <div
    className="h-full flex flex-col relative overflow-y-auto"
    style={{ background: BG }}
  >
    <StatusBar/>

    {/* Top-half composed hero */}
    <img
      src="/landing-top.png"
      alt="Go Mama — Your kid needs a friend, and so do you."
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
      }}
    />

    {/* Feature list */}
    <div style={{ padding: '14px 22px 0' }}>
      <FeatureRow
        icon={Users}
        iconBg={C.coralSoft}
        iconColor={C.coral}
        title="Meet Moms Like You"
        body="Find local moms who get your stage of life."
      />
      <FeatureRow
        icon={Calendar}
        iconBg={C.peach}
        iconColor={C.saffron}
        title="Fun Things To Do"
        body="Activities, classes, and events for kids."
      />
      <FeatureRow
        icon={MapPin}
        iconBg={C.lilac}
        iconColor="#7E5BAE"
        title="Best Local Spots"
        body="Discover places moms and kids love."
      />
      <FeatureRow
        icon={Leaf}
        iconBg={C.sage}
        iconColor={C.sageDark}
        title="Support Made For You"
        body="Resources matched to your family's needs."
      />
    </div>

    <div className="flex-1" style={{ minHeight: 8 }}/>

    {/* CTA */}
    <div style={{ padding: '14px 22px 20px', position: 'relative' }}>
      <Heart
        size={10}
        style={{ position: 'absolute', left: 14, top: 22, color: C.coralSoft }}
        fill="currentColor"
      />
      <Heart
        size={10}
        style={{ position: 'absolute', right: 14, top: 22, color: C.coralSoft }}
        fill="currentColor"
      />

      <button
        onClick={onBegin}
        className="w-full rounded-full flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
        style={{
          background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff', padding: '15px 24px',
          fontFamily: 'Albert Sans', fontSize: 16, fontWeight: 700,
          boxShadow: '0 14px 28px -12px rgba(214,68,106,.7)',
          border: 'none', cursor: 'pointer',
        }}
      >
        <Search size={18} strokeWidth={2.4}/>
        Find My Village
      </button>

      <button
        onClick={onSignIn}
        className="w-full text-center"
        style={{
          background: 'transparent', border: 'none',
          fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navySoft,
          padding: '10px 6px 0', cursor: 'pointer',
        }}
      >
        Already have an account?{' '}
        <span style={{ color: C.coral, fontWeight: 700 }}>
          Log in
        </span>
      </button>
    </div>
  </div>
);

const FeatureRow = ({ icon: Icon, iconBg, iconColor, title, body }) => (
  <div className="flex items-center" style={{ gap: 12, padding: '8px 0' }}>
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 40, height: 40,
        borderRadius: 12,
        background: iconBg,
      }}
    >
      <Icon size={20} style={{ color: iconColor }} strokeWidth={2}/>
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 13.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11.5, lineHeight: 1.35,
        color: C.navySoft, marginTop: 2,
      }}>
        {body}
      </div>
    </div>
  </div>
);
