import { Plus, ArrowRight, MapPin, Users, Calendar, Zap, Settings } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';
import { HeroCarousel } from '../components/HeroCarousel';

// ==========================================================================
// Landing — editorial-magazine layout.
//
// Hierarchy (top → bottom):
//   1. Logo + tiny coral accents
//   2. Headline + subhead (coral emphasis on "Tampa mom")
//   3. Hero carousel as the centerpiece (fills leftover space) — a swipeable
//      story of the app's four pillars (Connect · Explore · Top Rated ·
//      Verified), each slide carrying its own proof point. See HeroCarousel.
//   4. Three-stat unified card (events · moms · local gems)
//   5. Coral gradient CTA + secondary log-in link
// ==========================================================================

const BG = '#FAF3F0';

const STAT_PILLS = [
  { Icon: Calendar, count: '50+',     label: 'events this week', tint: C.coralSoft, fg: C.coralDeep },
  { Icon: Users,    count: '1,200+',  label: 'moms nearby',      tint: C.peach,     fg: C.coralDeep },
  { Icon: MapPin,   count: '300+',    label: 'local gems',       tint: C.sage,      fg: C.sageDark },
];

export const Landing = ({ onBegin, onSignIn, onDevLogin }) => (
  <div
    className="flex flex-col relative"
    style={{
      height: '100%', minHeight: 0, width: '100%',
      background: BG, boxSizing: 'border-box', overflow: 'hidden',
    }}
  >
    <StatusBar/>

    {/* Admin shortcut — muted gear in the top-right corner, full reload into /admin */}
    <button
      onClick={() => { window.location.href = '/admin'; }}
      aria-label="Admin dashboard"
      title="Admin dashboard"
      className="flex items-center justify-center active:scale-90 transition-transform"
      style={{
        position: 'absolute', top: 8, right: 10, zIndex: 5,
        width: 30, height: 30, borderRadius: 15,
        background: 'rgba(255,255,255,.55)',
        border: `1px solid ${C.line}`,
        color: C.muted, cursor: 'pointer',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Settings size={15} strokeWidth={2}/>
    </button>

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
      {/* Logo + tiny coral accents — anchored to the top; the hero carousel
          below grows to absorb all leftover real estate. */}
      <div style={{ position: 'relative', textAlign: 'center', padding: '10px 20px 0', flexShrink: 0 }}>
        <img
          src="/gomama-logo.png"
          alt="Go Mama"
          style={{
            height: 84, width: 'auto', display: 'block',
            margin: '0 auto', mixBlendMode: 'multiply',
          }}
        />
        <span style={{
          position: 'absolute', top: 8, right: 92,
          color: C.coral, fontSize: 14, opacity: .78,
        }}>♡</span>
        <span style={{
          position: 'absolute', top: 24, right: 80,
          color: C.coral, fontSize: 9, opacity: .5,
        }}>✦</span>
      </div>

      {/* Headline + subhead — continuous two-sentence block, tight to hero */}
      <div style={{ textAlign: 'center', padding: '6px 20px 0', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700,
          color: C.navy, lineHeight: 1.2, letterSpacing: '-.02em',
        }}>
          Everything a{' '}
          <span style={{ color: C.coralDeep }}>mom</span>
          {' '}needs. In one place.
        </div>
        <p style={{
          fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
          lineHeight: 1.4, marginTop: 6, padding: '0 6px',
        }}>
          Find activities, events, places, support and moms who get it — all near you.
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

      {/* Stats — one unified card, divided by hairlines (between hero and CTA) */}
      <div style={{ padding: '12px 18px 0', flexShrink: 0 }}>
        <div
          className="flex items-stretch"
          style={{
            background: '#fff',
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            padding: '10px 4px',
            boxShadow: '0 1px 2px rgba(27,42,78,.04)',
          }}
        >
          {STAT_PILLS.map(({ Icon, count, label, tint, fg }, i) => (
            <div key={label} className="flex items-center" style={{ flex: 1, position: 'relative' }}>
              {i > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute', left: 0, top: '14%', bottom: '14%',
                    width: 1, background: C.line,
                  }}
                />
              )}
              <div
                className="flex items-center justify-center"
                style={{ gap: 8, width: '100%', padding: '0 6px' }}
              >
                <span
                  style={{
                    width: 26, height: 26, borderRadius: 13,
                    background: tint,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} color={fg} strokeWidth={2.4}/>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                  <span style={{
                    fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 800,
                    color: C.navy, letterSpacing: '-.01em',
                  }}>
                    {count}
                  </span>
                  <span style={{
                    fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 600,
                    color: C.muted, marginTop: 1, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* CTA */}
    <div style={{
      padding: '12px 16px 12px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      flexShrink: 0, position: 'relative', zIndex: 1,
    }}>
      <span style={{ position: 'absolute', left: 22, top: 22, color: C.coral, fontSize: 11 }}>✦</span>
      <span style={{ position: 'absolute', right: 22, top: 22, color: C.coral, fontSize: 11 }}>✦</span>

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
        <Plus size={17} strokeWidth={2.6}/>
        Get Started
        <ArrowRight size={17} strokeWidth={2.4}/>
      </button>

      <div className="text-center" style={{
        marginTop: 8, fontSize: 11, color: C.muted, fontFamily: 'Albert Sans',
      }}>
        Already a member?{' '}
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

      {/* Pick any seeded mom — available to everyone. */}
      <div className="text-center" style={{ marginTop: 8 }}>
        <button
          onClick={onDevLogin}
          className="inline-flex items-center justify-center active:scale-[.97] transition-transform"
          style={{
            height: 24, padding: '0 11px', gap: 5, borderRadius: 999,
            background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
            color: '#fff',
            fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
            boxShadow: '0 6px 14px -8px rgba(124,58,237,.6)',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Zap size={10} strokeWidth={2.6} fill="currentColor"/>
          Pick seeded mom
        </button>
      </div>
    </div>
  </div>
);
