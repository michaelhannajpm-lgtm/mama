import { ShieldCheck, ArrowRight } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// VerifyPromptSheet — gates verified-only actions (connect with a mom,
// RSVP to a meetup, join a group) when the current profile isn't verified
// yet. Action-specific headline so the prompt reads as a direct response
// to whatever the user just tapped. Primary CTA jumps to the Profile tab
// where verification lives.
// ==========================================================================

const ACTION_COPY = {
  connect: {
    title: 'Verify to connect',
    detail: 'Verified moms can request to connect with other moms in Go Mama.',
  },
  meetup: {
    title: 'Verify to RSVP',
    detail: 'Meetups are for verified moms — it keeps groups safe and high-trust.',
  },
  group: {
    title: 'Verify to join',
    detail: 'Mom groups are verified-only so every conversation stays grounded.',
  },
};

const DEFAULT_COPY = {
  title: 'Verify your profile',
  detail: 'Go Mama is a verified-only space. Take 30 seconds to verify so you can join in.',
};

export const VerifyPromptSheet = ({
  action,        // 'connect' | 'meetup' | 'group'
  contextName,   // optional — mom name, meetup title, group title
  onVerify,      // jump to the verify flow (Profile tab)
  onClose,
}) => {
  const copy = ACTION_COPY[action] || DEFAULT_COPY;

  return (
    <Sheet onClose={onClose}>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          One more step
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 24, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em', lineHeight: 1.1,
          }}
        >
          {copy.title}
          {contextName && (
            <span style={{ display: 'block', color: C.coral, fontStyle: 'italic', marginTop: 2 }}>
              {contextName}
            </span>
          )}
        </h3>

        <div
          className="flex items-start gap-3"
          style={{
            marginTop: 18, padding: '14px 14px',
            background: `linear-gradient(135deg, ${C.peach}, ${C.coralSoft})`,
            borderRadius: 14, border: `1px solid ${C.coralSoft}`,
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: '#fff', color: C.coralDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={18}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 800, color: C.navy,
            }}>
              {copy.detail}
            </div>
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft,
              marginTop: 4, lineHeight: 1.4,
            }}>
              Connect Instagram or Facebook, then add a real photo. Takes about 30 seconds.
            </div>
          </div>
        </div>

        <button
          onClick={() => { onVerify?.(); onClose?.(); }}
          className="w-full active:scale-[.99] transition-transform"
          style={{
            marginTop: 18, height: 52, borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 14.5,
            boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)',
          }}
        >
          Verify now <ArrowRight size={16}/>
        </button>
        <button
          onClick={onClose}
          className="w-full"
          style={{
            marginTop: 8, height: 44, background: 'transparent', border: 'none',
            color: C.inkSoft, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </Sheet>
  );
};
