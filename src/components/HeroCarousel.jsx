import { useEffect, useRef, useState } from 'react';
import { Star, ShieldCheck, MapPin } from 'lucide-react';
import { C } from '../theme';

// ==========================================================================
// HeroCarousel — the landing hero, reimagined as a swipeable story of the
// app's four pillars. Each slide is a full-bleed cover photo with a bottom
// scrim and an overlaid caption (eyebrow + title + proof point). Auto-advances
// every 3.8s, pauses while dragging, supports touch/mouse swipe + tap-to-jump.
//
// This replaces the old single static photo + lone cycling stat pill — every
// slide now carries its own proof point, so the layout height is unchanged and
// the landing still fits without scroll.
// ==========================================================================

const SLIDES = [
  {
    img: '/hero-moms.png',
    eyebrow: 'CONNECT',
    title: 'Moms who actually get it',
    stat: '50 moms meeting this week in Tampa',
    badge: 'live',
  },
  {
    img: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&auto=format&fit=crop',
    eyebrow: 'EXPLORE',
    title: 'Kid activities, all sorted',
    stat: '70 playgroups & classes this week',
    badge: 'map',
  },
  {
    img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop',
    eyebrow: 'TOP RATED',
    title: 'Local gems, mom-ranked',
    stat: '4.9 · 1,200+ kid-friendly spots',
    badge: 'rating',
  },
  {
    img: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop',
    eyebrow: 'VERIFIED',
    title: 'Real moms, always verified',
    stat: 'Instagram + a real photo — no randoms',
    badge: 'shield',
  },
];

const N = SLIDES.length;

// Small adornment shown to the left of each slide's eyebrow.
const EyebrowMark = ({ kind }) => {
  if (kind === 'live') {
    return (
      <span style={{
        width: 7, height: 7, borderRadius: 4, background: C.coral,
        boxShadow: `0 0 0 3px rgba(255,255,255,.45)`,
        animation: 'livePulse 1.4s ease-in-out infinite',
      }}/>
    );
  }
  if (kind === 'rating') return <Star size={11} fill={C.saffron} color={C.saffron} strokeWidth={0}/>;
  if (kind === 'shield') return <ShieldCheck size={11} color="#fff" strokeWidth={2.4}/>;
  return <MapPin size={11} color="#fff" strokeWidth={2.4}/>;
};

export const HeroCarousel = () => {
  const [idx, setIdx] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const widthRef = useRef(1);
  const pausedRef = useRef(false);
  const containerRef = useRef(null);

  const go = (i) => setIdx(((i % N) + N) % N);

  // Auto-advance — paused while the user is interacting.
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setIdx(i => (i + 1) % N);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  const onPointerDown = (e) => {
    draggingRef.current = true;
    pausedRef.current = true;
    startXRef.current = e.clientX;
    widthRef.current = containerRef.current?.offsetWidth || 1;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    setDragDx(e.clientX - startXRef.current);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    const threshold = widthRef.current * 0.18;
    if (dragDx > threshold) go(idx - 1);
    else if (dragDx < -threshold) go(idx + 1);
    draggingRef.current = false;
    setDragDx(0);
    // Resume auto-advance shortly after the gesture ends.
    setTimeout(() => { pausedRef.current = false; }, 700);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden',
        background: C.cream, touchAction: 'pan-y', cursor: 'grab', userSelect: 'none',
        boxShadow: '0 14px 30px -16px rgba(27,42,78,.35)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Track */}
      <div
        className="flex h-full"
        style={{
          width: '100%',
          transform: `translateX(calc(${-idx * 100}% + ${dragDx}px))`,
          transition: draggingRef.current ? 'none' : 'transform .5s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {SLIDES.map((s, i) => (
          <div key={s.eyebrow} className="relative shrink-0" style={{ width: '100%', height: '100%' }}>
            <img
              src={s.img}
              alt={s.title}
              draggable={false}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                objectPosition: 'center', display: 'block',
                WebkitUserDrag: 'none', pointerEvents: 'none',
              }}
            />

            {/* Bottom scrim for caption legibility */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(20,14,16,0) 42%, rgba(20,14,16,.18) 60%, rgba(20,14,16,.74) 100%)',
            }}/>

            {/* Caption + dots row */}
            <div
              className="absolute left-0 right-0 bottom-0 flex items-end justify-between"
              style={{ padding: '0 14px 12px', gap: 10 }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center" style={{ gap: 6, marginBottom: 3 }}>
                  <EyebrowMark kind={s.badge}/>
                  <span style={{
                    fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
                    letterSpacing: '.16em', color: '#fff', opacity: .92,
                  }}>
                    {s.eyebrow}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'Fraunces', fontSize: 19, fontWeight: 600,
                  color: '#fff', lineHeight: 1.12, letterSpacing: '-.01em',
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
                  color: 'rgba(255,255,255,.9)', marginTop: 3,
                }}>
                  {s.stat}
                </div>
              </div>

              {/* Dot indicators (also tappable) */}
              <div className="flex items-center" style={{ gap: 5, paddingBottom: 3, pointerEvents: 'auto' }}>
                {SLIDES.map((d, di) => (
                  <button
                    key={d.eyebrow}
                    aria-label={`Go to slide ${di + 1}: ${d.eyebrow}`}
                    onClick={(e) => { e.stopPropagation(); pausedRef.current = true; go(di); setTimeout(() => { pausedRef.current = false; }, 4000); }}
                    style={{
                      width: di === idx ? 16 : 6, height: 6, borderRadius: 999,
                      background: di === idx ? C.coral : 'rgba(255,255,255,.6)',
                      border: 'none', padding: 0, cursor: 'pointer',
                      transition: 'width .3s ease, background .3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
