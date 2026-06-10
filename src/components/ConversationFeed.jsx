import { useEffect, useMemo, useState } from 'react';
import { Heart, Send, MessageCircle } from 'lucide-react';
import { C } from '../theme';
import { listThread, listReactions, sendMessage, toggleReaction, subscribe } from '../lib/chat';
import { buildThread } from '../lib/chat-helpers';

// Threaded feed (posts → comments → likes) for group + subject conversations.
// `conversationId` must already exist (caller find-or-creates it). `author` is
// the { name, photo } snapshot. `myUserId` aligns ownership + like state.
export const ConversationFeed = ({ conversationId, author, myUserId, placeholder = 'Share with the group…', flash }) => {
  const [rows, setRows] = useState([]);
  const [likes, setLikes] = useState([]);   // {message_id,user_id}
  const [composer, setComposer] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const loadInto = async (setAlive) => {
    const data = await listThread(conversationId);
    const reacts = await listReactions(data.map((r) => r.id));
    if (setAlive()) { setRows(data); setLikes(reacts); }
  };

  // public refresh used by composer/like actions (component still mounted)
  const refresh = async () => {
    const data = await listThread(conversationId);
    setRows(data);
    setLikes(await listReactions(data.map((r) => r.id)));
  };

  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    let unsub = () => {};
    (async () => {
      await loadInto(() => alive);
      unsub = subscribe(conversationId, {
        onMessage: () => { if (alive) refresh(); },
        onReaction: () => { if (alive) refresh(); },
      });
    })();
    return () => { alive = false; unsub(); };
  }, [conversationId]);

  const tree = useMemo(() => buildThread(rows), [rows]);
  const likeCount = (id) => likes.filter((l) => l.message_id === id).length;
  const iLiked = (id) => likes.some((l) => l.message_id === id && l.user_id === myUserId);

  const post = async (parentId = null) => {
    const body = composer.trim();
    if (!body) return;
    setComposer('');
    try { await sendMessage(conversationId, { body, parentId, author }); await refresh(); }
    catch { flash?.('Could not post'); }
  };
  const like = async (id) => { try { await toggleReaction(id); await refresh(); } catch { /* ignore */ } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* composer */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder={replyTo ? 'Write a reply…' : placeholder}
          style={{ flex: 1, border: `1px solid ${C.divider}`, borderRadius: 12, padding: '10px 12px',
                   fontFamily: 'Albert Sans', fontSize: 13, outline: 'none' }}/>
        <button onClick={() => post(replyTo)} aria-label="Post" style={{
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`, color: '#fff',
          border: 'none', borderRadius: 12, padding: '0 14px', cursor: 'pointer' }}>
          <Send size={16}/>
        </button>
      </div>
      {replyTo && (
        <button onClick={() => setReplyTo(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none',
          color: C.muted, fontFamily: 'Albert Sans', fontSize: 11, cursor: 'pointer' }}>
          Replying to a post · cancel
        </button>
      )}

      {/* posts */}
      {tree.map((p) => (
        <div key={p.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {p.author_photo
              ? <img src={p.author_photo} alt="" style={{ width: 30, height: 30, borderRadius: 15, objectFit: 'cover' }}/>
              : <div style={{ width: 30, height: 30, borderRadius: 15, background: C.coralSoft }}/>}
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, color: C.navy }}>{p.author_name}</div>
          </div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 1.4 }}>{p.body}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <button onClick={() => like(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none',
              border: 'none', cursor: 'pointer', color: iLiked(p.id) ? C.coralDeep : C.muted,
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700 }}>
              <Heart size={13} fill={iLiked(p.id) ? C.coralDeep : 'none'}/> {likeCount(p.id)}
            </button>
            <button onClick={() => setReplyTo(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none',
              border: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700 }}>
              <MessageCircle size={13}/> {p.comments.length}
            </button>
          </div>
          {/* comments */}
          {p.comments.map((c) => (
            <div key={c.id} style={{ marginTop: 8, marginLeft: 12, paddingLeft: 10, borderLeft: `2px solid ${C.line}` }}>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy }}>{c.author_name}</div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{c.body}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
