import { useState } from 'react';
import { Star } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// RateSheet — quick 1–5 star + optional note. Used on event + place cards
// in ActivitiesTab. Saves into `ratings` map in App.
// ==========================================================================

export const RateSheet = ({ item, kind, current = 0, onSave, onClose }) => {
  const [stars, setStars] = useState(current || 0);
  const [note, setNote] = useState('');

  return (
    <Sheet onClose={onClose}>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Rate {kind === 'event' ? 'this activity' : 'this place'}
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          How was <span style={{ fontStyle: 'italic', color: C.coral }}>your</span> visit?
        </h3>

        {/* Compact item summary */}
        <div
          className="mt-4 rounded-2xl px-3 py-2.5"
          style={{ background: C.paper, border: `1px solid ${C.divider}` }}
        >
          <div style={{
            fontFamily: 'Fraunces', fontSize: 15, fontWeight: 600,
            color: C.navy, letterSpacing: '-.01em',
          }}>
            {item.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
            {kind === 'event'
              ? `${item.day} · ${item.time} · ${item.place}`
              : `${item.area} · ${item.dist} mi`}
          </div>
        </div>

        {/* Star row */}
        <div className="mt-5 flex items-center justify-center gap-1">
          {[1,2,3,4,5].map(n => {
            const filled = n <= stars;
            return (
              <button
                key={n}
                onClick={() => setStars(stars === n ? 0 : n)}
                aria-label={`${n} star${n>1?'s':''}`}
                className="rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={{ width: 44, height: 44, background: 'transparent', border: 'none' }}
              >
                <Star
                  size={32}
                  color={filled ? '#A0791E' : C.divider}
                  fill={filled ? C.saffron : 'none'}
                  strokeWidth={1.6}
                />
              </button>
            );
          })}
        </div>
        <div
          className="text-center mt-1"
          style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted }}
        >
          {stars === 0 ? 'Tap a star' : `${stars} of 5`}
        </div>

        {/* Optional note */}
        <div className="mt-4">
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
              color: C.muted, fontWeight: 700,
            }}
          >
            Note (optional)
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What worked, what didn't…"
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 14,
              background: C.paper,
              border: `1px solid ${C.divider}`,
              fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy,
              resize: 'none', outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => { onSave(stars, note); onClose(); }}
          disabled={stars === 0}
          className="mt-5 w-full rounded-2xl flex items-center justify-center"
          style={{
            height: 50,
            background: stars === 0 ? C.divider : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: stars === 0 ? C.muted : '#fff',
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            boxShadow: stars === 0 ? 'none' : '0 6px 16px -6px rgba(214,68,106,.55)',
          }}
        >
          Save rating
        </button>
      </div>
    </Sheet>
  );
};
