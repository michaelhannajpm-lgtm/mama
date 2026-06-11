import { useState } from 'react';
import {
  MessageCircle, Users, CalendarDays, Bookmark,
  MapPin, Clock, ChevronRight, Heart,
} from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// ==========================================================================
// MamaHubSheet — the catch-all "what's happening in my orbit" surface.
// Four segmented tabs (ordered Plans-first so the user lands on her day):
//
//   Plans · Chat · Groups · Saved
//
// An "Up next" hero card sits above the tabs and highlights the soonest
// activity she's joining. The Plans tab lists this week's plans below,
// with the day/time pinned on the right of each row.
// ==========================================================================

const TABS = [
  { id: 'plans',  label: 'Plans',  Icon: CalendarDays  },
  { id: 'chats',  label: 'Chat',   Icon: MessageCircle },
  { id: 'groups', label: 'Groups', Icon: Users         },
  { id: 'saved',  label: 'Saved',  Icon: Bookmark      },
];

// Seed chat data — feels populated on first open.
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

// Resolve a saved/interested id into a display shape (event, place, or mom).
// Pools are live, supplied by the parent: `moms` (match-ranked nearby),
// `events` (recurring + dated, combined), `places` (flattened). Saved ids:
// `mom-<id>`, `int-<eventId>`, a bare place id/slug, or a bare event id.
const resolveSaved = (id, { moms = [], events = [], places = [] } = {}) => {
  if (typeof id === 'string' && id.startsWith('mom-')) {
    const m = moms.find(x => String(x.id) === id.slice(4));
    if (!m) return null;
    return {
      kind: 'mom', photo: m.photo, title: m.name,
      sub: `${m.type} · ${m.kids}`,
      meta: m.distance ? `${m.distance} · ${m.overlap}% match` : `${m.overlap}% match`,
    };
  }
  const evId = typeof id === 'string' && id.startsWith('int-') ? id.slice(4) : id;
  const ev = events.find(e => String(e.id) === String(evId));
  if (ev) return {
    kind: 'event', photo: ev.photo, title: ev.name,
    sub: `${ev.day} · ${ev.time}`, meta: ev.place,
  };
  const place = places.find(p => String(p.id) === String(id) || p.slug === id);
  if (place) return {
    kind: 'place', photo: place.hero_photo || null, title: place.name,
    sub: place.area, meta: place.city || '',
  };
  return null;
};

export const MamaHubSheet = ({
  groupDiscussions = [],
  joinedDiscussionIds = new Set(),
  joinedEvents = [],
  savedItems = [], setSavedItems,
  goingItems = [], setGoingItems,
  moms = [],
  events = [], thisWeek = [], places = {},
  onOpenMessage,
  onOpenDiscussion,
  flash,
  onClose,
  asScreen = false, // render as a full tab screen instead of a bottom drawer
}) => {
  const [tab, setTab] = useState('plans');

  // Live lookup pools: events (recurring + dated) and places (flattened from
  // the category-grouped object the parent passes).
  const allEvents = [...events, ...thisWeek];
  const allPlaces = Object.values(places || {}).flat();
  const pools = { moms, events: allEvents, places: allPlaces };

  // Surface joined groups + a few popular ones as a single feed.
  const groupItems = groupDiscussions.slice(0, 6).map(d => ({
    ...d,
    joined: joinedDiscussionIds.has(d.id),
  }));

  // Joined activities — resolve event ids to full event shapes (with photo).
  // Fall back to the first few live events so the surface feels populated
  // before the user RSVPs to anything.
  const joinedActivities = joinedEvents
    .map(id => allEvents.find(e => String(e.id) === String(id)))
    .filter(Boolean);
  const planActivities = joinedActivities.length > 0
    ? joinedActivities
    : allEvents.slice(0, 3);
  const upNext = planActivities[0];

  // Resolve saved + interested ids.
  const savedResolved = savedItems
    .map(id => ({ id, item: resolveSaved(id, pools) }))
    .filter(x => x.item);
  const interestedResolved = goingItems
    .map(id => ({ id, item: resolveSaved(id, pools) }))
    .filter(x => x.item);

  const unsave     = (id) => setSavedItems?.(prev => prev.filter(x => x !== id));
  const uninterest = (id) => setGoingItems?.(prev => prev.filter(x => x !== id));

  const inner = (
      <div className="pb-6">

        {/* Up next hero card — soonest activity in your plan */}
        {upNext && (
          <div className="px-5" style={{ paddingTop: 2, paddingBottom: 4 }}>
            <UpNextCard
              event={upNext}
              onClick={() => flash?.(`Opening ${upNext.name}…`)}
            />
          </div>
        )}

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
          {tab === 'plans' && (
            <div>
              <SectionLabel Icon={CalendarDays} label="This week" count={planActivities.length} color={C.coralDeep}/>
              {planActivities.length === 0 ? (
                <EmptyState
                  Icon={CalendarDays}
                  title="No plans yet"
                  subtitle="RSVP to a meetup and it'll land here."
                />
              ) : (
                <div className="space-y-2">
                  {planActivities.map(ev => (
                    <PlanRow
                      key={ev.id}
                      event={ev}
                      onClick={() => flash?.(`Opening ${ev.name}…`)}
                    />
                  ))}
                </div>
              )}
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

          {tab === 'saved' && (
            <div>
              <SectionLabel Icon={Bookmark} label="Saved" count={savedResolved.length} color={C.coralDeep}/>
              {savedResolved.length === 0 ? (
                <EmptyState
                  Icon={Bookmark}
                  title="Nothing saved yet"
                  subtitle="Tap the bookmark on anything to save it here."
                />
              ) : (
                <div className="space-y-2">
                  {savedResolved.map(({ id, item }) => (
                    <SavedRow
                      key={`saved-${id}`}
                      item={item}
                      onRemove={() => unsave(id)}
                    />
                  ))}
                </div>
              )}

              <div style={{ height: 12 }}/>
              <SectionLabel Icon={Heart} label="Interested" count={interestedResolved.length} color={C.coralDeep}/>
              {interestedResolved.length === 0 ? (
                <EmptyState
                  Icon={Heart}
                  title="Nothing marked interested"
                  subtitle="Tap Interested on a place or event to track it here."
                />
              ) : (
                <div className="space-y-2">
                  {interestedResolved.map(({ id, item }) => (
                    <SavedRow
                      key={`int-${id}`}
                      item={item}
                      onRemove={() => uninterest(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );

  return asScreen
    ? <div className="flex-1 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'none' }}>{inner}</div>
    : <Sheet onClose={onClose} tall>{inner}</Sheet>;
};

// ===== Rows =====

const UpNextCard = ({ event, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-2xl overflow-hidden active:scale-[.99] transition-transform"
    style={{
      background: '#fff', border: `1px solid ${C.divider}`,
      boxShadow: '0 8px 24px -16px rgba(27,42,78,.25)',
      cursor: 'pointer', position: 'relative',
    }}
  >
    <div style={{ position: 'relative', height: 96 }}>
      {event.photo ? (
        <img src={event.photo} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
        }}/>
      ) : (
        <div style={{ width: '100%', height: '100%', background: event.hue || C.coralSoft }}/>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.55) 100%)',
      }}/>
      <div style={{
        position: 'absolute', top: 10, left: 10,
        padding: '4px 8px', borderRadius: 999,
        background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
        color: '#fff', fontFamily: 'Albert Sans', fontSize: 9.5,
        fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
      }}>
        Up next
      </div>
    </div>
    <div style={{ padding: '10px 12px 12px' }}>
      <div style={{
        fontFamily: 'Fraunces', fontSize: 16, fontWeight: 600,
        color: C.navy, letterSpacing: '-.01em', lineHeight: 1.15,
      }}>
        {event.name}
      </div>
      <div className="flex items-center" style={{
        marginTop: 4, gap: 5, flexWrap: 'wrap',
        fontFamily: 'Albert Sans', fontSize: 11.5, color: C.navySoft,
      }}>
        <Clock size={11} color={C.coralDeep}/>
        <span style={{ fontWeight: 700, color: C.navy }}>{event.day} · {event.time}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <MapPin size={11} color={C.navySoft}/>
        <span>{event.place}</span>
      </div>
    </div>
  </button>
);

const PlanRow = ({ event, onClick }) => (
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
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700,
        color: C.navy, lineHeight: 1.15,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {event.name}
      </div>
      <div className="flex items-center" style={{
        marginTop: 3, gap: 4,
        fontFamily: 'Albert Sans', fontSize: 11, color: C.muted,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {event.place && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <MapPin size={9}/> {event.place}
          </span>
        )}
        {event.going != null && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{
              color: C.sageDark, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
            }}>
              <Heart size={9} fill={C.sageDark}/> {event.going}
            </span>
          </>
        )}
      </div>
    </div>
    {/* Day / time, right-aligned */}
    <div style={{
      flexShrink: 0, textAlign: 'right', paddingLeft: 8,
      borderLeft: `1px solid ${C.divider}`, marginLeft: 4,
    }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
        color: C.coralDeep, letterSpacing: '.08em', textTransform: 'uppercase',
      }}>
        {event.day}
      </div>
      <div className="flex items-center justify-end" style={{
        marginTop: 2, gap: 3,
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy,
      }}>
        <Clock size={9} color={C.navySoft}/>
        {event.time}
      </div>
    </div>
  </button>
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

const SavedRow = ({ item, onRemove }) => (
  <div
    className="flex rounded-2xl overflow-hidden relative"
    style={{ background: '#fff', border: `1px solid ${C.divider}` }}
  >
    {item.photo
      ? <img src={item.photo} alt="" style={{ width: 60, height: 60, objectFit: 'cover', flexShrink: 0 }}/>
      : <div style={{
          width: 60, height: 60, background: C.creamSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Bookmark size={16} color={C.coralDeep}/>
        </div>}
    <div className="flex-1 px-3 py-2 flex flex-col justify-center min-w-0">
      <div style={{
        fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
        color: C.navy, lineHeight: 1.15,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.title}
      </div>
      {item.sub && (
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.sub}
        </div>
      )}
      {item.meta && (
        <div className="flex items-center" style={{
          gap: 4, marginTop: 3, fontFamily: 'Albert Sans',
          fontSize: 9.5, fontWeight: 600, color: C.navySoft,
        }}>
          <MapPin size={9}/>
          <span style={{
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.meta}
          </span>
        </div>
      )}
    </div>
    {onRemove && (
      <button
        onClick={onRemove}
        aria-label="Remove"
        style={{
          alignSelf: 'center', marginRight: 8,
          width: 24, height: 24, borderRadius: 12,
          background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, lineHeight: 1 }}>×</span>
      </button>
    )}
  </div>
);

const SectionLabel = ({ Icon, label, count, color }) => (
  <div className="flex items-center gap-1.5" style={{
    marginBottom: 8,
    fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
    letterSpacing: '.12em', color,
  }}>
    <Icon size={11}/>
    <span>{label.toUpperCase()}</span>
    <span style={{ color: C.muted, fontWeight: 600 }}>· {count}</span>
  </div>
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
