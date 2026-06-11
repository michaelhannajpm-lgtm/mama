import { useState } from 'react';
import { RotateCcw, Clock } from 'lucide-react';
import { C } from '../theme';
import { StatusBar } from '../components/StatusBar';
import { PrimaryBtn } from '../components/PrimaryBtn';

// DeletedScreen — root gate shown after login when account_status is 'deleted'.
// Within the 30-day window the user can restore; after that it's a terminal
// "this account has been deleted" with only Sign out. No app access either way.
//
// Props:
//   deletedAt   — ISO timestamp the delete was requested
//   onRestore   — async; flips the account back to active on success
//   onSignOut   — leaves to the Landing screen
const DAY_MS = 24 * 60 * 60 * 1000;

const daysLeft = (deletedAtIso) => {
  if (!deletedAtIso) return 0;
  const t = Date.parse(deletedAtIso);
  if (Number.isNaN(t)) return 0;
  return Math.ceil((t + 30 * DAY_MS - Date.now()) / DAY_MS);
};

export const DeletedScreen = ({ deletedAt, onRestore, onSignOut }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const left = daysLeft(deletedAt);
  const restorable = left > 0;

  const restore = async () => {
    setBusy(true); setErr(null);
    try {
      await onRestore?.();
    } catch (e) {
      setErr(e?.message || "We couldn't restore just now — please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div style={{
          width: 60, height: 60, borderRadius: 20, marginBottom: 22,
          background: restorable ? C.coralSoft : C.divider,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {restorable
            ? <RotateCcw size={24} color={C.coralDeep}/>
            : <Clock size={24} color={C.muted}/>}
        </div>

        <h1 style={{
          fontFamily: 'Fraunces', fontSize: 26, fontWeight: 600, color: C.navy,
          letterSpacing: '-.02em', lineHeight: 1.14,
        }}>
          {restorable ? (
            <>Your account is <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>waiting</span></>
          ) : (
            'This account has been deleted'
          )}
        </h1>

        <p style={{
          fontFamily: 'Albert Sans', fontSize: 14, color: C.inkSoft,
          lineHeight: 1.5, marginTop: 12, maxWidth: 300,
        }}>
          {restorable ? (
            <>You asked us to delete your account. We'll erase everything in{' '}
              <strong style={{ color: C.navy }}>{left} day{left === 1 ? '' : 's'}</strong>.
              Change your mind? Restore it now and pick up right where you left off.</>
          ) : (
            <>Your account and personal data have been removed. Thanks for being
              part of Go Mama — you're always welcome back with a fresh start.</>
          )}
        </p>

        {err && (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 12.5, color: C.coralDeep,
            fontWeight: 600, marginTop: 16,
          }}>
            {err}
          </div>
        )}

        {restorable && (
          <div style={{ width: '100%', maxWidth: 320, marginTop: 28 }}>
            <PrimaryBtn variant="coral" onClick={restore} disabled={busy}>
              {busy ? 'Restoring…' : 'Restore my account'}
            </PrimaryBtn>
          </div>
        )}

        <button
          onClick={onSignOut}
          disabled={busy}
          style={{
            marginTop: restorable ? 18 : 28, background: 'transparent', border: 'none',
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
