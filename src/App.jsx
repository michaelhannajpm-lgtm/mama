import { useEffect, useMemo, useRef, useState } from 'react';
import { C } from './theme';
import { TIME_WINDOWS } from './data/taxonomy';
import { AdminPage } from './AdminPage';
import { PhoneFrame } from './components/PhoneFrame';
import { Toast } from './components/Toast';
import { ScheduleSheet } from './sheets/ScheduleSheet';

// True when the viewport is phone-sized. On a real phone (or a narrow window)
// we drop the decorative PhoneFrame and let the app fill the screen edge-to-edge.
const PHONE_QUERY = '(max-width: 640px)';
function useIsNarrowViewport() {
  const get = () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches;
  const [isNarrow, setIsNarrow] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isNarrow;
}
import { ProfileSheet } from './sheets/ProfileSheet';
import { MessageSheet } from './sheets/MessageSheet';
import { CreateAccountSheet } from './sheets/CreateAccountSheet';
import { PremiumSheet } from './sheets/PremiumSheet';
import { SeededMomLoginSheet } from './sheets/SeededMomLoginSheet';
import { Landing }        from './screens/Landing';
import { AboutYou }       from './screens/onboarding/AboutYou';
import { Account }        from './screens/onboarding/Account';
import { Login }          from './screens/onboarding/Login';
import { MainApp } from './screens/MainApp';
import { recordStep, promoteSession, signOut, onAuthChange, sendHeartbeat } from './lib/onboarding';
import { derivePresence } from './lib/presence';
import { computeVerified } from './lib/social-verify';
import { ensureSession } from './lib/supabase';
import { resolveArea } from './lib/places.js';
import { fetchPlaces, fetchConfig } from './lib/places-api';
import { fetchEvents } from './lib/events-api';
import { appStateFromMomProfile, fetchSeededMomProfiles } from './lib/seeded-moms';
import { fetchNearbyMoms } from './lib/nearby-moms';
import { decorateMom } from './lib/mom-card';
import { SUGGESTED_EVENTS as FALLBACK_EVENTS } from './data/events';

// ====================================================================
// ROOT
// ====================================================================
function PrototypeApp({ bare = false }) {
  // Phone-sized viewports skip the PhoneFrame and render full-screen, same as
  // the explicit `bare` route (/live) used for embedding.
  const isNarrow = useIsNarrowViewport();
  const fullScreen = bare || isNarrow;
  const [step, setStep] = useState(0);
  const [splashShown, setSplashShown] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [seededLoginOpen, setSeededLoginOpen] = useState(false);
  const [seededMoms, setSeededMoms] = useState([]);
  const [nearbyMoms, setNearbyMoms] = useState([]);
  const [nearbyVerifiedOnly, setNearbyVerifiedOnly] = useState(true);
  const nearbyReqId = useRef(0);
  const [seededLoginLoading, setSeededLoginLoading] = useState(false);
  const [seededLoginError, setSeededLoginError] = useState(null);
  const [profile, setProfile] = useState({ kidsAges:{}, momTypes:[], values:[], interests:[], photos:[], bio:'', verified:{ instagram:false, facebook:false, photo:false } });
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState(null);
  const [locationGeo, setLocationGeo] = useState(null); // { id,label,city,neighborhood,county,lat,lng }
  const [prefs, setPrefs] = useState({ slots:[], places:[] });
  const [savedItems, setSavedItems] = useState([]); // ids of bookmarked meetups + places (Favorites)
  const [scheduleMom, setScheduleMom] = useState(null);
  const [profileMom, setProfileMom] = useState(null);
  const [messageMom, setMessageMom] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [account, setAccount] = useState(null); // { firstName, username, auth_user_id, method, phone, email } after signup
  const [pendingAction, setPendingAction] = useState(null); // generic gate: { type, mom?, slot?, event? }
  const [toast, setToast] = useState(null);
  // Lifted state — shared across Screen 7 (1:1) and Screen 8 (groups) for conflict awareness
  const [scheduled1to1, setScheduled1to1] = useState({});
  const [joinedEvents, setJoinedEvents] = useState([]);
  // Activities-tab lightweight presence + ratings. `goingItems` is the "I'm
  // going" social signal across both events and places; `ratings` is a 1–5
  // star map keyed by item id.
  const [goingItems, setGoingItems] = useState([]);
  const [ratings, setRatings] = useState({});
  // Current user's id for chat — resolved once the session is established.
  const [myUserId, setMyUserId] = useState(null);

  // Live places loaded from /api/places (approved + visible rows, grouped by
  // category). Null until the first load resolves; screens fall back to their
  // own hardcoded data so the app never renders blank or stale.
  const [livePlaces, setLivePlaces] = useState(null); // { places, topPicks, flat } | null
  useEffect(() => {
    let alive = true;
    fetchPlaces()
      .then(data => { if (alive) setLivePlaces(data); })
      .catch(() => { /* keep hardcoded fallback in screens */ });
    return () => { alive = false; };
  }, []);
  const placesData = livePlaces?.places || null;

  // App-level config + the user's top-places radius override. Effective radius
  // is the user's choice, else the app default, else 50 mi.
  const [appConfig, setAppConfig] = useState({});
  useEffect(() => { fetchConfig().then(setAppConfig); }, []);
  const [placesRadius, setPlacesRadius] = useState(null); // null = use app default
  const effectivePlacesRadius = placesRadius ?? appConfig.defaultPlacesRadiusMiles ?? 50;
  // Set + persist the user's radius override to onboarding_profiles.
  const changePlacesRadius = (r) => { setPlacesRadius(r); recordStep(3, { places_radius_miles: r }); };

  const [liveEvents, setLiveEvents] = useState(null); // { recurring, thisWeek } | null

  useEffect(() => {
    let alive = true;
    fetchEvents()
      .then(data => { if (alive) setLiveEvents(data); })
      .catch(() => { if (alive) setLiveEvents(null); });
    return () => { alive = false; };
  }, []);

  // Live recurring events when present; hardcoded fallback so the app never blanks.
  const eventsData = liveEvents?.recurring?.length ? liveEvents.recurring : FALLBACK_EVENTS;
  const thisWeekData = liveEvents?.thisWeek || [];

  const flash = (m) => { setToast(m); setTimeout(()=>setToast(null), 1900); };

  const loadSeededMoms = async () => {
    setSeededLoginLoading(true);
    setSeededLoginError(null);
    try {
      const rows = await fetchSeededMomProfiles();
      setSeededMoms(rows);
    } catch (e) {
      setSeededLoginError(e?.message || 'Could not load seeded moms');
    } finally {
      setSeededLoginLoading(false);
    }
  };

  const openSeededLogin = () => {
    setSeededLoginOpen(true);
    if (!seededMoms.length && !seededLoginLoading) loadSeededMoms();
  };

  const applySeededMomLogin = (row) => {
    const next = appStateFromMomProfile(row);
    signOut().catch(() => { /* ignore */ });
    setProfile(next.profile);
    setPrefs(next.prefs);
    setLocation(next.location);
    setLocationGeo(next.locationGeo);
    setDistance(next.distance);
    setSavedItems([]);
    setScheduled1to1({});
    setJoinedEvents([]);
    setGoingItems([]);
    setRatings({});
    setPendingAction(null);
    setAccount(next.account);
    setLoginOpen(false);
    setSeededLoginOpen(false);
    setSplashShown(true);
    setStep(3);
    flash(`Welcome back, ${next.account.firstName} ✦`);
  };

  // Build the matching payload from the user's current profile/prefs/location.
  // `account` may be a real signed-in user or a dev-seed mom (isSeed).
  const buildMatchUser = () => ({
    auth_user_id: account?.auth_user_id || null,
    seed_mom_id: account?.seedMomId || null,
    kids_ages: profile?.kidsAges || {},
    interests: profile?.interests || [],
    values: profile?.values || [],
    mom_types: profile?.momTypes || [],
    places: prefs?.places || [],
    free_slots: prefs?.slots || [],
    lat: locationGeo?.lat ?? null,
    lng: locationGeo?.lng ?? null,
    // Administrative location — used as a ranking fallback when coords are
    // absent, and for the same-neighborhood/city affinity nudge.
    city: locationGeo?.city ?? null,
    neighborhood: locationGeo?.neighborhood ?? null,
    county: locationGeo?.county ?? null,
  });

  const loadNearbyMoms = async (verifiedOnly = nearbyVerifiedOnly) => {
    const reqId = ++nearbyReqId.current;
    setNearbyVerifiedOnly(verifiedOnly);
    try {
      const { moms } = await fetchNearbyMoms(buildMatchUser(), { limit: 24, verifiedOnly });
      if (reqId !== nearbyReqId.current) return; // a newer load superseded this one
      setNearbyMoms(moms.map(decorateMom));
    } catch (e) {
      if (reqId !== nearbyReqId.current) return;
      console.error('loadNearbyMoms failed', e);
      setNearbyMoms([]);
    }
  };

  // Load once the user reaches the main app. Re-runs if the matching inputs
  // change. `locationGeo?.id` keys on location without sending coords as deps.
  useEffect(() => {
    if (step < 3) return;
    loadNearbyMoms(nearbyVerifiedOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, account?.auth_user_id, account?.seedMomId, locationGeo?.id,
      JSON.stringify(profile?.interests), JSON.stringify(profile?.kidsAges)]);

  // --- Presence ---------------------------------------------------------
  // (a) Heartbeat so *we* show as online to others: ping on entering the app,
  //     every 60s, and on tab focus. Best-effort; no-ops without an identity.
  // (b) A 60s tick re-derives every nearby mom's status so dots age
  //     online→away→offline without a refetch. Coming back online needs a
  //     fresh last_seen_at, so we also reload the nearby list on tab focus.
  const [presenceTick, setPresenceTick] = useState(0);
  useEffect(() => {
    if (step < 3) return undefined;
    const beat = () => sendHeartbeat({ seedMomId: account?.seedMomId });
    beat();
    const hb = setInterval(beat, 60_000);
    const tick = setInterval(() => setPresenceTick((n) => n + 1), 60_000);
    const onFocus = () => { beat(); setPresenceTick((n) => n + 1); loadNearbyMoms(nearbyVerifiedOnly); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(hb); clearInterval(tick); window.removeEventListener('focus', onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, account?.seedMomId, account?.auth_user_id]);

  // Nearby moms decorated with a live presence status (recomputed each tick).
  const presenceOnlineMaxS = appConfig.presenceOnlineMaxSeconds ?? 300;
  const presenceAwayMaxS = appConfig.presenceAwayMaxSeconds ?? 1800;
  const nearbyMomsLive = useMemo(
    () => nearbyMoms.map((m) => ({
      ...m,
      // null presence (she hid her active status) ⇒ no dot rendered.
      presence: m.presenceHidden ? null : derivePresence(m.last_seen_at, presenceOnlineMaxS, presenceAwayMaxS),
    })),
    // presenceTick forces a recompute on the 60s cadence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nearbyMoms, presenceTick, presenceOnlineMaxS, presenceAwayMaxS],
  );
  // Never show the current user in their own mom results. The nearby API already
  // excludes self by auth_user_id / seed_mom_id, but anonymous sessions can leave
  // the browsing identity out of sync with how the profile row is stored — so we
  // also exclude client-side by every identity signal we have (uid, seed id,
  // @handle). Centralized so Home + Connect (which both read nearbyMoms) agree.
  const selfUid = account?.auth_user_id || null;
  const selfSeedId = account?.seedMomId || null;
  const selfHandle = (account?.username || '').toLowerCase() || null;
  const nearbyMomsShown = useMemo(() => {
    const isSelf = (m) =>
      (selfUid && m.auth_user_id && m.auth_user_id === selfUid) ||
      (selfSeedId && m.id === selfSeedId) ||
      (selfHandle && m.username && m.username.toLowerCase() === selfHandle);
    return nearbyMomsLive.filter((m) => !isSelf(m));
  }, [nearbyMomsLive, selfUid, selfSeedId, selfHandle]);

  // Auto-promote on mount: if Supabase has a session (OAuth return or
  // returning user), attach it to our onboarding row and hydrate state.
  useEffect(() => {
    let cancelled = false;
    let alreadyHydrated = false;

    const hydrate = async () => {
      if (alreadyHydrated) return;
      try {
        const result = await promoteSession();
        if (cancelled || !result?.auth_user_id) return;
        alreadyHydrated = true;
        if (result.profile) setProfile(p => ({
          ...p,
          kidsAges: result.profile.kidsAges || {},
          momTypes: result.profile.momTypes || [],
          values: result.profile.values || [],
          interests: result.profile.interests || [],
          photos: result.profile.photos || [],
          bio: result.profile.bio || '',
          socialLinks: result.profile.socialLinks || {},
          settings: result.profile.settings || {},
        }));
        if (result.prefs) setPrefs({
          slots: result.prefs.slots || [],
          places: result.prefs.places || [],
        });
        if (result.location) setLocation(result.location);
        if (result.locationGeo?.id) {
          setLocationGeo(resolveArea(result.locationGeo.id) || result.locationGeo);
        }
        if (result.distance != null) setDistance(result.distance);
        if (result.places_radius_miles != null) setPlacesRadius(result.places_radius_miles);
        setAccount({
          firstName: result.first_name,
          username: result.username,
          auth_user_id: result.auth_user_id,
          method: result.contact_method,
          phone: result.phone,
          email: result.email,
        });
        setSplashShown(true);
        setStep(3); // jump straight to MainApp for returning users
        flash(`Welcome back, ${result.first_name} ✦`);
      } catch {
        /* silent */
      }
    };

    // Guarantee a session (anonymous if needed) so chat RLS + Realtime work.
    ensureSession().then(setMyUserId);
    // Try once immediately — handles the "already signed in" case.
    hydrate();

    // Subscribe to auth changes so we catch the OAuth-callback hash detection,
    // which fires async after the supabase client initialises.
    const unsub = onAuthChange((event, session) => {
      if (cancelled) return;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.access_token) {
        hydrate();
      }
    });

    return () => { cancelled = true; unsub(); };
  }, []);

  const restart = async () => {
    setStep(0);
    setProfile({ kidsAges:{}, momTypes:[], values:[], interests:[], photos:[], bio:'', verified:{ instagram:false, facebook:false, photo:false } });
    setLocation('');
    setDistance(null);
    setLocationGeo(null);
    setPrefs({ slots:[], places:[] });
    setSavedItems([]);
    setAccount(null);
    setScheduled1to1({});
    setJoinedEvents([]);
    setGoingItems([]);
    setRatings({});
    setPendingAction(null);
    setSplashShown(false);
    await signOut();
  };

  // Generic gate: if no account yet, queue the action and open CreateAccountSheet
  const requestAccount = (action) => setPendingAction(action);

  // Replay the queued action after account creation completes
  const handleAccountComplete = (acct) => {
    setAccount(acct);
    const a = pendingAction;
    if (a) {
      if (a.type === '1to1' && a.mom && a.slot) {
        // Parse slot string into {day, time}
        let day, time, place;
        if (typeof a.slot === 'string') {
          const [d, ...winParts] = a.slot.split('-');
          const win = TIME_WINDOWS.find(w => w.id === winParts.join('-')) || TIME_WINDOWS[1];
          day = d; time = win.label; place = a.mom.nextPlace;
        } else {
          day = a.slot.day; time = a.slot.time; place = a.slot.place || a.mom.nextPlace;
        }
        setScheduled1to1(s => ({ ...s, [a.mom.id]: { day, time, place } }));
        flash(`✦ Welcome ${acct.firstName} · scheduled with ${a.mom.name.split(' ')[0]}`);
      } else if (a.type === 'group' && a.event) {
        setJoinedEvents(j => j.includes(a.event.id) ? j : [...j, a.event.id]);
        flash(`✦ Welcome ${acct.firstName} · joined ${a.event.name}`);
      } else if (a.type === 'invite' && a.mom) {
        flash(`Welcome, ${acct.firstName}. Invite sent to ${a.mom.name.split(' ')[0]} ✦`);
      } else {
        flash(`Welcome, ${acct.firstName} ✦`);
      }
    } else {
      flash(`Welcome, ${acct.firstName} ✦`);
    }
    setPendingAction(null);
  };

  const chatAuthor = { name: account?.firstName || 'Mama', photo: profile?.photos?.[0] || null };
  // Whether the current user is a verified mom — gates DMs to "verified-only" moms.
  const selfVerified = computeVerified({
    instagram: !!profile?.socialLinks?.instagram,
    facebook: !!profile?.socialLinks?.facebook,
    photo: !!profile?.photos?.[0],
  });

  const inner = (
    <div className="w-full h-full relative">
      {!splashShown && loginOpen ? (
            <Login
              onBack={() => setLoginOpen(false)}
              onSuccess={(acct) => {
                setAccount(acct);
                setLoginOpen(false);
                setSplashShown(true);
                setStep(3);
                flash(`Welcome back, ${acct.firstName} ✦`);
              }}
              flash={flash}
            />
          ) : !splashShown ? (
            <Landing onBegin={()=>setSplashShown(true)} onSignIn={() => setLoginOpen(true)}
              onDevLogin={openSeededLogin}/>
          ) : (<>
          {step===0 && <AboutYou
            onNext={()=>{ recordStep(0, {
              location,
              distance_miles: distance,
              location_place_id:     locationGeo?.id ?? null,
              location_city:         locationGeo?.city ?? null,
              location_neighborhood: locationGeo?.neighborhood ?? null,
              location_county:       locationGeo?.county ?? null,
              location_lat:          locationGeo?.lat ?? null,
              location_lng:          locationGeo?.lng ?? null,
              kids_ages: profile.kidsAges,
              mom_types: profile.momTypes,
            }); setStep(2); }}
            onBack={()=>{ setSplashShown(false); }}
            profile={profile} setProfile={setProfile}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            locationGeo={locationGeo} setLocationGeo={setLocationGeo}
          />}
          {step===2 && <Account
            onBack={()=>setStep(0)}
            onLogin={()=>{ setSplashShown(false); setLoginOpen(true); }}
            account={account}
            onComplete={(acct) => { setAccount(acct); setStep(3); }}
            flash={flash}
          />}
          {step===3 && <MainApp
            places={placesData}
            events={eventsData}
            thisWeek={thisWeekData}
            locationGeo={locationGeo} setLocationGeo={setLocationGeo}
            placesRadius={effectivePlacesRadius} setPlacesRadius={changePlacesRadius}
            profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            savedItems={savedItems} setSavedItems={setSavedItems}
            goingItems={goingItems} setGoingItems={setGoingItems}
            ratings={ratings} setRatings={setRatings}
            account={account} requestAccount={requestAccount}
            nearbyMoms={nearbyMomsShown}
            nearbyVerifiedOnly={nearbyVerifiedOnly}
            onSetVerifiedOnly={loadNearbyMoms}
            openSchedule={setScheduleMom}
            openProfile={setProfileMom}
            openMessage={setMessageMom}
            openPremium={()=>setPremiumOpen(true)}
            restart={restart}
            flash={flash}
            chatAuthor={chatAuthor}
            myUserId={myUserId}
          />}

          {scheduleMom && <ScheduleSheet mom={scheduleMom}
            hasAccount={!!account}
            prefs={prefs} setPrefs={setPrefs}
            onClose={()=>setScheduleMom(null)}
            onContinue={(slot)=>{
              if (account) {
                setScheduleMom(null);
                flash(`Invite sent to ${scheduleMom.name.split(' ')[0]} ✦`);
              } else {
                setPendingAction({ type: 'invite', mom: scheduleMom, slot });
                setScheduleMom(null);
              }
            }}/>}
          {pendingAction && <CreateAccountSheet pendingAction={pendingAction}
            onClose={()=>setPendingAction(null)}
            onComplete={handleAccountComplete}/>}
          {profileMom && <ProfileSheet mom={profileMom}
            profile={profile}
            isPremium={!!account?.isPremium}
            onClose={()=>setProfileMom(null)}
            openPremium={()=>{ setProfileMom(null); setPremiumOpen(true); }}/>}
          {messageMom && <MessageSheet
            mom={messageMom}
            isPremium={!!account?.isPremium}
            author={chatAuthor}
            myUserId={myUserId}
            senderVerified={selfVerified}
            flash={flash}
            onClose={() => setMessageMom(null)}
            openPremium={() => { setMessageMom(null); setPremiumOpen(true); }}/>}
          {premiumOpen && <PremiumSheet
            onClose={()=>setPremiumOpen(false)}
            onActivate={()=>{
              setAccount(a => ({ ...(a || { firstName: 'Mama' }), isPremium: true, trialEndsAt: Date.now() + 7*24*3600*1000 }));
              flash('✦ Welcome to Go Mama Plus · 7-day trial started');
            }}/>}
          </>)}

      {toast && <Toast msg={toast}/>}
      {seededLoginOpen && (
        <SeededMomLoginSheet
          rows={seededMoms}
          loading={seededLoginLoading}
          error={seededLoginError}
          onRefresh={loadSeededMoms}
          onSelect={applySeededMomLogin}
          onClose={() => setSeededLoginOpen(false)}
        />
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="w-full relative" style={{
        height: '100dvh',
        background: C.cream,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {inner}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8" style={{
      background: `radial-gradient(ellipse at top left, ${C.rose}33, transparent 50%), radial-gradient(ellipse at bottom right, ${C.sage}22, transparent 50%), ${C.creamSoft}`,
    }}>
      <PhoneFrame>{inner}</PhoneFrame>
    </div>
  );
}

export default function App() {
  const getRoute = () => window.location.pathname.replace(/\/+$/, '') || '/';
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onRouteChange = () => setRoute(getRoute());
    window.addEventListener('popstate', onRouteChange);
    return () => window.removeEventListener('popstate', onRouteChange);
  }, []);

  if (route === '/admin' || route.startsWith('/admin/')) {
    return <AdminPage />;
  }
  return <PrototypeApp />;
}
