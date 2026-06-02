import { useRef, useState } from 'react';
import {
  MapPin, Lock, ShieldCheck, Star, MessageCircle, Calendar as CalendarIcon,
  Plus, X, Pencil, ChevronLeft, ChevronRight, Mail, Phone, LogOut,
  Instagram, Facebook, User as UserIcon, Users,
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
  profile, setProfile, account, prefs, location, distance,
  scheduled1to1 = {}, joinedEvents = [], goToMeetups,
  restart,
}) => {
  void prefs;
  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef(null);

  // ───── Verification state (Instagram + Facebook + real photo)
  // Stored under profile.verified so it survives across renders.
  const verified = profile.verified || { instagram: false, facebook: false, photo: false };
  const isFullyVerified = (verified.instagram || verified.facebook) && verified.photo;
  const toggleVerification = (key) => {
    setProfile(p => ({
      ...p,
      verified: { ...(p.verified || {}), [key]: !((p.verified || {})[key]) },
    }));
  };

  // ───── Upcoming items (folded from the old Calendar tab)
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

  // Persist a new photo order to mom_profiles. Best-effort — local state is
  // the source of truth; backend errors are swallowed.
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

  const contact = account?.email || account?.phone || null;

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4" style={{ scrollbarWidth:'none' }}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h1 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, color: C.ink, letterSpacing:'-.02em' }}>
            {account?.firstName ? `Hi, ${account.firstName}` : 'You'}
          </h1>
          {(account?.email || account?.phone) && (
            <div className="mt-0.5 flex flex-col gap-0.5">
              {account.email && (
                <div className="flex items-center gap-1.5 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                  <Mail size={11}/> {account.email}
                </div>
              )}
              {account.phone && (
                <div className="flex items-center gap-1.5 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
                  <Phone size={11}/> {account.phone}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setEditOpen(true)}
          aria-label="Edit profile"
          className="rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink }}>
          <Pencil size={14}/>
        </button>
      </div>

      {/* Photo gallery */}
      <div className="mb-4">
        <div className="text-[10.5px] tracking-[.16em] uppercase mb-2 flex items-baseline justify-between" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600 }}>
          <span>Photos · {photos.length}/{MAX_PHOTOS}</span>
          {photos.length > 1 && (
            <span className="text-[9.5px]" style={{ color: C.inkMuted, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              Tap ★ to set primary · ◀▶ to reorder
            </span>
          )}
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

                {/* Top-left: Primary chip OR Star (set-primary) button */}
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

                {/* Top-right: Remove */}
                <button onClick={() => removePhoto(i)} aria-label="Remove photo"
                  className="absolute top-1 right-1 rounded-full flex items-center justify-center"
                  style={{ width: 22, height: 22, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
                  <X size={12}/>
                </button>

                {/* Bottom: Reorder arrows — only when there's something to swap with */}
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

      {/* Hero card */}
      <div className="rounded-[22px] p-5 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#E8B4A0,#C8553D)', color:'#fff' }}>
        <Sprig style={{ position:'absolute', width: 60, top: 8, right: 8, opacity: .4 }} color="#fff"/>
        <div className="text-[10.5px] tracking-[.18em] uppercase opacity-80" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>You · preview mode</div>
        <div className="mt-1" style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500 }}>
          {momTypeLabel}
        </div>
        <div className="mt-0.5 text-[12.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
          Kids: {kidsLabel}
        </div>
        {location && (
          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] opacity-90" style={{ fontFamily:'Albert Sans' }}>
            <MapPin size={11}/> {location}{distanceLabel ? ` · ${distanceLabel}` : ''}
          </div>
        )}
        <div className="mt-1 text-[12px] opacity-85" style={{ fontFamily:'Albert Sans' }}>
          {profile.values.slice(0,3).join(' · ') || 'Set your values'}
        </div>
        {!account && (
          <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.92 }}>
            <Lock size={11}/> Sign up to save · keep using free
          </div>
        )}
      </div>

      {/* Verification — ported from GoMama prototype.
          (Instagram OR Facebook) + real photo ⇒ "Verified mom". */}
      <div className="mb-4">
        <div className="text-[10.5px] tracking-[.16em] uppercase mb-2 flex items-baseline justify-between" style={{
          color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:600,
        }}>
          <span>Verify your profile</span>
          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{
            background: isFullyVerified ? '#DFF5E5' : '#FFF4D6',
            color: isFullyVerified ? '#2A7A48' : '#B8852A',
            fontFamily:'Albert Sans', fontWeight:700, letterSpacing:'.04em',
            textTransform: 'none',
          }}>
            {isFullyVerified ? '✓ Verified mom' : '⏳ Pending'}
          </span>
        </div>
        <div className="rounded-[18px] p-3.5" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
          <div className="text-[11.5px] mb-2.5" style={{ fontFamily:'Albert Sans', color: C.inkMuted, lineHeight: 1.4 }}>
            Connect a social account + add a real photo. Keeps the space safe for moms.
          </div>
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

      {/* Upcoming — folded from the old Calendar tab */}
      <div className="mb-4">
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

      {/* Bio */}
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

      <div className="rounded-[18px] divide-y" style={{ background: C.paper, border:`1px solid ${C.divider}`, borderColor: C.divider }}>
        {[
          { l:'Verified · phone & social media', tag:'Plus', icon: ShieldCheck },
          { l:'Full profile in groups',    tag:'Plus', icon: Star },
          { l:'Unlimited messages',        tag:'Plus', icon: MessageCircle },
          { l:'Calendar & places',         tag:'Free', icon: CalendarIcon },
        ].map((r,i)=>(
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <r.icon size={16} style={{ color: C.ink }}/>
            <div className="flex-1 text-[13.5px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>{r.l}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: r.tag==='Plus' ? C.ink : C.creamSoft,
              color: r.tag==='Plus' ? C.saffron : C.inkSoft,
              fontFamily:'Albert Sans', fontWeight:600, letterSpacing:'.06em'
            }}>{r.tag.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* Sign out — only shown when signed in */}
      {account && (
        <button onClick={handleSignOut}
          className="mt-4 w-full rounded-2xl flex items-center justify-center gap-2 py-3"
          style={{
            background: C.paper, border: `1px solid ${C.divider}`, color: C.terracotta,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13.5,
          }}>
          <LogOut size={14}/> Sign out
        </button>
      )}

      <button onClick={restart} className="mt-3 w-full text-[12px] py-2" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
        ↺ Restart prototype tour
      </button>

      {/* Suppress lint for unused contact var — used implicitly in render guards above */}
      <span style={{ display: 'none' }}>{contact}</span>

      {editOpen && <EditProfileSheet profile={profile} setProfile={setProfile} onClose={() => setEditOpen(false)}/>}
    </div>
  );
};
