import { useState, useEffect, useRef } from 'react';
import { C } from '../../theme';
import { EventBubble } from './EventBubble';

export function ChatPane({ events, onSend, busy }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events.length]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: C.cream }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {events.length === 0 && (
          <div style={{ color: C.inkMuted, fontFamily: 'Albert Sans, sans-serif', fontSize: 14, textAlign: 'center', marginTop: 80 }}>
            Type a prompt below. Claude will edit the code, commit to <code>release-latest</code>, and deploy a preview.
          </div>
        )}
        {events.map((e) => <EventBubble key={e.id} event={e} />)}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${C.divider}`, background: C.paper }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Ask Claude to make a change… (Cmd/Ctrl+Enter to send)"
          rows={3}
          style={{ flex: 1, padding: 8, fontFamily: 'Albert Sans, sans-serif', fontSize: 14, border: `1px solid ${C.divider}`, borderRadius: 4, resize: 'vertical' }}
          disabled={busy}
        />
        <button onClick={submit} disabled={busy || !text.trim()} style={{
          background: busy ? C.inkMuted : C.terracotta, color: 'white', border: 'none',
          padding: '0 16px', borderRadius: 4, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', minWidth: 80,
        }}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
