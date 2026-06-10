import { useEffect, useState } from 'react';
import { Users, UserPlus, Check } from 'lucide-react';
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
// Header (title, member counter, online badge) and the Join toggle are
// preserved. Joining also calls joinConversation() so the user appears as
// a participant in the DB.
// ==========================================================================

export const GroupDiscussionSheet = ({
  discussion,
  joined = false,
  onToggleJoin,
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

  const handleJoin = async () => {
    if (convId) await joinConversation(convId).catch(() => {});
    onToggleJoin?.();
  };

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
              </div>
            </div>
          </div>

          <button
            onClick={handleJoin}
            className="mt-4 w-full rounded-2xl flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
            style={{
              height: 44,
              background: joined ? C.sage : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
              color: joined ? C.sageDark : '#fff',
              border: joined ? `1px solid ${C.sageDark}` : 'none',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
              boxShadow: joined ? 'none' : '0 6px 14px -8px rgba(214,68,106,.5)',
            }}
          >
            {joined ? <><Check size={15}/> Joined</> : <><UserPlus size={15}/> Join group</>}
          </button>
        </div>

        {/* Persistent ConversationFeed */}
        <div className="px-5 pt-4 pb-3">
          {convId && (
            <ConversationFeed
              conversationId={convId}
              author={author}
              myUserId={myUserId}
              placeholder={`Share with ${discussion.title}…`}
              flash={flash}
            />
          )}
        </div>
      </div>
    </Sheet>
  );
};
