import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// DeleteAccountSheet — captures a leaving reason (stored in the DB) then a
// two-step confirm before a permanent (soft) delete. Content-sized drawer, not
// full-screen — this is a focused decision, not a browsing surface.
//
// Props:
//   onConfirm  — async ({ reasonCode, reasonNote }) => void. Throws on failure.
//   onClose    — dismiss without deleting.
const REASONS = [
  { code: 'found_my_people',       label: 'I found my people' },
  { code: 'not_enough_moms',       label: 'Not enough moms nearby' },
  { code: 'too_many_notifications',label: 'Too many notifications' },
  { code: 'privacy',               label: 'Privacy concerns' },
  { code: 'taking_a_break',        label: 'Just taking a break' },
  { code: 'other',                 label: 'Something else' },
];

export const DeleteAccountSheet = ({ onConfirm, onClose }) => {
  const [reasonCode, setReasonCode] = useState(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await onConfirm?.({ reasonCode, reasonNote: note.trim() });
      // On success the parent unmounts this sheet (signs out → gate). No-op here.
    } catch (e) {
      setErr(e?.message || "We couldn't process that — please try again.");
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Before you go
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Delete your <span style={{ fontStyle: 'italic', color: C.coral }}>account</span>
        </h3>

        {!confirming ? (
          <>
            <p style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginTop: 8 }}>
              We'd love to know why you're leaving — it helps us make Go Mama
              better for other moms.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {REASONS.map((r) => {
                const on = reasonCode === r.code;
                return (
                  <button
                    key={r.code}
                    onClick={() => setReasonCode(r.code)}
                    className="active:scale-[.97] transition-transform"
                    style={{
                      padding: '8px 13px', borderRadius: 999,
                      background: on ? C.coralDeep : '#fff',
                      color: on ? '#fff' : C.navy,
                      border: `1px solid ${on ? C.coralDeep : C.divider}`,
                      fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              placeholder="Anything else you'd like us to know? (optional)"
              rows={3}
              style={{
                marginTop: 14, width: '100%', resize: 'none',
                background: '#fff', border: `1px solid ${C.divider}`, borderRadius: 12,
                padding: '10px 12px', fontFamily: 'Albert Sans', fontSize: 13, color: C.navy,
                outline: 'none', lineHeight: 1.45,
              }}
            />

            <button
              onClick={() => setConfirming(true)}
              disabled={!reasonCode}
              className="mt-5 w-full rounded-2xl active:scale-[.99] transition-transform"
              style={{
                height: 50,
                background: reasonCode ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : '#E7DAD3',
                color: '#fff', fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
                border: 'none', cursor: reasonCode ? 'pointer' : 'default',
                boxShadow: reasonCode ? '0 6px 16px -6px rgba(214,68,106,.5)' : 'none',
              }}
            >
              Continue
            </button>

            <button
              onClick={onClose}
              className="mt-3 w-full"
              style={{
                background: 'transparent', border: 'none', padding: 6,
                fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.muted, cursor: 'pointer',
              }}
            >
              Keep my account
            </button>
          </>
        ) : (
          <>
            <div style={{
              marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start',
              background: `${C.coral}10`, border: `1px solid ${C.coral}33`,
              borderRadius: 14, padding: '12px 13px',
            }}>
              <AlertTriangle size={18} color={C.coralDeep} style={{ flexShrink: 0, marginTop: 1 }}/>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
                This hides your profile right away and <strong style={{ color: C.navy }}>erases
                everything in 30 days</strong>. Changed your mind? Just log back in
                within 30 days to restore it.
              </div>
            </div>

            {err && (
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.coralDeep, fontWeight: 600, marginTop: 14 }}>
                {err}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy}
              className="mt-5 w-full rounded-2xl active:scale-[.99] transition-transform"
              style={{
                height: 50, background: C.coralDeep, color: '#fff',
                fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 14, border: 'none',
                cursor: busy ? 'default' : 'pointer',
                boxShadow: '0 6px 16px -6px rgba(214,68,106,.5)',
              }}
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>

            <button
              onClick={() => { setConfirming(false); setErr(null); }}
              disabled={busy}
              className="mt-3 w-full"
              style={{
                background: 'transparent', border: 'none', padding: 6,
                fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.muted,
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              Go back
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
};
