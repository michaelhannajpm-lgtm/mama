import { Bookmark, MapPin, Calendar, Users, MessageCircle, Heart, ChevronRight, X } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { findResource, RESOURCE_CATEGORIES } from '../data/resources';

// ==========================================================================
// MyVillageSheet — replaces the old bell + filter icons in the MainApp
// header with one place that gathers everything a mom has signaled across
// the app: items she Saved, items she's Interested in, events she's
// Joining, individual mom chats, and group chats per joined event.
// ==========================================================================

// Resolve a saved/interested id into a display shape. Mirrors MyPlansSheet
// but lifted here so we don't double-import a private helper.
const resolve = (id, { moms = [], events = [], places = [] } = {}) => {
  if (typeof id === 'string' && id.startsWith('mom-')) {
    const m = moms.find(x => String(x.id) === id.slice(4));
    if (!m) return null;
    return {
      kind: 'mom',
      photo: m.photo,
      title: m.name,
      sub:   `${m.type} · ${m.kids}`,
      meta:  m.distance ? `${m.distance} · ${m.overlap}% match` : `${m.overlap}% match`,
      accent: C.coralDeep,
    };
  }

  const evId = typeof id === 'string' && id.startsWith('int-') ? id.slice(4) : id;
  const ev = events.find(e => String(e.id) === String(evId));
  if (ev) return {
    kind: 'event',
    photo: ev.photo,
    title: ev.name,
    sub:   `${ev.day} · ${ev.time}`,
    meta:  ev.place,
    accent: C.sageDark,
  };

  const place = places.find(p => String(p.id) === String(id) || p.slug === id);
  if (place) return {
    kind: 'place',
    photo: place.hero_photo || null,
    title: place.name,
    sub:   place.area,
    meta:  place.city || '',
    accent: C.coralDeep,
  };

  const resource = findResource(id);
  if (resource) {
    const cat = RESOURCE_CATEGORIES.find(c => c.id === resource.category);
    return {
      kind: 'resource',
      photo: null,
      title: resource.title,
      sub:   resource.summary,
      meta:  resource.location || (cat ? cat.label : ''),
      accent: C.navy,
    };
  }

  return null;
};

const Eyebrow = ({ Icon, label, count, color }) => (
  <div className="flex items-center gap-1.5" style={{
    marginTop: 14, marginBottom: 8,
    fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
    letterSpacing: '.12em', color,
  }}>
    <Icon size={11}/>
    <span>{label.toUpperCase()}</span>
    <span style={{ color: C.muted, fontWeight: 600 }}>· {count}</span>
  </div>
);

const ItemRow = ({ photo, title, sub, meta, accent, trailingIcon: Trailing = X, onTrailing }) => (
  <div
    className="flex rounded-2xl overflow-hidden mb-2 relative"
    style={{ background: C.paper, border: `1px solid ${C.divider}` }}
  >
    {photo
      ? <img src={photo} alt="" style={{ width: 64, height: 64, objectFit: 'cover' }}/>
      : <div style={{
          width: 64, height: 64, background: C.creamSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bookmark size={16} color={accent} fill={accent}/>
        </div>}
    <div className="flex-1 px-2.5 py-2 flex flex-col justify-center min-w-0">
      <div className="truncate" style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5, color: C.navy }}>
        {title}
      </div>
      {sub && (
        <div className="truncate" style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 2 }}>
          {sub}
        </div>
      )}
      {meta && (
        <div className="flex items-center gap-1 truncate" style={{ marginTop: 3 }}>
          <MapPin size={9} color={C.navySoft}/>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 600, color: C.navySoft }}>
            {meta}
          </span>
        </div>
      )}
    </div>
    {onTrailing && (
      <button
        onClick={onTrailing}
        aria-label="Remove"
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 24, height: 24, borderRadius: 12,
          background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Trailing size={12} color={C.muted}/>
      </button>
    )}
  </div>
);

const ChatRow = ({ photo, name, preview, meta, onOpen, unread }) => (
  <button
    onClick={onOpen}
    className="w-full flex rounded-2xl overflow-hidden mb-2 text-left active:scale-[.99] transition-transform"
    style={{ background: C.paper, border: `1px solid ${C.divider}`, padding: 0, cursor: 'pointer' }}
  >
    {photo
      ? <img src={photo} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 26, margin: 8 }}/>
      : <div style={{
          width: 52, height: 52, borderRadius: 26, margin: 8,
          background: C.sage, color: C.sageDark,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18}/>
        </div>}
    <div className="flex-1 py-2 pr-2 flex flex-col justify-center min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate" style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 13, color: C.navy }}>
          {name}
        </div>
        {meta && (
          <span style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.muted, flexShrink: 0 }}>
            {meta}
          </span>
        )}
      </div>
      <div className="truncate" style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.inkSoft, marginTop: 2 }}>
        {preview}
      </div>
    </div>
    <div className="flex items-center pr-3" style={{ gap: 6 }}>
      {unread > 0 && (
        <span style={{
          minWidth: 18, height: 18, padding: '0 5px',
          borderRadius: 9, background: C.coralDeep, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
      <ChevronRight size={14} color={C.muted}/>
    </div>
  </button>
);

const EmptyHint = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2" style={{
    padding: '10px 12px', borderRadius: 12,
    background: C.creamSoft, color: C.muted,
    fontFamily: 'Albert Sans', fontSize: 11.5,
  }}>
    <Icon size={13} color={C.muted}/>
    <span>{text}</span>
  </div>
);

export const MyVillageSheet = ({
  savedItems = [], setSavedItems,
  goingItems = [], setGoingItems,
  joinedEvents = [], setJoinedEvents,
  moms = [],
  events = [], thisWeek = [], places = {},
  openMessage,
  flash,
  onClose,
}) => {
  // Live lookup pools: events (recurring + dated) and places (flattened from
  // the category-grouped object the parent passes).
  const allEvents = [...events, ...thisWeek];
  const allPlaces = Object.values(places || {}).flat();
  const pools = { moms, events: allEvents, places: allPlaces };

  const savedResolved   = savedItems.map(id   => ({ id, item: resolve(id, pools) })).filter(x => x.item);
  const interestedResolved = goingItems.map(id => ({ id, item: resolve(id, pools) })).filter(x => x.item);
  const joiningResolved = joinedEvents
    .map(id => allEvents.find(e => String(e.id) === String(id)))
    .filter(Boolean);

  // Group chats: one per joined event. Tap opens a flash placeholder for now.
  const groupRows = joiningResolved.map(ev => ({
    id: ev.id,
    title: ev.name,
    place: ev.place,
    photo: ev.photo,
    when: `${ev.day} · ${ev.time}`,
  }));

  const unsave        = (id) => setSavedItems?.(prev => prev.filter(x => x !== id));
  const uninterest    = (id) => setGoingItems?.(prev => prev.filter(x => x !== id));
  const unjoin        = (id) => setJoinedEvents?.(prev => prev.filter(x => x !== id));

  const totalCount =
    savedResolved.length + interestedResolved.length + joiningResolved.length +
    groupRows.length;

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-5">
        <div style={{
          fontFamily: 'Fraunces', fontSize: 26, fontWeight: 600,
          color: C.navy, letterSpacing: '-.02em', lineHeight: 1.1,
        }}>
          My{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>village</span>
        </div>
        <div className="mt-1" style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted }}>
          {totalCount === 0
            ? "As you save things, mark interest, RSVP, and start chats, they'll all live here."
            : `${totalCount} thing${totalCount === 1 ? '' : 's'} you're following`}
        </div>

        {/* SAVED */}
        <Eyebrow Icon={Bookmark} label="Saved" count={savedResolved.length} color={C.coralDeep}/>
        {savedResolved.length === 0
          ? <EmptyHint icon={Bookmark} text="Tap the bookmark on anything to save it here."/>
          : savedResolved.map(({ id, item }) => (
              <ItemRow key={`saved-${id}`} {...item} onTrailing={() => unsave(id)}/>
            ))}

        {/* INTERESTED */}
        <Eyebrow Icon={Heart} label="Interested" count={interestedResolved.length} color={C.coralDeep}/>
        {interestedResolved.length === 0
          ? <EmptyHint icon={Heart} text="Tap Interested on an event or place to track it here."/>
          : interestedResolved.map(({ id, item }) => (
              <ItemRow key={`int-${id}`} {...item} onTrailing={() => uninterest(id)}/>
            ))}

        {/* JOINING */}
        <Eyebrow Icon={Calendar} label="Joining" count={joiningResolved.length} color={C.sageDark}/>
        {joiningResolved.length === 0
          ? <EmptyHint icon={Calendar} text="RSVP to a group meetup and it'll show up here."/>
          : joiningResolved.map(ev => (
              <ItemRow
                key={`join-${ev.id}`}
                photo={ev.photo}
                title={ev.name}
                sub={`${ev.day} · ${ev.time}`}
                meta={ev.place}
                accent={C.sageDark}
                onTrailing={() => unjoin(ev.id)}
              />
            ))}

        {/* INDIVIDUAL CHATS */}
        <Eyebrow Icon={MessageCircle} label="Individual chats" count={0} color={C.coralDeep}/>
        <EmptyHint icon={MessageCircle} text="Message a mom and your chat will appear here."/>

        {/* GROUP CHATS */}
        <Eyebrow Icon={Users} label="Group chats" count={groupRows.length} color={C.sageDark}/>
        {groupRows.length === 0
          ? <EmptyHint icon={Users} text="Join a group meetup and you can chat with the whole crew."/>
          : groupRows.map(g => (
              <ChatRow
                key={`grp-${g.id}`}
                photo={g.photo}
                name={g.title}
                preview={`${g.when} · ${g.place}`}
                onOpen={() => {
                  onClose?.();
                  flash?.(`${g.title} · group chat coming soon`);
                }}
              />
            ))}
      </div>
    </Sheet>
  );
};
