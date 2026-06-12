import { useState, useEffect, useRef } from 'react';
import { Crown, MessageCircle, ShieldCheck } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Skeleton } from '../components/Skeleton';
import { getOrCreateDM, listMessages, sendMessage, subscribe } from '../lib/chat';
import { dmFreeState, DM_FREE_LIMIT } from '../lib/chat-helpers';

// 2026-06-08: tightened free tier from 25 → 3 messages per mom to drive
// Plus conversion harder. Premium still unlocks unlimited.
// DM_FREE_LIMIT = 3 is the protected lever — do not raise without product sign-off.

export const MessageSheet = ({ mom, isPremium, author, myUserId, senderVerified = false, onClose, openPremium, flash,
  freeLimit = DM_FREE_LIMIT, plusPrice = 7.99, plusTrialDays = 7 }) => {
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = mom?.name?.split(' ')[0] || 'her';
  const unavailable = !mom?.auth_user_id;
  // Privacy: she only accepts DMs from verified moms, and the sender isn't one.
  const dmBlocked = !!mom?.verifiedOnlyDms && !senderVerified;

  // Icebreaker text only for brand-new conversations
  const icebreaker = (() => {
    try {
      const kids = mom?.kids?.split(' · ')?.[0] || 'little one';
      const slot = mom?.nextSlot?.split(' ')?.[0] || 'Tue';
      return `Hi ${firstName}! Saw we both have a ${kids} kid and free ${slot} mornings. Want to grab coffee?`;
    } catch {
      return `Hi ${firstName}! Would love to connect sometime.`;
    }
  })();

  const free = dmFreeState(messages, myUserId, isPremium, freeLimit);
  const { used, remaining, limitReached } = free;

  const [text, setText] = useState('');
  const initialized = useRef(false);

  // Open DM conversation and load messages
  useEffect(() => {
    if (unavailable) { setLoading(false); return; }
    let alive = true;
    let unsub = () => {};

    (async () => {
      try {
        const id = await getOrCreateDM(mom.auth_user_id);
        if (!alive) return;
        setConvId(id);
        const rows = await listMessages(id);
        if (!alive) return;
        setMessages(rows);
        setLoading(false);

        unsub = subscribe(id, {
          onMessage: (row) => {
            if (!alive || !row?.id) return;
            setMessages(prev => {
              if (prev.some(m => m.id === row.id)) return prev;
              return [...prev, row];
            });
          },
        });
      } catch {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; unsub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mom?.auth_user_id]);

  // Prefill icebreaker only on first open with empty history
  useEffect(() => {
    if (!loading && !initialized.current) {
      initialized.current = true;
      if (messages.length === 0) setText(icebreaker);
    }
  }, [loading, messages.length, icebreaker]);

  const canSend = !loading && convId && text.trim().length > 0 && !limitReached && !dmBlocked;

  const handleSend = async () => {
    if (!canSend) return;
    const body = text.trim();
    setText('');
    try {
      const row = await sendMessage(convId, { body, author });
      setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]));
    } catch {
      flash?.('Could not send');
      setText(body); // restore on error
    }
  };

  // ---- unavailable state ----
  if (unavailable) {
    return (
      <Sheet onClose={onClose} tall>
        <div className="px-6 pt-2 pb-6 flex flex-col" style={{ minHeight: 540 }}>
          <div>
            <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily: 'Albert Sans', fontWeight: 600 }}>
              Message {firstName}
            </div>
            <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em' }}>
              Not available yet.
            </h3>
          </div>
          <div className="mt-4 rounded-2xl p-4" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
            <p style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
              {firstName} isn't on Go Mama yet — you can't message her just yet. We'll let you know when she joins!
            </p>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6 flex flex-col" style={{ minHeight: 540 }}>
        {/* Header */}
        <div>
          <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily: 'Albert Sans', fontWeight: 600 }}>
            Message {firstName}
          </div>
          <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em' }}>
            {isPremium
              ? <>Chat <span style={{ fontStyle: 'italic', color: C.terracotta }}>unlimited</span>.</>
              : <>Your first <span style={{ fontStyle: 'italic', color: C.terracotta }}>{freeLimit} messages</span> are free.</>}
          </h3>
        </div>

        {/* Free counter — only for non-Plus */}
        {!isPremium && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: freeLimit }, (_, i) => i).map(i => (
                <div key={i} className="rounded-full" style={{
                  width: 10, height: 6,
                  background: i < used ? C.terracotta : C.divider,
                  opacity: i < used ? 1 : .6,
                }}/>
              ))}
            </div>
            <div className="text-[11px]" style={{ fontFamily: 'Albert Sans', color: limitReached ? C.terracotta : C.inkSoft, fontWeight: limitReached ? 600 : 500 }}>
              {limitReached ? 'Free messages used' : `${remaining} free message${remaining === 1 ? '' : 's'} left`}
            </div>
          </div>
        )}

        {/* Plus badge */}
        {isPremium && (
          <div className="mt-3 inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-md" style={{
            background: `${C.saffron}25`, border: `1px solid ${C.saffron}55`,
          }}>
            <Crown size={11} style={{ color: C.saffron }}/>
            <span className="text-[10px] tracking-[.12em] uppercase" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.ink }}>
              Plus · unlimited
            </span>
          </div>
        )}

        {/* Thread — chat-bubble skeleton while the conversation loads (the
            DM round-trips to Supabase), so the sheet never flashes blank. */}
        {loading && (
          <div className="mt-4 space-y-2" aria-hidden="true">
            <div className="flex justify-start"><Skeleton w="68%" h={38} radius={16}/></div>
            <div className="flex justify-end"><Skeleton w="52%" h={30} radius={16}/></div>
            <div className="flex justify-start"><Skeleton w="60%" h={30} radius={16}/></div>
          </div>
        )}

        {/* Thread — show messages chronologically */}
        {!loading && messages.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {messages.map((m) => {
              const isMe = m.author_id === myUserId;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="rounded-2xl px-3.5 py-2 max-w-[85%]" style={{
                    background: isMe ? C.terracotta : C.paper,
                    color: isMe ? '#fff' : C.ink,
                    border: isMe ? 'none' : `1px solid ${C.divider}`,
                    borderBottomRightRadius: isMe ? 6 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 6,
                  }}>
                    {!isMe && (
                      <div className="text-[10px] mb-0.5" style={{ fontFamily: 'Albert Sans', opacity: 0.6 }}>
                        {m.author_name}
                      </div>
                    )}
                    <div className="text-[13px]" style={{ fontFamily: 'Albert Sans', lineHeight: 1.4 }}>
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Verified-only gate · message limit upsell · or the composer */}
        {dmBlocked ? (
          <div className="mt-4 rounded-2xl p-4" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={16} style={{ color: C.sageDark }}/>
              <div style={{ fontFamily: 'Fraunces', fontSize: 15.5, fontWeight: 500, color: C.ink }}>
                Verified moms only
              </div>
            </div>
            <p style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
              {firstName} only accepts messages from verified moms. Verify your profile
              (link Instagram or Facebook + add a real photo) to message her.
            </p>
          </div>
        ) : limitReached ? (
          <div className="mt-4 rounded-2xl p-4" style={{ background: C.ink, color: C.cream }}>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} style={{ color: C.saffron }}/>
              <div style={{ fontFamily: 'Fraunces', fontSize: 15.5, fontWeight: 500 }}>
                Keep the conversation going
              </div>
            </div>
            <div className="text-[12px] mb-3" style={{ fontFamily: 'Albert Sans', opacity: .8, lineHeight: 1.4 }}>
              You've used your {freeLimit} free messages with {firstName}. Plus unlocks unlimited chat with every match.
            </div>
            <button onClick={openPremium} className="w-full rounded-xl flex items-center justify-center gap-2"
              style={{
                height: 44, background: C.saffron, color: C.ink,
                fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13.5,
              }}>
              <Crown size={14}/> Try Plus · {plusTrialDays} days free
            </button>
            <div className="mt-1.5 text-center text-[10.5px]" style={{ fontFamily: 'Albert Sans', opacity: .55 }}>
              Then ${plusPrice.toFixed(2)}/mo · cancel anytime
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-2xl p-3" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 180))}
                placeholder={`Write a message to ${firstName}…`}
                rows={3}
                className="w-full text-[13.5px] resize-none outline-none"
                style={{
                  fontFamily: 'Albert Sans', color: C.ink, lineHeight: 1.5,
                  background: 'transparent',
                }}
              />
              <div className="mt-1 flex items-center justify-between text-[10.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>
                <span>{text.length} / 180 chars</span>
                {!isPremium && <span>· message {used + 1} of {freeLimit}</span>}
              </div>
            </div>

            <button onClick={handleSend} disabled={!canSend}
              className="mt-3 w-full rounded-2xl flex items-center justify-center gap-2"
              style={{
                height: 50,
                background: canSend ? C.terracotta : C.creamSoft,
                color: canSend ? '#fff' : C.inkMuted,
                border: canSend ? 'none' : `1px solid ${C.divider}`,
                fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 14.5,
              }}>
              <MessageCircle size={15}/> Send
            </button>

            {!isPremium && remaining === 1 && (
              <div className="mt-2 text-center text-[11px]" style={{ color: C.terracotta, fontFamily: 'Albert Sans', fontWeight: 500 }}>
                Last free message — make it count ✦
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};
