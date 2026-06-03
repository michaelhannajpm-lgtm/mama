import { useState } from 'react';
import { RotateCcw, CalendarHeart } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { MOM_TYPES, KID_AGES, INTERESTS, DAYS, TIME_WINDOWS } from '../data/taxonomy';

// One sheet, four shapes. `kind` controls which preference slice is edited:
//   momType   → filters.momTypes (string[])
//   kidAge    → filters.kidAges  (string[])
//   interests → filters.interests (string[])
//   calendar  → filters.calSameAsMe (bool) + calDays (string[]) + calTimes (string[])
//
// The sheet reads the current slice from `filters` and writes a partial
// patch via `onApply(patch)`.

const Chip = ({ active, onClick, children, accent = C.coral }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97] flex items-center gap-1.5"
    style={{
      padding: '9px 13px',
      background: active ? accent : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

const SectionLabel = ({ children }) => (
  <div
    className="uppercase"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 8,
    }}
  >
    {children}
  </div>
);

const TITLES = {
  momType:   { eyebrow: 'Filter by',     line: 'Mom type',                  italic: 'type',  accent: C.coral    },
  kidAge:    { eyebrow: 'Filter by',     line: 'Kid age',                   italic: 'age',   accent: C.coral    },
  interests: { eyebrow: 'Filter by',     line: 'Shared interests',          italic: 'spark', accent: C.coral    },
  calendar:  { eyebrow: 'Filter by',     line: 'Calendar',                  italic: 'free',  accent: C.sageDark },
};

export const MomCategoryFilterSheet = ({ kind, filters, onApply, onClose, userSlotsCount = 0 }) => {
  const t = TITLES[kind];

  const [momTypes,    setMomTypes]    = useState(filters.momTypes    || []);
  const [kidAges,     setKidAges]     = useState(filters.kidAges     || []);
  const [interests,   setInterests]   = useState(filters.interests   || []);
  const [calSameAsMe, setCalSameAsMe] = useState(!!filters.calSameAsMe);
  const [calDays,     setCalDays]     = useState(filters.calDays     || []);
  const [calTimes,    setCalTimes]    = useState(filters.calTimes    || []);

  const toggleIn = (arr, setter, val) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const apply = () => {
    if (kind === 'momType')   onApply({ momTypes });
    if (kind === 'kidAge')    onApply({ kidAges });
    if (kind === 'interests') onApply({ interests });
    if (kind === 'calendar')  onApply({ calSameAsMe, calDays, calTimes });
    onClose();
  };

  const reset = () => {
    if (kind === 'momType')   setMomTypes([]);
    if (kind === 'kidAge')    setKidAges([]);
    if (kind === 'interests') setInterests([]);
    if (kind === 'calendar')  { setCalSameAsMe(false); setCalDays([]); setCalTimes([]); }
  };

  return (
    <Sheet onClose={onClose}>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: t.accent, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          {t.eyebrow}
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          {t.line.replace(t.italic, '__')
            .split('__')
            .map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span style={{ fontStyle: 'italic', color: t.accent }}>{t.italic}</span>
                )}
              </span>
            ))}
        </h3>

        {/* Body */}
        {kind === 'momType' && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {MOM_TYPES.filter(m => m.id !== 'prefer_not').map(m => (
              <Chip
                key={m.id}
                active={momTypes.includes(m.label)}
                onClick={() => toggleIn(momTypes, setMomTypes, m.label)}
                accent={C.coral}
              >
                <m.icon size={13}/>
                {m.label}
              </Chip>
            ))}
          </div>
        )}

        {kind === 'kidAge' && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {KID_AGES.map(a => (
              <Chip
                key={a}
                active={kidAges.includes(a)}
                onClick={() => toggleIn(kidAges, setKidAges, a)}
                accent={C.coral}
              >
                {a}
              </Chip>
            ))}
          </div>
        )}

        {kind === 'interests' && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {INTERESTS.map(i => (
              <Chip
                key={i.label}
                active={interests.includes(i.label)}
                onClick={() => toggleIn(interests, setInterests, i.label)}
                accent={C.coral}
              >
                <i.icon size={13}/>
                {i.label}
              </Chip>
            ))}
          </div>
        )}

        {kind === 'calendar' && (
          <div className="mt-5 space-y-5">
            {/* Same as me toggle */}
            <button
              onClick={() => setCalSameAsMe(v => !v)}
              className="w-full rounded-2xl flex items-center gap-2.5 transition-all"
              style={{
                padding: '12px 14px',
                background: calSameAsMe ? C.sage : C.paper,
                border: `1px solid ${calSameAsMe ? C.sageDark : C.divider}`,
                textAlign: 'left',
                opacity: userSlotsCount === 0 ? 0.55 : 1,
                cursor: userSlotsCount === 0 ? 'not-allowed' : 'pointer',
              }}
              disabled={userSlotsCount === 0}
            >
              <CalendarHeart size={18} color={calSameAsMe ? C.sageDark : C.muted}/>
              <div className="flex-1">
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy,
                }}>
                  Similar availability to mine
                </div>
                <div style={{
                  fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted, marginTop: 1,
                }}>
                  {userSlotsCount === 0
                    ? 'Set your availability in Profile to enable'
                    : 'Match moms whose free slots overlap mine'}
                </div>
              </div>
              <div
                style={{
                  width: 36, height: 22, borderRadius: 11,
                  background: calSameAsMe ? C.sageDark : C.divider,
                  position: 'relative',
                  transition: 'background .2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute', top: 2,
                    left: calSameAsMe ? 16 : 2,
                    width: 18, height: 18, borderRadius: 9,
                    background: '#fff',
                    transition: 'left .2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                  }}
                />
              </div>
            </button>

            <div>
              <SectionLabel>Free on these days</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <Chip
                    key={d}
                    active={calDays.includes(d)}
                    onClick={() => toggleIn(calDays, setCalDays, d)}
                    accent={C.sageDark}
                  >
                    {d}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>At these times</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {TIME_WINDOWS.map(w => (
                  <Chip
                    key={w.id}
                    active={calTimes.includes(w.id)}
                    onClick={() => toggleIn(calTimes, setCalTimes, w.id)}
                    accent={C.sageDark}
                  >
                    {w.emoji} {w.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-7 flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-2xl flex items-center justify-center gap-1.5"
            style={{
              height: 50, padding: '0 16px',
              background: C.paper,
              border: `1px solid ${C.divider}`,
              color: C.navy,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13,
            }}
          >
            <RotateCcw size={14}/> Reset
          </button>
          <button
            onClick={apply}
            className="flex-1 rounded-2xl flex items-center justify-center"
            style={{
              height: 50,
              background: `linear-gradient(135deg, ${t.accent}, ${kind === 'calendar' ? C.sageDark : C.coralDeep})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </Sheet>
  );
};
