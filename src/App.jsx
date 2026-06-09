import { useEffect, useState } from 'react';
import { C } from './theme';
import { TIME_WINDOWS } from './data/taxonomy';
import { WaitlistPage } from './WaitlistPage';
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
import { Landing }        from './screens/Landing';
import { AboutYou }       from './screens/onboarding/AboutYou';
import { VillagePreview } from './screens/onboarding/VillagePreview';
import { Account }        from './screens/onboarding/Account';
import { Login }          from './screens/onboarding/Login';
import { MainApp } from './screens/MainApp';
import { recordStep, promoteSession, signOut, onAuthChange } from './lib/onboarding';
import { resolveArea } from './lib/places.js';
import { fetchPlaces } from './lib/places-api';
import { fetchEvents } from './lib/events-api';
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
  // Message history per mom: { [momId]: [{ text, fromUser, ts }, ...] }
  const [messageHistory, setMessageHistory] = useState({});

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
    setMessageHistory({});
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

  // Wraps onNext for an onboarding screen: persist this step's slice, then advance.
  const advance = (currentStepIndex, patch) => {
    recordStep(currentStepIndex, patch);
    setStep(currentStepIndex + 1);
  };

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
              onDevLogin={()=>{
                setAccount({ firstName:'Sana', username:'sana', auth_user_id:'local-sana', method:'phone', phone:'(813) 956-2058' });
                setSplashShown(true);
                setStep(3);
                flash('Welcome back, Sana ✦');
              }}/>
          ) : (<>
          {step===0 && <AboutYou
            onNext={()=>advance(0, {
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
            })}
            onBack={()=>{ setSplashShown(false); }}
            profile={profile} setProfile={setProfile}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            locationGeo={locationGeo} setLocationGeo={setLocationGeo}
          />}
          {step===1 && <VillagePreview
            onNext={()=>advance(1, {})}
            onBack={()=>setStep(0)}
            savedItems={savedItems}
            setSavedItems={setSavedItems}
            profile={profile} setProfile={setProfile}
            location={location}
          />}
          {step===2 && <Account
            onBack={()=>setStep(1)}
            onLogin={()=>{ setSplashShown(false); setLoginOpen(true); }}
            account={account}
            onComplete={(acct) => { setAccount(acct); setStep(3); }}
            flash={flash}
          />}
          {step===3 && <MainApp
            places={placesData}
            events={eventsData}
            thisWeek={thisWeekData}
            profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            savedItems={savedItems} setSavedItems={setSavedItems}
            goingItems={goingItems} setGoingItems={setGoingItems}
            ratings={ratings} setRatings={setRatings}
            messageHistory={messageHistory}
            account={account} requestAccount={requestAccount}
            openSchedule={setScheduleMom}
            openProfile={setProfileMom}
            openMessage={setMessageMom}
            openPremium={()=>setPremiumOpen(true)}
            restart={restart}
            flash={flash}
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
          {messageMom && <MessageSheet mom={messageMom}
            history={messageHistory[messageMom.id] || []}
            isPremium={!!account?.isPremium}
            onSend={(text)=>{
              setMessageHistory(h => ({
                ...h,
                [messageMom.id]: [...(h[messageMom.id] || []), { text, fromUser: true, ts: Date.now() }],
              }));
              flash(`Sent to ${messageMom.name.split(' ')[0]}`);
            }}
            onClose={()=>setMessageMom(null)}
            openPremium={()=>{ setMessageMom(null); setPremiumOpen(true); }}/>}
          {premiumOpen && <PremiumSheet
            onClose={()=>setPremiumOpen(false)}
            onActivate={()=>{
              setAccount(a => ({ ...(a || { firstName: 'Mama' }), isPremium: true, trialEndsAt: Date.now() + 7*24*3600*1000 }));
              flash('✦ Welcome to Go Mama Plus · 7-day trial started');
            }}/>}
          </>)}

      {toast && <Toast msg={toast}/>}
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
  if (route === '/waitlist') {
    return (
      <WaitlistPage
        onNavigate={(path) => {
          window.history.pushState({}, '', path);
          window.dispatchEvent(new Event('popstate'));
        }}
      />
    );
  }

  return <PrototypeApp />;
}
