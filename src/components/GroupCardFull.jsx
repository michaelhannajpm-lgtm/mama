import { Plus, Check, MessageCircle, Info } from 'lucide-react';
import { C } from '../theme';
import { DAYS_SHORT_BY_DOW, MONTH_NAMES } from '../data/taxonomy';

// `moms` is the live recommended-moms list (from /api/mom-profiles/nearby,
// already ranked by the match engine) supplied by the parent — leaf cards
// never fetch. Defaults to empty so the card degrades to "No matches going yet".
export const GroupCardFull = ({ event, joined, onJoin, onChat, onDetails, moms = [] }) => {
  // Date label like "SAT · MAY 11" — compute the next occurrence of event.day in this month.
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dowToIdx = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 };
  const target = dowToIdx[event.day];
  let dateNum = today.getDate();
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month, today.getDate() + i);
    if (d.getDay() === target) { dateNum = d.getDate(); break; }
  }
  const dateLabel = `${(DAYS_SHORT_BY_DOW[event.day] || event.day).toUpperCase()} · ${MONTH_NAMES[month].slice(0,3).toUpperCase()} ${dateNum}`;

  // Overlap: recommended moms whose freeSlots contain `${event.day}-${event.bucket}`
  const slotKey = `${event.day}-${event.bucket}`;
  const matchedGoing = moms.filter(m => (m.freeSlots || []).includes(slotKey));

  const firstNameOf = (m) => m.firstName || m.name?.split(' ')[0] || 'Mama';
  let overlapLabel;
  if (matchedGoing.length === 0) {
    overlapLabel = 'No matches going yet';
  } else if (matchedGoing.length <= 2) {
    overlapLabel = `${matchedGoing.map(firstNameOf).join(', ')} going`;
  } else {
    const names = matchedGoing.slice(0, 2).map(firstNameOf).join(', ');
    overlapLabel = `${names} +${matchedGoing.length - 2} more going`;
  }

  const tags = (event.tags || []).slice(0, 3);

  return (
    <div className="rounded-[28px] overflow-hidden h-full flex flex-col relative" style={{
      background: C.paper, border: `1px solid ${C.divider}`, boxShadow: '0 6px 24px rgba(42,30,34,.06)',
    }}>
      {/* Hero */}
      <div className="relative" style={{ flex: '0 0 55%', backgroundImage: `url('${event.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,.6))' }}/>

        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full" style={{
          background: C.sageDark, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10.5, letterSpacing: '.08em',
        }}>
          GROUP
        </div>

        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full" style={{
          background: 'rgba(255,255,255,.92)', color: C.ink,
          fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11, letterSpacing: '.04em',
        }}>
          {dateLabel}
        </div>

        <div className="absolute left-4 right-4 bottom-3 text-white">
          <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 24, letterSpacing: '-.02em', lineHeight: 1.1 }}>
            {event.name}
          </div>
          <div className="mt-0.5" style={{ fontFamily: 'Albert Sans', fontWeight: 500, fontSize: 12, opacity: .92 }}>
            {event.time} &nbsp;·&nbsp; {event.place} &nbsp;·&nbsp; {event.going} going
          </div>
        </div>
      </div>

      {/* Lower panel */}
      <div className="px-4 py-3" style={{ flex: '1 1 45%', background: C.paper }}>
        <div className="text-[10.5px] uppercase tracking-[.16em]" style={{
          fontFamily: 'Albert Sans', fontWeight: 600, color: C.sageDark,
        }}>
          From your matches
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          {matchedGoing.length > 0 ? (
            <div className="flex">
              {matchedGoing.slice(0, 3).map((m, i) => (
                <div key={m.id} className="rounded-full flex items-center justify-center" style={{
                  width: 28, height: 28, background: m.hue, color: '#fff',
                  fontFamily: 'Fraunces', fontWeight: 500, fontSize: 11,
                  border: `2px solid ${C.paper}`, marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i,
                }}>
                  {(m.name || '').split(' ').map(s => s[0]).join('')}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ fontFamily: 'Albert Sans', fontWeight: 500, fontSize: 12, color: C.inkSoft }}>
            {overlapLabel}
          </div>
        </div>

        {tags.length > 0 && (
          <>
            <div className="text-[10.5px] uppercase tracking-[.16em] mt-3" style={{
              fontFamily: 'Albert Sans', fontWeight: 600, color: C.sageDark,
            }}>
              Shared ground
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tags.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-full" style={{
                  background: `${C.sage}30`, color: C.sageDark,
                  fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
                }}>{t}</span>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={() => onJoin(event)} disabled={joined} className="flex-1 rounded-2xl flex items-center justify-center gap-1.5" style={{
            height: 42,
            background: joined ? `${C.sage}40` : C.sageDark,
            color: joined ? C.sageDark : '#fff',
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
          }}>
            {joined ? <><Check size={14}/> Going</> : <><Plus size={14}/> I'm in</>}
          </button>
          <button onClick={() => onChat(event)} aria-label={`Group chat for ${event.name}`} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <MessageCircle size={16}/>
          </button>
          <button onClick={() => onDetails(event)} aria-label={`Details for ${event.name}`} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <Info size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};
