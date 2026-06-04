import { Sparkles, ArrowRight, ShieldCheck, MapPin, Users } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';
import { HeroCarousel } from '../components/HeroCarousel';

// ==========================================================================
// Landing — revamp around an editorial-magazine pattern.
//
// Hierarchy (top → bottom):
//   1. Logo + tiny coral accents
//   2. Headline + subhead (tight unit)
//   3. Hero carousel as the centerpiece (fills leftover space) — a swipeable
//      story of the app's four pillars (Connect · Explore · Top Rated ·
//      Verified), each slide carrying its own proof point. See HeroCarousel.
//   4. Compact trust strip: Verified moms · Tampa-local · Real meetups
//   5. Coral gradient CTA + secondary log-in link
//
// The carousel replaces the prior single static photo + lone stat pill —
// rotating slides broaden the pitch beyond mom-matching while the trust strip
// reinforces the moat (verified, local, anti-Tinder) in one quick scan.
// ==========================================================================

const BG = '#FAF3F0';

const TRUST_SIGNALS = [
  { Icon: ShieldCheck, label: 'Verified moms' },
  { Icon: MapPin,      label: 'Tampa-local' },
  { Icon: Users,       label: 'Real meetups' },
];

export const Landing = ({ onBegin, onSignIn }) => {
  return (
  <div
    className="flex flex-col relative"
    style={{
      height: '100%', minHeight: 0, width: '100%',
      background: BG, boxSizing: 'border-box', overflow: 'hidden',
    }}
  >
    <StatusBar/>

    {/* Soft pink corner blobs — atmospheric decoration */}
    <div style={{
      position: 'absolute', top: 0, left: 0, width: 140, height: 120,
      background: 'radial-gradient(120% 100% at 0% 0%, #F8D2DC 0%, rgba(248,210,220,0) 65%)',
      pointerEvents: 'none', zIndex: 0,
    }}/>
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 120, height: 100,
      background: 'radial-gradient(120% 100% at 100% 0%, #F8D2DC 0%, rgba(248,210,220,0) 65%)',
      pointerEvents: 'none', zIndex: 0,
    }}/>

    {/* Content stack */}
    <div
      className="flex-1 flex flex-col"
      style={{ minHeight: 0, position: 'relative', zIndex: 1 }}
    >
      {/* Logo + tiny coral accents — PNG was cropped tight to content
          (1024×1536 → 661×613), so a much smaller box now shows the same
          visual size while freeing vertical room for the hero. */}
      <div style={{ position: 'relative', textAlign: 'center', padding: '10px 20px 0', flexShrink: 0 }}>
        <img
          src="/gomama-logo.png"
          alt="Go Mama"
          style={{
            height: 132, width: 'auto', display: 'block',
            margin: '0 auto', mixBlendMode: 'multiply',
          }}
        />
        <span style={{
          position: 'absolute', top: 22, right: 78,
          color: C.coral, fontSize: 18, opacity: .78,
        }}>♡</span>
        <span style={{
          position: 'absolute', top: 44, right: 64,
          color: C.coral, fontSize: 11, opacity: .5,
        }}>✦</span>
      </div>

      {/* Headline + subhead — tight unit under the logo */}
      <div style={{ textAlign: 'center', padding: '4px 24px 0', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700,
          color: C.navy, lineHeight: 1.15, letterSpacing: '-.02em',
        }}>
          Your kid needs a friend.
        </div>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700,
          color: C.coralDeep, lineHeight: 1.15, letterSpacing: '-.02em',
          marginTop: 2,
        }}>
          So do you.{' '}
          <span style={{ color: C.coral, fontSize: 15 }}>♡</span>
        </div>
        <p style={{
          fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
          lineHeight: 1.4, marginTop: 6, padding: '0 6px',
        }}>
          Meet local moms, find kid activities &amp; local gems — all in one app.
        </p>
      </div>

      {/* Hero carousel — flex-1 absorbs leftover space. Swipeable story of the
          app's four pillars; see HeroCarousel for slide content + interaction. */}
      <div
        className="flex-1 relative"
        style={{ padding: '12px 16px 0', minHeight: 0 }}
      >
        <HeroCarousel/>
      </div>

      {/* Trust strip */}
      <div
        className="flex items-center justify-center"
        style={{ padding: '14px 16px 0', flexShrink: 0 }}
      >
        {TRUST_SIGNALS.map(({ Icon, label }, i) => (
          <span key={label} className="flex items-center" style={{ gap: 5 }}>
            {i > 0 && (
              <span style={{ color: C.line, fontSize: 12, margin: '0 10px' }}>•</span>
            )}
            <Icon size={12} color={C.coralDeep} strokeWidth={2.3}/>
            <span style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
              color: C.navySoft, whiteSpace: 'nowrap', letterSpacing: '.01em',
            }}>
              {label}
            </span>
          </span>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div style={{
      padding: '14px 16px 14px',
      paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
      flexShrink: 0, position: 'relative', zIndex: 1,
    }}>
      <span style={{ position: 'absolute', left: 22, top: 24, color: C.coral, fontSize: 11 }}>✦</span>
      <span style={{ position: 'absolute', right: 22, top: 24, color: C.coral, fontSize: 11 }}>✦</span>

      <button
        onClick={onBegin}
        className="w-full rounded-full flex items-center justify-center active:scale-[.98] transition-transform"
        style={{
          height: 54, gap: 10,
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff',
          fontFamily: 'Albert Sans', fontSize: 15.5, fontWeight: 800,
          letterSpacing: '.005em',
          boxShadow: '0 12px 24px -10px rgba(214,68,106,.55), inset 0 -2px 0 rgba(0,0,0,.06)',
          border: 'none', cursor: 'pointer',
        }}
      >
        <Sparkles size={16} fill="currentColor"/>
        Find My Village
        <ArrowRight size={17} strokeWidth={2.4}/>
      </button>

      <div className="text-center" style={{
        marginTop: 8, fontSize: 11, color: C.muted, fontFamily: 'Albert Sans',
      }}>
        Already a mom?{' '}
        <button
          onClick={onSignIn}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: C.coralDeep, fontWeight: 700, fontSize: 11, fontFamily: 'Albert Sans',
          }}
        >
          Log in
        </button>
      </div>
    </div>
  </div>
  );
};
