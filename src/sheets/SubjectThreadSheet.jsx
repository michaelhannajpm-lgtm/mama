import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { ConversationFeed } from '../components/ConversationFeed';
import { getSubjectConversation } from '../lib/chat';

// A discussion thread attached to a place / event / activity / meetup. `subject` is
// { type:'place'|'event'|'activity'|'meetup-chat', id, title, expiresHint? }.
// `expiresHint` (e.g. "2 days after meetup") surfaces a small banner so users
// understand the thread is intentionally short-lived.
export const SubjectThreadSheet = ({ subject, author, myUserId, flash, onClose }) => {
  const [convId, setConvId] = useState(null);
  useEffect(() => {
    if (!subject?.id) return;
    getSubjectConversation(subject.type, subject.id, subject.title).then(setConvId).catch(() => {});
  }, [subject?.type, subject?.id]);

  const isMeetupChat = subject?.type === 'meetup-chat';
  const eyebrow = isMeetupChat ? 'Meetup group chat' : 'Discussion';

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          {eyebrow}
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, color: C.navy }}>
          {subject?.title}
        </h3>
        {subject?.expiresHint && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full"
            style={{
              background: C.sage, color: C.sageDark,
              padding: '4px 10px',
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700,
              border: `1px solid ${C.sageDark}33`,
            }}
          >
            <Clock size={11}/> Closes {subject.expiresHint}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          {convId && <ConversationFeed
            conversationId={convId} author={author} myUserId={myUserId}
            placeholder={isMeetupChat
              ? 'Say hi to the moms going…'
              : `Ask or share about ${subject?.title}…`} flash={flash}/>}
        </div>
      </div>
    </Sheet>
  );
};
