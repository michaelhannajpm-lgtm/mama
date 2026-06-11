import { useEffect, useState } from 'react';
import {
  MapPin, ChevronRight, Pencil, Heart, Bell, Lock, Gift, Baby, Check, X,
  User as UserIcon, LogOut, BadgeCheck, ShieldCheck, Camera, Link2,
  Instagram, Facebook,
} from 'lucide-react';
import { C } from '../../theme';
import { PresenceDot } from '../../components/PresenceDot';
import { ProfilePhotosSheet } from '../../sheets/ProfilePhotosSheet';
import { EditIdentitySheet } from '../../sheets/EditIdentitySheet';
import { InterestsPreferencesSheet } from '../../sheets/InterestsPreferencesSheet';
import { ToggleSettingsSheet } from '../../sheets/ToggleSettingsSheet';
import { LocationSheet } from '../../sheets/LocationSheet';
import { KidsSheet } from '../../sheets/KidsSheet';
import { signOut as signOutSession, updateMomProfile } from '../../lib/onboarding';
import { linkFacebook, linkInstagram, getLinkedProviders, computeVerified } from '../../lib/social-verify';

// ==========================================================================
// YouTab — "My Profile". User card (+ verified chip) · bio · badges · connect
// social (drives verification) · settings drawers (Interests & Preferences /
// Notifications / Privacy, all persisted) · refer · sign out.
// ==========================================================================

// Starburst/sunburst seal outline — the universal "award sticker" shape. N
// outer spikes alternating with inner valleys around a center point.
const sealPoints = (cx, cy, outer, inner, spikes) => {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

const SEAL_POINTS = sealPoints(25, 25, 24, 19.5, 12);

// An earned achievement seal (gradient sunburst + white icon) or a locked,
// dashed-outline version. Reads as a medal, never as a button.
const BadgeSeal = ({ id, Icon, earned }) => (
  <div style={{ position: 'relative', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="50" height="50" viewBox="0 0 50 50" style={{
      position: 'absolute', inset: 0,
      filter: earned ? 'drop-shadow(0 4px 7px rgba(94,122,59,.45))' : 'none',
    }}>
      <defs>
        <linearGradient id={`seal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.sage}/>
          <stop offset="100%" stopColor={C.sageDark}/>
        </linearGradient>
      </defs>
      <polygon
        points={SEAL_POINTS}
        fill={earned ? `url(#seal-${id})` : C.cream}
        stroke={earned ? '#fff' : C.divider}
        strokeWidth={earned ? 2 : 1.2}
        strokeLinejoin="round"
        strokeDasharray={earned ? undefined : '3 2.5'}
      />
      {earned && <circle cx="25" cy="25" r="15.5" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1"/>}
    </svg>
    <Icon size={17} color={earned ? '#fff' : C.muted} style={{ position: 'relative' }}/>
    {earned && (
      <div style={{
        position: 'absolute', right: 1, bottom: 1,
        width: 17, height: 17, borderRadius: 9, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(27,42,78,.3)',
      }}>
        <Check size={11} color={C.sageDark} strokeWidth={3.5}/>
      </div>
    )}
  </div>
);

const NOTIFICATION_ITEMS = [
  { key: 'meetups',  label: 'Meetup reminders',   sub: 'Upcoming 1:1s and events',        default: true },
  { key: 'messages', label: 'New messages',       sub: 'When a mom messages you',          default: true },
  { key: 'groups',   label: 'Group activity',     sub: 'Posts in groups you joined',       default: true },
  { key: 'digest',   label: 'Weekly digest',      sub: 'A roundup of picks near you',      default: false },
];

const PRIVACY_ITEMS = [
  { key: 'discoverable',     label: 'Discoverable',          sub: 'Appear in nearby-mom matching',     default: true },
  { key: 'show_last_active', label: 'Show last active',      sub: 'Let others see when you were on',    default: true },
  { key: 'verified_only_dms',label: 'Verified-only messages',sub: 'Only verified moms can DM you',      default: false },
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

const SettingsRow = ({ Icon, iconBg, iconFg, label, sub, onClick }) => (
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
      width: 30, height: 30, borderRadius: 9, background: iconBg, color: iconFg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={14}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700, color: C.navy }}>{label}</div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, marginTop: 1 }}>{sub}</div>
    </div>
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
      width: 30, height: 30, borderRadius: 9, background: C.lilac, color: '#5E4A8A',
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
  openPlans, restart, flash,
}) => {
  const [photosOpen, setPhotosOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'prefs'|'notif'|'priv'|'location'|'kids'|null
  const [bioEditing, setBioEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState('');

  const fullName = account?.firstName
    ? `${account.firstName}${account.lastName ? ' ' + account.lastName : ''}`
    : 'Your profile';
  const kidsCount = Object.values(profile?.kidsAges || {}).reduce((s, n) => s + n, 0);
  const cityLabel = location ? location.split(',')[0] + ', FL' : 'Tampa, FL';
  const primaryPhoto = profile?.photos?.[0];
  const displayName = profile?.displayName || fullName;
  const handle = profile?.username || account?.username || null;

  const socialLinks = profile?.socialLinks || {};
  const igLinked = !!socialLinks.instagram;
  const fbLinked = !!socialLinks.facebook;
  const hasPhoto = !!primaryPhoto;
  const verified = computeVerified({ instagram: igLinked, facebook: fbLinked, photo: hasPhoto });

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

  const saveBio = () => { saveProfile({ bio: bioDraft.trim() }); setBioEditing(false); };

  // Persist the photos array (primary = photos[0]) and recompute the verified
  // flag — having a photo is one of the two verification signals.
  const savePhotos = (next) => {
    setProfile(prev => ({ ...prev, photos: next }));
    const isVerified = computeVerified({ instagram: igLinked, facebook: fbLinked, photo: next.length > 0 });
    updateMomProfile({ photos: next, verified: isVerified }, { seedMomId: account?.seedMomId }).catch(() => { /* best-effort */ });
  };

  const linkSocial = (network, handle) => {
    const nextSocial = { ...socialLinks, [network]: handle };
    const isVerified = computeVerified({
      instagram: !!nextSocial.instagram, facebook: !!nextSocial.facebook, photo: hasPhoto,
    });
    saveProfile({ socialLinks: nextSocial, verifiedFlag: isVerified });
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

  const badges = [
    { id: 'verified', label: 'Verified Mom', Icon: ShieldCheck, earned: verified,            hint: 'Link a social + add a photo' },
    { id: 'photo',    label: 'Photo added',  Icon: Camera,      earned: hasPhoto,            hint: 'Add a profile photo' },
    { id: 'social',   label: 'Social linked',Icon: Link2,       earned: igLinked || fbLinked, hint: 'Connect Instagram or Facebook' },
    { id: 'bio',      label: 'Bio written',  Icon: Pencil,      earned: !!profile?.bio,      hint: 'Write a short bio' },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 20 }}>
      {/* User card */}
      <div style={{
        background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {primaryPhoto ? (
            <img src={primaryPhoto} alt="" onClick={() => setPhotosOpen(true)}
              style={{ width: 64, height: 64, borderRadius: 32, objectFit: 'cover', cursor: 'pointer' }}/>
          ) : (
            <div onClick={() => setPhotosOpen(true)} style={{
              width: 64, height: 64, borderRadius: 32, background: C.coralSoft, color: C.coralDeep,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><UserIcon size={28}/></div>
          )}
          <button onClick={() => setPhotosOpen(true)} aria-label="Edit photos" style={{
            position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12,
            background: C.coral, color: '#fff', border: '2px solid #fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px -2px rgba(0,0,0,.35)',
          }}>
            <Camera size={12}/>
          </button>
          {/* You're using the app → always online. Camera edit sits bottom-right. */}
          <PresenceDot status="online" size={15} style={{ top: 0, right: 0, bottom: 'auto' }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-1.5" style={{ flexWrap: 'wrap' }}>
            <button onClick={() => setIdentityOpen(true)} className="active:scale-[.98] transition-transform"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700, color: C.navy, letterSpacing: '-.01em' }}>
                {displayName}
              </span>
              <Pencil size={12} color={C.muted}/>
            </button>
            {verified && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: `${C.sageDark}1A`, color: C.sageDark, borderRadius: 999,
                padding: '2px 8px', fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
              }}>
                <BadgeCheck size={11}/> Verified
              </span>
            )}
          </div>
          {handle && (
            <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.coralDeep, fontWeight: 700, marginTop: 2 }}>
              @{handle}
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, marginTop: 4,
          }}>
            {kidsCount ? `Mom of ${kidsCount} · ` : ''}<MapPin size={11} color={C.muted}/> {cityLabel}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 14,
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>
            About me
          </div>
          {!bioEditing && (
            <button onClick={() => { setBioDraft(profile?.bio || ''); setBioEditing(true); }} style={{
              background: 'transparent', border: 'none', padding: 0, color: C.coralDeep,
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>Edit</button>
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
            {igLinked && <StatPill Icon={Instagram} bg={C.lilac} tone="#5E4A8A">{socialLinks.instagram}</StatPill>}
            {fbLinked && <StatPill Icon={Facebook} bg="#E7EEF8" tone="#2B5CA8">Facebook</StatPill>}
          </div>
        )}
      </div>

      {/* Badges */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 14,
      }}>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 10 }}>
          Your badges
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {badges.map(b => (
            <div key={b.id} title={b.earned ? b.label : b.hint} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
            }}>
              <BadgeSeal id={b.id} Icon={b.Icon} earned={b.earned}/>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700, lineHeight: 1.15,
                color: b.earned ? C.navy : C.muted,
              }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect social → verification */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ padding: '13px 14px 2px' }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>
            Get verified
          </div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 2 }}>
            Link a social account and add a photo to earn your Verified Mom badge.
          </div>
        </div>
        <SocialRow Icon={Instagram} name="Instagram" handle={socialLinks.instagram} linked={igLinked} onConnect={connectInstagram}/>
        <SocialRow Icon={Facebook}  name="Facebook"  handle={socialLinks.facebook}  linked={fbLinked} onConnect={connectFacebook}/>
      </div>

      {/* Settings */}
      <div style={{
        marginTop: 12, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ borderTop: 'none' }}>
          <SettingsRow Icon={Heart} iconBg={C.coralSoft} iconFg={C.coralDeep}
            label="Interests & Preferences" sub="Update what matters to you" onClick={() => setSheet('prefs')}/>
        </div>
        <SettingsRow Icon={MapPin} iconBg={C.peach} iconFg={C.coralDeep}
          label="Location" sub={location ? `${cityLabel} · ${distance ?? 5} mi` : 'Set your neighborhood & radius'} onClick={() => setSheet('location')}/>
        <SettingsRow Icon={Baby} iconBg={C.lilac} iconFg="#5E4A8A"
          label="Kids" sub={kidsCount ? `${kidsCount} ${kidsCount === 1 ? 'kid' : 'kids'}` : 'Add your kids'} onClick={() => setSheet('kids')}/>
        <SettingsRow Icon={Bell} iconBg="#FFF4D6" iconFg="#8A6610"
          label="Notifications" sub="Manage your alerts" onClick={() => setSheet('notif')}/>
        <SettingsRow Icon={Lock} iconBg={C.sage} iconFg={C.sageDark}
          label="Privacy" sub="Control your data and privacy" onClick={() => setSheet('priv')}/>
      </div>

      {/* Refer a friend */}
      <button
        onClick={openPlans}
        style={{
          marginTop: 12, width: '100%', background: C.lilac, border: 'none', borderRadius: 16,
          padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 12, background: '#fff', color: '#5E4A8A',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Gift size={18}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800, color: C.navy }}>Refer a friend</div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.navySoft, marginTop: 3 }}>
            Invite a mom, get $10 in rewards
          </div>
        </div>
        <span style={{
          background: C.coralDeep, color: '#fff', fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
          padding: '6px 12px', borderRadius: 14, flexShrink: 0,
        }}>Invite Now</span>
      </button>

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
      <button onClick={restart} style={{
        marginTop: 8, width: '100%', background: 'transparent', border: 'none', padding: '6px 0',
        color: C.muted, fontFamily: 'Albert Sans', fontSize: 11, cursor: 'pointer',
      }}>
        ↺ Restart prototype tour
      </button>

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
        onSave={(next) => saveProfile({ settings: { ...(profile?.settings || {}), notifications: next } })}
        onClose={() => setSheet(null)}/>}

      {sheet === 'priv' && <ToggleSettingsSheet
        eyebrow="Your space" title="Privacy" accentWord="controls"
        items={PRIVACY_ITEMS}
        values={profile?.settings?.privacy || {}}
        onSave={(next) => saveProfile({ settings: { ...(profile?.settings || {}), privacy: next } })}
        onClose={() => setSheet(null)}/>}

      {sheet === 'location' && <LocationSheet
        location={location} locationGeo={locationGeo} distance={distance}
        onSave={saveLocation}
        onClose={() => setSheet(null)}/>}

      {sheet === 'kids' && <KidsSheet
        profile={profile}
        onSave={(patch) => saveProfile(patch)}
        onClose={() => setSheet(null)}/>}
    </div>
  );
};
