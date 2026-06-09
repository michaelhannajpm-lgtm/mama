import { useState } from 'react';
import {
  Bell, MessageCircle, Users, CalendarDays, LayoutGrid,
  Sparkles, MapPin, Clock, ChevronRight, Heart,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// MamaHubSheet — the catch-all "what's happening in my orbit" surface.
// Lifted from the new top-right LayoutGrid button in MainApp. Four
// segmented tabs:
//
//   Notifications · Chats · Groups · Plans
//
// Each tab renders a light, scrollable list of items. Tapping a chat row
// hands the mom back through `onOpenMessage` so MessageSheet opens via
// App-level state; tapping a group hands the discussion through
// `onOpenDiscussion`; tapping a plan flashes a confirmation.
// ==========================================================================

const TABS = [
  { id: 'notifs',  label: 'Notifs',   Icon: Bell          },
  { id: 'chats',   label: 'Chats',    Icon: MessageCircle },
  { id: 'groups',  label: 'Groups',   Icon: Users         },
  { id: 'plans',   label: 'Plans',    Icon: CalendarDays  },
];

// Seed data — feels populated on first open.
const SEED_NOTIFS = [
  { id: 'n1', kind: 'connection', title: 'Sarah accepted your connection',
    when: '2m', accent: C.coralDeep,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop' },
  { id: 'n2', kind: 'post', title: 'Amanda commented on your post in Daycare picks',
    when: '24m', accent: C.sageDark,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop' },
  { id: 'n3', kind: 'meetup', title: '✦ Reminder · Stroller Walk + Coffee tomorrow 9:00 AM',
    when: '1h', accent: C.coralDeep },
  { id: 'n4', kind: 'group', title: 'New post in Sleep training in South Tampa',
    when: '3h', accent: '#5E4A8A' },
  { id: 'n5', kind: 'connection', title: 'Mia liked your reply in Postpartum support',
    when: '5h', accent: C.coralDeep,
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop' },
];

const SEED_CHATS = [
  { id: 'c1', name: 'Sarah K.', kids: '2 kids', preview: "Yes! Park tomorrow at 10 works",
    when: '8m', unread: 2,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop' },
  { id: 'c2', name: 'Amanda R.', kids: '1 kid', preview: "Sent the daycare list — let me know what you think",
    when: '32m', unread: 0,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop' },
  { id: 'c3', name: 'Jessica T.', kids: '2 kids', preview: "Will def stop by the splash pad on Sat",
    when: '2h', unread: 0,
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&auto=format&fit=crop' },
  { id: 'c4', name: 'Priya N.', kids: '1 kid', preview: "🤞 hoping it warms up",
    when: 'Yesterday', unread: 0,
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop' },
];

const SEED_PLANS = [
  { id: 'pl1', kind: 'Meetup', title: 'Stroller Walk + Coffee', when: 'Sat, May 17 · 9:00 AM',
    place: 'Curtis Hixon Waterfront Park', going: 12 },
  { id: 'pl2', kind: '1:1 meetup', title: 'Coffee with Sarah', when: 'Thu, May 22 · 10:00 AM',
    place: 'Buddy Brew · Hyde Park' },
  { id: 'pl3', kind: 'Activity', title: 'Family Yoga in the Park', when: 'Sun, May 18 · 10:00 AM',
    place: 'Curtis Hixon Waterfront Park', going: 28 },
  { id: 'pl4', kind: 'Group', title: 'Toddler playdates · Hyde Park', when: 'Joined · 2d ago',
    place: '187 moms · 11 online' },
];

export const MamaHubSheet = ({
  groupDiscussions = [],
  joinedDiscussionIds = new Set(),
  onOpenMessage,
  onOpenDiscussion,
  flash,
  onClose,
}) => {
  const [tab, setTab] = useState('notifs');

  // Surface joined groups + a few popular ones as a single feed.
  const groupItems = groupDiscussions.slice(0, 6).map(d => ({
    ...d,
    joined: joinedDiscussionIds.has(d.id),
  }));

  return (
    <Sheet onClose={onClose} tall>
      <div className="pb-6">
        {/* Header */}
        <div style={{
          padding: '12px 20px 4px',
          background: `linear-gradient(180deg, ${C.coralSoft} 0%, ${C.cream} 100%)`,
        }}>
          <div className="text-[10px] tracking-[.18em] uppercase" style={{
            color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 800,
          }}>
            Your village, all in one place
          </div>
          <div style={{
            fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600,
            color: C.navy, letterSpacing: '-.02em', marginTop: 2,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <LayoutGrid size={18} color={C.coralDeep}/>
            Mama Hub
          </div>
        </div>

        {/* Tab segmented control */}
        <div className="px-5 pt-3">
          <div className="flex gap-1 rounded-full" style={{
            background: C.paper, border: `1px solid ${C.divider}`,
            padding: 3,
          }}>
            {TABS.map(t => {
              const active = tab === t.id;
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 rounded-full flex items-center justify-center gap-1.5 active:scale-[.97] transition-all"
                  style={{
                    padding: '7px 4px',
                    background: active ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : 'transparent',
                    color: active ? '#fff' : C.navy,
                    border: 'none',
                    fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={12}/>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab body */}
        <div className="px-5 pt-4">
          {tab === 'notifs' && (
            <div className="space-y-2">
              {SEED_NOTIFS.map(n => (
                <NotifRow key={n.id} notif={n}/>
              ))}
            </div>
          )}

          {tab === 'chats' && (
            <div className="space-y-2">
              {SEED_CHATS.map(c => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  onClick={() => {
                    onOpenMessage?.({
                      id: c.id, name: c.name, kids: c.kids, photo: c.photo,
                      nextSlot: 'Tue mornings',
                    });
                    onClose?.();
                  }}
                />
              ))}
            </div>
          )}

          {tab === 'groups' && (
            <div className="space-y-2">
              {groupItems.length === 0 ? (
                <EmptyState
                  Icon={Users}
                  title="Find your group"
                  subtitle="Browse Popular discussions on the Connect tab."
                />
              ) : groupItems.map(g => (
                <GroupRow
                  key={g.id}
                  group={g}
                  onClick={() => {
                    onOpenDiscussion?.(g);
                    onClose?.();
                  }}
                />
              ))}
            </div>
          )}

          {tab === 'plans' && (
            <div className="space-y-2">
              {SEED_PLANS.map(p => (
                <PlanRow
                  key={p.id}
                  plan={p}
                  onClick={() => flash?.(`Opening ${p.title}…`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};

// ===== Rows =====

const NotifRow = ({ notif }) => (
  <div className="flex items-start gap-3 rounded-2xl p-3" style={{
    background: '#fff', border: `1px solid ${C.divider}`,
  }}>
    {notif.photo ? (
      <img src={notif.photo} alt="" style={{
        width: 34, height: 34, borderRadius: 17, objectFit: 'cover', flexShrink: 0,
      }}/>
    ) : (
      <div style={{
        width: 34, height: 34, borderRadius: 17,
        background: `${notif.accent}1A`, color: notif.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sparkles size={14}/>
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600,
        color: C.navy, lineHeight: 1.35,
      }}>
        {notif.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 2,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Clock size={9}/> {notif.when}
      </div>
    </div>
  </div>
);

const ChatRow = ({ chat, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[.99] transition-transform"
    style={{ background: '#fff', border: `1px solid ${C.divider}`, cursor: 'pointer' }}
  >
    <img src={chat.photo} alt="" style={{
      width: 42, height: 42, borderRadius: 21, objectFit: 'cover', flexShrink: 0,
    }}/>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
          color: C.navy, lineHeight: 1.1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {chat.name}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, flexShrink: 0,
        }}>
          {chat.when}
        </div>
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11.5, color: C.navySoft,
        marginTop: 2, lineHeight: 1.35,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {chat.preview}
      </div>
    </div>
    {chat.unread > 0 && (
      <div style={{
        minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
        background: C.coralDeep, color: '#fff',
        fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {chat.unread}
      </div>
    )}
  </button>
);

const GroupRow = ({ group, onClick }) => {
  const Icon = group.Icon;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[.99] transition-transform"
      style={{ background: '#fff', border: `1px solid ${C.divider}`, cursor: 'pointer' }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: group.bg, color: group.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16}/>
      </div>
      <div className="flex-1 min-w-0">
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
          color: C.navy, lineHeight: 1.15,
        }}>
          {group.title}
        </div>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted,
          marginTop: 2, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Users size={9}/> {group.members.toLocaleString()}
          {group.joined && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: C.sageDark, fontWeight: 700 }}>Joined</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={14} color={C.muted}/>
    </button>
  );
};

const PlanRow = ({ plan, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[.99] transition-transform"
    style={{ background: '#fff', border: `1px solid ${C.divider}`, cursor: 'pointer' }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: C.coralSoft, color: C.coralDeep,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <CalendarDays size={18}/>
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[9.5px] tracking-[.14em] uppercase" style={{
        color: C.coralDeep, fontFamily: 'Albert Sans', fontWeight: 800,
      }}>
        {plan.kind}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
        color: C.navy, lineHeight: 1.15, marginTop: 1,
      }}>
        {plan.title}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11, color: C.muted,
        marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
      }}>
        <Clock size={9}/> {plan.when}
        {plan.place && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9}/> {plan.place}
            </span>
          </>
        )}
        {plan.going != null && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{
              color: C.sageDark, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Heart size={9} fill={C.sageDark}/> {plan.going} going
            </span>
          </>
        )}
      </div>
    </div>
  </button>
);

const EmptyState = ({ Icon, title, subtitle }) => (
  <div className="rounded-2xl text-center" style={{
    background: '#fff', border: `1px solid ${C.divider}`,
    padding: '24px 18px',
  }}>
    <div style={{
      width: 42, height: 42, borderRadius: 21,
      background: C.coralSoft, color: C.coralDeep, margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={18}/>
    </div>
    <div style={{
      fontFamily: 'Fraunces', fontSize: 16, fontWeight: 600,
      color: C.navy, marginTop: 8, letterSpacing: '-.01em',
    }}>
      {title}
    </div>
    <div style={{
      fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
      marginTop: 4, lineHeight: 1.4,
    }}>
      {subtitle}
    </div>
  </div>
);
