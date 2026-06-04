import { useState } from 'react';
import { CalendarDays, Users, MapPin, User, Bell, SlidersHorizontal, Settings } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { ThisWeekTab } from './ThisWeekTab';
import { ConnectTab } from './ConnectTab';
import { LocalPicksTab } from './LocalPicksTab';
import { YouTab } from './YouTab';
import { MyPlansSheet } from '../../sheets/MyPlansSheet';

// ====================================================================
// MAIN APP — 4 tabs (V5 layout):
//   This Week · Connect · Local Picks · Profile
//
// Shared header surfaces the tab title (Fraunces, large) and two round
// icon buttons on the right: notifications (bell) + filters (sliders).
// Profile swaps the filter icon for settings.
// ====================================================================

const TABS = [
  { id: 'thisweek',   icon: CalendarDays, label: 'This Week',   headerLabel: 'This Week'   },
  { id: 'connect',    icon: Users,        label: 'Connect',     headerLabel: 'Connect'     },
  { id: 'localpicks', icon: MapPin,       label: 'Local Picks', headerLabel: 'Local Picks' },
  { id: 'profile',    icon: User,         label: 'Profile',     headerLabel: 'My Profile'  },
];

const HEADER_SUBTITLES = {
  thisweek:   '38 ideas picked for your family',
  connect:    'Meet moms who get it',
  localpicks: 'The best places, programs, schools, and resources near you.',
  profile:    'Everything for you and your family',
};

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
  void setPrefs;
  const [tab, setTab] = useState('thisweek');
  const [plansOpen, setPlansOpen] = useState(false);

  const activeTab = TABS.find(t => t.id === tab);
  const activeLabel = activeTab?.headerLabel || activeTab?.label || '';
  const savedCount = savedItems?.length || 0;
  const isProfile = tab === 'profile';

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {/* Shared top header — tab title + subtitle (left), bell + filter (right). */}
      <div className="px-5" style={{ paddingTop: 6, paddingBottom: 8 }}>
        <div className="flex items-start justify-between">
          <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
              color: C.navy, letterSpacing: '-.02em', lineHeight: 1.05,
            }}>
              {activeLabel}
              <svg width="16" height="14" viewBox="0 0 20 18" fill="none" style={{ flexShrink: 0 }}>
                <path d="M10 17 L2 9.2 C0 7.3 0 4.2 2 2.3 C4 0.4 7 0.4 9 2.3 L10 3.2 L11 2.3 C13 0.4 16 0.4 18 2.3 C20 4.2 20 7.3 18 9.2 L10 17 Z"
                  fill={C.coral} stroke={C.coral} strokeWidth="0.5"/>
              </svg>
            </div>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
              marginTop: 4, lineHeight: 1.35,
            }}>
              {HEADER_SUBTITLES[tab]}
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            <button
              onClick={() => setPlansOpen(true)}
              aria-label="Notifications"
              className="rounded-full flex items-center justify-center relative"
              style={{ width: 36, height: 36, background: C.paper, border: `1px solid ${C.divider}` }}
            >
              <Bell size={15} color={C.coralDeep}/>
              {savedCount > 0 && (
                <span
                  style={{
                    position: 'absolute', top: -3, right: -3,
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
            <button
              aria-label={isProfile ? 'Settings' : 'Filters'}
              className="rounded-full flex items-center justify-center"
              style={{ width: 36, height: 36, background: C.paper, border: `1px solid ${C.divider}` }}
            >
              {isProfile
                ? <Settings size={15} color={C.navy}/>
                : <SlidersHorizontal size={15} color={C.navy}/>}
            </button>
          </div>
        </div>
      </div>

      {tab === 'thisweek' && <ThisWeekTab
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        ratings={ratings} setRatings={setRatings}
        location={location} flash={flash}/>}
      {tab === 'connect' && <ConnectTab
        profile={profile} prefs={prefs}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        savedItems={savedItems} setSavedItems={setSavedItems}
        account={account} requestAccount={requestAccount} flash={flash}/>}
      {tab === 'localpicks' && <LocalPicksTab
        savedItems={savedItems} setSavedItems={setSavedItems}
        location={location} flash={flash}/>}
      {tab === 'profile' && <YouTab
        profile={profile} setProfile={setProfile}
        account={account} prefs={prefs}
        location={location} setLocation={setLocation}
        distance={distance} setDistance={setDistance}
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        goToMeetups={() => setTab('connect')}
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
