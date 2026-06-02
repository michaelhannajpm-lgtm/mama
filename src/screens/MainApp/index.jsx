import { useState } from 'react';
import { MapPin, Users, Heart, User } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { PlacesTab } from './PlacesTab';
import { MatchesTab } from './MatchesTab';
import { FavoritesTab } from './FavoritesTab';
import { YouTab } from './YouTab';

// ====================================================================
// MAIN APP — 4 tabs (ported from the GoMama Expo prototype):
//   Meetups · Places · Favorites · Profile
//
// - Meetups (was Matches): keeps the moms/groups toggle and now also
//   surfaces the SUGGESTED_EVENTS that previously lived in their own
//   Events tab.
// - Calendar tab was folded into Profile (YouTab Upcoming section).
// ====================================================================
export const MainApp = ({ profile, setProfile, prefs, setPrefs, location, distance, scheduled1to1, joinedEvents, setJoinedEvents, savedItems, setSavedItems, openSchedule, openProfile, openMessage, openPremium, account, requestAccount, restart, flash }) => {
  const [tab, setTab] = useState('meetups');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {tab==='meetups'   && <MatchesTab
        profile={profile}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        savedItems={savedItems} setSavedItems={setSavedItems}
        account={account} requestAccount={requestAccount} flash={flash}/>}
      {tab==='places'    && <PlacesTab prefs={prefs} setPrefs={setPrefs} location={location} goToMatches={()=>setTab('meetups')} savedItems={savedItems} setSavedItems={setSavedItems} flash={flash}/>}
      {tab==='favorites' && <FavoritesTab savedItems={savedItems} setSavedItems={setSavedItems}/>}
      {tab==='profile'   && <YouTab
        profile={profile} setProfile={setProfile}
        account={account} prefs={prefs} location={location} distance={distance}
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        goToMeetups={()=>setTab('meetups')}
        restart={restart}/>}

      {/* Tab Bar — 4 buttons, GoMama style */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.line, background: '#fff' }}>
        <div className="flex justify-between items-center">
          {[
            { id:'meetups',   icon: Users,    label:'Meetups'   },
            { id:'places',    icon: MapPin,   label:'Places'    },
            { id:'favorites', icon: Heart,    label:'Favorites' },
            { id:'profile',   icon: User,     label:'Profile'   },
          ].map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className="flex flex-col items-center gap-0.5 py-1.5 flex-1 relative">
                {active && (
                  <div style={{
                    position: 'absolute', top: -1,
                    width: 20, height: 2.5,
                    borderRadius: 2, background: C.coral,
                  }}/>
                )}
                <t.icon
                  size={20}
                  color={active ? C.coralDeep : C.navySoft}
                  fill={active && t.id === 'favorites' ? C.coralDeep : 'none'}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="text-[10px]" style={{
                  fontFamily:'Albert Sans',
                  fontWeight: active ? 700 : 600,
                  color: active ? C.coralDeep : C.navySoft,
                  marginTop: 2,
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
