import { UserPlus } from 'lucide-react';
import { C } from '../theme';

// ==========================================================================
// InviteFriendButton — coral pill CTA rendered at the bottom of Home,
// Connect, and Explore tabs. Uses the Web Share API when available, otherwise
// falls back to copying the app URL and flashing a confirmation toast.
//
// Renders only the button (no horizontal padding wrapper) so callers control
// the surrounding gutter — HomeTab/ConnectTab scrollers are already px-5,
// LocalPicksTab's scroller is bare and wraps in `<div className="px-5">`.
// ==========================================================================

const INVITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://gomama.app';
const INVITE_TEXT = 'Found my mom-village on Go Mama — come join 💛';

export const InviteFriendButton = ({ flash }) => {
  const onClick = async () => {
    const payload = { title: 'Go Mama', text: INVITE_TEXT, url: INVITE_URL };
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share(payload); return; }
      catch { /* user cancelled or share failed — fall through to copy */ }
    }
    try {
      await navigator.clipboard?.writeText(`${INVITE_TEXT} ${INVITE_URL}`);
      flash?.('✦ Invite link copied');
    } catch {
      flash?.('Share unsupported on this device');
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full active:scale-[.99] transition-transform"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14,
        background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
        color: '#fff', border: 'none', cursor: 'pointer',
        fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13.5,
        boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)',
        marginTop: 20, marginBottom: 6,
      }}
    >
      <UserPlus size={15}/>
      Invite a friend
    </button>
  );
};
