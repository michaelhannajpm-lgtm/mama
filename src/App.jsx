import { useEffect, useState } from 'react';
import { C } from './theme';
import { TIME_WINDOWS } from './data/taxonomy';
import { WaitlistPage } from './WaitlistPage';
import { AdminPage } from './AdminPage';
import { PhoneFrame } from './components/PhoneFrame';
import { Toast } from './components/Toast';
import { ScheduleSheet } from './sheets/ScheduleSheet';
import { ProfileSheet } from './sheets/ProfileSheet';
import { MessageSheet } from './sheets/MessageSheet';
import { CreateAccountSheet } from './sheets/CreateAccountSheet';
import { PremiumSheet } from './sheets/PremiumSheet';
import { Splash } from './screens/Splash';
import { Welcome }       from './screens/onboarding/Welcome';
import { LocationStep }  from './screens/onboarding/LocationStep';
import { ProfileStep }   from './screens/onboarding/ProfileStep';
import { ScheduleStep }  from './screens/onboarding/ScheduleStep';
import { PlacesStep }    from './screens/onboarding/PlacesStep';
import { Summary }       from './screens/onboarding/Summary';
import { Account }       from './screens/onboarding/Account';
import { Login }         from './screens/onboarding/Login';
import { MainApp } from './screens/MainApp';
import { recordStep, promoteSession, signOut, onAuthChange } from './lib/onboarding';

// ====================================================================
// ROOT
// ====================================================================
function PrototypeApp({ bare = false }) {
  const [step, setStep] = useState(0);
  const [splashShown, setSplashShown] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profile, setProfile] = useState({ kidsAges:{}, momTypes:[], values:[], interests:[], photos:[], bio:'' });
  const [location, setLocation] = useState('Tampa, FL');
  const [distance, setDistance] = useState(null);
  const [prefs, setPrefs] = useState({ slots:[], places:[] });
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
  // Message history per mom: { [momId]: [{ text, fromUser, ts }, ...] }
  const [messageHistory, setMessageHistory] = useState({});

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
        }));
        if (result.prefs) setPrefs({
          slots: result.prefs.slots || [],
          places: result.prefs.places || [],
        });
        if (result.location) setLocation(result.location);
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
        setStep(7);
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
    setProfile({ kidsAges:{}, momTypes:[], values:[], interests:[], photos:[], bio:'' });
    setLocation('Tampa, FL');
    setDistance(null);
    setPrefs({ slots:[], places:[] });
    setAccount(null);
    setScheduled1to1({});
    setJoinedEvents([]);
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
                setStep(7);
                flash(`Welcome back, ${acct.firstName} ✦`);
              }}
              flash={flash}
            />
          ) : !splashShown ? (
            <Splash onBegin={()=>setSplashShown(true)} onSignIn={() => setLoginOpen(true)}/>
          ) : (<>
          {step===0 && <Welcome onNext={()=>advance(0, {})} onBack={()=>setStep(0)}/>}
          {step===1 && <LocationStep onNext={()=>advance(1, { location, distance_miles: distance })} onBack={()=>setStep(0)} location={location} setLocation={setLocation} distance={distance} setDistance={setDistance}/>}
          {step===2 && <ProfileStep onNext={()=>advance(2, { kids_ages: profile.kidsAges, mom_types: profile.momTypes, values: profile.values, interests: profile.interests })} onBack={()=>setStep(1)} profile={profile} setProfile={setProfile}/>}
          {step===3 && <ScheduleStep onNext={()=>advance(3, { slots: prefs.slots })} onBack={()=>setStep(2)} prefs={prefs} setPrefs={setPrefs}/>}
          {step===4 && <PlacesStep onNext={()=>advance(4, { places: prefs.places })} onBack={()=>setStep(3)} prefs={prefs} setPrefs={setPrefs} location={location}/>}
          {step===5 && <Summary onNext={()=>advance(5, {})} onBack={()=>setStep(4)} profile={profile} prefs={prefs} location={location} distance={distance}/>}
          {step===6 && <Account
            onBack={()=>setStep(5)}
            account={account}
            onComplete={(acct) => { setAccount(acct); setStep(7); }}
            flash={flash}
          />}
          {step===7 && <MainApp
            profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs}
            location={location} distance={distance}
            scheduled1to1={scheduled1to1}
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
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

  if (bare) {
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
    if (window.location.hash === '#prototype') {
      window.history.replaceState({}, '', '/prototype');
      setRoute('/prototype');
    }

    const onRouteChange = () => setRoute(getRoute());
    window.addEventListener('popstate', onRouteChange);
    return () => window.removeEventListener('popstate', onRouteChange);
  }, []);

  if (route === '/prototype' || route === '/preview') return <PrototypeApp />;
  if (route === '/live') return <PrototypeApp bare />;
  if (route === '/admin' || route.startsWith('/admin/')) {
    // Lazy import via static reference — kept simple, no Suspense needed.
    return <AdminPage />;
  }

  return (
    <WaitlistPage
      onNavigate={(path) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('popstate'));
      }}
    />
  );
}
