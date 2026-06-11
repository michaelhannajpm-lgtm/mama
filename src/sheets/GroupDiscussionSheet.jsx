import { useEffect, useState } from 'react';
import { Users, UserPlus, Check, Crown, Clock, ShieldCheck } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { getGroupConversation, joinConversation } from '../lib/chat';
import { ConversationFeed } from '../components/ConversationFeed';

// ==========================================================================
// GroupDiscussionSheet — group-chat-style thread for a single topic. The
// feed is backed by a persisted Supabase conversation resolved via
// getGroupConversation(discussion.id, discussion.title) and rendered by
// the shared ConversationFeed component.
//
// Join flow (per 2026-06-10 product change):
//   1. Group join is **Plus-only** — non-premium taps open the PremiumSheet.
//   2. After Plus users tap Join, the group host reviews their request.
//      Status transitions: none → pending (yellow saffron banner) →
//      accepted (sage "Joined" pill).
//   3. The ConversationFeed is read-only until status === 'accepted' — only
//      then can the user comment + like.
// ==========================================================================

export const GroupDiscussionSheet = ({
  discussion,
  joinStatus = 'none', // 'none' | 'pending' | 'accepted'
  onRequestJoin,       // called when the user wants to join
  onLeave,             // called when an accepted member taps "Leave group"
  isPremium = false,
  openPremium,         // () => void — opens the PremiumSheet
  onMessageMom,
  onScheduleMom,
  author,
  myUserId,
  flash,
  onClose,
}) => {
  void onMessageMom; void onScheduleMom; // kept for API compat; ConversationFeed handles interactions

  const [convId, setConvId] = useState(null);

  useEffect(() => {
    if (!discussion?.id) return;
    getGroupConversation(discussion.id, discussion.title).then(setConvId).catch(() => {});
  }, [discussion?.id]);

  if (!discussion) return null;

  const Icon = discussion.Icon;
  const isAccepted = joinStatus === 'accepted';
  const isPending  = joinStatus === 'pending';

  const handleJoinPress = async () => {
    if (isAccepted) {
      onLeave?.();
      return;
    }
    if (isPending) return; // waiting on host
    if (!isPremium) {
      openPremium?.();
      flash?.('✦ Joining groups is a Plus perk');
      return;
    }
    if (convId) await joinConversation(convId).catch(() => {});
    onRequestJoin?.();
  };

  // Button background / label per status
  const joinBg = isAccepted
    ? C.sage
    : isPending
      ? `${C.saffron}22`
      : !isPremium
        ? `linear-gradient(135deg, ${C.saffron}, #B8862C)`
        : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`;
  const joinColor = isAccepted
    ? C.sageDark
    : isPending
      ? '#8A6610'
      : '#fff';
  const joinBorder = isPending ? `1px solid ${C.saffron}` : (isAccepted ? `1px solid ${C.sageDark}` : 'none');

  return (
    <Sheet onClose={onClose} tall bleedTop>
      <div className="pb-6">
        {/* Header */}
        <div
          className="relative"
          style={{
            background: `linear-gradient(180deg, ${discussion.bg} 0%, ${C.cream} 100%)`,
            padding: '20px 20px 18px',
          }}
        >
          <div className="flex items-start gap-3">
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: '#fff', color: discussion.fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px -6px rgba(27,42,78,.25)',
            }}>
              <Icon size={22}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[.18em] uppercase" style={{
                color: discussion.fg, fontFamily: 'Albert Sans', fontWeight: 800,
              }}>
                Group discussion
              </div>
              <div style={{
                fontFamily: 'Fraunces', fontSize: 21, fontWeight: 600,
                color: C.navy, letterSpacing: '-.02em', lineHeight: 1.15,
                marginTop: 2,
              }}>
                {discussion.title}
              </div>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
                marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11}/> {discussion.members.toLocaleString()} moms
                </span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  color: C.sageDark, fontWeight: 700,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: 4, background: C.sageDark,
                  }}/>
                  {discussion.online} online
                </span>
                {discussion.hostName && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={11}/> Hosted by {discussion.hostName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleJoinPress}
            disabled={isPending}
            className="mt-4 w-full rounded-2xl flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
            style={{
              height: 44,
              background: joinBg,
              color: joinColor,
              border: joinBorder,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13,
              cursor: isPending ? 'default' : 'pointer',
              boxShadow: isAccepted || isPending
                ? 'none'
                : !isPremium
                  ? '0 6px 14px -8px rgba(217,164,65,.55)'
                  : '0 6px 14px -8px rgba(214,68,106,.5)',
            }}
          >
            {isAccepted ? (
              <><Check size={15}/> Joined</>
            ) : isPending ? (
              <><Clock size={15}/> Waiting for host approval</>
            ) : !isPremium ? (
              <><Crown size={15}/> Join with Plus</>
            ) : (
              <><UserPlus size={15}/> Request to join</>
            )}
          </button>

          {/* Pending / Premium-gated context banner */}
          {isPending && (
            <div
              className="mt-3 rounded-xl flex items-start gap-2"
              style={{
                padding: '10px 12px',
                background: `${C.saffron}1A`,
                border: `1px solid ${C.saffron}66`,
              }}
            >
              <Clock size={14} color="#8A6610" style={{ marginTop: 1, flexShrink: 0 }}/>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: '#5C4408', lineHeight: 1.4 }}>
                <strong>{discussion.hostName || 'The host'}</strong> reviews each new member before they can post.
                You can browse the conversation while you wait — comments + likes unlock once you're in.
              </div>
            </div>
          )}
          {!isAccepted && !isPending && !isPremium && (
            <div
              className="mt-3 rounded-xl flex items-start gap-2"
              style={{
                padding: '10px 12px',
                background: `${C.saffron}14`,
                border: `1px solid ${C.saffron}55`,
              }}
            >
              <Crown size={14} color="#8A6610" style={{ marginTop: 1, flexShrink: 0 }}/>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: '#5C4408', lineHeight: 1.4 }}>
                Group discussions are a <strong>Plus</strong> perk — joining unlocks the request flow, comments, and likes.
              </div>
            </div>
          )}
        </div>

        {/* Persistent ConversationFeed — read-only until the host accepts */}
        <div className="px-5 pt-4 pb-3">
          {convId && (
            <ConversationFeed
              conversationId={convId}
              author={author}
              myUserId={myUserId}
              placeholder={`Share with ${discussion.title}…`}
              flash={flash}
              readOnly={!isAccepted}
            />
          )}
        </div>
      </div>
    </Sheet>
  );
};
