import { useEffect, useState } from 'react';
import { C } from './theme';
import { TIME_WINDOWS } from './data/taxonomy';
import { WaitlistPage } from './WaitlistPage';
import { PhoneFrame } from './components/PhoneFrame';
import { Toast } from './components/Toast';
import { ScheduleSheet } from './sheets/ScheduleSheet';
import { ProfileSheet } from './sheets/ProfileSheet';
import { MessageSheet } from './sheets/MessageSheet';
import { CreateAccountSheet } from './sheets/CreateAccountSheet';
import { PremiumSheet } from './sheets/PremiumSheet';
import { Splash } from './screens/Splash';
import { Screen2 } from './screens/Screen2';
import { Screen3 } from './screens/Screen3';
import { Screen4 } from './screens/Screen4';
import { Screen5 } from './screens/Screen5';
import { Screen6 } from './screens/Screen6';
import { SummaryScreen } from './screens/SummaryScreen';
import { AccountScreen } from './screens/AccountScreen';
import { MainApp } from './screens/MainApp';

// ====================================================================
// ROOT
// ====================================================================
function PrototypeApp() {
  const [step, setStep] = useState(0);
  const [splashShown, setSplashShown] = useState(false);
  const [profile, setProfile] = useState({ kidsAges:{}, momTypes:[], values:[], interests:[] });
  const [location, setLocation] = useState('Tampa, FL');
  const [distance, setDistance] = useState(null);
  const [prefs, setPrefs] = useState({ slots:[], places:[] });
  const [scheduleMom, setScheduleMom] = useState(null);
  const [profileMom, setProfileMom] = useState(null);
  const [messageMom, setMessageMom] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [account, setAccount] = useState(null); // { firstName, method, phone, email } after signup
  const [pendingAction, setPendingAction] = useState(null); // generic gate: { type, mom?, slot?, event? }
  const [toast, setToast] = useState(null);
  // Lifted state — shared across Screen 7 (1:1) and Screen 8 (groups) for conflict awareness
  const [scheduled1to1, setScheduled1to1] = useState({});
  const [joinedEvents, setJoinedEvents] = useState([]);
  // Message history per mom: { [momId]: [{ text, fromUser, ts }, ...] }
  const [messageHistory, setMessageHistory] = useState({});

  const flash = (m) => { setToast(m); setTimeout(()=>setToast(null), 1900); };

  const restart = () => {
    setStep(0);
    setProfile({ kidsAges:{}, momTypes:[], values:[], interests:[] });
    setLocation('Tampa, FL');
    setDistance(null);
    setPrefs({ slots:[], places:[] });
    setAccount(null);
    setScheduled1to1({});
    setJoinedEvents([]);
    setPendingAction(null);
    setMessageHistory({});
    setSplashShown(false);
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

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8" style={{
      background: `radial-gradient(ellipse at top left, ${C.rose}33, transparent 50%), radial-gradient(ellipse at bottom right, ${C.sage}22, transparent 50%), ${C.creamSoft}`,
    }}>
      <PhoneFrame>
        <div className="w-full h-full relative">
          {!splashShown ? (
            <Splash onBegin={()=>setSplashShown(true)}/>
          ) : (<>
          {step===0 && <Screen2 onNext={()=>setStep(1)} onBack={()=>setStep(0)}/>}
          {step===1 && <Screen3 onNext={()=>setStep(2)} onBack={()=>setStep(0)} location={location} setLocation={setLocation} distance={distance} setDistance={setDistance}/>}
          {step===2 && <Screen4 onNext={()=>setStep(3)} onBack={()=>setStep(1)} profile={profile} setProfile={setProfile}/>}
          {step===3 && <Screen5 onNext={()=>setStep(4)} onBack={()=>setStep(2)} prefs={prefs} setPrefs={setPrefs}/>}
          {step===4 && <Screen6 onNext={()=>setStep(5)} onBack={()=>setStep(3)} prefs={prefs} setPrefs={setPrefs} location={location}/>}
          {step===5 && <SummaryScreen onNext={()=>setStep(6)} onBack={()=>setStep(4)} profile={profile} prefs={prefs} location={location} distance={distance}/>}
          {step===6 && <AccountScreen onNext={()=>setStep(7)} onBack={()=>setStep(5)} account={account} setAccount={setAccount}/>}
          {step===7 && <MainApp
            profile={profile} prefs={prefs} setPrefs={setPrefs}
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
              flash('✦ Welcome to Mama Plus · 7-day trial started');
            }}/>}
          </>)}

          {toast && <Toast msg={toast}/>}
        </div>
      </PhoneFrame>
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

  if (route === '/prototype') return <PrototypeApp />;

  return (
    <WaitlistPage
      onOpenPrototype={() => {
        window.history.pushState({}, '', '/prototype');
        window.dispatchEvent(new Event('popstate'));
      }}
    />
  );
}
