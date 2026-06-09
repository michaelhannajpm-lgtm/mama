import { useState } from 'react';
import { CalendarDays, Users, MapPin, User, Settings, LayoutGrid } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { ThisWeekTab } from './ThisWeekTab';
import { ConnectTab } from './ConnectTab';
import { LocalPicksTab } from './LocalPicksTab';
import { YouTab } from './YouTab';
import { MyVillageSheet } from '../../sheets/MyVillageSheet';
import { MamaHubSheet } from '../../sheets/MamaHubSheet';
import { GroupDiscussionSheet } from '../../sheets/GroupDiscussionSheet';
import { GROUP_DISCUSSIONS } from '../../data/discussions';

// ====================================================================
// MAIN APP — 4 tabs (V5 layout):
//   This Week · Connect · Local Picks · Profile
//
// Shared header surfaces the tab title (Fraunces, large) and two round
// icon buttons on the right: notifications (bell) + filters (sliders).
// Profile swaps the filter icon for settings.
// ====================================================================

// Bottom tab bar. 'hub' is a launcher (opens MamaHubSheet) rather than a
// content tab. Profile lives in the top-right header button instead.
const TABS = [
  { id: 'thisweek',   icon: CalendarDays, label: 'This Week',   headerLabel: 'This Week'   },
  { id: 'connect',    icon: Users,        label: 'Connect',     headerLabel: 'Connect'     },
  { id: 'localpicks', icon: MapPin,       label: 'Local Picks', headerLabel: 'Local Picks' },
  { id: 'hub',        icon: LayoutGrid,   label: 'My Hub',      headerLabel: 'My Hub'      },
];

const HEADER_SUBTITLES = {
  thisweek:   '38 ideas picked for your family',
  connect:    'Meet moms who get it',
  localpicks: 'The best places, programs, schools, and resources near you.',
  profile:    'Everything for you and your family',
};

// Header title for the active content view (profile is reached via the
// top-right button, so it isn't in the bottom TABS list).
const HEADER_LABELS = {
  thisweek: 'This Week', connect: 'Connect', localpicks: 'Local Picks', profile: 'My Profile',
};

export const MainApp = ({
  places,
  events, thisWeek,
  locationGeo,
  placesRadius = 50, setPlacesRadius,
  profile, setProfile, prefs, setPrefs,
  location, setLocation, distance, setDistance,
  scheduled1to1, joinedEvents, setJoinedEvents,
  savedItems, setSavedItems,
  goingItems, setGoingItems,
  ratings, setRatings,
  messageHistory = {},
  openSchedule, openProfile, openMessage, openPremium,
  account, requestAccount, restart, flash,
  nearbyMoms = [], nearbyVerifiedOnly = true, onSetVerifiedOnly,
}) => {
  void setPrefs;
  const [tab, setTab] = useState('thisweek');
  const [villageOpen, setVillageOpen] = useState(false);
  // Mama Hub launcher state (opened from the bottom "My Hub" tab).
  const [hubOpen, setHubOpen] = useState(false);
  // Group discussion opened from inside the Mama Hub. Local to MainApp so
  // it can stack above the hub.
  const [hubDiscussion, setHubDiscussion] = useState(null);
  const [joinedDiscussions, setJoinedDiscussions] = useState(new Set());

  // Filter-sheet open state per tab. Each tab still exposes an inline
  // filter button next to its category row — the header filter icon was
  // removed in favor of My Village, so this is the only entry point.
  const [thisWeekFilterOpen,   setThisWeekFilterOpen]   = useState(false);
  const [connectFilterOpen,    setConnectFilterOpen]    = useState(false);
  const [localPicksFilterOpen, setLocalPicksFilterOpen] = useState(false);

  const activeLabel = HEADER_LABELS[tab] || '';
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
              fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
              color: C.navy, letterSpacing: '-.02em', lineHeight: 1.05,
            }}>
              {activeLabel}
            </div>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
              marginTop: 4, lineHeight: 1.35,
            }}>
              {HEADER_SUBTITLES[tab]}
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {/* Profile — top-right avatar button (opens the Profile view) */}
            <button
              aria-label="Profile"
              onClick={() => setTab('profile')}
              className="rounded-full flex items-center justify-center active:scale-[.97] transition-transform overflow-hidden"
              style={{
                width: 36, height: 36,
                background: profile?.photos?.[0]
                  ? `center/cover no-repeat url('${profile.photos[0]}')`
                  : C.paper,
                border: `${isProfile ? 2 : 1}px solid ${isProfile ? C.coralDeep : C.divider}`,
                cursor: 'pointer',
              }}
            >
              {!profile?.photos?.[0] && <User size={16} color={isProfile ? C.coralDeep : C.navy}/>}
            </button>
            {isProfile && (
              <button
                aria-label="Settings"
                onClick={() => flash?.('Settings coming soon')}
                className="rounded-full flex items-center justify-center active:scale-[.97] transition-transform"
                style={{ width: 36, height: 36, background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer' }}
              >
                <Settings size={15} color={C.navy}/>
              </button>
            )}
          </div>
        </div>
      </div>

      {tab === 'thisweek' && <ThisWeekTab
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        ratings={ratings} setRatings={setRatings}
        location={location} flash={flash}
        filterOpen={thisWeekFilterOpen} setFilterOpen={setThisWeekFilterOpen}/>}
      {tab === 'connect' && <ConnectTab
        profile={profile} prefs={prefs}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        openPremium={openPremium}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        scheduled1to1={scheduled1to1}
        savedItems={savedItems} setSavedItems={setSavedItems}
        messageHistory={messageHistory}
        account={account} requestAccount={requestAccount} flash={flash}
        filterOpen={connectFilterOpen} setFilterOpen={setConnectFilterOpen}
        nearbyMoms={nearbyMoms}
        nearbyVerifiedOnly={nearbyVerifiedOnly}
        onSetVerifiedOnly={onSetVerifiedOnly}/>}
      {tab === 'localpicks' && <LocalPicksTab
        places={places}
        location={location} locationGeo={locationGeo}
        placesRadius={placesRadius}
        savedItems={savedItems} setSavedItems={setSavedItems}
        flash={flash}
        filterOpen={localPicksFilterOpen} setFilterOpen={setLocalPicksFilterOpen}/>}
      {tab === 'profile' && <YouTab
        profile={profile} setProfile={setProfile}
        account={account} prefs={prefs}
        location={location} setLocation={setLocation}
        distance={distance} setDistance={setDistance}
        placesRadius={placesRadius} setPlacesRadius={setPlacesRadius}
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        goToMeetups={() => setTab('connect')}
        openPlans={() => setVillageOpen(true)}
        openPremium={openPremium}
        savedCount={savedCount}
        restart={restart} flash={flash}/>}

      {/* Tab Bar — 4 buttons, coral underline indicates active */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.line, background: '#fff' }}>
        <div className="flex justify-between items-center">
          {TABS.map(t => {
            // 'hub' is a launcher (opens the sheet); it's never the active tab.
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => (t.id === 'hub' ? setHubOpen(true) : setTab(t.id))}
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

      {villageOpen && (
        <MyVillageSheet
          savedItems={savedItems} setSavedItems={setSavedItems}
          goingItems={goingItems} setGoingItems={setGoingItems}
          joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
          messageHistory={messageHistory}
          openMessage={openMessage}
          flash={flash}
          moms={nearbyMoms}
          onClose={() => setVillageOpen(false)}
        />
      )}

      {hubOpen && (
        <MamaHubSheet
          groupDiscussions={GROUP_DISCUSSIONS}
          joinedDiscussionIds={joinedDiscussions}
          onOpenMessage={openMessage}
          onOpenDiscussion={(d) => setHubDiscussion(d)}
          flash={flash}
          onClose={() => setHubOpen(false)}
        />
      )}

      {hubDiscussion && (
        <GroupDiscussionSheet
          discussion={hubDiscussion}
          joined={joinedDiscussions.has(hubDiscussion.id)}
          onToggleJoin={() => {
            setJoinedDiscussions(prev => {
              const next = new Set(prev);
              if (next.has(hubDiscussion.id)) {
                next.delete(hubDiscussion.id);
                flash?.(`Left ${hubDiscussion.title}`);
              } else {
                next.add(hubDiscussion.id);
                flash?.(`✦ Joined ${hubDiscussion.title}`);
              }
              return next;
            });
          }}
          onMessageMom={(mom) => { openMessage?.(mom); setHubDiscussion(null); }}
          onScheduleMom={(mom) => { openSchedule?.(mom); setHubDiscussion(null); }}
          flash={flash}
          onClose={() => setHubDiscussion(null)}
        />
      )}
    </div>
  );
};
