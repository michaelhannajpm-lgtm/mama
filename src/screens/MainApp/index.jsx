import { useState } from 'react';
import {
  Calendar as CalendarIcon, MapPin, Users, Heart, User,
} from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { CalendarTab } from './CalendarTab';
import { PlacesTab } from './PlacesTab';
import { EventsTab } from './EventsTab';
import { MatchesTab } from './MatchesTab';
import { YouTab } from './YouTab';

// ====================================================================
// MAIN APP — 5 tabs: Matches · Calendar · Places · Events · Profile
// ====================================================================
export const MainApp = ({ profile, prefs, setPrefs, location, distance, scheduled1to1, joinedEvents, setJoinedEvents, openSchedule, openProfile, openMessage, openPremium, account, requestAccount, restart, flash }) => {
  const [tab, setTab] = useState('matches');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {tab==='matches'  && <MatchesTab
        profile={profile}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        account={account} requestAccount={requestAccount} flash={flash}/>}
      {tab==='calendar' && <CalendarTab
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        prefs={prefs} setPrefs={setPrefs}
        openSchedule={openSchedule}
        goToMatches={()=>setTab('matches')}
        flash={flash}/>}
      {tab==='places'   && <PlacesTab prefs={prefs} setPrefs={setPrefs} location={location} goToMatches={()=>setTab('matches')} flash={flash}/>}
      {tab==='events'   && <EventsTab joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents} account={account} requestAccount={requestAccount} openPremium={openPremium} flash={flash}/>}
      {tab==='profile'  && <YouTab profile={profile} prefs={prefs} location={location} distance={distance} restart={restart}/>}

      {/* Tab Bar — 5 buttons, Matches first */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.divider, background: C.creamSoft }}>
        <div className="flex justify-between items-center">
          {[
            { id:'matches',  icon: Heart,         label:'Matches'  },
            { id:'calendar', icon: CalendarIcon,  label:'Calendar' },
            { id:'places',   icon: MapPin,        label:'Places'   },
            { id:'events',   icon: Users,         label:'Events'   },
            { id:'profile',  icon: User,          label:'Profile'  },
          ].map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className="flex flex-col items-center gap-0.5 py-1.5 flex-1">
                <t.icon size={20} style={{ color: active ? C.terracotta : C.inkMuted, strokeWidth: active ? 2.2 : 1.7 }}/>
                <span className="text-[11.5px]" style={{ fontFamily:'Albert Sans', fontWeight: active?600:500, color: active ? C.ink : C.inkMuted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
