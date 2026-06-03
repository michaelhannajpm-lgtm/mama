import { Heart, Users, Music, MapPin, Calendar, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';

// ==========================================================================
// Landing — engaged, comprehensive service pitch.
//
// Headline keeps the emotional hook ("Your kid needs a friend / and so do
// you. ←"). Below it, a 2×2 grid of pastel pillar tiles sells the four
// big things the app delivers, each with a concrete number for curiosity:
//
//   ♥ 92 verified moms · 👥 23 meetups this week
//   ♪ 47 kid classes  · 📍 120+ curated places
//
// A compact "+ also" row below the grid surfaces the supporting services
// (scheduling, verified chat, favorites) without the visual weight of more
// tiles.
//
// Sized to fit iPhone SE (375x667) without scrolling; safe-area aware
// bottom padding for the iOS home indicator.
// ==========================================================================

const BG = '#FAF3F0';
const PURPLE = '#7E5BAE';

// Numbers are hardcoded marketing copy. Wiring them to live counts would
// take a `/api/landing/stats` endpoint — out of scope for this screen.
const PILLARS = [
  {
    Icon: Heart,
    bg: C.coralSoft,
    fg: C.coralDeep,
    iconFill: true,
    big: '92',
    label: 'Verified moms',
    sub: 'near you',
  },
  {
    Icon: Users,
    bg: C.sage,
    fg: C.sageDark,
    big: '23',
    label: 'Group meetups',
    sub: 'this week',
  },
  {
    Icon: Music,
    bg: C.peach,
    fg: C.saffron,
    big: '47',
    label: 'Kid activities',
    sub: 'classes & camps to join',
  },
  {
    Icon: MapPin,
    bg: C.lilac,
    fg: PURPLE,
    big: '120+',
    label: 'Curated places',
    sub: 'Tampa moms love',
  },
];

// Supporting services shown as a single inline row — covers the rest of
// what the app does without adding more tiles.
const ALSO = [
  { Icon: Calendar,       label: '1-tap scheduling' },
  { Icon: MessageCircle,  label: 'Verified chat' },
  { Icon: ShieldCheck,    label: 'Real moms only' },
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

    {/* Logo area — floating hearts + logo + decorative line */}
    <div style={{ position: 'relative', textAlign: 'center', padding: '10px 20px 0', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 14, left: 16, fontSize: 18, color: '#F5B8C8', opacity: .8 }}>♡</span>
      <span style={{ position: 'absolute', top: 36, left: 30, fontSize: 11, color: '#F5B8C8', opacity: .6 }}>♡</span>
      <span style={{ position: 'absolute', top: 20, right: 22, fontSize: 13, color: '#F5B8C8', opacity: .55 }}>♡</span>

      <img
        src="/gomama-logo.png"
        alt="Go Mama"
        style={{
          width: 150, height: 'auto', display: 'block',
          margin: '0 auto', mixBlendMode: 'multiply',
        }}
      />
    </div>

    {/* Centered stack — headline sits directly above the hook */}
    <div className="flex-1 flex flex-col justify-center" style={{ padding: '0 16px', minHeight: 0, gap: 12 }}>
      {/* Headline */}
      <div style={{ textAlign: 'center', padding: '0 6px' }}>
        <div style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700,
          lineHeight: 1.15, color: C.navy, letterSpacing: '-.015em',
        }}>
          Your kid needs a{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>friend</span>
          <br/>
          and so do{' '}
          <span style={{ color: C.coralDeep }}>you.</span>{' '}
          <span style={{ color: C.coral, fontSize: 16 }}>←</span>
        </div>
      </div>

      {/* 2×2 pillar grid */}
      <div className="grid grid-cols-2" style={{ gap: 8 }}>
        {PILLARS.map(p => <PillarTile key={p.label} {...p}/>)}
      </div>

      {/* Also row — supporting services */}
      <div
        className="flex items-center justify-center"
        style={{
          gap: 12, marginTop: 2, padding: '6px 0',
        }}
      >
        {ALSO.map(({ Icon, label }, i) => (
          <span key={label} className="flex items-center" style={{ gap: 4 }}>
            {i > 0 && <span style={{ color: C.coralSoft, marginRight: 4 }}>·</span>}
            <Icon size={11} color={C.coralDeep} strokeWidth={2.3}/>
            <span style={{
              fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700,
              color: C.navySoft, whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </span>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div style={{
      padding: '6px 16px 10px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      flexShrink: 0, position: 'relative',
    }}>
      <span style={{ position: 'absolute', left: 22, top: 14, color: C.coral, fontSize: 11, zIndex: 1 }}>✦</span>
      <span style={{ position: 'absolute', right: 22, top: 14, color: C.coral, fontSize: 11, zIndex: 1 }}>✦</span>

      <button
        onClick={onBegin}
        className="w-full rounded-full flex items-center justify-center active:scale-[.98] transition-transform"
        style={{
          height: 50, gap: 8,
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff',
          fontFamily: 'Albert Sans', fontSize: 14.5, fontWeight: 800,
          boxShadow: '0 8px 20px -8px rgba(214,68,106,.5)',
          border: 'none', cursor: 'pointer',
        }}
      >
        <Sparkles size={15} fill="currentColor"/>
        Find My Village
      </button>

      <div className="text-center" style={{
        marginTop: 6, fontSize: 11, color: C.muted, fontFamily: 'Albert Sans',
      }}>
        Already have an account?{' '}
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

// ==========================================================================
// PillarTile — one of the four big squares in the grid.
// Pastel bg (the pillar's color), lucide icon top-left, big Fraunces
// number, then label + sub. The number is the engagement hook:
// "92 verified moms" / "23 group meetups" reads as abundance + specificity,
// not as a generic feature label.
// ==========================================================================
const PillarTile = ({ Icon, bg, fg, iconFill, big, label, sub }) => (
  <div
    className="relative overflow-hidden"
    style={{
      background: bg,
      borderRadius: 16,
      padding: '12px 12px 11px',
      minHeight: 96,
    }}
  >
    <div
      className="flex items-center justify-center"
      style={{
        width: 26, height: 26, borderRadius: 13,
        background: 'rgba(255,255,255,.55)',
        marginBottom: 6,
      }}
    >
      <Icon
        size={14}
        color={fg}
        strokeWidth={2.2}
        fill={iconFill ? fg : 'none'}
      />
    </div>
    <div style={{
      fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
      color: fg, lineHeight: 1, letterSpacing: '-.02em',
    }}>
      {big}
    </div>
    <div style={{
      marginTop: 4,
      fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
      color: C.navy, lineHeight: 1.2,
    }}>
      {label}
    </div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 600,
      color: C.navySoft, marginTop: 1, lineHeight: 1.25,
    }}>
      {sub}
    </div>
  </div>
);
