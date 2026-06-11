import { useState } from 'react';
import { Users, User, LayoutGrid, Home, Compass, Bell } from 'lucide-react';
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
import { SubjectThreadSheet } from '../../sheets/SubjectThreadSheet';
import { NotificationsSheet } from '../../sheets/NotificationsSheet';
import { VerifyPromptSheet } from '../../sheets/VerifyPromptSheet';
import { GROUP_DISCUSSIONS, TOP_DISCUSSIONS } from '../../data/discussions';
import { updateMomProfile } from '../../lib/onboarding';

// ====================================================================
// MAIN APP — 5-tab shell:
//   Home · Connect · Explore · My Hub · Profile
//
// Every tab now shows a consistent top header: the GoMama wordmark on
// Home, and the tab's name in Fraunces on every other tab. The
// notification bell sits on the right in all tabs.
// ====================================================================

// Bottom tab bar. 'hub' opens MamaHubSheet (as a screen). Profile lives
// at the right edge with a user icon. "Explore" used to be "Local Picks";
// the underlying tab id stays `localpicks` to keep cross-tab nav working
// (HomeTab's "See all places" still routes here).
const TABS = [
  { id: 'home',       icon: Home,       label: 'Home'    },
  { id: 'connect',    icon: Users,      label: 'Connect' },
  { id: 'localpicks', icon: Compass,    label: 'Explore' },
  { id: 'hub',        icon: LayoutGrid, label: 'My Hub'  },
  { id: 'profile',    icon: User,       label: 'Profile' },
];

// Header titles. Home shows the GoMama wordmark instead of a text title
// (handled inline below); every other tab shows its name in Fraunces in
// the shared top header.
const HEADER_LABELS = {
  connect:    'Connect',
  localpicks: 'Explore',
  hub:        'My Hub',
  profile:    'My Profile',
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
  messageHistory = {},
  account, requestAccount, restart, flash,
  verifiedRequiresSocial = true,
  nearbyMoms = [], localFavorite = null, nearbyVerifiedOnly = true, onSetVerifiedOnly,
  nearbyLoading = false, placesLoading = false, eventsLoading = false,
  chatAuthor,
  myUserId,
}) => {
  const [tab, setTab] = useState('home');
  const [villageOpen, setVillageOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifsUnread, setNotifsUnread] = useState(true);

  // Verify-gate: connect / RSVP / join-group are blocked until a mom is
  // verified. `verifyPrompt` is null when the gate is closed; when open it
  // carries the triggering action so the sheet copy reads as a direct
  // response to whatever was tapped.
  const [verifyPrompt, setVerifyPrompt] = useState(null); // { action, name? } | null
  const v = profile?.verified || {};
  const isVerified = !!((v.instagram || v.facebook) && v.photo);
  const requireVerify = (action, name) => {
    if (isVerified) return true;
    setVerifyPrompt({ action, name });
    return false;
  };

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
  // Subject thread — place / event discussion opened from a detail sheet.
  const [subjectThread, setSubjectThread] = useState(null);

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

  // Same pattern for Explore. Used so the "See all" links on Home (Things
  // to do, Popular places) and Connect (Upcoming meetups) all route into
  // the SAME SeeAllSheet that lives in LocalPicksTab — with that section's
  // quick filters and advanced filter sheet. Keys must match SECTIONS in
  // LocalPicksTab: 'events' | 'meetups' | 'places' | 'kids' | 'schools' | 'health'.
  const [exploreSeeAll, setExploreSeeAll] = useState(null);
  const goToExploreSeeAll = (view) => { setExploreSeeAll(view); setTab('localpicks'); };

  const isHome = tab === 'home';
  // Home anchors on place rather than a greeting. Prefer the resolved geo
  // city (set via LocationSheet), fall back to the free-text location,
  // then "Your current location" until the user enters an exact location.
  const locationLabel = locationGeo?.city
    ? `${locationGeo.city}, FL`
    : (location || 'Your current location');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {/* Shared top header — consistent across every tab. Home shows the
          GoMama logo in the title slot; every other tab shows its name in
          Fraunces. The notification bell sits on the right in every tab.
          Header height + top/bottom padding are identical on all tabs. */}
      <div className="px-5" style={{ paddingTop: 14, paddingBottom: 8 }}>
        <div className="flex items-center justify-between" style={{ minHeight: 34 }}>
          <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
              color: C.navy, letterSpacing: '-.02em', lineHeight: 1.05,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {isHome ? (
                <>Go <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>Mama</span></>
              ) : (
                HEADER_LABELS[tab] || ''
              )}
            </div>
          </div>
          <button
            aria-label="Notifications"
            onClick={() => { setNotifsUnread(false); setNotifsOpen(true); }}
            className="relative rounded-full flex items-center justify-center active:scale-[.97] transition-transform"
            style={{
              flexShrink: 0,
              width: 36, height: 36, background: C.paper,
              border: `1px solid ${C.divider}`, cursor: 'pointer',
            }}
          >
            <Bell size={15} color={C.navy}/>
            {notifsUnread && (
              <span
                className="absolute"
                style={{
                  top: 7, right: 8, width: 8, height: 8, borderRadius: 4,
                  background: C.coralDeep, border: `1.5px solid ${C.cream}`,
                }}
              />
            )}
          </button>
        </div>
      </div>

      {tab === 'home' && <HomeTab
        thisWeek={thisWeek} events={events}
        places={places} nearbyMoms={nearbyMoms}
        nearbyLoading={nearbyLoading} eventsLoading={eventsLoading}
        localFavorite={localFavorite}
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        profile={profile} account={account} flash={flash}
        openMessage={openMessage} openSchedule={openSchedule}
        goToPlaces={() => goToExploreSeeAll('places')}
        goToActivities={() => goToExploreSeeAll('events')}
        goToMeetups={() => goToExploreSeeAll('meetups')}
        goToKidsPrograms={() => goToExploreSeeAll('kids')}
        goToConnectMoms={() => goToConnectSeeAll('moms')}
        onVerify={() => setTab('profile')}
        location={location}
        city={locationGeo?.city || location || 'Tampa'}
        locationLabel={locationLabel}
        openLocation={() => setLocationOpen(true)}
        openVillage={() => setVillageOpen(true)}
        onDiscuss={setSubjectThread}/>}
      {tab === 'connect' && <ConnectTab
        profile={profile} prefs={prefs}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        openPremium={openPremium}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        scheduled1to1={scheduled1to1}
        savedItems={savedItems} setSavedItems={setSavedItems}
        messageHistory={messageHistory}
        account={account} requestAccount={requestAccount} flash={flash}
        requireVerify={requireVerify}
        filterOpen={connectFilterOpen} setFilterOpen={setConnectFilterOpen}
        nearbyMoms={nearbyMoms}
        nearbyLoading={nearbyLoading}
        nearbyVerifiedOnly={nearbyVerifiedOnly}
        onSetVerifiedOnly={onSetVerifiedOnly}
        initialSeeAll={connectSeeAll}
        onConsumeSeeAll={() => setConnectSeeAll(null)}
        goToExploreSeeAll={goToExploreSeeAll}
        chatAuthor={chatAuthor}
        myUserId={myUserId}
        onDiscuss={setSubjectThread}/>}
      {tab === 'localpicks' && <LocalPicksTab
        places={places}
        placesLoading={placesLoading} eventsLoading={eventsLoading}
        location={location} locationGeo={locationGeo}
        placesRadius={placesRadius}
        savedItems={savedItems} setSavedItems={setSavedItems}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        ratings={ratings} setRatings={setRatings}
        requireVerify={requireVerify}
        flash={flash}
        filterOpen={localPicksFilterOpen} setFilterOpen={setLocalPicksFilterOpen}
        account={account} openPremium={openPremium}
        initialSeeAll={exploreSeeAll}
        onConsumeSeeAll={() => setExploreSeeAll(null)}
        goToConnectGroups={() => goToConnectSeeAll('topics')}
        chatAuthor={chatAuthor}
        myUserId={myUserId}
        onDiscuss={setSubjectThread}/>}
      {tab === 'profile' && <YouTab
        profile={profile} setProfile={setProfile}
        account={account}
        location={location} setLocation={setLocation}
        locationGeo={locationGeo} setLocationGeo={setLocationGeo}
        distance={distance} setDistance={setDistance}
        prefs={prefs} setPrefs={setPrefs}
        verifiedRequiresSocial={verifiedRequiresSocial}
        restart={restart} flash={flash}/>}
      {tab === 'hub' && <MamaHubSheet
        asScreen
        groupDiscussions={GROUP_DISCUSSIONS}
        joinedDiscussionIds={joinedDiscussions}
        joinedEvents={joinedEvents}
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        moms={nearbyMoms}
        events={events} thisWeek={thisWeek} places={places}
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

      {notifsOpen && (
        <NotificationsSheet
          flash={flash}
          onClose={() => setNotifsOpen(false)}
        />
      )}

      {verifyPrompt && (
        <VerifyPromptSheet
          action={verifyPrompt.action}
          contextName={verifyPrompt.name}
          onVerify={() => setTab('profile')}
          onClose={() => setVerifyPrompt(null)}
        />
      )}

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
          events={events} thisWeek={thisWeek} places={places}
          onClose={() => setVillageOpen(false)}
        />
      )}

      {subjectThread && (
        <SubjectThreadSheet
          subject={subjectThread} author={chatAuthor} myUserId={myUserId} flash={flash}
          onClose={() => setSubjectThread(null)}
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
