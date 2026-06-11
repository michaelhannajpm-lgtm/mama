import { useState } from 'react';
import {
  MapPin, Heart, Bookmark, Share2, MessageCircle,
  ShieldCheck, Sparkles, Check, Briefcase, Baby, Calendar,
  Crown, User, UserPlus, Coffee, Smile, Moon, Send,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { PresenceDot } from '../components/PresenceDot';

// ==========================================================================
// MomDetailSheet — full profile + action surface for a single mom. Replaces
// the older invite-and-save stub; now hosts every deep action that used to
// live on the SeeAll MomListCard:
//
//   • Send connection request (none → pending → accepted)
//   • Message (3 free / Plus)
//   • Schedule (opens ScheduleSheet)
//   • Propose first meetup (inline composer: day + time + place)
//   • Save / Share
//
// Photo, bio, availability, interests, neighborhood, kids, "what to know"
// blurb — all visible above the actions. Designed so a mom can decide
// whether to match without flipping between sheets.
// ==========================================================================

const FALLBACK_BIO =
  "Real mom. Real schedule. Likes coffee, slow walks, and finding people who get it. Drop a hi — I respond.";
const FALLBACK_SHARED = ['Coffee dates', 'Park hangs', 'Same kid ages'];
const FALLBACK_AVAILABILITY = ['Tue mornings', 'Thu mornings', 'Sat mornings'];

const DAY_CHIPS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_CHIPS = [
  { id: 'morning',   label: 'Morning',   icon: Coffee },
  { id: 'midday',    label: 'Midday',    icon: Sparkles },
  { id: 'afternoon', label: 'Afternoon', icon: Smile },
  { id: 'evening',   label: 'Evening',   icon: Moon },
];

const kidAgesText = (mom) => {
  if (Array.isArray(mom.kidBuckets) && mom.kidBuckets.length) {
    return `${mom.kidBuckets.join(' · ')} yrs`;
  }
  if (mom.kids && /\byrs?\b/i.test(mom.kids)) return mom.kids.trim();
  return null;
};
const kidsCountText = (mom) => {
  const n = mom.kidsCount
    || (Array.isArray(mom.kidBuckets) ? mom.kidBuckets.length : null);
  if (typeof n === 'number' && n > 0) return `${n} ${n === 1 ? 'kid' : 'kids'}`;
  if (mom.kids && /\bkid/i.test(mom.kids)) return mom.kids;
  return null;
};

const SectionLabel = ({ children, icon: Icon }) => (
  <div
    className="uppercase flex items-center gap-1.5"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 6,
    }}
  >
    {Icon && <Icon size={11}/>}
    {children}
  </div>
);

export const MomDetailSheet = ({
  mom,
  saved = false,
  invited = false,
  // Action wiring — every callback is optional so the older HomeTab call
  // sites that only pass onMessage / onSave / onShare keep working.
  connectionStatus = 'none', // 'none' | 'pending' | 'accepted'
  scheduledSlot = null,
  proposal = null,
  isPremium = false,
  messagesUsed = 0, freeLimit = 3,
  onConnect, onInvite, onMessage, onSchedule, onPropose,
  onSave, onShare, onPremium,
  onClose,
  fullScreen = false,
}) => {
  const [showFullBio, setShowFullBio] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [pday, setPday] = useState('Sat');
  const [ptime, setPtime] = useState('morning');
  const [pplace, setPplace] = useState('');

  if (!mom) return null;

  const bio = mom.bio || FALLBACK_BIO;
  const sharedTags = mom.sharedTags || FALLBACK_SHARED;
  const availability = Array.isArray(mom.nextSlots) && mom.nextSlots.length
    ? mom.nextSlots.slice(0, 3)
    : FALLBACK_AVAILABILITY;
  const interests = Array.isArray(mom.interests) && mom.interests.length
    ? mom.interests.slice(0, 5)
    : sharedTags.slice(0, 4);
  const kidsLine = kidsCountText(mom);
  const ageLine = kidAgesText(mom);
  const neighborhood = mom.neighborhood || mom.area;
  const TagIcon = mom.Icon;
  const msgLimitHit = !isPremium && messagesUsed >= freeLimit;
  const msgRemaining = Math.max(0, freeLimit - messagesUsed);
  const booked = !!scheduledSlot;
  const proposalSent = !!proposal;

  const sendProposal = () => {
    onPropose?.({
      day: pday,
      time: TIME_CHIPS.find(t => t.id === ptime)?.label || ptime,
      place: pplace.trim(),
    });
    setProposeOpen(false);
  };

  // Bridge — onInvite is the legacy callback; onConnect is the new one.
  // If onConnect isn't passed but onInvite is, treat them as the same so
  // older Home / Saved screens still work.
  const handleConnect = () => (onConnect || onInvite)?.(mom);

  return (
    <Sheet onClose={onClose} tall bleedTop fullScreen={fullScreen}>
      <div className="pb-2">
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
            {mom.photo ? (
              <img
                src={mom.photo}
                alt=""
                style={{
                  width: 110, height: 110, borderRadius: 55, objectFit: 'cover',
                  border: '4px solid #fff',
                  boxShadow: '0 6px 20px -6px rgba(27,42,78,.25)',
                }}
              />
            ) : (
              <div style={{
                width: 110, height: 110, borderRadius: 55,
                background: mom.hue || `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
                border: '4px solid #fff', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Fraunces', fontWeight: 600, fontSize: 44,
                boxShadow: '0 6px 20px -6px rgba(27,42,78,.25)',
              }}>
                {(mom.firstName || mom.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
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
            {/* Presence dot — top-right (verified shield is bottom-right). */}
            <PresenceDot status={mom.presence} size={20} ring="#fff" style={{ top: 2, right: 2, bottom: 'auto' }}/>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2" style={{ flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 24, fontWeight: 600,
              color: C.navy, letterSpacing: '-.02em',
            }}>
              {mom.name}
            </div>
            {mom.overlap != null && (
              <span style={{
                background: C.coralSoft, color: C.coralDeep,
                fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
                padding: '3px 8px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <Sparkles size={9}/> {Math.round(mom.overlap)}% match
              </span>
            )}
          </div>
          <div className="mt-1" style={{
            fontFamily: 'Albert Sans', fontSize: 12.5, color: C.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            flexWrap: 'wrap',
          }}>
            {kidsLine && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Baby size={10}/> {kidsLine}{ageLine ? ` · ${ageLine}` : ''}
              </span>
            )}
            {(kidsLine && (mom.distance || neighborhood)) && (
              <span style={{ opacity: 0.4 }}>·</span>
            )}
            {(mom.distance || neighborhood) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={10}/> {mom.distance}{neighborhood ? ` · ${neighborhood}` : ''}
              </span>
            )}
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

          {/* Availability */}
          <div className="mt-5 rounded-2xl p-3.5" style={{
            background: C.creamSoft, border: `1px solid ${C.divider}`,
          }}>
            <SectionLabel icon={Calendar}>Free time</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {availability.map(slot => (
                <span key={slot} style={{
                  background: '#fff', color: C.navy,
                  border: `1px solid ${C.divider}`,
                  fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11,
                  padding: '4px 10px', borderRadius: 10,
                }}>
                  {slot}
                </span>
              ))}
            </div>
          </div>

          {/* Interests */}
          {interests.length > 0 && (
            <div className="mt-5">
              <SectionLabel icon={Heart}>Into</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {interests.map(t => (
                  <span key={t} style={{
                    background: '#fff', color: C.coralDeep,
                    border: `1px solid ${C.coral}33`,
                    fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11,
                    padding: '4px 10px', borderRadius: 10,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested first meetup — kept as a soft suggestion above the
              propose composer so the user can scan a default to pick. */}
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

          {/* Primary — Send connection request */}
          {(onConnect || onInvite) && (
            <button
              onClick={connectionStatus === 'none' && !invited ? handleConnect : undefined}
              disabled={connectionStatus !== 'none' || invited}
              className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[.99]"
              style={{
                height: 50,
                background:
                  connectionStatus === 'accepted' || invited
                    ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`
                    : connectionStatus === 'pending'
                      ? `${C.saffron}22`
                      : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
                color:
                  connectionStatus === 'accepted' || invited
                    ? '#fff'
                    : connectionStatus === 'pending'
                      ? '#8A6610'
                      : '#fff',
                border: connectionStatus === 'pending' ? `1px solid ${C.saffron}` : 'none',
                fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
                cursor: connectionStatus === 'none' && !invited ? 'pointer' : 'default',
                boxShadow:
                  connectionStatus === 'accepted' || invited
                    ? '0 6px 16px -6px rgba(94,122,59,.5)'
                    : connectionStatus === 'pending'
                      ? 'none'
                      : '0 6px 16px -6px rgba(214,68,106,.55)',
              }}
            >
              {connectionStatus === 'accepted' || invited ? (
                <><Check size={16}/> Connected with {mom.name.split(' ')[0]}</>
              ) : connectionStatus === 'pending' ? (
                <><Sparkles size={14}/> Request sent · waiting</>
              ) : (
                <><UserPlus size={16}/> Send connection request</>
              )}
            </button>
          )}

          {/* 3-up action tiles — Message / Schedule / Save (Profile is the
              whole sheet, so no Profile tile needed) */}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <ActionTile
              accent={msgLimitHit ? C.saffron : C.navy}
              Icon={msgLimitHit ? Crown : MessageCircle}
              label={msgLimitHit ? 'Unlock' : 'Message'}
              sub={
                isPremium ? 'Unlimited' :
                msgLimitHit ? 'Plus required' :
                `${msgRemaining} free`
              }
              onClick={msgLimitHit ? () => onPremium?.() : () => onMessage?.(mom)}
            />
            <ActionTile
              accent={booked ? C.sageDark : C.coralDeep}
              filled={!booked}
              Icon={booked ? Check : Calendar}
              label={booked ? 'Booked' : 'Schedule'}
              sub={booked ? `${scheduledSlot.day} · ${scheduledSlot.time}` : 'Pick a slot'}
              onClick={() => onSchedule?.(mom)}
            />
            <ActionTile
              accent={saved ? C.coralDeep : C.navy}
              filled={saved}
              Icon={Bookmark}
              label={saved ? 'Saved' : 'Save'}
              onClick={() => onSave?.(mom)}
            />
          </div>

          {/* Share — kept as a single-row pill, separate from the 3-up since
              it routes to ShareSheet rather than a per-mom action. */}
          {onShare && (
            <button
              onClick={() => onShare?.(mom)}
              className="mt-2 w-full rounded-2xl flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
              style={{
                height: 40, background: C.paper, color: C.navy,
                border: `1px solid ${C.divider}`,
                fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              <Share2 size={13}/> Share profile
            </button>
          )}

          {/* Propose first meetup — collapsible composer */}
          {onPropose && (proposalSent ? (
            <div className="mt-3" style={{
              background: `${C.sageDark}12`,
              border: `1px solid ${C.sageDark}33`,
              borderRadius: 12, padding: '8px 10px',
              fontFamily: 'Albert Sans', fontSize: 11.5, color: C.sageDark,
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Check size={12}/> Proposal sent · {proposal.day} {proposal.time}
              {proposal.place ? ` @ ${proposal.place}` : ''}
            </div>
          ) : (
            <div className="mt-3">
              <button
                onClick={() => setProposeOpen(v => !v)}
                className="active:scale-[.98] transition-transform"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent', border: `1px dashed ${C.coral}55`,
                  borderRadius: 12, padding: '9px 12px',
                  fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, color: C.coralDeep,
                  cursor: 'pointer',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12}/> Propose time & place for first meetup
                </span>
                <span style={{ fontFamily: 'Albert Sans', fontSize: 16, lineHeight: 1, color: C.coralDeep }}>
                  {proposeOpen ? '−' : '+'}
                </span>
              </button>

              {proposeOpen && (
                <div className="mt-2 rounded-xl" style={{
                  background: C.paper, border: `1px solid ${C.divider}`,
                  padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div>
                    <SectionLabel>Day</SectionLabel>
                    <div className="flex gap-1 flex-wrap">
                      {DAY_CHIPS.map(d => (
                        <button
                          key={d}
                          onClick={() => setPday(d)}
                          style={{
                            background: pday === d ? C.coralDeep : '#fff',
                            color: pday === d ? '#fff' : C.navy,
                            border: `1px solid ${pday === d ? C.coralDeep : C.divider}`,
                            padding: '4px 9px', borderRadius: 8,
                            fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Time</SectionLabel>
                    <div className="flex gap-1 flex-wrap">
                      {TIME_CHIPS.map(t => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setPtime(t.id)}
                            style={{
                              background: ptime === t.id ? C.coralDeep : '#fff',
                              color: ptime === t.id ? '#fff' : C.navy,
                              border: `1px solid ${ptime === t.id ? C.coralDeep : C.divider}`,
                              padding: '4px 9px', borderRadius: 8,
                              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}
                          >
                            <Icon size={11}/> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Place (optional)</SectionLabel>
                    <input
                      value={pplace}
                      onChange={(e) => setPplace(e.target.value.slice(0, 60))}
                      placeholder="Buddy Brew · Hyde Park"
                      style={{
                        width: '100%',
                        background: '#fff', border: `1px solid ${C.divider}`,
                        borderRadius: 9, padding: '8px 10px',
                        fontFamily: 'Albert Sans', fontSize: 12, color: C.navy,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={sendProposal}
                    className="active:scale-[.99] transition-transform"
                    style={{
                      height: 40, width: '100%',
                      background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
                      color: '#fff', border: 'none', borderRadius: 10,
                      fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      boxShadow: '0 4px 10px -6px rgba(214,68,106,.55)',
                    }}
                  >
                    <Send size={13}/> Send proposal to {mom.name.split(' ')[0]}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
};

const ActionTile = ({ Icon, label, sub, accent = C.navy, filled = false, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[.97]"
    style={{
      padding: '9px 4px',
      background: filled ? `linear-gradient(135deg, ${accent}, ${accent})` : C.paper,
      color: filled ? '#fff' : C.navy,
      border: `1px solid ${filled ? accent : C.divider}`,
      fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12,
      cursor: 'pointer',
      boxShadow: filled ? '0 4px 10px -6px rgba(214,68,106,.4)' : 'none',
    }}
  >
    <Icon size={15} color={filled ? '#fff' : accent}/>
    <span style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>
      {label}
    </span>
    {sub && (
      <span style={{
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 600,
        color: filled ? 'rgba(255,255,255,.85)' : C.muted,
        marginTop: 1, lineHeight: 1.1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
      }}>
        {sub}
      </span>
    )}
  </button>
);
