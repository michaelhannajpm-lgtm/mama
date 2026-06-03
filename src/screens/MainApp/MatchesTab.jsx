import { useState } from 'react';
import { Heart, Users } from 'lucide-react';
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
      {/* Top toggle — both pills use coral gradient when active (HTML S5) */}
      <div className="px-5 pt-3 pb-2">
        <div className="rounded-full p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
          <button onClick={() => setView('moms')} className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all" style={{
            height: 38,
            background: view === 'moms' ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : 'transparent',
            color: view === 'moms' ? '#fff' : C.inkMuted,
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
            boxShadow: view === 'moms' ? '0 4px 12px -4px rgba(214,68,106,.5)' : 'none',
          }}>
            <Heart size={13} fill={view === 'moms' ? 'currentColor' : 'none'}/> 1:1 matches · {momCount}
          </button>
          <button onClick={() => setView('groups')} className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all" style={{
            height: 38,
            background: view === 'groups' ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : 'transparent',
            color: view === 'groups' ? '#fff' : C.inkMuted,
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
            boxShadow: view === 'groups' ? '0 4px 12px -4px rgba(214,68,106,.5)' : 'none',
          }}>
            <Users size={13}/> Group meetups · {groupCount}
          </button>
        </div>
      </div>

      {/* Deck — vertical scroll-snap */}
      <div className="flex-1 overflow-y-auto" style={{
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
    </div>
  );
};
