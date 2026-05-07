import { useState } from 'react';
import { Crown, MessageCircle } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

export const MessageSheet = ({ mom, history, onSend, isPremium, onClose, openPremium }) => {
  const FREE_LIMIT = 3;
  const userMessages = history.filter(m => m.fromUser);
  const used = userMessages.length;
  const remaining = FREE_LIMIT - used;
  const limitReached = !isPremium && remaining <= 0;

  const [text, setText] = useState(history.length === 0
    ? `Hi ${mom.name.split(' ')[0]}! Saw we both have a ${mom.kids.split(' · ')[0]} kid and free ${mom.nextSlot ? mom.nextSlot.split(' ')[0] : 'Tue'} mornings. Want to grab coffee?`
    : '');

  const canSend = text.trim().length > 0 && !limitReached;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6 flex flex-col" style={{ minHeight: 540 }}>
        {/* Header */}
        <div>
          <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
            Message {mom.name.split(' ')[0]}
          </div>
          <h3 className="mt-1.5" style={{ fontFamily:'Fraunces', fontSize: 22, fontWeight:500, color: C.ink, letterSpacing:'-.02em' }}>
            {isPremium
              ? <>Chat <span style={{ fontStyle:'italic', color: C.terracotta }}>unlimited</span>.</>
              : <>Your first <span style={{ fontStyle:'italic', color: C.terracotta }}>3 messages</span> are free.</>}
          </h3>
        </div>

        {/* Free counter — only for non-Plus */}
        {!isPremium && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-full" style={{
                  width: 18, height: 6,
                  background: i < used ? C.terracotta : C.divider,
                  opacity: i < used ? 1 : .6,
                }}/>
              ))}
            </div>
            <div className="text-[11px]" style={{ fontFamily:'Albert Sans', color: limitReached ? C.terracotta : C.inkSoft, fontWeight: limitReached ? 600 : 500 }}>
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
            <span className="text-[10px] tracking-[.12em] uppercase" style={{ fontFamily:'Albert Sans', fontWeight:700, color: C.ink }}>
              Plus · unlimited
            </span>
          </div>
        )}

        {/* Thread — show prior sent messages */}
        {history.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth:'none' }}>
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.fromUser ? 'justify-end' : 'justify-start'}`}>
                <div className="rounded-2xl px-3.5 py-2 max-w-[85%]" style={{
                  background: m.fromUser ? C.terracotta : C.paper,
                  color: m.fromUser ? '#fff' : C.ink,
                  border: m.fromUser ? 'none' : `1px solid ${C.divider}`,
                  borderBottomRightRadius: m.fromUser ? 6 : 16,
                  borderBottomLeftRadius: m.fromUser ? 16 : 6,
                }}>
                  <div className="text-[13px]" style={{ fontFamily:'Albert Sans', lineHeight: 1.4 }}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input OR upsell */}
        {limitReached ? (
          <div className="mt-4 rounded-2xl p-4" style={{ background: C.ink, color: C.cream }}>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} style={{ color: C.saffron }}/>
              <div style={{ fontFamily:'Fraunces', fontSize: 15.5, fontWeight: 500 }}>
                Keep the conversation going
              </div>
            </div>
            <div className="text-[12px] mb-3" style={{ fontFamily:'Albert Sans', opacity: .8, lineHeight: 1.4 }}>
              You've used your 3 free messages with {mom.name.split(' ')[0]}. Plus unlocks unlimited chat with every match.
            </div>
            <button onClick={openPremium} className="w-full rounded-xl flex items-center justify-center gap-2"
              style={{
                height: 44, background: C.saffron, color: C.ink,
                fontFamily:'Albert Sans', fontWeight: 600, fontSize: 13.5,
              }}>
              <Crown size={14}/> Try Plus · 7 days free
            </button>
            <div className="mt-1.5 text-center text-[10.5px]" style={{ fontFamily:'Albert Sans', opacity: .55 }}>
              Then $7.99/mo · cancel anytime
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-2xl p-3" style={{ background: C.paper, border:`1px solid ${C.divider}` }}>
              <textarea
                value={text}
                onChange={(e)=>setText(e.target.value.slice(0, 180))}
                placeholder={`Write a message to ${mom.name.split(' ')[0]}…`}
                rows={3}
                className="w-full text-[13.5px] resize-none outline-none"
                style={{
                  fontFamily:'Albert Sans', color: C.ink, lineHeight: 1.5,
                  background: 'transparent',
                }}
              />
              <div className="mt-1 flex items-center justify-between text-[10.5px]" style={{ color: C.inkMuted, fontFamily:'Albert Sans' }}>
                <span>{text.length} / 180 chars</span>
                {!isPremium && <span>· message {used + 1} of {FREE_LIMIT}</span>}
              </div>
            </div>

            <button onClick={handleSend} disabled={!canSend}
              className="mt-3 w-full rounded-2xl flex items-center justify-center gap-2"
              style={{
                height: 50,
                background: canSend ? C.terracotta : C.creamSoft,
                color: canSend ? '#fff' : C.inkMuted,
                border: canSend ? 'none' : `1px solid ${C.divider}`,
                fontFamily:'Albert Sans', fontWeight: 600, fontSize: 14.5,
              }}>
              <MessageCircle size={15}/> Send
            </button>

            {!isPremium && remaining === 1 && (
              <div className="mt-2 text-center text-[11px]" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight: 500 }}>
                Last free message — make it count ✦
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};
