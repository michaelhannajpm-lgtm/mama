import { useState } from 'react';
import {
  MapPin, Heart, Bookmark, Share2, MessageCircle, CalendarHeart,
  ShieldCheck, Sparkles, Check, Briefcase,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// MomDetailSheet — lightweight profile card for the Connect tab's
// hardcoded MOMS array (the richer SAMPLE_MOMS uses ProfileSheet
// directly). Surface enough context for the user to decide to reach
// out: photo, name, kids, distance, tag, fake "shared ground", and
// 4 actions — Send invite, Message, Save, Share.
//
// Accepts:
//   {
//     id, name, kids, distance, tag, tagBg, tagFg, photo,
//     Icon? — optional lucide icon shown on the tag pill,
//     bio?, verified?, sharedTags?
//   }
// ==========================================================================

const FALLBACK_BIO =
  "Real mom. Real schedule. Likes coffee, slow walks, and finding people who get it. Drop a hi — I respond.";

const FALLBACK_SHARED = ['Coffee dates', 'Park hangs', 'Same kid ages'];

const ActionTile = ({ active, onClick, accent, Icon, label, activeLabel }) => (
  <button
    onClick={onClick}
    className="flex-1 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[.97]"
    style={{
      height: 44,
      background: active ? accent : C.paper,
      color: active ? '#fff' : C.navy,
      border: `1px solid ${active ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12,
    }}
  >
    <Icon size={14} fill={active && Icon === Bookmark ? '#fff' : 'none'}/>
    {active ? (activeLabel || label) : label}
  </button>
);

export const MomDetailSheet = ({
  mom,
  saved = false,
  invited = false,
  onInvite, onMessage, onSave, onShare,
  onClose,
}) => {
  const [showFullBio, setShowFullBio] = useState(false);
  if (!mom) return null;

  const bio = mom.bio || FALLBACK_BIO;
  const sharedTags = mom.sharedTags || FALLBACK_SHARED;
  const TagIcon = mom.Icon;

  return (
    <Sheet onClose={onClose} tall bleedTop>
      <div className="pb-6">
        {/* Hero — round avatar over a coral wash */}
        <div
          className="relative"
          style={{
            background: `linear-gradient(180deg, ${C.coralSoft} 0%, ${C.cream} 100%)`,
            padding: '24px 20px 18px',
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={mom.photo}
              alt=""
              style={{
                width: 110, height: 110, borderRadius: 55, objectFit: 'cover',
                border: '4px solid #fff',
                boxShadow: '0 6px 20px -6px rgba(27,42,78,.25)',
              }}
            />
            {mom.verified !== false && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                background: C.sageDark, color: '#fff',
                border: '3px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={13}/>
              </div>
            )}
          </div>
          <div className="mt-3" style={{
            fontFamily: 'Fraunces', fontSize: 24, fontWeight: 600,
            color: C.navy, letterSpacing: '-.02em',
          }}>
            {mom.name}
          </div>
          <div className="mt-1" style={{
            fontFamily: 'Albert Sans', fontSize: 12.5, color: C.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span>{mom.kids}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10}/> {mom.distance}
            </span>
          </div>
          {mom.tag && (
            <div className="mt-3 inline-flex items-center gap-1.5" style={{
              background: mom.tagBg || C.coralSoft,
              color: mom.tagFg || C.coralDeep,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11,
              padding: '5px 11px', borderRadius: 14,
            }}>
              {TagIcon ? <TagIcon size={11}/> : <Briefcase size={11}/>}
              {mom.tag}
            </div>
          )}
        </div>

        <div className="px-5 pt-4">
          {/* Shared ground */}
          <div className="rounded-2xl p-3.5" style={{
            background: `${C.coral}10`, border: `1px solid ${C.coral}33`,
          }}>
            <div className="text-[10px] tracking-[.16em] uppercase mb-1.5 flex items-center gap-1.5" style={{
              color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 700,
            }}>
              <Heart size={10} fill={C.coralDeep}/> You both share
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sharedTags.map(t => (
                <span key={t} style={{
                  background: C.coral, color: '#fff',
                  fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
                  padding: '4px 10px', borderRadius: 10,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="mt-5">
            <SectionLabel>About {mom.name.split(' ')[0]}</SectionLabel>
            <div
              className="text-[13px]"
              style={{
                fontFamily: 'Albert Sans', color: C.navySoft, lineHeight: 1.5,
                fontStyle: 'italic',
                display: showFullBio ? 'block' : '-webkit-box',
                WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bio}
            </div>
            {bio.length > 120 && (
              <button
                onClick={() => setShowFullBio(v => !v)}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  marginTop: 4,
                  color: C.coralDeep,
                  fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showFullBio ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Suggested first meetup */}
          <div className="mt-5 rounded-2xl p-3.5" style={{
            background: C.paper, border: `1px solid ${C.divider}`,
          }}>
            <div className="text-[10px] tracking-[.16em] uppercase mb-1.5 flex items-center gap-1.5" style={{
              color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 700,
            }}>
              <Sparkles size={10}/> Suggested first meetup
            </div>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 15, fontWeight: 500,
              color: C.navy, marginTop: 2, letterSpacing: '-.01em',
            }}>
              Saturday morning coffee
            </div>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, marginTop: 2,
            }}>
              Buddy Brew, Hyde Park · 0.7 mi
            </div>
          </div>

          {/* Primary — Send invite */}
          <button
            onClick={() => onInvite?.(mom)}
            disabled={invited}
            className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
            style={{
              height: 50,
              background: invited
                ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
                : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
              boxShadow: invited
                ? '0 6px 16px -6px rgba(94,122,59,.5)'
                : '0 6px 16px -6px rgba(214,68,106,.55)',
            }}
          >
            {invited
              ? <><Check size={16}/> Invite sent</>
              : <><CalendarHeart size={16}/> Send invite</>}
          </button>

          {/* Secondary actions */}
          <div className="mt-2.5 flex gap-2">
            <ActionTile
              active={false}
              onClick={() => onMessage?.(mom)}
              accent={C.navy}
              Icon={MessageCircle}
              label="Message"
            />
            <ActionTile
              active={saved}
              onClick={() => onSave?.(mom)}
              accent={C.coralDeep}
              Icon={Bookmark}
              label="Save"
              activeLabel="Saved"
            />
            <ActionTile
              active={false}
              onClick={() => onShare?.(mom)}
              accent={C.navy}
              Icon={Share2}
              label="Share"
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="uppercase"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 6,
    }}
  >
    {children}
  </div>
);
