import { useRef, useState } from 'react';
import {
  MapPin, Lock, ShieldCheck, Star, Calendar as CalendarIcon,
  Plus, X, Pencil, ChevronLeft, ChevronRight, Mail, Phone, LogOut,
  Instagram, Facebook, User as UserIcon, Users, Bookmark, Sparkles,
  SlidersHorizontal,
  ChevronRight as ChevronRightSm,
} from 'lucide-react';
import { C } from '../../theme';
import { Sprig } from '../../components/icons/Sprig';
import { MOM_TYPES } from '../../data/taxonomy';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS } from '../../data/events';
import { EditProfileSheet } from '../../sheets/EditProfileSheet';
import { signOut as signOutSession, updateMomProfile } from '../../lib/onboarding';

const MAX_PHOTOS = 6;

export const YouTab = ({
  profile, setProfile, account, prefs,
  location, setLocation, distance, setDistance,
  scheduled1to1 = {}, joinedEvents = [], goToMeetups,
  openPlans, openPremium, savedCount = 0,
  restart,
}) => {
  void prefs;
  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Verification: (Instagram OR Facebook) + real photo ⇒ Verified mom.
  const verified = profile.verified || { instagram: false, facebook: false, photo: false };
  const isFullyVerified = (verified.instagram || verified.facebook) && verified.photo;
  const verifiedCount = ['instagram','facebook','photo'].filter(k => verified[k]).length;
  const toggleVerification = (key) => {
    setProfile(p => ({
      ...p,
      verified: { ...(p.verified || {}), [key]: !((p.verified || {})[key]) },
    }));
  };

  // Upcoming items (folded from the old Calendar tab)
  const upcoming1to1 = Object.entries(scheduled1to1 || {}).map(([momId, slot]) => {
    const mom = SAMPLE_MOMS.find(m => String(m.id) === String(momId));
    return mom ? { kind: '1to1', mom, slot } : null;
  }).filter(Boolean);
  const upcomingGroups = (joinedEvents || []).map(id =>
    SUGGESTED_EVENTS.find(e => e.id === id)
  ).filter(Boolean);
  const totalUpcoming = upcoming1to1.length + upcomingGroups.length;

  const photos = profile.photos || [];
  const canAddPhoto = photos.length < MAX_PHOTOS;
  const primaryPhoto = photos[0];

  const momTypeLabel = profile.momTypes
    .filter(id => id !== 'prefer_not')
    .map(id => MOM_TYPES.find(m=>m.id===id)?.label)
    .filter(Boolean)
    .slice(0,2)
    .join(' & ') || 'Mom';

  const kidsLabel = Object.entries(profile.kidsAges || {})
    .map(([age, count]) => `${count} × ${age}`)
    .join(', ') || '—';

  const distanceLabel = distance === 'any' ? 'anywhere' : distance ? `within ${distance} mi` : '';

  const persistPhotos = (next) => {
    updateMomProfile({ photos: next }).catch(() => { /* swallow */ });
  };

  const handlePhotoPick = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl !== 'string') return;
      const next = [...(profile.photos || []), dataUrl].slice(0, MAX_PHOTOS);
      setProfile(p => ({ ...p, photos: next }));
      persistPhotos(next);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (idx) => {
    const next = (profile.photos || []).filter((_, i) => i !== idx);
    setProfile(p => ({ ...p, photos: next }));
    persistPhotos(next);
  };

  const setPrimary = (idx) => {
    if (idx === 0) return;
    const arr = [...photos];
    const [pulled] = arr.splice(idx, 1);
    arr.unshift(pulled);
    setProfile(p => ({ ...p, photos: arr }));
    persistPhotos(arr);
  };

  const movePhoto = (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= photos.length) return;
    const arr = [...photos];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setProfile(p => ({ ...p, photos: arr }));
    persistPhotos(arr);
  };

  const handleSignOut = async () => {
    try {
      await signOutSession();
    } catch {
      /* swallow — restart() clears local state anyway */
    }
    restart();
  };

  const isPremium = !!account?.isPremium;

  const verificationHeader = isFullyVerified
    ? 'Verification'
    : verifiedCount > 0
    ? `Finish setup · ${verifiedCount}/3`
    : 'Verify your profile';

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-1 pb-4" style={{ scrollbarWidth:'none' }}>
      {/* ───── Header */}
      <div className="mb-3 flex items-baseline justify-between">
        <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 24, color: C.ink, letterSpacing:'-.02em' }}>
          {account?.firstName ? `Hi, ${account.firstName}` : 'You'}
        </h1>
        <button onClick={() => setEditOpen(true)}
          aria-label="Edit profile"
          className="rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink }}>
          <Pencil size={14}/>
        </button>
      </div>

      {/* ───── ZONE 1: Identity — how other moms see you */}
      <div className="rounded-[22px] p-5 mb-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#E8B4A0,#C8553D)', color:'#fff' }}>
        <Sprig style={{ position:'absolute', width: 60, top: 8, right: 8, opacity: .35 }} color="#fff"/>

        <div className="text-[10.5px] tracking-[.18em] uppercase opacity-85" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>
          How other moms see you
        </div>

        <div className="mt-3 flex items-center gap-3">
          {primaryPhoto ? (
            <img src={primaryPhoto} alt="" className="rounded-2xl object-cover flex-shrink-0"
              style={{ width: 56, height: 56, border: '2px solid rgba(255,255,255,.6)' }}/>
          ) : (
            <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ width: 56, height: 56, background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.4)' }}>
              <UserIcon size={22} color="#fff"/>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily:'Fraunces', fontSize: 20, fontWeight:500, lineHeight: 1.1 }}>
              {momTypeLabel}
            </div>
            <div className="mt-1 text-[12px] opacity-90 truncate" style={{ fontFamily:'Albert Sans' }}>
              Kids: {kidsLabel}
            </div>
          </div>
        </div>

        {location && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
            <MapPin size={11}/> {location}{distanceLabel ? ` · ${distanceLabel}` : ''}
          </div>
        )}
        {profile.values && profile.values.length > 0 && (
          <div className="mt-1 text-[12px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
            {profile.values.slice(0,3).join(' · ')}
          </div>
        )}

        {/* Inline verification status — single source of truth */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{
          background: isFullyVerified ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.18)',
          color: isFullyVerified ? C.sageDark : '#fff',
        }}>
          <ShieldCheck size={12}/>
          <span className="text-[11px]" style={{ fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.02em' }}>
            {isFullyVerified ? 'Verified mom' : `${verifiedCount}/3 verified`}
          </span>
        </div>

        {!account && (
          <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.92 }}>
            <Lock size={11}/> Sign up to save · keep using free
          </div>
        )}
      </div>

      {/* Primary CTA — opens the same sheet as the pencil icon, but labeled. */}
      <button
        onClick={() => setEditOpen(true)}
        className="mb-4 w-full rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[.98]"
        style={{
          padding: '12px 20px',
          background: `linear-gradient(90deg, ${C.coral}, ${C.coralDeep})`,
          color: '#fff',
          fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 700,
          letterSpacing: '.01em',
          boxShadow: '0 8px 18px -8px rgba(214,68,106,.55)',
          border: 'none',
        }}
      >
        <SlidersHorizontal size={15}/>
        Update my preferences
      </button>

      {/* Bio — moved up next to the identity card */}
      {profile.bio && (
        <div className="mb-4 rounded-[18px] p-4" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
          <div className="text-[10.5px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
            Bio
          </div>
          <div className="text-[13px]" style={{ fontFamily:'Albert Sans', color: C.ink, lineHeight: 1.45 }}>
            {profile.bio}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="mb-4">
        <div className="text-[10.5px] tracking-[.16em] uppercase mb-2" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
          Photos · {photos.length}/{MAX_PHOTOS}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => {
            const isPrimary = i === 0;
            const isFirst = i === 0;
            const isLast = i === photos.length - 1;
            return (
              <div key={`${src.slice(0, 24)}-${i}`} className="relative rounded-[14px] overflow-hidden"
                style={{
                  aspectRatio: '1 / 1', background: C.paper,
                  border: isPrimary ? `2px solid ${C.sageDark}` : '1px solid transparent',
                }}>
                <img src={src} alt={`You ${i + 1}`} className="w-full h-full object-cover"/>

                {isPrimary ? (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md flex items-center gap-0.5" style={{
                    background: C.sageDark, color: '#fff',
                    fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                  }}>
                    <Star size={9} fill="currentColor"/> PRIMARY
                  </div>
                ) : (
                  <button onClick={() => setPrimary(i)} aria-label="Set as primary photo"
                    className="absolute top-1 left-1 rounded-full flex items-center justify-center"
                    style={{ width: 22, height: 22, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
                    <Star size={12}/>
                  </button>
                )}

                <button onClick={() => removePhoto(i)} aria-label="Remove photo"
                  className="absolute top-1 right-1 rounded-full flex items-center justify-center"
                  style={{ width: 22, height: 22, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
                  <X size={12}/>
                </button>

                {photos.length > 1 && (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                    <button onClick={() => movePhoto(i, -1)} disabled={isFirst} aria-label="Move earlier"
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: 22, height: 22,
                        background: isFirst ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.55)',
                        color: '#fff',
                        opacity: isFirst ? 0.4 : 1,
                        cursor: isFirst ? 'default' : 'pointer',
                      }}>
                      <ChevronLeft size={12}/>
                    </button>
                    <button onClick={() => movePhoto(i, 1)} disabled={isLast} aria-label="Move later"
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: 22, height: 22,
                        background: isLast ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.55)',
                        color: '#fff',
                        opacity: isLast ? 0.4 : 1,
                        cursor: isLast ? 'default' : 'pointer',
                      }}>
                      <ChevronRight size={12}/>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {canAddPhoto && (
            <button onClick={() => fileInputRef.current?.click()}
              className="rounded-[14px] flex flex-col items-center justify-center"
              style={{
                aspectRatio: '1 / 1',
                background: C.paper,
                border: `1px dashed ${C.divider}`,
                color: C.inkMuted,
              }}>
              <Plus size={20}/>
              <span className="text-[10.5px] mt-1" style={{ fontFamily:'Albert Sans', fontWeight: 500 }}>Add photo</span>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoPick} style={{ display: 'none' }}/>
      </div>

      {/* Verification rows — action only, no duplicate status chip */}
      <div className="mb-4">
        <div className="text-[10.5px] tracking-[.16em] uppercase mb-2" style={{
          color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600,
        }}>
          {verificationHeader}
        </div>
        <div className="rounded-[18px] p-3.5" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
          {!isFullyVerified && (
            <div className="text-[11.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, lineHeight: 1.4 }}>
              Connect a social account + add a real photo. Keeps the space safe for moms.
            </div>
          )}
          {[
            { key:'instagram', label:'Connect Instagram', icon: Instagram, brand:'#E4405F' },
            { key:'facebook',  label:'Connect Facebook',  icon: Facebook,  brand:'#1877F2' },
            { key:'photo',     label:'Add a real photo',  icon: UserIcon,  brand: C.coralDeep },
          ].map(row => {
            const on = !!verified[row.key];
            return (
              <button key={row.key} onClick={() => toggleVerification(row.key)}
                className="w-full mt-1.5 first:mt-0 rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition-all active:scale-[.99]"
                style={{
                  background: on ? C.sage : C.paper,
                  border: `1.3px solid ${on ? '#5E7A3B' : C.line}`,
                }}>
                <row.icon size={16} style={{ color: on ? '#5E7A3B' : row.brand }}/>
                <span className="flex-1 text-left text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:600, color: C.navy }}>
                  {row.label}
                </span>
                <span style={{ color: on ? '#5E7A3B' : C.muted, fontWeight: 700 }}>
                  {on ? '✓' : '›'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ───── ZONE 2: Activity */}
      <div className="mb-3">
        <div className="text-[10.5px] tracking-[.16em] uppercase mb-2 flex items-baseline justify-between" style={{
          color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600,
        }}>
          <span>Upcoming</span>
          <span className="text-[10px]" style={{ color: C.inkMuted, fontWeight:500, textTransform:'none', letterSpacing:0 }}>
            {totalUpcoming === 0 ? 'Nothing on the calendar' : `${totalUpcoming} ${totalUpcoming === 1 ? 'meetup' : 'meetups'}`}
          </span>
        </div>
        {totalUpcoming === 0 ? (
          <button onClick={goToMeetups}
            className="w-full rounded-[18px] p-4 flex items-center justify-between transition-all active:scale-[.99]"
            style={{ background: C.coralSoft, border: `1px dashed ${C.coral}` }}>
            <div className="text-left">
              <div className="text-[13px]" style={{ fontFamily:'Albert Sans', fontWeight:700, color: C.coralDeep }}>
                Schedule your first meetup
              </div>
              <div className="text-[11px] mt-0.5" style={{ fontFamily:'Albert Sans', color: C.coralDeep, opacity:.75 }}>
                Browse Meetups for moms + groups near you
              </div>
            </div>
            <ChevronRightSm size={16} color={C.coralDeep}/>
          </button>
        ) : (
          <div className="rounded-[18px] overflow-hidden" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
            {upcoming1to1.map(({ mom, slot }, i) => (
              <div key={`m-${mom.id}`}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.divider}` }}>
                <div className="rounded-xl flex-shrink-0 overflow-hidden" style={{ width: 36, height: 36, background: C.coral }}>
                  {mom.photo && <img src={mom.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:700, color: C.navy }}>
                    1:1 with {mom.name.split(' ')[0]}
                  </div>
                  <div className="text-[10.5px] mt-0.5 truncate" style={{ fontFamily:'Albert Sans', color: C.muted }}>
                    {slot.day} · {slot.time}{slot.place ? ` · ${slot.place}` : ''}
                  </div>
                </div>
                <CalendarIcon size={14} color={C.coralDeep}/>
              </div>
            ))}
            {upcomingGroups.map((ev, i) => (
              <div key={`e-${ev.id}`}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderTop: (upcoming1to1.length === 0 && i === 0) ? 'none' : `1px solid ${C.divider}` }}>
                <div className="rounded-xl flex-shrink-0 overflow-hidden" style={{ width: 36, height: 36, background: C.sage }}>
                  {ev.photo && <img src={ev.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] truncate" style={{ fontFamily:'Albert Sans', fontWeight:700, color: C.navy }}>
                    {ev.name}
                  </div>
                  <div className="text-[10.5px] mt-0.5 truncate" style={{ fontFamily:'Albert Sans', color: C.muted }}>
                    {ev.day} · {ev.time} · {ev.place}
                  </div>
                </div>
                <Users size={14} color="#5E7A3B"/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Plans — saved-content navigation, moved down from the top */}
      <button
        onClick={openPlans}
        className="mb-5 w-full rounded-2xl flex items-center gap-3 px-3 py-3 transition-all active:scale-[.99]"
        style={{ background: C.paper, border: `1px solid ${C.divider}` }}
      >
        <div className="rounded-full flex items-center justify-center" style={{
          width: 30, height: 30, background: C.coralSoft,
        }}>
          <Bookmark size={14} color={C.coralDeep} fill={savedCount > 0 ? C.coralDeep : 'none'}/>
        </div>
        <div className="flex-1 text-left">
          <div style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13, color: C.navy }}>
            My Plans
          </div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 1 }}>
            {savedCount === 0 ? 'Nothing saved yet' : `${savedCount} saved across the app`}
          </div>
        </div>
        <ChevronRightSm size={16} color={C.muted}/>
      </button>

      {/* ───── ZONE 3: Account */}
      <div className="text-[10.5px] tracking-[.16em] uppercase mb-2" style={{
        color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600,
      }}>
        Account
      </div>

      {/* Plan row — saffron CTA for free, quiet badge for Plus */}
      {isPremium ? (
        <div className="mb-2 rounded-2xl flex items-center gap-3 px-3 py-3"
          style={{ background: C.ink, border: `1px solid ${C.ink}` }}>
          <div className="rounded-full flex items-center justify-center" style={{
            width: 30, height: 30, background: 'rgba(217,164,65,.18)',
          }}>
            <Sparkles size={14} color={C.saffron}/>
          </div>
          <div className="flex-1 text-left">
            <div style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13, color: C.saffron }}>
              Go Mama Plus
            </div>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: '#fff', opacity: .7, marginTop: 1 }}>
              Unlimited messages · full profiles · group DMs
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={openPremium}
          className="mb-2 w-full rounded-2xl flex items-center gap-3 px-3 py-3 transition-all active:scale-[.99]"
          style={{
            background: `linear-gradient(135deg, ${C.ink}, #2A3A66)`,
            border: `1px solid ${C.ink}`,
          }}
        >
          <div className="rounded-full flex items-center justify-center" style={{
            width: 30, height: 30, background: 'rgba(217,164,65,.22)',
          }}>
            <Sparkles size={14} color={C.saffron}/>
          </div>
          <div className="flex-1 text-left">
            <div style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13, color: C.saffron }}>
              Try Go Mama Plus
            </div>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: '#fff', opacity: .8, marginTop: 1 }}>
              7-day free trial · unlimited messages + full profiles
            </div>
          </div>
          <ChevronRightSm size={16} color={C.saffron}/>
        </button>
      )}

      {/* Contact info — moved here from header; these are settings, not headline */}
      {(account?.email || account?.phone) && (
        <div className="mb-2 rounded-2xl px-3 py-3" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
          {account.email && (
            <div className="flex items-center gap-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>
              <Mail size={13} color={C.inkMuted}/> {account.email}
            </div>
          )}
          {account.phone && (
            <div className="flex items-center gap-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.ink, marginTop: account.email ? 6 : 0 }}>
              <Phone size={13} color={C.inkMuted}/> {account.phone}
            </div>
          )}
        </div>
      )}

      {/* Sign out — only shown when signed in */}
      {account && (
        <button onClick={handleSignOut}
          className="w-full rounded-2xl flex items-center justify-center gap-2 py-3"
          style={{
            background: C.paper, border: `1px solid ${C.divider}`, color: C.terracotta,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13.5,
          }}>
          <LogOut size={14}/> Sign out
        </button>
      )}

      <button onClick={restart} className="mt-3 w-full text-[11.5px] py-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
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
