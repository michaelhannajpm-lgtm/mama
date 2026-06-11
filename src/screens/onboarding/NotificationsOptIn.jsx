import { useState } from 'react';
import { Bell, ArrowRight } from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { PrimaryBtn } from '../../components/PrimaryBtn';

// ==========================================================================
// NotificationsOptIn — the last onboarding beat. One bell, one coral CTA, one
// quiet "Not now". Shown once when the mom has no saved notification choice yet
// (settings.notifications.enabled is undefined). "Allow" fires the real browser
// permission prompt; either choice persists the preference so it never returns.
//   onAllow()  — request permission, persist enabled = result, enter the app
//   onSkip()   — persist enabled = false, enter the app
// ==========================================================================

export const NotificationsOptIn = ({ onAllow, onSkip }) => {
  const [busy, setBusy] = useState(false);

  const allow = async () => {
    if (busy) return;
    setBusy(true);
    try { await onAllow?.(); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col" style={{ height: '100%', background: C.cream, overflow: 'hidden' }}>
      <StatusBar/>

      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center" style={{ minHeight: 0 }}>
        {/* Soft coral bell badge — the single accent moment */}
        <div className="flex items-center justify-center rounded-full" style={{
          width: 84, height: 84, background: C.coralSoft,
          animation: 'popBadge 0.5s ease-out',
        }}>
          <Bell size={36} color={C.coral} strokeWidth={1.8}/>
        </div>

        <h2 className="mt-7" style={{ fontFamily: 'Fraunces', fontWeight: 400, fontSize: 27, lineHeight: 1.12, color: C.ink, letterSpacing: '-.02em' }}>
          Stay in the <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>loop</span>
        </h2>
        <p className="mt-2.5" style={{ fontFamily: 'Albert Sans', fontSize: 13.5, color: C.inkMuted, lineHeight: 1.5, maxWidth: 280 }}>
          We'll let you know when a mom replies or a meetup is coming up. No spam — just your village.
        </p>
      </div>

      <div style={{ padding: '6px 24px', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))', background: C.cream }}>
        <PrimaryBtn onClick={allow} disabled={busy} variant="terracotta">
          <Bell size={16} fill="currentColor"/> {busy ? 'One sec…' : 'Allow notifications'} <ArrowRight size={17}/>
        </PrimaryBtn>
        <button onClick={() => onSkip?.()} disabled={busy}
          className="w-full text-center active:scale-[.99] transition-transform"
          style={{ marginTop: 12, padding: '6px 0', background: 'transparent', border: 'none',
                   fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 600, color: C.inkMuted, cursor: 'pointer' }}>
          Not now
        </button>
      </div>
    </div>
  );
};
