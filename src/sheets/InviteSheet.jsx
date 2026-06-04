import { useState, useMemo } from 'react';
import { Send, Copy, MessageCircle, Instagram, Mail, Share2, Check } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { SAMPLE_MOMS } from '../data/moms';

// ==========================================================================
// InviteSheet — opens from the "Invite" button on an event/place card.
// Lets the user pick a date/time, customise a message, share via social,
// and tick which matched moms should receive a direct invite.
// ==========================================================================

// Map event.day ('Sat') → next concrete date string for the prefilled input.
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const nextDateForDayLabel = (label) => {
  const target = DAY_NAMES.indexOf(label);
  if (target < 0) return null;
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};
const time12to24 = (s) => {
  if (!s) return '10:00';
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(s);
  if (!m) return '10:00';
  let h = Number(m[1]); const min = m[2]; const mer = m[3].toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${min}`;
};

const SectionLabel = ({ children }) => (
  <div
    className="uppercase"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700, marginBottom: 8,
    }}
  >
    {children}
  </div>
);

// Single share-channel chip. Coral when active; default = paper.
const ShareBtn = ({ icon: Icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 transition-all active:scale-95"
    style={{
      width: 64, padding: '8px 4px', borderRadius: 14,
      background: active ? C.coralSoft : C.paper,
      border: `1px solid ${active ? C.coralDeep : C.divider}`,
    }}
  >
    <Icon size={18} color={active ? C.coralDeep : C.navySoft}/>
    <span style={{ fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 700, color: C.navy }}>
      {label}
    </span>
  </button>
);

export const InviteSheet = ({ item, kind, onClose, onSent, flash }) => {
  // Prefill date/time for events; blank for places.
  const initDate = kind === 'event' ? nextDateForDayLabel(item.day) || '' : '';
  const initTime = kind === 'event' ? time12to24(item.time) : '10:00';
  const defaultMsg = kind === 'event'
    ? `Come with me to ${item.name} on ${item.day} at ${item.time}! Would love to hang ✦`
    : `Want to meet at ${item.name}? Let me know if you're in ✦`;

  const [date, setDate] = useState(initDate);
  const [time, setTime] = useState(initTime);
  const [msg, setMsg]   = useState(defaultMsg);
  const [picked, setPicked] = useState(() => new Set());
  const [copied, setCopied] = useState(false);

  const matched = useMemo(() => SAMPLE_MOMS.slice(0, 6), []);

  const togglePick = (id) => {
    setPicked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const shareLink = `https://gomama.app/i/${item.id}`;
  const shareText = encodeURIComponent(`${msg}\n${shareLink}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${msg}\n${shareLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      flash?.('Copy not supported');
    }
  };
  const openWhatsApp = () => window.open(`https://wa.me/?text=${shareText}`, '_blank');
  const openSms      = () => window.open(`sms:?&body=${shareText}`, '_blank');
  const openEmail    = () => window.open(`mailto:?subject=${encodeURIComponent('Come with me')}&body=${shareText}`, '_blank');
  const openInsta    = () => { copyLink(); flash?.('Copied · paste in Instagram'); };
  const openNative   = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: item.name, text: msg, url: shareLink }); }
      catch { /* user cancelled */ }
    } else { copyLink(); }
  };

  const sendCount = picked.size;
  const send = () => {
    onSent?.({ picked: [...picked], msg, date, time });
    onClose();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Bring mom friends
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Invite to <span style={{ fontStyle: 'italic', color: C.coral }}>{item.name}</span>
        </h3>

        {/* Item summary card */}
        <div
          className="mt-4 rounded-2xl overflow-hidden flex"
          style={{ background: C.paper, border: `1px solid ${C.divider}` }}
        >
          {kind === 'event' && item.photo && (
            <div style={{
              width: 88, height: 88, flexShrink: 0,
              backgroundImage: `url('${item.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center',
            }}/>
          )}
          <div className="flex-1 px-3 py-2.5 min-w-0">
            <div className="truncate" style={{
              fontFamily: 'Fraunces', fontWeight: 600, fontSize: 14, color: C.navy, letterSpacing: '-.01em',
            }}>
              {item.name}
            </div>
            <div className="truncate mt-0.5" style={{
              fontFamily: 'Albert Sans', fontSize: 11, color: C.muted,
            }}>
              {kind === 'event' ? `${item.place}` : `${item.area} · ${item.dist} mi`}
            </div>
          </div>
        </div>

        {/* Date + Time */}
        <div className="mt-5">
          <SectionLabel>When</SectionLabel>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                flex: 1, padding: '12px 12px',
                borderRadius: 12, background: C.paper,
                border: `1px solid ${C.divider}`,
                fontFamily: 'Albert Sans', fontSize: 13, color: C.navy,
                outline: 'none',
              }}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: 110, padding: '12px 12px',
                borderRadius: 12, background: C.paper,
                border: `1px solid ${C.divider}`,
                fontFamily: 'Albert Sans', fontSize: 13, color: C.navy,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Message */}
        <div className="mt-5">
          <SectionLabel>Message</SectionLabel>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: 12,
              borderRadius: 14, background: C.paper,
              border: `1px solid ${C.divider}`,
              fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy,
              resize: 'none', outline: 'none', lineHeight: 1.4,
            }}
          />
        </div>

        {/* Share via */}
        <div className="mt-5">
          <SectionLabel>Share via</SectionLabel>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <ShareBtn icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy'} onClick={copyLink} active={copied}/>
            <ShareBtn icon={MessageCircle} label="WhatsApp" onClick={openWhatsApp}/>
            <ShareBtn icon={MessageCircle} label="Messages" onClick={openSms}/>
            <ShareBtn icon={Instagram}     label="Instagram" onClick={openInsta}/>
            <ShareBtn icon={Mail}          label="Email"     onClick={openEmail}/>
            <ShareBtn icon={Share2}        label="More"      onClick={openNative}/>
          </div>
        </div>

        {/* Pick moms to invite */}
        <div className="mt-5">
          <SectionLabel>Or send direct · pick moms</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {matched.map(m => {
              const active = picked.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => togglePick(m.id)}
                  className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-all active:scale-[.97]"
                  style={{
                    background: active ? C.coralSoft : C.paper,
                    border: `1px solid ${active ? C.coralDeep : C.divider}`,
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundImage: `url('${m.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center',
                  }}/>
                  <span style={{
                    fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700,
                    color: active ? C.coralDeep : C.navy,
                  }}>
                    {m.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={send}
          disabled={sendCount === 0}
          className="mt-6 w-full rounded-2xl flex items-center justify-center gap-1.5"
          style={{
            height: 50,
            background: sendCount === 0 ? C.divider : `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            color: sendCount === 0 ? C.muted : '#fff',
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            boxShadow: sendCount === 0 ? 'none' : '0 6px 16px -6px rgba(214,68,106,.55)',
          }}
        >
          <Send size={14}/>
          {sendCount === 0 ? 'Pick moms or share above' : `Send invite · ${sendCount}`}
        </button>
      </div>
    </Sheet>
  );
};
