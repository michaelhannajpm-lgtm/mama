import { useEffect, useRef, useState } from 'react';
import {
  MapPin, ChevronRight, Pencil, Heart, Bell, Lock, Gift, Baby, CalendarClock, Check, X,
  User as UserIcon, LogOut, BadgeCheck, Camera, Share2, Mail, Phone,
  Instagram, Facebook, PauseCircle, Trash2,
} from 'lucide-react';
import { C } from '../../theme';
import { Sheet } from '../../components/Sheet';
import { ProfilePhotosSheet } from '../../sheets/ProfilePhotosSheet';
import { EditIdentitySheet } from '../../sheets/EditIdentitySheet';
import { InterestsPreferencesSheet } from '../../sheets/InterestsPreferencesSheet';
import { ToggleSettingsSheet } from '../../sheets/ToggleSettingsSheet';
import { LocationSheet } from '../../sheets/LocationSheet';
import { KidsSheet } from '../../sheets/KidsSheet';
import { AvailabilitySheet } from '../../sheets/AvailabilitySheet';
import { ContactVerifySheet } from '../../sheets/ContactVerifySheet';
import { signOut as signOutSession, updateMomProfile, fetchReferrals } from '../../lib/onboarding';
import { deactivateAccount, deleteAccount } from '../../lib/account';
import { DeleteAccountSheet } from '../../sheets/DeleteAccountSheet';
import { requestPushPermission, sendTestPush, pushBlockedHint } from '../../lib/push';
import { inviteUrl, myCode } from '../../lib/referral';
import { linkFacebook, linkInstagram, getLinkedProviders } from '../../lib/social-verify';
import { profileCompletion } from '../../lib/profile-completion';

// ==========================================================================
// YouTab — "My Profile". User card (+ verified badge at top) · bio · connect
// social (drives verification) · settings drawers (Interests & Preferences /
// Location & radius / Kids / Notifications / Privacy, all persisted) · refer ·
// sign out.
// ==========================================================================

// `enabled` is the master push opt-in (the gate). While it's off, the four
// granular toggles below it are hidden and only the master switch shows; flip
// it on (which fires the real permission prompt) to reveal them.
const NOTIFICATION_ITEMS = [
  { key: 'enabled',  label: 'Allow notifications', sub: 'Push for meetups & messages',     default: false },
  { key: 'meetups',  label: 'Meetup reminders',   sub: 'Upcoming 1:1s and events',  default: true,  gated: true },
  { key: 'messages', label: 'New messages',       sub: 'When a mom messages you',   default: true,  gated: true },
  { key: 'groups',   label: 'Group activity',     sub: 'Posts in groups you joined', default: true,  gated: true },
  { key: 'digest',   label: 'Weekly digest',      sub: 'A roundup of picks near you', default: false, gated: true },
];

const PRIVACY_ITEMS = [
  { key: 'discoverable',     label: 'Discoverable',          sub: 'Appear in nearby-mom matching',     default: false },
  { key: 'show_last_active', label: 'Show last active',      sub: 'Let others see when you were on',    default: true },
  { key: 'verified_only_dms',label: 'Verified-only messages',sub: 'Only verified moms can DM you',      default: true },
];

const StatPill = ({ Icon, children, tone = C.coralDeep, bg = C.coralSoft }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: bg, color: tone, borderRadius: 999, padding: '4px 10px',
    fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
  }}>
    <Icon size={11}/> {children}
  </span>
);

// `incomplete` flags a section the mom hasn't filled in yet: an alert dot on
// the icon, a coral-tinted prompt, and a "Set up" pill — so the row reads as a
// to-do, not just a setting.
// Compact private-contact row (email / phone) shown under the name. Verified
// values get a sage check; empty ones invite an "Add your …" in coral.
const ContactRow = ({ Icon, label, value, onClick }) => (
  <button onClick={onClick} className="w-full active:scale-[.99] transition-transform"
    style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', padding: '7px 0', cursor: 'pointer', textAlign: 'left' }}>
    <Icon size={14} color={C.muted} style={{ flexShrink: 0 }}/>
    <div style={{ flex: 1, minWidth: 0 }}>
      {value ? (
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      ) : (
        <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.coralDeep }}>Add your {label}</div>
      )}
    </div>
    {value ? (
      <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, color: C.sageDark, fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800 }}>
        <BadgeCheck size={12}/> Verified
      </span>
    ) : (
      <ChevronRight size={14} color={C.muted}/>
    )}
  </button>
);

const SettingsRow = ({ Icon, iconBg, iconFg, label, sub, onClick, incomplete }) => (
  <button
    onClick={onClick}
    className="active:scale-[.99] transition-transform"
    style={{
      width: '100%', background: '#fff', border: 'none', padding: '13px 6px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderTop: `1px solid ${C.line}`, cursor: 'pointer', textAlign: 'left',
    }}
  >
    <div style={{
      position: 'relative',
      width: 30, height: 30, borderRadius: 9, background: iconBg, color: iconFg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={14}/>
      {incomplete && (
        <span style={{
          position: 'absolute', top: -3, right: -3, width: 10, height: 10,
          borderRadius: 999, background: C.coral, border: '2px solid #fff',
        }}/>
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.navy }}>{label}</div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, marginTop: 1,
        color: incomplete ? C.coralDeep : C.muted, fontWeight: incomplete ? 700 : 400,
      }}>{sub}</div>
    </div>
    {incomplete && (
      <span style={{
        flexShrink: 0, background: C.coralSoft, color: C.coralDeep, borderRadius: 999,
        padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800,
      }}>Set up</span>
    )}
    <ChevronRight size={14} color={C.muted}/>
  </button>
);

// One connect row per network. Linked → shows the handle + a checkmark.
const SocialRow = ({ Icon, name, handle, linked, onConnect }) => (
  <button
    onClick={linked ? undefined : onConnect}
    className="active:scale-[.99] transition-transform"
    style={{
      width: '100%', background: '#fff', border: 'none', padding: '12px 6px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderTop: `1px solid ${C.line}`, cursor: linked ? 'default' : 'pointer', textAlign: 'left',
    }}
  >
    <div style={{
      width: 30, height: 30, borderRadius: 9, background: C.lilac, color: C.lilacDark,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={15}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.navy }}>{name}</div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: linked ? C.sageDark : C.muted, marginTop: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {linked ? (handle || 'Connected') : 'Tap to connect'}
      </div>
    </div>
    {linked ? (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        background: `${C.sageDark}1A`, color: C.sageDark, borderRadius: 999,
        padding: '5px 11px', fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
      }}>
        <BadgeCheck size={13}/> Linked
      </span>
    ) : (
      <span style={{
        flexShrink: 0, background: C.coral, color: '#fff', borderRadius: 999,
        padding: '6px 15px', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
        boxShadow: '0 3px 8px -4px rgba(214,68,106,.6)',
      }}>
        Connect
      </span>
    )}
  </button>
);

export const YouTab = ({
  profile, setProfile, account,
  location, setLocation, locationGeo, setLocationGeo, distance, setDistance,
  prefs, setPrefs,
  verifiedRequiresSocial = true,
  restart, flash,
}) => {
  const [photosOpen, setPhotosOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'prefs'|'avail'|'notif'|'priv'|'location'|'kids'|null
  // Account-lifecycle flow opened from inside the Privacy sheet's Account
  // footer: null | 'deactivate' (confirm) | 'delete' (reason sheet).
  const [accountAction, setAccountAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [bioEditing, setBioEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [photoIdx, setPhotoIdx] = useState(0); // active photo in the hero carousel

  const fullName = account?.firstName
    ? `${account.firstName}${account.lastName ? ' ' + account.lastName : ''}`
    : 'Your profile';
  const kidsCount = Object.values(profile?.kidsAges || {}).reduce((s, n) => s + n, 0);
  const cityLabel = location ? location.split(',')[0] + ', FL' : 'Tampa, FL';
  const photos = profile?.photos || [];
  const primaryPhoto = photos[0];
  const displayName = profile?.displayName || fullName;
  const handle = profile?.username || account?.username || null;

  // Availability lives in app-level prefs (prefs.slots → "Day-window" strings).
  const availSlots = prefs?.slots || [];
  const availDays = new Set(availSlots.map(s => String(s).split('-')[0])).size;

  const socialLinks = profile?.socialLinks || {};
  const igLinked = !!socialLinks.instagram;
  const fbLinked = !!socialLinks.facebook;
  const hasPhoto = !!primaryPhoto;

  // Profile completion — shared with HomeTab's "Complete your profile" card
  // via src/lib/profile-completion.js. A section that isn't done gets a "Set
  // up" nudge here and counts against the progress bar.
  const { items: completionItems, done: completionDone, pct: completionPct } = profileCompletion(profile, location);
  const isDone = (key) => !!completionItems.find(c => c.key === key)?.done;

  // Each completion step → the screen that fixes it, so the "Complete your
  // profile" card can list exactly what's missing and route a tap straight to
  // it. Filtered from the same completionItems, so the list always matches the
  // progress bar.
  const STEP_FIX = {
    photo:    { Icon: Camera, label: 'Add a profile photo',        onFix: () => setPhotosOpen(true) },
    prefs:    { Icon: Heart,  label: 'Add your interests & values', onFix: () => setSheet('prefs') },
    location: { Icon: MapPin, label: 'Set your neighborhood',       onFix: () => setSheet('location') },
    kids:     { Icon: Baby,   label: 'Add your kids',               onFix: () => setSheet('kids') },
    bio:      { Icon: Pencil, label: 'Write a short bio',           onFix: () => { setBioDraft(profile?.bio || ''); setBioEditing(true); } },
  };
  const missingSteps = completionItems
    .filter(c => !c.done && STEP_FIX[c.key])
    .map(c => ({ key: c.key, ...STEP_FIX[c.key] }));

  // Refer a friend — opens the device's native share sheet (Web Share API) so a
  // mom can send the invite through any app she likes. Falls back to copying the
  // invite link where Web Share isn't available (e.g. desktop browsers).
  const referFriend = async () => {
    // Link carries the mom's `?ref=` invite code so a friend who signs up is
    // attributed back to her.
    const url = inviteUrl(account?.username || myCode());
    const shareData = {
      title: 'Go Mama',
      text: "I'm on Go Mama meeting other moms near me — come find your village 💛",
      url,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareData.text} ${url}`);
        flash?.('✦ Invite link copied — send it to a friend');
      } else {
        flash?.("Sharing isn't available on this device");
      }
    } catch (err) {
      // The user dismissing the native share sheet throws AbortError — that's
      // not a failure, so stay quiet; only surface real errors.
      if (err?.name !== 'AbortError') flash?.("Couldn't open share");
    }
  };

  // Friends who joined via this mom's invite link — shown inline under the
  // Refer card. Best-effort; stays empty/hidden if the fetch fails or there's
  // no account yet.
  const [referrals, setReferrals] = useState(null); // { code, count, friends[] } | null
  const [friendsOpen, setFriendsOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchReferrals({ seedMomId: account?.seedMomId });
      if (alive && data?.ok) setReferrals(data);
    })();
    return () => { alive = false; };
  }, [account?.auth_user_id, account?.seedMomId]);
  const referredFriends = referrals?.friends || [];

  // Private contact info (phone + email) shown under the name. The verified
  // value comes from `account`; once the mom verifies a new one in this session
  // we override locally so it shows immediately (server-persisted via sync).
  const [contactSheet, setContactSheet] = useState(null); // 'email' | 'phone' | null
  const [contactOverride, setContactOverride] = useState({});
  const emailVal = contactOverride.email ?? account?.email ?? '';
  const phoneVal = contactOverride.phone ?? account?.phone ?? '';

  // Verified = every profile step complete, AND (when the admin requires it) a
  // linked social account — the documented verified-only moat. Lose any step
  // and the badge drops. The flag is persisted (below) so it's correct wherever
  // others see this mom's avatar.
  const profileComplete = completionItems.every(c => c.done);
  const verified = profileComplete && (!verifiedRequiresSocial || igLinked || fbLinked);

  // Persist a local-shaped patch: merge into profile state + map → API fields.
  const saveProfile = async (localPatch) => {
    setProfile(prev => ({ ...prev, ...localPatch }));
    const api = {};
    if ('momTypes' in localPatch)    api.mom_types = localPatch.momTypes;
    if ('values' in localPatch)      api.values = localPatch.values;
    if ('interests' in localPatch)   api.interests = localPatch.interests;
    if ('kidsAges' in localPatch)    api.kids_ages = localPatch.kidsAges;
    if ('bio' in localPatch)         api.bio = localPatch.bio;
    if ('settings' in localPatch)    api.settings = localPatch.settings;
    if ('socialLinks' in localPatch) api.social_links = localPatch.socialLinks;
    if ('verifiedFlag' in localPatch) api.verified = localPatch.verifiedFlag;
    if (Object.keys(api).length) { try { await updateMomProfile(api, { seedMomId: account?.seedMomId }); } catch { /* best-effort */ } }
  };

  // Location lives in app-level state (not the profile object); persist the
  // geo + travel radius separately.
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

  // Availability persists to prefs.slots (app state) + free_slots (the column
  // the matching engine reads), so picks here improve who sees her.
  const saveAvailability = (nextSlots) => {
    setPrefs?.(p => ({ ...(p || {}), slots: nextSlots }));
    updateMomProfile({ free_slots: nextSlots }, { seedMomId: account?.seedMomId }).catch(() => { /* best-effort */ });
  };

  const saveBio = () => { saveProfile({ bio: bioDraft.trim() }); setBioEditing(false); };

  // Persist the photos array (primary = photos[0]). Adding a first photo also
  // auto-enables Discoverable (and unlocks its toggle); removing the last photo
  // turns it back off — a mom with no photo isn't visible. The verified flag is
  // persisted separately by the effect above.
  const savePhotos = (next) => {
    const hadPhoto = (profile?.photos?.length || 0) > 0;
    const willHave = next.length > 0;
    let nextSettings = null;
    if (willHave !== hadPhoto) {
      nextSettings = {
        ...(profile?.settings || {}),
        privacy: { ...(profile?.settings?.privacy || {}), discoverable: willHave },
      };
    }
    setProfile(prev => ({ ...prev, photos: next, ...(nextSettings ? { settings: nextSettings } : {}) }));
    const api = { photos: next };
    if (nextSettings) api.settings = nextSettings;
    updateMomProfile(api, { seedMomId: account?.seedMomId }).catch(() => { /* best-effort */ });
  };

  const linkSocial = (network, handle) => {
    const nextSocial = { ...socialLinks, [network]: handle };
    saveProfile({ socialLinks: nextSocial });
  };

  // On mount: pick up Instagram redirect-back (?ig=) and any linked FB identity.
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const ig = params.get('ig');
      if (ig) {
        linkSocial('instagram', `@${ig}`);
        flash?.('✦ Instagram connected');
        ['ig', 'ig_error'].forEach(k => params.delete(k));
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
      }
      const providers = await getLinkedProviders();
      if (providers.includes('facebook') && !socialLinks.facebook) {
        linkSocial('facebook', 'Connected');
        flash?.('✦ Facebook connected');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the computed verified flag whenever it flips, so the mom's badge
  // stays correct everywhere others see her. Skips the initial render.
  const verifiedRef = useRef(null);
  useEffect(() => {
    if (verifiedRef.current === null) { verifiedRef.current = verified; return; }
    if (verifiedRef.current === verified) return;
    verifiedRef.current = verified;
    updateMomProfile({ verified }, { seedMomId: account?.seedMomId }).catch(() => { /* best-effort */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  const connectFacebook = async () => {
    try { await linkFacebook(); } catch (e) { flash?.(e?.message || 'Facebook sign-in not configured'); }
  };
  const connectInstagram = async () => {
    try { await linkInstagram(); } catch (e) { flash?.(e?.message || 'Instagram sign-in not configured'); }
  };

  const handleSignOut = async () => {
    try { await signOutSession(); } catch { /* swallow */ }
    restart?.();
  };

  // Deactivate: persist the pause, then sign out → Landing. On her next login
  // promote reports 'deactivated' and App shows the Reactivate gate.
  const handleDeactivate = async () => {
    setActionBusy(true);
    try { await deactivateAccount(); } catch (e) { flash?.(e?.message || 'Could not deactivate'); }
    setActionBusy(false);
    setAccountAction(null);
    try { await signOutSession(); } catch { /* swallow */ }
    restart?.();
  };

  // Delete: the DeleteAccountSheet captures the reason and calls this. Persist
  // the soft-delete (reason stored server-side), then sign out → Landing. Next
  // login shows the Deleted/Restore gate. Throws propagate to the sheet so it
  // can show an inline error instead of half-completing.
  const handleDelete = async ({ reasonCode, reasonNote }) => {
    await deleteAccount({ reasonCode, reasonNote });
    setAccountAction(null);
    try { await signOutSession(); } catch { /* swallow */ }
    restart?.();
  };

  // The "Account" section injected into the Privacy sheet footer. Tapping a row
  // closes Privacy and opens the matching lifecycle flow at the YouTab root.
  const accountFooter = (
    <div className="mt-5" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '11px 14px 3px', fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted }}>
        Account
      </div>
      <button
        onClick={() => { setSheet(null); setAccountAction('deactivate'); }}
        className="w-full flex items-center gap-3 active:scale-[.99] transition-transform"
        style={{ background: 'transparent', border: 'none', padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 10, background: C.divider, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PauseCircle size={16} color={C.navySoft}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>Deactivate account</div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 1 }}>Take a break — reactivate anytime</div>
        </div>
        <ChevronRight size={15} color={C.muted}/>
      </button>
      <button
        onClick={() => { setSheet(null); setAccountAction('delete'); }}
        className="w-full flex items-center gap-3 active:scale-[.99] transition-transform"
        style={{ background: 'transparent', border: 'none', borderTop: `1px solid ${C.line}`, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 10, background: C.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trash2 size={16} color={C.coralDeep}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.coralDeep }}>Delete account</div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 1 }}>Permanently remove your profile</div>
        </div>
        <ChevronRight size={15} color={C.muted}/>
      </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 20 }}>
      {/* Photo hero — swipe through your photos; identity sits in the band below */}
      <div style={{
        background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ position: 'relative' }}>
          {photos.length > 0 ? (
            <div
              onScroll={(e) => setPhotoIdx(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
              style={{
                display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
              }}
            >
              {photos.map((p, i) => (
                <img key={i} src={p} alt="" onClick={() => setPhotosOpen(true)}
                  style={{
                    width: '100%', height: 190, flexShrink: 0, objectFit: 'cover',
                    scrollSnapAlign: 'center', cursor: 'pointer', display: 'block',
                  }}/>
              ))}
            </div>
          ) : (
            <button onClick={() => setPhotosOpen(true)} aria-label="Add a photo" style={{
              width: '100%', height: 190, border: 'none', cursor: 'pointer',
              background: C.coralSoft, color: C.coralDeep,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 26, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><UserIcon size={26}/></div>
              <div style={{ textAlign: 'center', maxWidth: 250, padding: '0 12px' }}>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800 }}>Add your first photo</div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 600, marginTop: 3, lineHeight: 1.35 }}>
                  Without a photo, you won't be visible to other moms.
                </div>
              </div>
            </button>
          )}

          {/* Camera / edit, top-right */}
          <button onClick={() => setPhotosOpen(true)} aria-label="Edit photos" style={{
            position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16,
            background: 'rgba(27,42,78,.55)', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
          }}>
            <Camera size={15}/>
          </button>

          {/* Verified seal — top-left, only when fully verified */}
          {verified && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: C.sageDark, color: '#fff', borderRadius: 999,
              padding: '4px 9px', fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800,
              boxShadow: '0 2px 6px -2px rgba(27,42,78,.4)',
            }}>
              <BadgeCheck size={12}/> Verified
            </div>
          )}

          {/* Bottom scrim + paging dots (only with more than one photo) */}
          {photos.length > 1 && (
            <>
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, pointerEvents: 'none',
                background: 'linear-gradient(to top, rgba(27,42,78,.30), transparent)',
              }}/>
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 10,
                display: 'flex', justifyContent: 'center', gap: 5,
              }}>
                {photos.map((_, i) => (
                  <span key={i} style={{
                    width: i === photoIdx ? 16 : 6, height: 6, borderRadius: 999,
                    background: i === photoIdx ? '#fff' : 'rgba(255,255,255,.6)', transition: 'width .2s',
                  }}/>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Identity band */}
        <div style={{ padding: '12px 14px' }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <button onClick={() => setIdentityOpen(true)} className="active:scale-[.98] transition-transform"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
              <span style={{
                fontFamily: 'Fraunces', fontSize: 19, fontWeight: 700, color: C.navy, letterSpacing: '-.01em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </span>
              <Pencil size={12} color={C.muted} style={{ flexShrink: 0 }}/>
            </button>
            {verified ? (
              <span style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
                background: `${C.sageDark}1A`, color: C.sageDark, borderRadius: 999,
                padding: '3px 9px', fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
              }}>
                <BadgeCheck size={11}/> Verified
              </span>
            ) : (
              <span style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
                background: C.cream, color: C.muted, border: `1px solid ${C.divider}`, borderRadius: 999,
                padding: '3px 9px', fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
              }}>
                Unverified
              </span>
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, marginTop: 4,
          }}>
            {handle && <span style={{ color: C.coralDeep, fontWeight: 700 }}>@{handle}</span>}
            {handle && <span>·</span>}
            {kidsCount ? <span>Mom of {kidsCount} ·</span> : null}
            <MapPin size={11} color={C.muted}/> {cityLabel}
          </div>

          {/* Private contact info — phone + email, each OTP-verified. Never
              shown to other moms (see the privacy line below). */}
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 6 }}>
            <ContactRow Icon={Mail}  label="email" value={emailVal} onClick={() => setContactSheet('email')}/>
            <ContactRow Icon={Phone} label="phone" value={phoneVal} onClick={() => setContactSheet('phone')}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, lineHeight: 1.3 }}>
              <Lock size={10} style={{ flexShrink: 0 }}/> Only you can see this — never shared with other moms.
            </div>
          </div>
        </div>
      </div>

      {/* Profile completion — only while there's something left to finish */}
      {completionPct < 100 && (
        <div style={{
          marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 14,
        }}>
          <div className="flex items-center justify-between">
            <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800, color: C.navy }}>
              Complete your profile
            </div>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 800, color: C.coralDeep }}>
              {completionPct}%
            </div>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: C.coralSoft, overflow: 'hidden' }}>
            <div style={{
              width: `${completionPct}%`, height: '100%', borderRadius: 999,
              background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`, transition: 'width .3s ease-out',
            }}/>
          </div>
          <div style={{ marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11, color: C.muted }}>
            {completionDone} of {completionItems.length} done · finish these to get verified
          </div>

          {/* What's left — each row routes straight to the screen that fixes it */}
          <div style={{ marginTop: 8 }}>
            {missingSteps.map(m => (
              <button
                key={m.key}
                onClick={m.onFix}
                className="w-full active:scale-[.99] transition-transform"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderTop: `1px solid ${C.line}`, padding: '10px 0',
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: C.coralSoft, color: C.coralDeep,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <m.Icon size={13}/>
                </span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.navy }}>
                  {m.label}
                </span>
                <ChevronRight size={15} color={C.muted}/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 14,
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <div className="flex items-center gap-1.5">
            <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>
              About me
            </div>
            {!isDone('bio') && (
              <span style={{ width: 7, height: 7, borderRadius: 999, background: C.coral, flexShrink: 0 }}/>
            )}
          </div>
          {!bioEditing && (
            <button onClick={() => { setBioDraft(profile?.bio || ''); setBioEditing(true); }} style={{
              background: 'transparent', border: 'none', padding: 0, color: C.coralDeep,
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{isDone('bio') ? 'Edit' : 'Add'}</button>
          )}
        </div>
        {bioEditing ? (
          <>
            <textarea
              value={bioDraft} onChange={e => setBioDraft(e.target.value)} rows={3} maxLength={280} autoFocus
              placeholder="Add a short bio so other moms get to know you."
              style={{
                width: '100%', resize: 'none', border: `1px solid ${C.divider}`, borderRadius: 12,
                padding: 10, fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy, outline: 'none', lineHeight: 1.5,
              }}
            />
            <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
              <button onClick={saveBio} className="inline-flex items-center gap-1" style={{
                background: C.coral, color: '#fff', border: 'none', borderRadius: 999,
                padding: '6px 14px', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
              }}><Check size={12}/> Save</button>
              <button onClick={() => setBioEditing(false)} className="inline-flex items-center gap-1" style={{
                background: 'transparent', color: C.muted, border: 'none', padding: '6px 4px',
                fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
              }}><X size={12}/> Cancel</button>
            </div>
          </>
        ) : (
          <div onClick={() => { setBioDraft(profile?.bio || ''); setBioEditing(true); }}
            style={{ fontFamily: 'Albert Sans', fontSize: 12.5, lineHeight: 1.5, cursor: 'pointer', color: profile?.bio ? C.navySoft : C.muted }}>
            {profile?.bio || 'Add a short bio so other moms get to know you.'}
          </div>
        )}
        {(igLinked || fbLinked) && (
          <div className="flex gap-1.5" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {igLinked && <StatPill Icon={Instagram} bg={C.lilac} tone={C.lilacDark}>{socialLinks.instagram}</StatPill>}
            {fbLinked && <StatPill Icon={Facebook} bg={C.azureSoft} tone={C.azure}>Facebook</StatPill>}
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ borderTop: 'none' }}>
          <SettingsRow Icon={Heart} iconBg={C.coralSoft} iconFg={C.coralDeep}
            label="Interests & Preferences"
            sub={isDone('prefs') ? 'Update what matters to you' : 'Add your interests & values'}
            incomplete={!isDone('prefs')} onClick={() => setSheet('prefs')}/>
        </div>
        <SettingsRow Icon={MapPin} iconBg={C.peach} iconFg={C.coralDeep}
          label="Location" sub={location ? `${cityLabel} · ${distance ?? 5} mi` : 'Set your neighborhood & radius'}
          incomplete={!isDone('location')} onClick={() => setSheet('location')}/>
        <SettingsRow Icon={Baby} iconBg={C.lilac} iconFg={C.lilacDark}
          label="Kids" sub={kidsCount ? `${kidsCount} ${kidsCount === 1 ? 'kid' : 'kids'}` : 'Add your kids'}
          incomplete={!isDone('kids')} onClick={() => setSheet('kids')}/>
        <SettingsRow Icon={CalendarClock} iconBg={C.sage} iconFg={C.sageDark}
          label="Availability" sub={availDays ? `Free on ${availDays} day${availDays === 1 ? '' : 's'} a week` : "Set when you're free to meet"}
          onClick={() => setSheet('avail')}/>
        <SettingsRow Icon={Bell} iconBg={C.saffronSoft} iconFg={C.saffronDark}
          label="Notifications" sub="Manage your alerts" onClick={() => setSheet('notif')}/>
        <SettingsRow Icon={Lock} iconBg={C.sage} iconFg={C.sageDark}
          label="Privacy" sub="Control your data and privacy" onClick={() => setSheet('priv')}/>
      </div>

      {/* Link social media → verification */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ padding: '13px 14px 2px' }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>
            Link social media
          </div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 2 }}>
            Link a social account and add a photo to earn your Verified Mom badge.
          </div>
        </div>
        <SocialRow Icon={Instagram} name="Instagram" handle={socialLinks.instagram} linked={igLinked} onConnect={connectInstagram}/>
        <SocialRow Icon={Facebook}  name="Facebook"  handle={socialLinks.facebook}  linked={fbLinked} onConnect={connectFacebook}/>
      </div>

      {/* Refer a friend — triggers the device's native share sheet */}
      <button
        onClick={referFriend}
        aria-label="Refer a friend"
        className="active:scale-[.99] transition-transform"
        style={{
          marginTop: 12, width: '100%', background: C.lilac, border: 'none', borderRadius: 16,
          padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 12, background: '#fff', color: C.lilacDark,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Gift size={18}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800, color: C.navy }}>Refer a friend</div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.navySoft, marginTop: 3 }}>
            Unlock rewards as friends join
          </div>
        </div>
        <span style={{
          background: C.coralDeep, color: '#fff', fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
          padding: '6px 12px', borderRadius: 14, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}><Share2 size={12}/> Share</span>
      </button>

      {/* Friends who joined via your invite — inline under the Refer card.
          Collapsed to an avatar stack + count; tap to expand the full list. */}
      {referredFriends.length > 0 && (
        <div style={{ marginTop: 8, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
          <button
            onClick={() => setFriendsOpen(o => !o)}
            className="w-full active:scale-[.99] transition-transform"
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {referredFriends.slice(0, 3).map((f, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: 14, marginLeft: i ? -8 : 0,
                  border: `2px solid ${C.paper}`, overflow: 'hidden', flexShrink: 0,
                  background: C.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {f.photo
                    ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800, color: C.coralDeep }}>{(f.name || '?').charAt(0)}</span>}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 800, color: C.navy }}>
                {referrals.count} friend{referrals.count === 1 ? '' : 's'} joined
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 1 }}>
                Tap to see {friendsOpen ? 'less' : 'who'}
              </div>
            </div>
            <ChevronRight size={15} color={C.muted} style={{ transform: friendsOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}/>
          </button>
          {friendsOpen && (
            <div style={{ borderTop: `1px solid ${C.line}` }}>
              {referredFriends.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
                    background: C.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {f.photo
                      ? <img src={f.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      : <span style={{ fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 800, color: C.coralDeep }}>{(f.name || '?').charAt(0)}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.navy }}>{f.name}</div>
                    {f.joinedAt && (
                      <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 1 }}>
                        Joined {new Date(f.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <span style={{
                    flexShrink: 0, background: C.sage, color: C.sageDark, borderRadius: 999,
                    padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
                  }}>
                    {f.status === 'verified' ? 'Verified' : 'Joined'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign out + restart */}
      {account && (
        <button onClick={handleSignOut} style={{
          marginTop: 12, width: '100%', background: '#fff', border: `1px solid ${C.line}`,
          borderRadius: 16, padding: '10px 12px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6, color: C.coralDeep,
          fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
        }}>
          <LogOut size={13}/> Sign out
        </button>
      )}

      {/* Drawers */}
      {photosOpen && <ProfilePhotosSheet
        photos={profile?.photos || []}
        seedMomId={account?.seedMomId}
        onSave={savePhotos}
        flash={flash}
        onClose={() => setPhotosOpen(false)}/>}

      {identityOpen && <EditIdentitySheet
        displayName={displayName}
        username={handle || ''}
        seedMomId={account?.seedMomId}
        onSaved={({ displayName: dn, username: un }) => setProfile(p => ({ ...p, displayName: dn, username: un }))}
        flash={flash}
        onClose={() => setIdentityOpen(false)}/>}

      {sheet === 'prefs' && <InterestsPreferencesSheet
        profile={profile}
        onSave={(patch) => saveProfile(patch)}
        onClose={() => setSheet(null)}/>}

      {sheet === 'notif' && <ToggleSettingsSheet
        eyebrow="Stay in the loop" title="Notification" accentWord="settings"
        items={NOTIFICATION_ITEMS}
        values={profile?.settings?.notifications || {}}
        gateKey="enabled"
        onGateEnable={async () => {
          const { ok, reason } = await requestPushPermission();
          if (!ok) flash?.(pushBlockedHint(reason)); // explain a stuck toggle instead of silently refusing
          return ok;
        }}
        onSave={(next) => saveProfile({ settings: { ...(profile?.settings || {}), notifications: next } })}
        footer={
          <button
            onClick={async () => {
              flash?.('Sending a test…');
              const r = await sendTestPush();
              if (!r.ok) flash?.(pushBlockedHint(r.reason));
              else flash?.(r.sent > 0 ? '✦ Test sent — check your notifications' : '✦ Test shown on this device');
            }}
            className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
            style={{
              height: 46, background: '#fff', border: `1.5px solid ${C.coral}`,
              color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
            }}>
            <Bell size={15}/> Send a test notification
          </button>
        }
        onClose={() => setSheet(null)}/>}

      {sheet === 'priv' && <ToggleSettingsSheet
        eyebrow="Your space" title="Privacy" accentWord="controls"
        items={PRIVACY_ITEMS}
        values={profile?.settings?.privacy || {}}
        disabledKeys={hasPhoto ? [] : ['discoverable']}
        disabledNote="Add a profile photo to turn this on."
        onSave={(next) => saveProfile({ settings: { ...(profile?.settings || {}), privacy: next } })}
        footer={accountFooter}
        onClose={() => setSheet(null)}/>}

      {sheet === 'location' && <LocationSheet
        location={location} locationGeo={locationGeo} distance={distance}
        onSave={saveLocation}
        onClose={() => setSheet(null)}/>}

      {sheet === 'kids' && <KidsSheet
        profile={profile}
        onSave={(patch) => saveProfile(patch)}
        onClose={() => setSheet(null)}/>}

      {sheet === 'avail' && <AvailabilitySheet
        slots={availSlots}
        onSave={saveAvailability}
        onClose={() => setSheet(null)}/>}

      {contactSheet && (
        <ContactVerifySheet
          kind={contactSheet}
          current={contactSheet === 'phone' ? phoneVal : emailVal}
          onVerified={(val) => setContactOverride(o => ({ ...o, [contactSheet]: val }))}
          onClose={() => setContactSheet(null)}
          flash={flash}
        />
      )}

      {accountAction === 'delete' && (
        <DeleteAccountSheet
          onConfirm={handleDelete}
          onClose={() => setAccountAction(null)}
        />
      )}

      {accountAction === 'deactivate' && (
        <Sheet onClose={() => (actionBusy ? null : setAccountAction(null))}>
          <div className="px-5 pt-1 pb-6">
            <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
              Take a break
            </div>
            <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
              Deactivate your <span style={{ fontStyle: 'italic', color: C.coral }}>account</span>
            </h3>
            <p style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginTop: 8 }}>
              You'll disappear from matching and the app until you're ready. Nothing
              is deleted — just log back in anytime to reactivate and pick up where
              you left off.
            </p>
            <button
              onClick={handleDeactivate}
              disabled={actionBusy}
              className="mt-5 w-full rounded-2xl active:scale-[.99] transition-transform"
              style={{
                height: 50, background: C.navy, color: C.cream,
                fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14, border: 'none',
                cursor: actionBusy ? 'default' : 'pointer',
              }}
            >
              {actionBusy ? 'Deactivating…' : 'Deactivate my account'}
            </button>
            <button
              onClick={() => setAccountAction(null)}
              disabled={actionBusy}
              className="mt-3 w-full"
              style={{ background: 'transparent', border: 'none', padding: 6, fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.muted, cursor: actionBusy ? 'default' : 'pointer' }}
            >
              Never mind
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
};
