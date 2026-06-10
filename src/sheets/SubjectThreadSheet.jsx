import { useEffect, useState } from 'react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { ConversationFeed } from '../components/ConversationFeed';
import { getSubjectConversation } from '../lib/chat';

// A discussion thread attached to a place / event / activity. `subject` is
// { type:'place'|'event'|'activity', id, title }.
export const SubjectThreadSheet = ({ subject, author, myUserId, flash, onClose }) => {
  const [convId, setConvId] = useState(null);
  useEffect(() => {
    if (!subject?.id) return;
    getSubjectConversation(subject.type, subject.id, subject.title).then(setConvId).catch(() => {});
  }, [subject?.type, subject?.id]);

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Discussion
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, color: C.navy }}>
          {subject?.title}
        </h3>
        <div style={{ marginTop: 14 }}>
          {convId && <ConversationFeed
            conversationId={convId} author={author} myUserId={myUserId}
            placeholder={`Ask or share about ${subject?.title}…`} flash={flash}/>}
        </div>
      </div>
    </Sheet>
  );
};
