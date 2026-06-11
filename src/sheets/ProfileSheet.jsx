import { ShieldCheck, Heart, Quote, Users, Lock, Crown } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { PresencePill } from '../components/PresenceDot';
import { TIME_WINDOWS } from '../data/taxonomy';

export const ProfileSheet = ({ mom, profile, isPremium, onClose, openPremium, plusPrice = 7.99, plusTrialDays = 7 }) => {
  // Compute shared ground (works for both partial and full)
  const sharedValues = (mom.values || []).filter(v => (profile?.values || []).includes(v));
  const sharedInterests = (mom.interests || []).filter(i => (profile?.interests || []).includes(i));
  const sharedCount = sharedValues.length + sharedInterests.length;

  // Partial view obscures last name → "Sara K."
  const displayName = isPremium ? mom.name : `${mom.name.split(' ')[0]} ${mom.name.split(' ')[1]?.[0] || ''}.`;
  // Partial obscures specific kid ages — broaden them
  const broadKids = (() => {
    const parts = (mom.kids || '').split(' · ');
    const broaden = (k) => {
      const num = parseInt(k.trim().replace('y',''), 10);
      if (isNaN(num)) return k;
      if (num <= 1) return 'baby';
      if (num <= 3) return 'toddler';
      if (num <= 5) return 'preschool';
      if (num <= 12) return 'school-age';
      return 'teen';
    };
    return parts.map(broaden).join(' & ');
  })();

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6">
        {/* Hero card with photo */}
        <div className="rounded-[20px] overflow-hidden relative" style={{
          backgroundImage: mom.photo ? `url('${mom.photo}')` : undefined,
          background: mom.photo ? undefined : mom.hue,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color:'#fff',
          minHeight: 220,
        }}>
          {/* Legibility overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 65%, rgba(0,0,0,.7) 100%)',
          }}/>
          {/* Content */}
          <div className="relative p-5 flex flex-col justify-end" style={{ minHeight: 220 }}>
            <div className="text-[10.5px] tracking-[.18em] uppercase opacity-90" style={{ fontFamily:'Albert Sans', fontWeight:600 }}>
              {isPremium ? 'Profile · full' : 'Profile · partial'}
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <div style={{ fontFamily:'Fraunces', fontSize: 32, fontWeight:500, letterSpacing:'-.02em' }}>{displayName}</div>
              {mom.verified && <ShieldCheck size={16} style={{ opacity:.95 }}/>}
            </div>
            <div className="text-[12.5px] mt-0.5 opacity-90" style={{ fontFamily:'Albert Sans' }}>
              {mom.type} · Kids {isPremium ? mom.kids : broadKids} · {mom.distance}
            </div>
            {mom.presence && <div className="mt-1.5"><PresencePill status={mom.presence} color="#fff"/></div>}
          </div>
        </div>

        {/* Shared ground — always free, this is the hook */}
        {sharedCount > 0 && (
          <div className="mt-4 rounded-[16px] p-3.5" style={{ background: `${C.terracotta}10`, border:`1px solid ${C.terracotta}33` }}>
            <div className="text-[10px] tracking-[.16em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:700 }}>
              <Heart size={10} fill={C.terracotta}/> You both share · {sharedCount}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sharedValues.map(v => (
                <span key={v} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: C.terracotta, color:'#fff', fontFamily:'Albert Sans', fontWeight:600 }}>
                  {v}
                </span>
              ))}
              {sharedInterests.map(it => (
                <span key={it} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: `${C.sageDark}`, color:'#fff', fontFamily:'Albert Sans', fontWeight:600 }}>
                  {it}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Partial values/interests — show 2 of each only */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
              VALUES
            </div>
            {!isPremium && mom.values.length > 2 && (
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                +{mom.values.length - 2} more in Plus
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(isPremium ? mom.values : mom.values.slice(0, 2)).map(v => (
              <span key={v} className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans' }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
              INTERESTS
            </div>
            {!isPremium && mom.interests.length > 2 && (
              <div className="text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                +{mom.interests.length - 2} more in Plus
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(isPremium ? mom.interests : mom.interests.slice(0, 2)).map(v => (
              <span key={v} className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: C.paper, border:`1px solid ${C.divider}`, color: C.ink, fontFamily:'Albert Sans' }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Premium-only sections — bio, social proof, all slots */}
        {isPremium ? (
          <>
            {mom.bio && (
              <div className="mt-4 rounded-[16px] p-4" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
                <Quote size={14} style={{ color: C.terracotta }}/>
                <div className="mt-1 text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:400, color: C.ink, fontStyle:'italic', lineHeight:1.45 }}>
                  {mom.bio}
                </div>
              </div>
            )}
            {mom.freeSlots && (
              <div className="mt-4">
                <div className="text-[11.5px] mb-2" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
                  FREE TIMES
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mom.freeSlots.map(s => {
                    const [day, ...winParts] = s.split('-');
                    const win = TIME_WINDOWS.find(w => w.id === winParts.join('-'));
                    return (
                      <span key={s} className="text-[11px] px-2 py-1 rounded-md" style={{ background: `${C.saffron}25`, color: C.ink, fontFamily:'Albert Sans', fontWeight:600 }}>
                        {day} · {win ? win.label : winParts.join('-')}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 rounded-[16px] p-3 flex items-center gap-2.5" style={{ background: `${C.sageDark}10`, border:`1px solid ${C.sageDark}33` }}>
              <Users size={14} style={{ color: C.sageDark }}/>
              <div className="text-[12px]" style={{ fontFamily:'Albert Sans', color: C.ink }}>
                Met up with <strong style={{ color: C.sageDark }}>7 moms</strong> this month · super active
              </div>
            </div>
          </>
        ) : (
          /* Locked premium preview — blurred teaser */
          <div className="mt-5 rounded-[16px] overflow-hidden relative" style={{ background: C.creamSoft, border:`1px solid ${C.divider}` }}>
            {/* Blurred fake content underneath */}
            <div className="p-4" style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
              <Quote size={14} style={{ color: C.terracotta }}/>
              <div className="mt-1 text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:400, color: C.ink, fontStyle:'italic', lineHeight:1.45 }}>
                {mom.bio || 'Looking for a slow morning kind of friend who gets that some days are just survival mode...'}
              </div>
              <div className="mt-3 text-[11.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, fontWeight:600, letterSpacing:'.04em' }}>
                FREE TIMES
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <span className="text-[11px] px-2 py-1 rounded-md" style={{ background: `${C.saffron}25`, color: C.ink }}>Mon · 9–12 AM</span>
                <span className="text-[11px] px-2 py-1 rounded-md" style={{ background: `${C.saffron}25`, color: C.ink }}>Wed · 2–5 PM</span>
              </div>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4" style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(246,239,226,.92) 40%, rgba(246,239,226,.98) 100%)',
            }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lock size={13} style={{ color: C.inkSoft }}/>
                <div className="text-[10.5px] tracking-[.14em] uppercase" style={{ color: C.inkSoft, fontFamily:'Albert Sans', fontWeight:700 }}>
                  Plus reveals
                </div>
              </div>
              <div className="text-[12px] mb-3 text-center" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight: 1.4, maxWidth: 220 }}>
                Bio, all her free times, full values & interests, and her meetup history
              </div>
              <button onClick={openPremium} className="rounded-xl flex items-center justify-center gap-1.5 px-5"
                style={{ height: 40, background: C.ink, color: C.saffron, fontFamily:'Albert Sans', fontWeight:600, fontSize: 13 }}>
                <Crown size={13}/> See full profile
              </button>
              <div className="mt-1.5 text-[10px]" style={{ fontFamily:'Albert Sans', color: C.inkMuted }}>
                {plusTrialDays} days free · then ${plusPrice.toFixed(2)}/mo
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
