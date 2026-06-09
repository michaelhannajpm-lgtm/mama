import { useState } from 'react';
import {
  MapPin, Heart, Calendar, Users, Star, ChevronRight, Pencil,
  Bell, Lock, HelpCircle, Info, Gift, User as UserIcon,
  LogOut,
} from 'lucide-react';
import { C } from '../../theme';
import { EditProfileSheet } from '../../sheets/EditProfileSheet';
import { signOut as signOutSession } from '../../lib/onboarding';

// ==========================================================================
// YouTab — V5 "My Profile" surface.
//
//   • User card: round avatar + name + meta + "Edit profile" link
//   • 4 quick stats: Saved · My Events · My Connections · Reviews
//   • "My Family" — kid mini-cards on blush background
//   • Settings list: Interests & Preferences · Notifications · Privacy ·
//     Help & Support · About Go Mama
//   • Coral "Refer a friend" CTA card at the bottom
// ==========================================================================

const KIDS_FALLBACK = [
  {
    id: 'k1', name: 'Emma', age: '3 yrs 2 mos', tag: 'Toddler',
    tagBg: C.coralSoft, tagFg: C.coralDeep,
    photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=160&auto=format&fit=crop',
  },
  {
    id: 'k2', name: 'Liam', age: '18 mos', tag: 'Baby',
    tagBg: '#FFF4D6', tagFg: '#8A6610',
    photo: 'https://images.unsplash.com/photo-1490725263030-1f0521cec8ec?w=160&auto=format&fit=crop',
  },
];

const SETTINGS_ROWS = [
  { id: 'prefs',  label: 'Interests & Preferences', sub: 'Update what matters to you',         icon: Heart,       iconBg: C.coralSoft, iconFg: C.coralDeep },
  { id: 'notif',  label: 'Notifications',           sub: 'Manage your alerts',                icon: Bell,        iconBg: '#FFF4D6',   iconFg: '#8A6610'   },
  { id: 'priv',   label: 'Privacy',                 sub: 'Control your data and privacy',     icon: Lock,        iconBg: C.sage,      iconFg: C.sageDark  },
  { id: 'help',   label: 'Help & Support',          sub: 'Get help or contact support',       icon: HelpCircle,  iconBg: C.lilac,     iconFg: '#5E4A8A'   },
  { id: 'about',  label: 'About GoMama',            sub: 'Learn more about us',               icon: Info,        iconBg: C.coralSoft, iconFg: C.coralDeep },
];

// -------------------------- shared --------------------------

const StatTile = ({ Icon, value, label, fg, bg }) => (
  <div style={{
    flex: 1,
    background: '#fff', border: `1px solid ${C.line}`,
    borderRadius: 12,
    padding: '10px 6px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 3,
  }}>
    <div style={{
      width: 26, height: 26, borderRadius: 13,
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={13}/>
    </div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
      color: C.navy, marginTop: 1, lineHeight: 1.1,
    }}>
      {label}
    </div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
      color: C.muted,
    }}>
      {value}
    </div>
  </div>
);

const KidCard = ({ kid }) => (
  <div style={{
    flex: 1, minWidth: 0,
    background: '#fff', border: `1px solid ${C.line}`,
    borderRadius: 12,
    padding: '10px 10px',
    display: 'flex', alignItems: 'center', gap: 9,
  }}>
    <img src={kid.photo} alt="" style={{
      width: 38, height: 38, borderRadius: 19, objectFit: 'cover',
      flexShrink: 0,
    }}/>
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
        color: C.navy, lineHeight: 1.1,
      }}>
        {kid.name}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted,
        marginTop: 2,
      }}>
        {kid.age}
      </div>
      <div style={{
        marginTop: 4, display: 'inline-block',
        background: kid.tagBg, color: kid.tagFg,
        fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 700,
        padding: '1.5px 5px', borderRadius: 4,
      }}>
        {kid.tag}
      </div>
    </div>
  </div>
);

const SettingsRow = ({ Icon, iconBg, iconFg, label, sub, onClick }) => (
  <button
    onClick={onClick}
    className="active:scale-[.99] transition-transform"
    style={{
      width: '100%',
      background: '#fff', border: 'none',
      padding: '12px 6px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderTop: `1px solid ${C.line}`,
      cursor: 'pointer', textAlign: 'left',
    }}
  >
    <div style={{
      width: 30, height: 30, borderRadius: 9,
      background: iconBg, color: iconFg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={14}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
        color: C.navy, lineHeight: 1.15,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, color: C.muted,
        marginTop: 1,
      }}>
        {sub}
      </div>
    </div>
    <ChevronRight size={14} color={C.muted}/>
  </button>
);

// -------------------------- screen --------------------------

const SETTINGS_FLASH = {
  prefs: 'Preferences editor coming soon',
  notif: 'Notification settings coming soon',
  priv:  'Privacy controls coming soon',
  help:  'Help center coming soon',
  about: 'Go Mama · v0.1 prototype',
};

export const YouTab = ({
  profile, setProfile, account, prefs,
  location, setLocation, distance, setDistance,
  scheduled1to1 = {}, joinedEvents = [], goToMeetups,
  openPlans, openPremium, savedCount = 0,
  restart, flash,
}) => {
  void prefs; void goToMeetups; void openPremium;

  const [editOpen, setEditOpen] = useState(false);

  const fullName = account?.firstName
    ? `${account.firstName}${account.lastName ? ' ' + account.lastName : ''}`
    : 'Jessica Martin';

  const kidsCount = Object.values(profile?.kidsAges || {}).reduce((s, n) => s + n, 0)
    || KIDS_FALLBACK.length;
  const cityLabel = location ? location.split(',')[0] + ', FL' : 'Tampa, FL';

  const eventsCount = (joinedEvents?.length || 0) + Object.keys(scheduled1to1 || {}).length;
  const reviewsCount = 3;
  const connectionsCount = 12;
  const kids = KIDS_FALLBACK; // visual fallback — onboarding only captures counts/buckets

  const primaryPhoto = profile?.photos?.[0];

  const handleSignOut = async () => {
    try { await signOutSession(); } catch { /* swallow */ }
    restart?.();
  };

  return (
    <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingBottom: 20 }}>
      {/* User card */}
      <div style={{
        background: '#fff', border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {primaryPhoto ? (
            <img src={primaryPhoto} alt="" style={{
              width: 64, height: 64, borderRadius: 32, objectFit: 'cover',
            }}/>
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              background: C.coralSoft, color: C.coralDeep,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserIcon size={28}/>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700,
            color: C.navy, letterSpacing: '-.01em', lineHeight: 1.1,
          }}>
            {fullName}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
            marginTop: 4,
          }}>
            Mom of {kidsCount} · <MapPin size={11} color={C.muted}/> {cityLabel}
          </div>
          <button
            onClick={() => setEditOpen(true)}
            style={{
              marginTop: 6,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', padding: 0,
              color: C.coralDeep,
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Pencil size={11}/> Edit profile
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <StatTile Icon={Heart}    value={savedCount}      label="Saved"          bg={C.coralSoft} fg={C.coralDeep}/>
        <StatTile Icon={Calendar} value={eventsCount}     label="My Events"      bg={C.lilac}     fg="#5E4A8A"/>
        <StatTile Icon={Users}    value={connectionsCount} label="My Connections" bg={C.sage}     fg={C.sageDark}/>
        <StatTile Icon={Star}     value={reviewsCount}    label="Reviews"        bg="#FFF4D6"     fg="#8A6610"/>
      </div>

      {/* My Family */}
      <div style={{
        background: C.coralSoft, borderRadius: 16,
        padding: '12px 14px', marginTop: 12,
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'Fraunces', fontSize: 14, fontWeight: 700,
            color: C.navy, letterSpacing: '-.01em',
          }}>
            <Users size={13} color={C.coralDeep}/>
            My Family
          </div>
          <button
            onClick={() => setEditOpen(true)}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: C.coralDeep,
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {kids.map(k => <KidCard key={k.id} kid={k}/>)}
        </div>
      </div>

      {/* Settings list */}
      <div style={{
        marginTop: 14,
        background: '#fff', border: `1px solid ${C.line}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {SETTINGS_ROWS.map((row, i) => (
          <div key={row.id} style={{ borderTop: i === 0 ? 'none' : undefined }}>
            <SettingsRow
              Icon={row.icon}
              iconBg={row.iconBg}
              iconFg={row.iconFg}
              label={row.label}
              sub={row.sub}
              onClick={() => flash?.(SETTINGS_FLASH[row.id])}
            />
          </div>
        ))}
      </div>

      {/* Refer a friend */}
      <button
        onClick={openPlans}
        style={{
          marginTop: 14, width: '100%',
          background: C.lilac, border: 'none',
          borderRadius: 16,
          padding: '14px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: '#fff', color: '#5E4A8A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Gift size={18}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800,
            color: C.navy, lineHeight: 1.1,
          }}>
            Refer a friend
          </div>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 10.5, color: C.navySoft,
            marginTop: 3,
          }}>
            Invite a mom, get $10 in rewards
          </div>
        </div>
        <span style={{
          background: C.coralDeep, color: '#fff',
          fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 800,
          padding: '6px 12px', borderRadius: 14,
          flexShrink: 0,
        }}>
          Invite Now
        </span>
      </button>

      {/* Sign out + restart */}
      {account && (
        <button onClick={handleSignOut}
          style={{
            marginTop: 12, width: '100%',
            background: '#fff', border: `1px solid ${C.line}`,
            borderRadius: 16,
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: C.coralDeep,
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          <LogOut size={13}/> Sign out
        </button>
      )}
      <button onClick={restart}
        style={{
          marginTop: 8, width: '100%',
          background: 'transparent', border: 'none',
          padding: '6px 0',
          color: C.muted,
          fontFamily: 'Albert Sans', fontSize: 11,
          cursor: 'pointer',
        }}
      >
        ↺ Restart prototype tour
      </button>

      {editOpen && <EditProfileSheet
        profile={profile} setProfile={setProfile}
        location={location} setLocation={setLocation}
        distance={distance} setDistance={setDistance}
        onClose={() => setEditOpen(false)}/>}
    </div>
  );
};
