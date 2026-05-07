import { Calendar, MessageCircle, User, ShieldCheck } from 'lucide-react';
import { C } from '../theme';

export const MatchCardFull = ({ mom, profile, onSchedule, onMessage, onProfile }) => {
  const userTags = [
    ...(profile.interests || []),
    ...(profile.values || []),
  ];
  const momTags = [
    ...(mom.interests || []),
    ...(mom.values || []),
  ];
  const sharedRaw = momTags.filter(t => userTags.includes(t));
  const display = (sharedRaw.length ? sharedRaw : (mom.tags || [])).slice(0, 3);

  return (
    <div className="rounded-[28px] overflow-hidden h-full flex flex-col relative" style={{
      background: C.cream, border: `1px solid ${C.divider}`, boxShadow: '0 6px 24px rgba(42,30,34,.06)',
    }}>
      {/* Hero — photo with bottom gradient overlay */}
      <div className="relative" style={{ flex: '0 0 60%', backgroundImage: `url('${mom.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,.6))' }}/>

        {/* Match pill */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full" style={{
          background: 'rgba(255,255,255,.92)', color: C.ink,
          fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
        }}>
          {mom.overlap}% match
        </div>

        {/* Verified pill */}
        {mom.verified && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full flex items-center gap-1" style={{
            background: 'rgba(255,255,255,.92)', color: C.sageDark,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 10.5,
          }}>
            <ShieldCheck size={11}/> Verified
          </div>
        )}

        {/* Hero text */}
        <div className="absolute left-4 right-4 bottom-3 text-white">
          <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 26, letterSpacing: '-.02em', lineHeight: 1.05 }}>
            {mom.name} <span style={{ fontSize: 18, opacity: .85 }}>· {mom.age}</span>
          </div>
          <div className="mt-0.5" style={{ fontFamily: 'Albert Sans', fontWeight: 500, fontSize: 12, opacity: .92 }}>
            Kids {mom.kids} &nbsp;·&nbsp; {mom.distance} away
          </div>
        </div>
      </div>

      {/* Lower panel */}
      <div className="px-4 py-3" style={{ flex: '1 1 40%', background: C.paper }}>
        <div className="text-[10.5px] uppercase tracking-[.16em]" style={{
          fontFamily: 'Albert Sans', fontWeight: 600, color: C.terracotta,
        }}>
          Shared ground
        </div>

        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {display.map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full" style={{
              background: `${C.terracotta}15`, color: C.terracotta,
              fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
            }}>{t}</span>
          ))}
        </div>

        <div className="mt-2" style={{
          fontFamily: 'Albert Sans', fontWeight: 400, fontSize: 12, color: C.inkSoft, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          "{mom.bio}"
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => onSchedule(mom)} className="flex-1 rounded-2xl flex items-center justify-center gap-1.5" style={{
            height: 42, background: C.ink, color: C.cream,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
          }}>
            <Calendar size={14}/> Schedule
          </button>
          <button onClick={() => onMessage(mom)} aria-label={`Message ${mom.name}`} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <MessageCircle size={16}/>
          </button>
          <button onClick={() => onProfile(mom)} aria-label={`View ${mom.name}'s profile`} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <User size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};
