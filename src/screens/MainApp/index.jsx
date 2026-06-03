import { useState } from 'react';
import { Users, Calendar, BookOpen, User, Bookmark } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { ActivitiesTab } from './ActivitiesTab';
import { MatchesTab } from './MatchesTab';
import { ResourcesTab } from './ResourcesTab';
import { YouTab } from './YouTab';
import { MyPlansSheet } from '../../sheets/MyPlansSheet';

// ====================================================================
// MAIN APP — 4 tabs (curated-discovery restructure):
//   Meetups · Activities · Resources · Profile
//
// - Meetups defaults to Groups view; surfaces 1:1 matches via toggle.
// - Activities replaces the old Places tab; toggles between
//   "Things to do" (events) and "Places".
// - Resources is the curated info layer (Pediatricians, Discounts,
//   Mom-owned biz, etc.).
// - Profile keeps Verification + Photos + Hero card.
//
// Every tab shares a top header with a Bookmark icon (right) that opens
// MyPlansSheet — surfacing the user's saved cross-app items.
// ====================================================================

const TABS = [
  { id: 'meetups',    icon: Users,    label: 'Meetups'    },
  { id: 'activities', icon: Calendar, label: 'Activities' },
  { id: 'resources',  icon: BookOpen, label: 'Resources'  },
  { id: 'profile',    icon: User,     label: 'Profile'    },
];

export const MainApp = ({
  profile, setProfile, prefs, setPrefs,
  location, setLocation, distance, setDistance,
  scheduled1to1, joinedEvents, setJoinedEvents,
  savedItems, setSavedItems,
  goingItems, setGoingItems,
  ratings, setRatings,
  openSchedule, openProfile, openMessage, openPremium,
  account, requestAccount, restart, flash,
}) => {
  // setPrefs kept in props signature for future Places-tab routing.
  void setPrefs;
  const [tab, setTab] = useState('meetups');
  const [plansOpen, setPlansOpen] = useState(false);

  const activeLabel = TABS.find(t => t.id === tab)?.label || '';
  const savedCount = savedItems?.length || 0;

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {/* Shared top header — tab title (left) + bookmark icon (right). */}
      <div
        className="flex items-center justify-between px-5"
        style={{ paddingTop: 6, paddingBottom: 6 }}
      >
        <div style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600,
          color: C.navy, letterSpacing: '-.02em', lineHeight: 1.1,
        }}>
          {activeLabel}
        </div>
        <button
          onClick={() => setPlansOpen(true)}
          aria-label="Open My Plans"
          className="rounded-full flex items-center justify-center relative"
          style={{
            width: 36, height: 36,
            background: C.paper, border: `1px solid ${C.divider}`,
          }}
        >
          <Bookmark size={15} color={C.coralDeep} fill={savedCount > 0 ? C.coralDeep : 'none'}/>
          {savedCount > 0 && (
            <span
              className="absolute"
              style={{
                top: -3, right: -3,
                minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 8,
                background: C.coralDeep, color: '#fff',
                fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${C.cream}`,
              }}
            >
              {savedCount > 9 ? '9+' : savedCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'meetups' && <MatchesTab
        profile={profile} prefs={prefs}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        savedItems={savedItems} setSavedItems={setSavedItems}
        account={account} requestAccount={requestAccount} flash={flash}/>}
      {tab === 'activities' && <ActivitiesTab
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        ratings={ratings} setRatings={setRatings}
        location={location} flash={flash}/>}
      {tab === 'resources' && <ResourcesTab
        savedItems={savedItems} setSavedItems={setSavedItems}/>}
      {tab === 'profile' && <YouTab
        profile={profile} setProfile={setProfile}
        account={account} prefs={prefs}
        location={location} setLocation={setLocation}
        distance={distance} setDistance={setDistance}
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        goToMeetups={() => setTab('meetups')}
        openPlans={() => setPlansOpen(true)}
        openPremium={openPremium}
        savedCount={savedCount}
        restart={restart}/>}

      {/* Tab Bar — 4 buttons, coral underline indicates active */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.line, background: '#fff' }}>
        <div className="flex justify-between items-center">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-col items-center gap-0.5 py-1.5 flex-1 relative"
              >
                {active && (
                  <div style={{
                    position: 'absolute', top: -1,
                    width: 20, height: 2.5,
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
                  }}/>
                )}
                <t.icon
                  size={20}
                  color={active ? C.coralDeep : C.navySoft}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="text-[10px]" style={{
                  fontFamily: 'Albert Sans',
                  fontWeight: active ? 700 : 600,
                  color: active ? C.coralDeep : C.navySoft,
                  marginTop: 2,
                }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {plansOpen && (
        <MyPlansSheet
          savedItems={savedItems}
          setSavedItems={setSavedItems}
          onClose={() => setPlansOpen(false)}
        />
      )}
    </div>
  );
};
