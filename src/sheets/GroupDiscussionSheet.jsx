import { useState } from 'react';
import {
  Heart, MessageCircle, Send, Users, UserPlus, Check,
  CalendarHeart, Sparkles,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// GroupDiscussionSheet — group-chat-style thread for a single topic. Pulls
// seeded posts from data/discussions.js; everything below (new posts,
// likes, comments) is tracked in local component state. Each post gets:
//   • Like (heart fills coral, count ticks)
//   • Comment (expands inline composer + flattens replies)
//   • DM author (opens MessageSheet via parent's openMessage)
//   • Plan meetup (opens ScheduleSheet via parent's openSchedule)
// At the top: Join group toggle (sage when joined) + member counter.
// At the bottom: compose-new-post box.
//
// Designed to feel like a public, magazine-y forum rather than a chat —
// matches the Go Mama editorial aesthetic.
// ==========================================================================

export const GroupDiscussionSheet = ({
  discussion,
  joined = false,
  onToggleJoin,
  onMessageMom,
  onScheduleMom,
  flash,
  onClose,
}) => {
  // Local feed state: starts from seeded posts, accepts new ones at top.
  const [posts, setPosts] = useState(() =>
    (discussion?.posts || []).map(p => ({
      ...p,
      liked: false,
      // The seed comments are kept on the post; new comments push onto this
      // array.
      comments: [...(p.comments || [])],
    })),
  );
  const [composer, setComposer] = useState('');
  const [openCommentFor, setOpenCommentFor] = useState(null); // post.id whose composer is open
  const [draftComment, setDraftComment] = useState('');

  if (!discussion) return null;

  const Icon = discussion.Icon;

  const sendPost = () => {
    const text = composer.trim();
    if (!text) return;
    const newPost = {
      id: `me-${Date.now()}`,
      authorId: 'me', authorName: 'You',
      photo: null, when: 'just now',
      text, liked: false, likes: 0, comments: [],
    };
    setPosts(p => [newPost, ...p]);
    setComposer('');
    flash?.('✦ Posted to the group');
  };

  const toggleLike = (postId) => {
    setPosts(p => p.map(post => {
      if (post.id !== postId) return post;
      const liked = !post.liked;
      return { ...post, liked, likes: post.likes + (liked ? 1 : -1) };
    }));
  };

  const submitComment = (postId) => {
    const text = draftComment.trim();
    if (!text) return;
    setPosts(p => p.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        comments: [...post.comments, {
          id: `cme-${Date.now()}`,
          authorName: 'You', photo: null, when: 'just now', text,
        }],
      };
    }));
    setDraftComment('');
    flash?.('Reply added');
  };

  const handleDm = (post) => {
    if (post.authorId === 'me') return;
    onMessageMom?.({
      id: post.authorId,
      name: post.authorName,
      kids: '2 kids',
      photo: post.photo,
      nextSlot: 'Tue mornings',
    });
  };

  const handleScheduleFromPost = (post) => {
    if (post.authorId === 'me') return;
    onScheduleMom?.({
      id: post.authorId,
      name: post.authorName,
      kids: '2 kids',
      photo: post.photo,
      nextPlace: 'Buddy Brew · Hyde Park',
    });
  };

  return (
    <Sheet onClose={onClose} tall>
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
            onClick={onToggleJoin}
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

        {/* Compose new post */}
        <div className="px-5 pt-4">
          <div className="rounded-2xl p-3" style={{
            background: '#fff', border: `1px solid ${C.divider}`,
          }}>
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value.slice(0, 280))}
              placeholder={`Share with ${discussion.title.split(/[·•]/)[0].trim()}…`}
              rows={2}
              className="w-full resize-none outline-none"
              style={{
                fontFamily: 'Albert Sans', fontSize: 13, color: C.navy,
                background: 'transparent', lineHeight: 1.4,
              }}
            />
            <div className="mt-1 flex items-center justify-between">
              <span style={{
                fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
              }}>
                {composer.length} / 280 · visible to {discussion.members.toLocaleString()} moms
              </span>
              <button
                onClick={sendPost}
                disabled={!composer.trim()}
                className="flex items-center gap-1.5 active:scale-[.97] transition-transform"
                style={{
                  background: composer.trim() ? C.coralDeep : C.paper,
                  color: composer.trim() ? '#fff' : C.muted,
                  border: composer.trim() ? 'none' : `1px solid ${C.divider}`,
                  padding: '6px 11px', borderRadius: 12,
                  fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                  cursor: composer.trim() ? 'pointer' : 'default',
                }}
              >
                <Send size={11}/> Post
              </button>
            </div>
          </div>
        </div>

        {/* Post feed */}
        <div className="px-5 pt-2 pb-3 space-y-3" style={{ marginTop: 8 }}>
          {posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              isMe={p.authorId === 'me'}
              accentFg={discussion.fg}
              accentBg={discussion.bg}
              onToggleLike={() => toggleLike(p.id)}
              onComment={() => {
                setOpenCommentFor(prev => prev === p.id ? null : p.id);
                setDraftComment('');
              }}
              openCommentFor={openCommentFor}
              draftComment={draftComment}
              setDraftComment={setDraftComment}
              submitComment={() => submitComment(p.id)}
              onDm={() => handleDm(p)}
              onPlan={() => handleScheduleFromPost(p)}
            />
          ))}
        </div>
      </div>
    </Sheet>
  );
};

const PostCard = ({
  post, isMe, accentFg, accentBg,
  onToggleLike, onComment, openCommentFor, draftComment, setDraftComment, submitComment,
  onDm, onPlan,
}) => (
  <div className="rounded-2xl" style={{
    background: '#fff', border: `1px solid ${C.divider}`,
    padding: 12,
    boxShadow: '0 3px 10px -8px rgba(27,42,78,.18)',
  }}>
    {/* Author row */}
    <div className="flex items-center gap-2.5">
      {post.photo ? (
        <img src={post.photo} alt="" style={{
          width: 32, height: 32, borderRadius: 16, objectFit: 'cover',
        }}/>
      ) : (
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: accentBg, color: accentFg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 11,
        }}>
          {post.authorName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
          color: C.navy, lineHeight: 1.1,
        }}>
          {post.authorName}{isMe && <span style={{ color: C.muted, fontWeight: 500 }}> · You</span>}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
          marginTop: 1,
        }}>
          {post.when}
        </div>
      </div>
    </div>

    {/* Post text */}
    <div className="mt-2" style={{
      fontFamily: 'Albert Sans', fontSize: 13, color: C.navySoft,
      lineHeight: 1.5, whiteSpace: 'pre-wrap',
    }}>
      {post.text}
    </div>

    {/* Action bar */}
    <div className="mt-3 flex items-center gap-1 flex-wrap">
      <PostAction
        active={post.liked}
        accent={C.coralDeep}
        Icon={Heart}
        label={`${post.likes}${post.liked ? '' : ''}`}
        onClick={onToggleLike}
        fillWhenActive
      />
      <PostAction
        Icon={MessageCircle}
        label={`${post.comments.length} repl${post.comments.length === 1 ? 'y' : 'ies'}`}
        onClick={onComment}
      />
      {!isMe && (
        <>
          <PostAction
            Icon={Sparkles}
            label="Text"
            onClick={onDm}
            accent={C.navy}
          />
          <PostAction
            Icon={CalendarHeart}
            label="Plan meetup"
            onClick={onPlan}
            accent={C.sageDark}
          />
        </>
      )}
    </div>

    {/* Comments (always shown if any) */}
    {(post.comments.length > 0 || openCommentFor === post.id) && (
      <div className="mt-3 pl-3" style={{
        borderLeft: `2px solid ${C.divider}`,
      }}>
        {post.comments.map(c => (
          <div key={c.id} className="flex gap-2" style={{ marginBottom: 8 }}>
            {c.photo ? (
              <img src={c.photo} alt="" style={{
                width: 22, height: 22, borderRadius: 11, objectFit: 'cover', flexShrink: 0,
              }}/>
            ) : (
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                background: accentBg, color: accentFg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9, flexShrink: 0,
              }}>
                {c.authorName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 11.5, color: C.navy,
                lineHeight: 1.35,
              }}>
                <span style={{ fontWeight: 700 }}>{c.authorName}</span>
                <span style={{ color: C.muted, fontWeight: 500 }}> · {c.when}</span>
              </div>
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 11.5, color: C.navySoft,
                marginTop: 1, lineHeight: 1.4,
              }}>
                {c.text}
              </div>
            </div>
          </div>
        ))}

        {openCommentFor === post.id && (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value.slice(0, 180))}
              placeholder="Add a thoughtful reply…"
              className="flex-1 outline-none"
              style={{
                fontFamily: 'Albert Sans', fontSize: 12, color: C.navy,
                background: '#fff', border: `1px solid ${C.divider}`,
                padding: '6px 10px', borderRadius: 12,
              }}
            />
            <button
              onClick={submitComment}
              disabled={!draftComment.trim()}
              className="active:scale-[.96] transition-transform"
              style={{
                background: draftComment.trim() ? C.coralDeep : C.paper,
                color: draftComment.trim() ? '#fff' : C.muted,
                border: draftComment.trim() ? 'none' : `1px solid ${C.divider}`,
                padding: '6px 9px', borderRadius: 12,
                cursor: draftComment.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center',
              }}
            >
              <Send size={12}/>
            </button>
          </div>
        )}
      </div>
    )}
  </div>
);

const PostAction = ({ Icon, label, onClick, active = false, accent = C.muted, fillWhenActive = false }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 active:scale-[.96] transition-transform"
    style={{
      background: active ? `${accent}14` : 'transparent',
      color: active ? accent : C.muted,
      border: 'none', padding: '5px 9px', borderRadius: 12,
      fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    <Icon
      size={12}
      fill={fillWhenActive && active ? accent : 'none'}
      color={active ? accent : C.muted}
    />
    {label}
  </button>
);
