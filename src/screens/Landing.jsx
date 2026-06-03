import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';

// ==========================================================================
// Landing — ported from docs/HTML/GoMama-Prototype-html.html (Screen 1).
// Logo + floating ♡ hearts + ——♡—— divider + headline with coral italic
// "friend" / coralDeep "you." + ≺ STOP SEARCHING ≻ tagline + 4 pastel
// feature rows (chevrons + dividers) + coral gradient CTA with ✦ sparkles.
// Sized to fit iPhone SE (375x667) without scrolling; safe-area aware
// bottom padding for the iOS home indicator.
// ==========================================================================

const BG = '#FAF3F0';

const FEATURES = [
  { bg: '#F8D7DD', icon: '👥', title: 'Meet Moms',                 body: 'Find local moms who get your stage of life.' },
  { bg: '#FDE2D4', icon: '📅', title: 'Find Activities',           body: 'Activities, classes, and events for kids.' },
  { bg: '#EDE4F4', icon: '📍', title: 'Explore Local Favorites',   body: 'Places moms and kids love.' },
  { bg: '#E2EBD8', icon: '🤲', title: 'Get Personalized Support',  body: 'Resources matched to your family’s needs.' },
];

export const Landing = ({ onBegin, onSignIn }) => (
  <div
    className="flex flex-col relative"
    style={{
      height: '100%', minHeight: 0, width: '100%',
      background: BG, boxSizing: 'border-box', overflow: 'hidden',
    }}
  >
    <StatusBar/>

    {/* Logo area — floating hearts + logo + decorative line + headline */}
    <div style={{ position: 'relative', textAlign: 'center', padding: '14px 20px 0', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 18, left: 16, fontSize: 20, color: '#F5B8C8', opacity: .8 }}>♡</span>
      <span style={{ position: 'absolute', top: 42, left: 30, fontSize: 12, color: '#F5B8C8', opacity: .6 }}>♡</span>

      <img
        src="/gomama-logo.png"
        alt="Go Mama"
        style={{
          width: 140, height: 'auto', display: 'block',
          margin: '0 auto 3px', mixBlendMode: 'multiply',
        }}
      />

      <div className="flex items-center justify-center" style={{ gap: 5, marginBottom: 8 }}>
        <div style={{ width: 24, height: 1, background: C.coral }}/>
        <span style={{ fontSize: 9, color: C.coral }}>♡</span>
        <div style={{ width: 24, height: 1, background: C.coral }}/>
      </div>

      <div style={{
        fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700,
        lineHeight: 1.2, color: C.navy, marginBottom: 8, letterSpacing: '-.01em',
      }}>
        Your kid needs a{' '}
        <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>friend</span>
        <br/>
        and so do{' '}
        <span style={{ color: C.coralDeep }}>you.</span>{' '}
        <span style={{ color: C.coral, fontSize: 16 }}>←</span>
      </div>
    </div>

    {/* Tagline */}
    <div className="flex items-center justify-center" style={{ padding: '8px 16px 4px', flexShrink: 0 }}>
      <span style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800,
        letterSpacing: '.5px', color: C.coralDeep,
      }}>
        STOP SEARCHING. START CONNECTING.
      </span>
    </div>

    {/* Feature rows — flex fills space */}
    <div className="flex-1 flex flex-col justify-center" style={{ padding: '0 2px', minHeight: 0 }}>
      {FEATURES.map((f, i) => (
        <FeatureRow key={f.title} {...f} divider={i < FEATURES.length - 1}/>
      ))}
    </div>

    {/* CTA */}
    <div style={{
      padding: '8px 16px 10px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      flexShrink: 0, position: 'relative',
    }}>
      <span style={{ position: 'absolute', left: 22, top: 16, color: C.coral, fontSize: 11, zIndex: 1 }}>✦</span>
      <span style={{ position: 'absolute', right: 22, top: 16, color: C.coral, fontSize: 11, zIndex: 1 }}>✦</span>

      <button
        onClick={onBegin}
        className="w-full rounded-full flex items-center justify-center active:scale-[.98] transition-transform"
        style={{
          height: 48, gap: 8,
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff',
          fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 800,
          boxShadow: '0 8px 20px -8px rgba(214,68,106,.5)',
          border: 'none', cursor: 'pointer',
        }}
      >
        🔍&nbsp;&nbsp;Find My Village
      </button>

      <div className="text-center" style={{
        marginTop: 6, fontSize: 10.5, color: C.muted, fontFamily: 'Albert Sans',
      }}>
        Already have an account?{' '}
        <button
          onClick={onSignIn}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: C.coralDeep, fontWeight: 700, fontSize: 10.5, fontFamily: 'Albert Sans',
          }}
        >
          Log In
        </button>
      </div>
    </div>
  </div>
);

const FeatureRow = ({ bg, icon, title, body, divider }) => (
  <>
    <div className="flex items-center" style={{ padding: '6px 14px', cursor: 'pointer' }}>
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 44, height: 44, borderRadius: 22, background: bg, fontSize: 18 }}
      >
        {icon}
      </div>
      <div style={{ width: 1.5, height: 34, background: '#E0D4CF', margin: '0 10px' }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 1, lineHeight: 1.3 }}>
          {body}
        </div>
      </div>
      <span style={{ color: '#C8B8B2', fontSize: 14 }}>›</span>
    </div>
    {divider && <div style={{ height: 1, background: C.line, margin: '0 14px' }}/>}
  </>
);
