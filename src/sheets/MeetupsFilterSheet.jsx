import { useState } from 'react';
import { ShieldCheck, RotateCcw, CalendarHeart } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { MOM_TYPES, KID_AGES, VALUES, INTERESTS, DAYS, TIME_WINDOWS } from '../data/taxonomy';

const DISTANCE_PRESETS = [
  { val: 1,  label: '< 1 mi' },
  { val: 3,  label: '< 3 mi' },
  { val: 5,  label: '< 5 mi' },
  { val: 10, label: '< 10 mi' },
  { val: null, label: 'Any' },
];

const Chip = ({ active, onClick, children, accent = C.navy }) => (
  <button
    onClick={onClick}
    className="rounded-full transition-all active:scale-[.97] flex items-center gap-1.5"
    style={{
      padding: '8px 12px',
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

export const MEETUPS_FILTER_DEFAULT = {
  momTypes: [], kidAges: [], interests: [], values: [],
  calSameAsMe: false, calDays: [], calTimes: [],
  distance: null, verifiedOnly: false,
};

export const MeetupsFilterSheet = ({ filters, setFilters, onClose, userSlotsCount = 0 }) => {
  const [draft, setDraft] = useState(filters);

  const toggleArr = (key, val) => {
    setDraft(d => {
      const cur = d[key] || [];
      return { ...d, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  };

  const setDistance = (val) => setDraft(d => ({ ...d, distance: val }));
  const setBool = (key, v) => setDraft(d => ({ ...d, [key]: v }));

  const reset = () => setDraft({ ...MEETUPS_FILTER_DEFAULT });

  const apply = () => {
    setFilters(draft);
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Refine matches
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Find your <span style={{ fontStyle: 'italic', color: C.coral }}>kind</span> of mom
        </h3>

        {/* Mom type */}
        <div className="mt-5">
          <SectionLabel>Mom type</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {MOM_TYPES.filter(t => t.id !== 'prefer_not').map(t => (
              <Chip
                key={t.id}
                active={draft.momTypes.includes(t.label)}
                onClick={() => toggleArr('momTypes', t.label)}
                accent={C.coral}
              >
                <t.icon size={13}/>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Kid ages */}
        <div className="mt-5">
          <SectionLabel>Kid ages</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {KID_AGES.map(a => (
              <Chip
                key={a}
                active={draft.kidAges.includes(a)}
                onClick={() => toggleArr('kidAges', a)}
                accent={C.coral}
              >
                {a}
              </Chip>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="mt-5">
          <SectionLabel>Interests</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map(i => (
              <Chip
                key={i.label}
                active={draft.interests.includes(i.label)}
                onClick={() => toggleArr('interests', i.label)}
                accent={C.coral}
              >
                <i.icon size={13}/>
                {i.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mt-5">
          <SectionLabel>Shared values</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map(v => (
              <Chip
                key={v}
                active={draft.values.includes(v)}
                onClick={() => toggleArr('values', v)}
                accent={C.coral}
              >
                {v}
              </Chip>
            ))}
          </div>
        </div>

        {/* Calendar — sameAsMe + days + times */}
        <div className="mt-5">
          <SectionLabel>Calendar</SectionLabel>
          <button
            onClick={() => setBool('calSameAsMe', !draft.calSameAsMe)}
            className="w-full rounded-2xl flex items-center gap-2.5 transition-all"
            style={{
              padding: '12px 14px',
              background: draft.calSameAsMe ? C.sage : C.paper,
              border: `1px solid ${draft.calSameAsMe ? C.sageDark : C.divider}`,
              textAlign: 'left',
              opacity: userSlotsCount === 0 ? 0.55 : 1,
              cursor: userSlotsCount === 0 ? 'not-allowed' : 'pointer',
              marginBottom: 10,
            }}
            disabled={userSlotsCount === 0}
          >
            <CalendarHeart size={18} color={draft.calSameAsMe ? C.sageDark : C.muted}/>
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
                  : 'Moms whose free slots overlap mine'}
              </div>
            </div>
            <div
              style={{
                width: 36, height: 22, borderRadius: 11,
                background: draft.calSameAsMe ? C.sageDark : C.divider,
                position: 'relative',
                transition: 'background .2s',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: 2,
                  left: draft.calSameAsMe ? 16 : 2,
                  width: 18, height: 18, borderRadius: 9,
                  background: '#fff',
                  transition: 'left .2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                }}
              />
            </div>
          </button>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(d => (
              <Chip
                key={d}
                active={draft.calDays.includes(d)}
                onClick={() => toggleArr('calDays', d)}
                accent={C.sageDark}
              >
                {d}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TIME_WINDOWS.map(w => (
              <Chip
                key={w.id}
                active={draft.calTimes.includes(w.id)}
                onClick={() => toggleArr('calTimes', w.id)}
                accent={C.sageDark}
              >
                {w.emoji} {w.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div className="mt-5">
          <SectionLabel>Distance</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_PRESETS.map(d => (
              <Chip
                key={d.label}
                active={draft.distance === d.val}
                onClick={() => setDistance(d.val)}
                accent={C.navy}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Verified */}
        <div className="mt-5">
          <SectionLabel>Verification</SectionLabel>
          <button
            onClick={() => setBool('verifiedOnly', !draft.verifiedOnly)}
            className="w-full rounded-2xl flex items-center gap-2.5 transition-all"
            style={{
              padding: '12px 14px',
              background: draft.verifiedOnly ? C.sage : C.paper,
              border: `1px solid ${draft.verifiedOnly ? C.sageDark : C.divider}`,
              textAlign: 'left',
            }}
          >
            <ShieldCheck size={18} color={draft.verifiedOnly ? C.sageDark : C.muted} />
            <div className="flex-1">
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy,
              }}>
                Verified moms only
              </div>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted, marginTop: 1,
              }}>
                IG/FB + real photo confirmed
              </div>
            </div>
            <div
              style={{
                width: 36, height: 22, borderRadius: 11,
                background: draft.verifiedOnly ? C.sageDark : C.divider,
                position: 'relative',
                transition: 'background .2s',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: 2,
                  left: draft.verifiedOnly ? 16 : 2,
                  width: 18, height: 18, borderRadius: 9,
                  background: '#fff',
                  transition: 'left .2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                }}
              />
            </div>
          </button>
        </div>

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
              background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)',
            }}
          >
            Apply filters
          </button>
        </div>
      </div>
    </Sheet>
  );
};
