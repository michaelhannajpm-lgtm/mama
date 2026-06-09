import { useState } from 'react';
import {
  MessageCircle, Mail, Link as LinkIcon, Copy, MoreHorizontal,
  Check, Send, Search, ShieldCheck,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// ShareSheet — wraps any shareable item (event / meetup / place / mom) in a
// channel-grid + per-mom invite picker. The channel grid runs SMS, WhatsApp,
// Email, Copy Link, X, Facebook, More; below that, a search-able list of
// nearby moms gets a multi-select check that turns into a coral "Invite N
// mom(s)" CTA at the bottom.
//
// Real send/share would route through navigator.share / mailto: / sms: in a
// production build; this prototype flashes a confirmation toast.
// ==========================================================================

// Inline SVG glyphs so we don't add a brand-icon dependency for the
// prototype. Each is sized 18 and inherits currentColor.
const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.4-.1-.6.1s-.7.9-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.9-2.1-.2-.5-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.2.2 2.1 3.1 5.1 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3M12 2A10 10 0 0 0 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5-1.3c1.5.8 3.2 1.3 5 1.3a10 10 0 1 0 0-20Z"/>
  </svg>
);

const XIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M18.244 2H21.5l-7.27 8.31L22.75 22h-6.71l-5.25-6.84L4.78 22H1.52l7.77-8.88L1.25 2h6.86l4.74 6.27L18.244 2Zm-2.34 18.03h1.82L7.25 3.87H5.31l10.594 16.16Z"/>
  </svg>
);

const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-7H8v-2.88h2.44v-2.2c0-2.4 1.44-3.74 3.64-3.74 1.06 0 2.16.19 2.16.19v2.38h-1.22c-1.2 0-1.58.74-1.58 1.5v1.87h2.68l-.43 2.88h-2.25V22A10 10 0 0 0 22 12Z"/>
  </svg>
);

const CHANNELS = [
  { id: 'sms',      label: 'Messages', Icon: MessageCircle, bg: '#E2EBD8', fg: '#5E7A3B' }, // sage
  { id: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon,  bg: '#DDF4E1', fg: '#2EA84E' },
  { id: 'email',    label: 'Email',    Icon: Mail,          bg: '#FCEEEE', fg: '#E96B7D' },
  { id: 'copy',     label: 'Copy link',Icon: Copy,          bg: '#EDE4F4', fg: '#5E4A8A' },
  { id: 'x',        label: 'X',        Icon: XIcon,         bg: '#1B2A4E', fg: '#FFFFFF' },
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon,  bg: '#E8F0FE', fg: '#1877F2' },
  { id: 'more',     label: 'More',     Icon: MoreHorizontal,bg: '#F1ECE8', fg: '#1B2A4E' },
];

// Default invitee pool — surfaces nearby moms when no caller-supplied list
// is provided. Mirrors the shape of ConnectTab's MOMS array, since that's
// the most common context for sharing.
const DEFAULT_NEARBY_MOMS = [
  { id: 'sm1', name: 'Sarah',   kids: '2 kids', distance: '0.4 mi',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop' },
  { id: 'sm2', name: 'Amanda',  kids: '1 kid',  distance: '0.7 mi',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop' },
  { id: 'sm3', name: 'Jessica', kids: '2 kids', distance: '0.8 mi',
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=160&auto=format&fit=crop' },
  { id: 'sm4', name: 'Priya',   kids: '1 kid',  distance: '0.9 mi',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop' },
  { id: 'sm5', name: 'Emily',   kids: '3 kids', distance: '1.0 mi',
    photo: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=160&auto=format&fit=crop' },
  { id: 'sm6', name: 'Mia',     kids: '2 kids', distance: '1.1 mi',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&auto=format&fit=crop' },
];

const FALLBACK_TITLE = 'Share with another mom';

export const ShareSheet = ({
  item,                 // { title, kind?, photo?, place?, when? } — the thing being shared
  invitees = DEFAULT_NEARBY_MOMS,
  onClose,
  flash,
}) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const toggleMom = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const filtered = invitees.filter(m =>
    !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const shareTitle = item?.title || FALLBACK_TITLE;
  const subtitle = item?.when || item?.place || (item?.kind || 'Send to friends');

  const handleChannel = (ch) => {
    if (ch.id === 'copy') {
      setCopied(true);
      flash?.('✦ Link copied to clipboard');
      setTimeout(() => setCopied(false), 1600);
      return;
    }
    flash?.(`Opening ${ch.label}…`);
    onClose?.();
  };

  const sendInvites = () => {
    if (selected.size === 0) return;
    flash?.(`✦ Invite sent to ${selected.size} mom${selected.size === 1 ? '' : 's'}`);
    onClose?.();
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        {/* Header — what's being shared */}
        <div className="text-[11px] tracking-[.18em] uppercase" style={{
          color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 700,
        }}>
          Share
        </div>
        <div className="mt-1.5" style={{
          fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600,
          color: C.navy, letterSpacing: '-.02em', lineHeight: 1.15,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {shareTitle}
        </div>
        {subtitle && (
          <div className="mt-1" style={{
            fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, lineHeight: 1.3,
          }}>
            {subtitle}
          </div>
        )}

        {/* Channel grid */}
        <div className="mt-5">
          <SectionLabel>Send via</SectionLabel>
          <div
            className="flex gap-3 overflow-x-auto"
            style={{ scrollbarWidth: 'none', paddingBottom: 4, marginTop: 6 }}
          >
            {CHANNELS.map(ch => {
              const isCopy = ch.id === 'copy' && copied;
              const Icon = isCopy ? Check : ch.Icon;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleChannel(ch)}
                  className="flex-shrink-0 flex flex-col items-center active:scale-[.96] transition-transform"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    width: 64,
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 26,
                    background: isCopy ? C.sageDark : ch.bg,
                    color: isCopy ? '#fff' : ch.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 8px -6px rgba(27,42,78,.2)',
                  }}>
                    <Icon size={20}/>
                  </div>
                  <div style={{
                    marginTop: 6,
                    fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
                    color: C.navy, lineHeight: 1.15, textAlign: 'center',
                  }}>
                    {isCopy ? 'Copied' : ch.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Invite specific moms */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Invite moms directly</SectionLabel>
            <span style={{
              fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, fontWeight: 600,
            }}>
              {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} nearby`}
            </span>
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-full px-3 mt-2"
            style={{ background: C.paper, border: `1px solid ${C.divider}`, height: 36 }}
          >
            <Search size={13} color={C.muted}/>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a mom by name…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'Albert Sans', fontSize: 12.5, color: C.navy,
              }}
            />
          </div>

          {/* Mom rows */}
          <div className="mt-3 space-y-1.5" style={{ maxHeight: 224, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {filtered.length === 0 ? (
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
                padding: '14px 8px', textAlign: 'center',
              }}>
                No moms match "{query}".
              </div>
            ) : filtered.map(m => {
              const checked = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMom(m.id)}
                  className="w-full flex items-center gap-3 rounded-2xl px-2.5 py-2 active:scale-[.99] transition-transform"
                  style={{
                    background: checked ? C.coralSoft : '#fff',
                    border: `1px solid ${checked ? C.coral : C.divider}`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <img src={m.photo} alt="" style={{
                    width: 38, height: 38, borderRadius: 19, objectFit: 'cover',
                  }}/>
                  <div className="flex-1 min-w-0">
                    <div style={{
                      fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
                      color: C.navy, lineHeight: 1.1,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      {m.name}
                      {m.verified !== false && (
                        <ShieldCheck size={11} color={C.sageDark}/>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'Albert Sans', fontSize: 11, color: C.muted, marginTop: 1,
                    }}>
                      {m.kids} · {m.distance}
                    </div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11,
                    background: checked ? C.coralDeep : '#fff',
                    border: `1.5px solid ${checked ? C.coralDeep : C.divider}`,
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {checked && <Check size={12}/>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <button
          onClick={sendInvites}
          disabled={selected.size === 0}
          className="mt-5 w-full rounded-2xl flex items-center justify-center gap-2 active:scale-[.99] transition-transform"
          style={{
            height: 50,
            background: selected.size > 0
              ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`
              : C.paper,
            color: selected.size > 0 ? '#fff' : C.muted,
            border: selected.size > 0 ? 'none' : `1px solid ${C.divider}`,
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            cursor: selected.size > 0 ? 'pointer' : 'default',
            boxShadow: selected.size > 0 ? '0 6px 16px -6px rgba(214,68,106,.55)' : 'none',
          }}
        >
          <Send size={15}/>
          {selected.size === 0
            ? 'Pick moms to invite'
            : `Invite ${selected.size} mom${selected.size === 1 ? '' : 's'}`}
        </button>
        <div className="mt-2 text-center" style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
        }}>
          They'll get a private invite — no spammy broadcast.
        </div>
      </div>
    </Sheet>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="uppercase"
    style={{
      fontFamily: 'Albert Sans', fontSize: 10.5, letterSpacing: '.16em',
      color: C.muted, fontWeight: 700,
    }}
  >
    {children}
  </div>
);

// Convenience re-export so default imports don't break.
export default ShareSheet;
