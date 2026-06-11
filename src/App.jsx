import { useEffect, useMemo, useRef, useState } from 'react';
import { C } from './theme';
import { TIME_WINDOWS } from './data/taxonomy';
import { AdminApp } from './screens/admin';
import { PhoneFrame } from './components/PhoneFrame';
import { AuthLoading } from './components/AuthLoading';
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
import { ReactivateScreen } from './screens/ReactivateScreen';
import { DeletedScreen }    from './screens/DeletedScreen';
import { reactivateAccount, restoreAccount } from './lib/account';
import { AboutYou }       from './screens/onboarding/AboutYou';
import { Account }        from './screens/onboarding/Account';
import { Login }          from './screens/onboarding/Login';
import { NotificationsOptIn } from './screens/onboarding/NotificationsOptIn';
import { MainApp } from './screens/MainApp';
import { recordStep, promoteSession, signOut, onAuthChange, sendHeartbeat, completeOnboarding, updateMomProfile } from './lib/onboarding';
import { requestPushPermission } from './lib/push';
import { captureIncomingRef } from './lib/referral';
import { derivePresence } from './lib/presence';
import { computeVerified } from './lib/social-verify';
import { ensureSession, hasStoredSession, isSupabaseReady } from './lib/supabase';
import { resolveArea } from './lib/places.js';
import { fetchPlaces, fetchConfig } from './lib/places-api';
import { fetchEvents } from './lib/events-api';
import { appStateFromMomProfile, fetchSeededMomProfiles } from './lib/seeded-moms';
import { fetchNearbyMoms } from './lib/nearby-moms';
import { fetchLocalFavorite } from './lib/local-favorite-api';
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
  // True only while we're resolving a *persisted* session on launch. Seeded
  // synchronously from localStorage so a returning mom's first paint is the
  // quiet AuthLoading gate, not a flash of Landing before promoteSession()
  // swaps her into MainApp. New visitors start false → Landing shows instantly.
  const [authResolving, setAuthResolving] = useState(() => hasStoredSession());
  const [loginOpen, setLoginOpen] = useState(false);
  const [seededLoginOpen, setSeededLoginOpen] = useState(false);
  const [seededMoms, setSeededMoms] = useState([]);
  const [nearbyMoms, setNearbyMoms] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(true); // true until the first nearby fetch settles
  const [localFavorite, setLocalFavorite] = useState(null);
  const [nearbyVerifiedOnly, setNearbyVerifiedOnly] = useState(true);
  const nearbyReqId = useRef(0);
  const verifiedOnlyTouched = useRef(false); // true once the user manually toggles it
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
  // True once the one-time notification opt-in has been answered this session
  // (covers the brief window before the persisted preference round-trips).
  const [notifChoiceMade, setNotifChoiceMade] = useState(false);
  const [account, setAccount] = useState(null); // { firstName, username, auth_user_id, method, phone, email } after signup
  // Account lifecycle (from promote): 'active' | 'deactivated' | 'deleted'.
  // Drives the root gate below — a non-active signed-in user is routed to the
  // Reactivate / Deleted screen and can't reach any tab. deletedAt scopes the
  // 30-day restore window on the Deleted screen.
  const [accountStatus, setAccountStatus] = useState('active');
  const [deletedAt, setDeletedAt] = useState(null);
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
  const [placesLoading, setPlacesLoading] = useState(true); // false once the first fetch settles (ok or error)
  useEffect(() => {
    let alive = true;
    fetchPlaces()
      .then(data => { if (alive) setLivePlaces(data); })
      .catch(() => { /* keep hardcoded fallback in screens */ })
      .finally(() => { if (alive) setPlacesLoading(false); });
    return () => { alive = false; };
  }, []);
  const placesData = livePlaces?.places || null;

  // App-level config + the user's top-places radius override. Effective radius
  // is the user's choice, else the app default, else 50 mi.
  const [appConfig, setAppConfig] = useState({});
  useEffect(() => {
    fetchConfig().then((cfg) => {
      setAppConfig(cfg);
      // Apply the admin's default discovery filter unless the user already chose.
      if (!verifiedOnlyTouched.current && typeof cfg.defaultVerifiedOnlyDiscovery === 'boolean') {
        setNearbyVerifiedOnly(cfg.defaultVerifiedOnlyDiscovery);
      }
    });
  }, []);
  const [placesRadius, setPlacesRadius] = useState(null); // null = use app default
  const effectivePlacesRadius = placesRadius ?? appConfig.defaultPlacesRadiusMiles ?? 50;
  // Admin-configurable monetization knobs (with safe fallbacks).
  const dmFreeLimit = appConfig.dmFreeMessageLimit ?? 3;
  const plusPrice = appConfig.plusPriceMonthly ?? 7.99;
  const plusTrialDays = appConfig.plusTrialDays ?? 7;
  // User-driven verified-only toggle — marks the choice so config won't override it.
  const handleSetVerifiedOnly = (v) => { verifiedOnlyTouched.current = true; loadNearbyMoms(v); };
  // Set + persist the user's radius override to onboarding_profiles.
  const changePlacesRadius = (r) => { setPlacesRadius(r); recordStep(3, { places_radius_miles: r }); };

  const [liveEvents, setLiveEvents] = useState(null); // { recurring, thisWeek } | null
  const [eventsLoading, setEventsLoading] = useState(true); // false once the first fetch settles (ok or error)

  useEffect(() => {
    let alive = true;
    fetchEvents()
      .then(data => { if (alive) setLiveEvents(data); })
      .catch(() => { if (alive) setLiveEvents(null); })
      .finally(() => { if (alive) setEventsLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchLocalFavorite('Tampa')
      .then((fav) => { if (alive) setLocalFavorite(fav); })
      .catch(() => {});
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
    setNotifChoiceMade(false);
    setAccount(next.account);
    setAccountStatus('active');
    setDeletedAt(null);
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
    familyTags: profile?.settings?.familyTags || [],
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
    setNearbyLoading(true);
    try {
      const { moms } = await fetchNearbyMoms(buildMatchUser(), { limit: 24, verifiedOnly });
      if (reqId !== nearbyReqId.current) return; // a newer load superseded this one
      setNearbyMoms(moms.map(decorateMom));
    } catch (e) {
      if (reqId !== nearbyReqId.current) return;
      console.error('loadNearbyMoms failed', e);
      setNearbyMoms([]);
    } finally {
      // Only the latest request clears the flag — a superseded load mustn't
      // flip the skeleton off while a newer fetch is still in flight.
      if (reqId === nearbyReqId.current) setNearbyLoading(false);
    }
  };

  // Load once the user reaches the main app. Re-runs if the matching inputs
  // change. `locationGeo?.id` keys on location without sending coords as deps.
  useEffect(() => {
    if (step < 3) return;
    loadNearbyMoms(nearbyVerifiedOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, account?.auth_user_id, account?.seedMomId, locationGeo?.id,
      JSON.stringify(profile?.interests), JSON.stringify(profile?.kidsAges),
      JSON.stringify(profile?.values), (profile?.settings?.familyTags || []).join(',')]);

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

  // Capture an incoming `?ref=` invite code as early as possible — before the
  // promote effect below reads it for attribution — and clean it out of the URL.
  useEffect(() => { captureIncomingRef(); }, []);

  // Auto-promote on mount: if Supabase has a session (OAuth return or
  // returning user), attach it to our onboarding row and hydrate state.
  //
  // The launch gate (authResolving) stays up until auth is AUTHORITATIVELY
  // resolved so a returning mom never flashes Landing before promoteSession()
  // swaps her in. The gate drops in exactly two ways:
  //   (a) hydrate() succeeds → splashShown set → MainApp, or
  //   (b) the authoritative INITIAL_SESSION attempt finishes with no profile
  //       (new / anonymous-only visitor) → Landing.
  // We deliberately do NOT drop the gate on a speculative early promote: the
  // old code ran hydrate() immediately and dropped the gate in its finally{}
  // regardless of outcome, so a slow or transient-failed first promote revealed
  // Landing before a second, successful promote redirected into the app — the
  // "Landing → couple seconds → redirect" flash.
  useEffect(() => {
    let cancelled = false;
    let hydrated = false;     // true once we've hydrated a real signed-in user
    let gateDropped = false;

    // Reveal whatever's behind the gate (MainApp if hydrated, else Landing).
    // Idempotent — only the first call has any effect.
    const dropGate = () => {
      if (cancelled || gateDropped) return;
      gateDropped = true;
      setAuthResolving(false);
    };

    const hydrate = async () => {
      if (hydrated) return;
      try {
        const result = await promoteSession();
        if (cancelled || !result?.auth_user_id) return;
        hydrated = true;
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
        // Lifecycle gate: a deactivated/deleted user is still hydrated (so
        // reactivate/restore drops her straight back in) but the root render
        // routes her to the gate instead of MainApp.
        setAccountStatus(result.account_status || 'active');
        setDeletedAt(result.deleted_at || null);
        setSplashShown(true);
        // Gate on the explicit onboarding flag. A signed-in user who never
        // finished onboarding (no name/location/kids on file) is routed to
        // AboutYou — NOT MainApp. Because `account` is now set, AboutYou's
        // onNext skips the Account screen and lands straight in MainApp.
        if (result.onboarding_completed) {
          setStep(3); // returning, complete → MainApp
          flash(`Welcome back, ${result.first_name} ✦`);
        } else {
          setStep(0); // signed in, not onboarded → finish onboarding first
        }
        // hydrate owns clearing the launch gate once it routes a real user —
        // dropGate is a no-op after the initial load (gateDropped latched), so
        // the Login flow relies on this to leave the AuthLoading state.
        setAuthResolving(false);
      } catch {
        /* silent — gate still drops via the caller's .finally(dropGate) */
      }
    };

    // Guarantee a session (anonymous if needed) so chat RLS + Realtime work.
    ensureSession().then((id) => { if (!cancelled) setMyUserId(id); });

    // INITIAL_SESSION is auth-js's authoritative "persisted session loaded (or
    // not)" signal — it always fires once after we subscribe (and carries the
    // OAuth-callback session when returning from a redirect). SIGNED_IN covers
    // fresh logins. In every case we drop the gate only AFTER the hydrate
    // attempt settles, so the gate spans the whole promote round-trip instead
    // of being released mid-flight.
    // Always clear the launch gate after a hydrate attempt — dropGate latches
    // after the initial load, so a later SIGNED_IN (e.g. the Login flow, which
    // raises authResolving itself) must explicitly release authResolving even
    // if hydrate throws, or the user hangs on AuthLoading.
    const settleGate = () => { dropGate(); if (!cancelled) setAuthResolving(false); };
    const unsub = onAuthChange((event, session) => {
      if (cancelled) return;
      if (event === 'INITIAL_SESSION') {
        if (session?.access_token) hydrate().finally(settleGate);
        else dropGate(); // genuinely no session → Landing
      } else if (event === 'SIGNED_IN' && session?.access_token) {
        hydrate().finally(settleGate);
      }
    });

    // Safety net: never hang on the gate if no auth event arrives (e.g. auth
    // misconfigured / offline). Falls through to Landing after a beat.
    const safety = setTimeout(dropGate, 5000);

    return () => { cancelled = true; clearTimeout(safety); unsub(); };
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
    setNotifChoiceMade(false);
    setAccountStatus('active');
    setDeletedAt(null);
    setSplashShown(false);
    await signOut();
  };

  // Lifecycle gate handlers. Reactivate/restore flip the account back to active
  // — the user was already hydrated during promote, so clearing the gate drops
  // her into MainApp. Errors propagate to the gate screen's inline handler.
  const handleReactivate = async () => {
    await reactivateAccount();
    setAccountStatus('active');
    flash('Welcome back ✦');
  };
  const handleRestore = async () => {
    await restoreAccount();
    setAccountStatus('active');
    setDeletedAt(null);
    flash('Welcome back ✦');
  };

  // Generic gate: if no account yet, queue the action and open CreateAccountSheet
  const requestAccount = (action) => setPendingAction(action);

  // Replay the queued action after account creation completes
  const handleAccountComplete = (acct) => {
    setAccount(acct);
    completeOnboarding(); // a real account taking an in-app action counts as onboarded
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

  // ── First-run notification opt-in ────────────────────────────────────
  // Shown once, as the last onboarding beat, to any account that hasn't yet
  // made a push choice (settings.notifications.enabled is undefined). Driven by
  // the persisted preference rather than a routing step, so it surfaces uniformly
  // no matter how the user reached MainApp (OTP, OAuth reload, returning-incomplete).
  const notifEnabledPref = profile?.settings?.notifications?.enabled;
  const needsNotifOptIn = !!account && step === 3
    && notifEnabledPref === undefined && !notifChoiceMade;

  // Persist the push opt-in (master switch) to settings.notifications, locally
  // and through to mom_profiles. Seeded/dev users route via seedMomId.
  const persistNotifEnabled = (enabled) => {
    const nextNotifs = { ...(profile?.settings?.notifications || {}), enabled };
    const nextSettings = { ...(profile?.settings || {}), notifications: nextNotifs };
    setProfile((p) => ({ ...p, settings: { ...(p.settings || {}), notifications: nextNotifs } }));
    updateMomProfile({ settings: nextSettings }, { seedMomId: account?.seedMomId });
  };

  const handleNotifAllow = async () => {
    const { ok, reason } = await requestPushPermission();
    persistNotifEnabled(ok);
    setNotifChoiceMade(true);
    flash(ok ? '✦ Notifications on — see you soon' : reason === 'denied'
      ? 'Notifications are blocked in your browser settings'
      : 'No worries — you can turn these on anytime in your profile');
  };

  const handleNotifSkip = () => {
    persistNotifEnabled(false);
    setNotifChoiceMade(true);
  };

  const inner = (
    <div className="w-full h-full relative">
      {authResolving ? (
            <AuthLoading/>
          ) : account && accountStatus === 'deactivated' ? (
            <ReactivateScreen
              firstName={account.firstName}
              onReactivate={handleReactivate}
              onSignOut={restart}
            />
          ) : account && accountStatus === 'deleted' ? (
            <DeletedScreen
              deletedAt={deletedAt}
              onRestore={handleRestore}
              onSignOut={restart}
            />
          ) : !splashShown && loginOpen ? (
            <Login
              onBack={() => setLoginOpen(false)}
              onSuccess={(acct) => {
                setAccount(acct);
                setLoginOpen(false);
                if (isSupabaseReady()) {
                  // The OTP verify fired SIGNED_IN → the mount effect's
                  // hydrate() will promote + route by the onboarding flag
                  // (MainApp if complete, AboutYou if not). Show the launch
                  // gate meanwhile so Landing doesn't flash; hydrate clears it.
                  setAuthResolving(true);
                } else {
                  // Demo mode (no Supabase): no SIGNED_IN to hydrate from.
                  setSplashShown(true);
                  setStep(3);
                  flash(`Welcome back, ${acct.firstName} ✦`);
                }
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
              stage:       profile.stage,
              looking_for: profile.lookingFor,
              describes:   profile.describes,
            }); setStep(2); }}
              // Finishing AboutYou is what "completed onboarding" means. Flag
              // the session_id row so a later promote reads it back as done.
              onboarding_completed: true,
            });
              if (account) {
                // Already signed in (returning user we routed here, or OAuth
                // mid-onboarding) → skip the Account screen, flip the flag on
                // the auth-linked row too, and enter the app.
                completeOnboarding();
                setStep(3);
              } else {
                setStep(2); // new user → create account next
              }
            }}
            onBack={()=>{ setSplashShown(false); }}
            profile={profile} setProfile={setProfile}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            locationGeo={locationGeo} setLocationGeo={setLocationGeo}
            places={placesData} events={eventsData} thisWeek={thisWeekData}
          />}
          {step===2 && <Account
            onBack={()=>setStep(0)}
            onLogin={()=>{ setSplashShown(false); setLoginOpen(true); }}
            account={account}
            onComplete={(acct) => {
              setAccount(acct);
              // New user just authenticated at the end of onboarding — flip the
              // flag on their now-linked row so future sign-ins go straight to
              // MainApp. (The AboutYou recordStep already set it on the
              // session_id row; this covers the auth_user_id row too.)
              completeOnboarding();
              setStep(3);
            }}
            flash={flash}
          />}
          {step===3 && needsNotifOptIn && (
            <NotificationsOptIn onAllow={handleNotifAllow} onSkip={handleNotifSkip}/>
          )}
          {step===3 && !needsNotifOptIn && <MainApp
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
            verifiedRequiresSocial={appConfig.verifiedRequiresSocial !== false}
            nearbyMoms={nearbyMomsShown}
            nearbyLoading={nearbyLoading}
            placesLoading={placesLoading}
            eventsLoading={eventsLoading}
            localFavorite={localFavorite}
            nearbyVerifiedOnly={nearbyVerifiedOnly}
            onSetVerifiedOnly={handleSetVerifiedOnly}
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
            plusPrice={plusPrice} plusTrialDays={plusTrialDays}
            onClose={()=>setProfileMom(null)}
            openPremium={()=>{ setProfileMom(null); setPremiumOpen(true); }}/>}
          {messageMom && <MessageSheet
            mom={messageMom}
            isPremium={!!account?.isPremium}
            author={chatAuthor}
            myUserId={myUserId}
            senderVerified={selfVerified}
            freeLimit={dmFreeLimit}
            plusPrice={plusPrice} plusTrialDays={plusTrialDays}
            flash={flash}
            onClose={() => setMessageMom(null)}
            openPremium={() => { setMessageMom(null); setPremiumOpen(true); }}/>}
          {premiumOpen && <PremiumSheet
            plusPrice={plusPrice} plusTrialDays={plusTrialDays} freeLimit={dmFreeLimit}
            onClose={()=>setPremiumOpen(false)}
            onActivate={()=>{
              setAccount(a => ({ ...(a || { firstName: 'Mama' }), isPremium: true, trialEndsAt: Date.now() + plusTrialDays*24*3600*1000 }));
              flash(`✦ Welcome to Go Mama Plus · ${plusTrialDays}-day trial started`);
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
    return <AdminApp />;
  }
  return <PrototypeApp />;
}
