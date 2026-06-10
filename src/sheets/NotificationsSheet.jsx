import { Bell, MessageCircle, CalendarDays, Users, Sparkles, Check } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// NotificationsSheet — the bell launcher's dedicated panel.
// Surfaces *received* communications across surfaces: direct messages,
// event RSVPs/reminders, new mom matches, connection requests, group
// activity. Tap a chat row to open the message thread; everything else
// flashes a confirmation.
// ==========================================================================

const ICON_BY_KIND = {
  message:    MessageCircle,
  meetup:     CalendarDays,
  match:      Sparkles,
  connection: Users,
  group:      Users,
  rsvp:       Check,
  reminder:   Bell,
};

const ACCENT_BY_KIND = {
  message:    C.coralDeep,
  meetup:     C.sageDark,
  match:      C.coralDeep,
  connection: C.coralDeep,
  group:      '#5E4A8A',
  rsvp:       C.sageDark,
  reminder:   C.coralDeep,
};

// Seed feed — feels alive on first open even before real backend wiring.
const SEED_NOTIFS = [
  { id: 'n_msg_sa', kind: 'message',
    title: 'Sarah K. sent you a message',
    detail: '"Park tomorrow at 10 works for me!"',
    when: '2m',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop' },
  { id: 'n_match_em', kind: 'match',
    title: 'Emily P. matched with you',
    detail: 'You both love stroller runs · 0.6 mi away',
    when: '12m',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop' },
  { id: 'n_meetup_strl', kind: 'meetup',
    title: 'Reminder · Stroller Walk + Coffee',
    detail: 'Tomorrow 9:00 AM · Bayshore Boulevard',
    when: '1h' },
  { id: 'n_msg_am', kind: 'message',
    title: 'Amanda R. sent you a message',
    detail: '"Sent the daycare list — let me know what you think"',
    when: '3h',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop' },
  { id: 'n_rsvp_brunch', kind: 'rsvp',
    title: 'Mia confirmed Sat Mom Brunch',
    detail: "12:30 PM · Daily Eats · South Tampa",
    when: '4h',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop' },
  { id: 'n_group_sleep', kind: 'group',
    title: 'New post in Sleep training in South Tampa',
    detail: '5 new replies since you last checked',
    when: '6h' },
  { id: 'n_conn_jp', kind: 'connection',
    title: 'Jenny P. wants to connect',
    detail: '2 kids · same neighborhood',
    when: '1d',
    photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&auto=format&fit=crop' },
  { id: 'n_reminder_yoga', kind: 'reminder',
    title: 'Mom + Baby Yoga in 2 days',
    detail: 'Fri 9:30 AM · Bayshore Yoga',
    when: '1d' },
];

const NotifRow = ({ item, onClick }) => {
  const Icon = ICON_BY_KIND[item.kind] || Bell;
  const accent = ACCENT_BY_KIND[item.kind] || C.coralDeep;
  return (
    <button
      onClick={onClick}
      className="w-full text-left active:scale-[.99] transition-transform"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: C.paper,
        border: `1px solid ${C.divider}`,
        borderRadius: 14,
        cursor: 'pointer',
      }}
    >
      {item.photo ? (
        <img src={item.photo} alt="" style={{
          width: 38, height: 38, borderRadius: 19, objectFit: 'cover', flexShrink: 0,
        }}/>
      ) : (
        <div style={{
          width: 38, height: 38, borderRadius: 19,
          background: `${accent}20`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16}/>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'space-between',
        }}>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
            color: C.navy, lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.title}
          </div>
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, flexShrink: 0,
          }}>
            {item.when}
          </div>
        </div>
        {item.detail && (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft,
            marginTop: 2, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {item.detail}
          </div>
        )}
      </div>
    </button>
  );
};

export const NotificationsSheet = ({ flash, onClose }) => {
  const handleTap = (item) => {
    if (item.kind === 'message') {
      flash?.('Opening message thread…');
    } else if (item.kind === 'meetup' || item.kind === 'reminder' || item.kind === 'rsvp') {
      flash?.('Opening meetup detail…');
    } else if (item.kind === 'match' || item.kind === 'connection') {
      flash?.('Opening profile…');
    } else if (item.kind === 'group') {
      flash?.('Opening group discussion…');
    }
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}
        >
          Notifications
        </div>
        <h3
          className="mt-1.5"
          style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500,
            color: C.navy, letterSpacing: '-.02em',
          }}
        >
          Your <span style={{ fontStyle: 'italic', color: C.coral }}>inbox</span>
        </h3>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
          marginTop: 4, lineHeight: 1.35,
        }}>
          Messages, meetup updates, matches, and group activity
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          {SEED_NOTIFS.map(item => (
            <NotifRow key={item.id} item={item} onClick={() => handleTap(item)}/>
          ))}
        </div>
      </div>
    </Sheet>
  );
};
