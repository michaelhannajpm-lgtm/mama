import { useState } from 'react';
import { Users, MapPin, User, LayoutGrid, Home } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { HomeTab } from './HomeTab';
import { ConnectTab } from './ConnectTab';
import { LocalPicksTab } from './LocalPicksTab';
import { YouTab } from './YouTab';
import { MyVillageSheet } from '../../sheets/MyVillageSheet';
import { MamaHubSheet } from '../../sheets/MamaHubSheet';
import { GroupDiscussionSheet } from '../../sheets/GroupDiscussionSheet';
import { LocationSheet } from '../../sheets/LocationSheet';
import { GROUP_DISCUSSIONS, TOP_DISCUSSIONS } from '../../data/discussions';
import { updateMomProfile } from '../../lib/onboarding';
import { ChevronDown } from 'lucide-react';

// ====================================================================
// MAIN APP — 4 tabs (V5 layout):
//   Home · Local Picks · Connect · My Hub
//
// Shared header surfaces the tab title (Fraunces, large) and two round
// icon buttons on the right: notifications (bell) + filters (sliders).
// Profile swaps the filter icon for settings.
// ====================================================================

// Bottom tab bar. 'hub' is a launcher (opens MamaHubSheet) rather than a
// content tab. Profile sits at the bottom-right with a user icon.
const TABS = [
  { id: 'home',       icon: Home,    label: 'Home',        headerLabel: 'Home'        },
  { id: 'localpicks', icon: MapPin,  label: 'Local Picks', headerLabel: 'Local Picks' },
  { id: 'connect',    icon: Users,   label: 'Connect',     headerLabel: 'Connect'     },
  { id: 'hub',        icon: LayoutGrid, label: 'My Hub',   headerLabel: 'My Hub'      },
  { id: 'profile',    icon: User,    label: 'Profile',     headerLabel: 'My Profile'  },
];

const HEADER_SUBTITLES = {
  home:       'Your village this week',
  connect:    'Meet moms who get it',
  localpicks: 'The best local picks near you',
  hub:        'Your village, all in one place',
  profile:    'Everything for you and your family',
};

// Header title for the active content view (profile is reached via the
// top-right button, so it isn't in the bottom TABS list).
const HEADER_LABELS = {
  home: 'Home', connect: 'Connect', localpicks: 'Local Picks',
  hub: 'My Hub', profile: 'My Profile',
};

export const MainApp = ({
  places,
  events, thisWeek,
  locationGeo, setLocationGeo,
  placesRadius = 50, setPlacesRadius,
  profile, setProfile, prefs, setPrefs,
  location, setLocation, distance, setDistance,
  scheduled1to1, joinedEvents, setJoinedEvents,
  savedItems, setSavedItems,
  goingItems, setGoingItems,
  ratings, setRatings,
  openSchedule, openProfile, openMessage, openPremium,
  account, requestAccount, restart, flash,
  nearbyMoms = [], nearbyVerifiedOnly = true, onSetVerifiedOnly,
  chatAuthor,
  myUserId,
}) => {
  void setPrefs;
  const [tab, setTab] = useState('home');
  const [villageOpen, setVillageOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  // Location lives in app-level state (not the profile object). Mirror the
  // YouTab save path so a change from the Home header updates the profile too.
  const saveLocation = async ({ location: loc, locationGeo: geo, distance: dist }) => {
    setLocation?.(loc);
    setLocationGeo?.(geo || null);
    setDistance?.(dist);
    const api = { distance_miles: dist };
    if (geo) {
      if (geo.neighborhood || geo.label) api.neighborhood = geo.neighborhood || geo.label;
      if (geo.city) api.city = geo.city;
      if (geo.lat != null) api.home_lat = geo.lat;
      if (geo.lng != null) api.home_lng = geo.lng;
    }
    try { await updateMomProfile(api, { seedMomId: account?.seedMomId }); } catch { /* best-effort */ }
  };
  // Group discussion opened from inside the Mama Hub. Local to MainApp so
  // it can stack above the hub.
  const [hubDiscussion, setHubDiscussion] = useState(null);
  const [joinedDiscussions, setJoinedDiscussions] = useState(new Set());

  // Filter-sheet open state per tab. Each tab still exposes an inline
  // filter button next to its category row — the header filter icon was
  // removed in favor of My Village, so this is the only entry point.
  const [connectFilterOpen,    setConnectFilterOpen]    = useState(false);
  const [localPicksFilterOpen, setLocalPicksFilterOpen] = useState(false);

  // Cross-tab intent: when Home's "See all moms / See all groups" links are
  // tapped, switch to Connect AND tell it which See-all drawer to open on
  // mount. ConnectTab consumes + clears this so normal nav-bar entry is clean.
  const [connectSeeAll, setConnectSeeAll] = useState(null); // null | 'moms' | 'topics'
  const goToConnectSeeAll = (view) => { setConnectSeeAll(view); setTab('connect'); };

  const activeLabel = HEADER_LABELS[tab] || '';
  const savedCount = savedItems?.length || 0;
  const isHome = tab === 'home';
  // Home anchors on place ("Tampa, FL") rather than a greeting. Prefer the
  // resolved geo city, fall back to the free-text location, then Tampa.
  const locationLabel = locationGeo?.city
    ? `${locationGeo.city}, FL`
    : (location || 'Tampa, FL');
  const headerTitle = isHome ? locationLabel : activeLabel;

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {/* Shared top header — tab title + subtitle (left), bell + filter (right). */}
      <div className="px-5" style={{ paddingTop: 6, paddingBottom: 8 }}>
        <div className="flex items-start justify-between">
          <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
            {isHome ? (
              /* Small text link — opens LocationSheet, updates profile */
              <button
                aria-label="Change your location"
                onClick={() => setLocationOpen(true)}
                className="inline-flex items-center active:opacity-70 transition-opacity"
                style={{
                  gap: 4, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                  maxWidth: '100%',
                }}
              >
                <MapPin size={13} color={C.coralDeep} strokeWidth={2.4} style={{ flexShrink: 0 }}/>
                <span style={{
                  fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.coralDeep,
                  textDecoration: 'underline', textUnderlineOffset: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {headerTitle}
                </span>
                <ChevronDown size={13} color={C.coralDeep} strokeWidth={2.4} style={{ flexShrink: 0 }}/>
              </button>
            ) : (
              <div style={{
                fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
                color: C.navy, letterSpacing: '-.02em', lineHeight: 1.05,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {headerTitle}
              </div>
            )}
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
              marginTop: 4, lineHeight: 1.35,
            }}>
              {HEADER_SUBTITLES[tab]}
            </div>
          </div>
        </div>
      </div>

      {tab === 'home' && <HomeTab
        thisWeek={thisWeek} events={events}
        places={places} nearbyMoms={nearbyMoms} groups={TOP_DISCUSSIONS}
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        profile={profile} flash={flash}
        openMessage={openMessage} openSchedule={openSchedule}
        goToPlaces={() => setTab('localpicks')}
        goToConnectMoms={() => goToConnectSeeAll('moms')}
        goToConnectGroups={() => goToConnectSeeAll('topics')}
        onVerify={() => setTab('profile')}
        city={locationGeo?.city || location || 'Tampa'}
        openVillage={() => setVillageOpen(true)}/>}
      {tab === 'connect' && <ConnectTab
        profile={profile} prefs={prefs}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        openPremium={openPremium}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        scheduled1to1={scheduled1to1}
        savedItems={savedItems} setSavedItems={setSavedItems}
        account={account} requestAccount={requestAccount} flash={flash}
        filterOpen={connectFilterOpen} setFilterOpen={setConnectFilterOpen}
        nearbyMoms={nearbyMoms}
        nearbyVerifiedOnly={nearbyVerifiedOnly}
        onSetVerifiedOnly={onSetVerifiedOnly}
        initialSeeAll={connectSeeAll}
        onConsumeSeeAll={() => setConnectSeeAll(null)}
        chatAuthor={chatAuthor}
        myUserId={myUserId}/>}
      {tab === 'localpicks' && <LocalPicksTab
        places={places}
        location={location} locationGeo={locationGeo}
        placesRadius={placesRadius}
        savedItems={savedItems} setSavedItems={setSavedItems}
        flash={flash}
        filterOpen={localPicksFilterOpen} setFilterOpen={setLocalPicksFilterOpen}/>}
      {tab === 'profile' && <YouTab
        profile={profile} setProfile={setProfile}
        account={account}
        location={location} setLocation={setLocation}
        locationGeo={locationGeo} setLocationGeo={setLocationGeo}
        distance={distance} setDistance={setDistance}
        openPlans={() => setVillageOpen(true)}
        restart={restart} flash={flash}/>}
      {tab === 'hub' && <MamaHubSheet
        asScreen
        groupDiscussions={GROUP_DISCUSSIONS}
        joinedDiscussionIds={joinedDiscussions}
        onOpenMessage={openMessage}
        onOpenDiscussion={(d) => setHubDiscussion(d)}
        flash={flash}/>}

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

      {locationOpen && (
        <LocationSheet
          location={location} locationGeo={locationGeo} distance={distance}
          onSave={saveLocation}
          onClose={() => setLocationOpen(false)}
        />
      )}

      {villageOpen && (
        <MyVillageSheet
          savedItems={savedItems} setSavedItems={setSavedItems}
          goingItems={goingItems} setGoingItems={setGoingItems}
          joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
          openMessage={openMessage}
          flash={flash}
          moms={nearbyMoms}
          onClose={() => setVillageOpen(false)}
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
          author={chatAuthor}
          myUserId={myUserId}
          flash={flash}
          onClose={() => setHubDiscussion(null)}
        />
      )}
    </div>
  );
};
