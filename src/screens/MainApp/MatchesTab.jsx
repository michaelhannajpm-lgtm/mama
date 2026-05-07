import { useState, useRef, useEffect } from 'react';
import { Heart, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { C } from '../../theme';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS } from '../../data/events';
import { MatchCardFull } from '../../components/MatchCardFull';
import { GroupCardFull } from '../../components/GroupCardFull';

export const MatchesTab = ({
  profile,
  openSchedule,
  openProfile,
  openMessage,
  joinedEvents,
  setJoinedEvents,
  account,
  requestAccount,
  flash,
}) => {
  const [view, setView] = useState('moms');
  const deckRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const items = view === 'moms' ? SAMPLE_MOMS : SUGGESTED_EVENTS;
  const total = items.length;

  // Reset to top whenever the toggle switches view
  useEffect(() => {
    setActiveIdx(0);
    if (deckRef.current) deckRef.current.scrollTop = 0;
  }, [view]);

  // Track which card is in view as the user scrolls
  const handleScroll = () => {
    const el = deckRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  const goPrev = () => {
    const el = deckRef.current;
    if (!el || activeIdx === 0) return;
    el.scrollTo({ top: (activeIdx - 1) * el.clientHeight, behavior: 'smooth' });
  };

  const goNext = () => {
    const el = deckRef.current;
    if (!el || activeIdx >= total - 1) return;
    el.scrollTo({ top: (activeIdx + 1) * el.clientHeight, behavior: 'smooth' });
  };

  const atStart = activeIdx === 0;
  const atEnd = activeIdx >= total - 1;

  const momCount = SAMPLE_MOMS.length;
  const groupCount = SUGGESTED_EVENTS.length;

  const handleJoin = (e) => {
    if ((joinedEvents || []).includes(e.id)) return;
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top toggle */}
      <div className="px-5 pt-3 pb-2">
        <div className="rounded-full p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
          <button onClick={() => setView('moms')} className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all" style={{
            height: 38,
            background: view === 'moms' ? C.terracotta : 'transparent',
            color: view === 'moms' ? '#fff' : C.inkMuted,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13,
            boxShadow: view === 'moms' ? '0 2px 8px rgba(200,85,61,.4)' : 'none',
          }}>
            <Heart size={13} fill={view === 'moms' ? 'currentColor' : 'none'}/> Moms · {momCount}
          </button>
          <button onClick={() => setView('groups')} className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all" style={{
            height: 38,
            background: view === 'groups' ? C.sageDark : 'transparent',
            color: view === 'groups' ? '#fff' : C.inkMuted,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13,
            boxShadow: view === 'groups' ? '0 2px 8px rgba(126,150,120,.45)' : 'none',
          }}>
            <Users size={13}/> Groups · {groupCount}
          </button>
        </div>
      </div>

      {/* Deck — vertical scroll-snap, wrapped for overlay arrows */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={deckRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto" style={{
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
        }}>
          {view === 'moms' && SAMPLE_MOMS.map(mom => (
            <div key={`mom-${mom.id}`} className="px-4 pb-3" style={{
              scrollSnapAlign: 'start',
              height: '100%',
            }}>
              <MatchCardFull
                mom={mom}
                profile={profile}
                onSchedule={openSchedule}
                onMessage={openMessage}
                onProfile={openProfile}
              />
            </div>
          ))}

          {view === 'groups' && SUGGESTED_EVENTS.map(event => (
            <div key={`event-${event.id}`} className="px-4 pb-3" style={{
              scrollSnapAlign: 'start',
              height: '100%',
            }}>
              <GroupCardFull
                event={event}
                joined={(joinedEvents || []).includes(event.id)}
                onJoin={handleJoin}
                onChat={() => flash && flash('Group chat coming soon')}
                onDetails={() => flash && flash(`${event.name} · details soon`)}
              />
            </div>
          ))}
        </div>

        {/* Desktop nav arrows — absolutely positioned over the deck */}
        <button
          onClick={goPrev}
          aria-label="Previous"
          disabled={atStart}
          className="absolute hidden md:flex items-center justify-center transition-opacity"
          style={{
            left: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: 999,
            background: 'rgba(255,255,255,.7)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.5)',
            color: C.ink, boxShadow: '0 4px 16px rgba(42,30,34,.18)',
            opacity: atStart ? 0.35 : 1, cursor: atStart ? 'default' : 'pointer',
            zIndex: 5,
          }}
        >
          <ChevronLeft size={22}/>
        </button>

        <button
          onClick={goNext}
          aria-label="Next"
          disabled={atEnd}
          className="absolute hidden md:flex items-center justify-center transition-opacity"
          style={{
            right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: 999,
            background: 'rgba(255,255,255,.7)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.5)',
            color: C.ink, boxShadow: '0 4px 16px rgba(42,30,34,.18)',
            opacity: atEnd ? 0.35 : 1, cursor: atEnd ? 'default' : 'pointer',
            zIndex: 5,
          }}
        >
          <ChevronRight size={22}/>
        </button>
      </div>
    </div>
  );
};
