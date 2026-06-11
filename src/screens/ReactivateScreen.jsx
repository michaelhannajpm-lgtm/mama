import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';
import { PrimaryBtn } from '../components/PrimaryBtn';

// ReactivateScreen — root gate shown after login when account_status is
// 'deactivated'. The user cannot reach any tab until she reactivates (or signs
// out). Warm welcome-back, one coral CTA, calm.
//
// Props:
//   firstName     — for the greeting
//   onReactivate  — async; flips the account back to active on success
//   onSignOut     — leaves to the Landing screen
export const ReactivateScreen = ({ firstName, onReactivate, onSignOut }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const reactivate = async () => {
    setBusy(true); setErr(null);
    try {
      await onReactivate?.();
    } catch (e) {
      setErr(e?.message || "We couldn't reactivate just now — please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div style={{
          width: 60, height: 60, borderRadius: 20, marginBottom: 22,
          background: C.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={26} color={C.coralDeep}/>
        </div>

        <h1 style={{
          fontFamily: 'Fraunces', fontSize: 27, fontWeight: 600, color: C.navy,
          letterSpacing: '-.02em', lineHeight: 1.12,
        }}>
          Welcome back{firstName ? `, ` : ''}
          {firstName && <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>{firstName}</span>}
        </h1>

        <p style={{
          fontFamily: 'Albert Sans', fontSize: 14, color: C.inkSoft,
          lineHeight: 1.5, marginTop: 12, maxWidth: 300,
        }}>
          Your account is paused, so you're hidden from matching. Reactivate to
          jump back into your village.
        </p>

        {err && (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 12.5, color: C.coralDeep,
            fontWeight: 600, marginTop: 16,
          }}>
            {err}
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 320, marginTop: 28 }}>
          <PrimaryBtn variant="coral" onClick={reactivate} disabled={busy}>
            {busy ? 'Reactivating…' : 'Reactivate my account'}
          </PrimaryBtn>
        </div>

        <button
          onClick={onSignOut}
          disabled={busy}
          style={{
            marginTop: 18, background: 'transparent', border: 'none',
            fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
            color: C.muted, cursor: busy ? 'default' : 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};
