// src/screens/MainApp/HomeTab.jsx
import { useState } from 'react';
import {
  MapPin, ChevronRight, Star, Clock, ShieldCheck, Users, Bookmark,
} from 'lucide-react';
import { C } from '../../theme';
import { bucketActivities, pickTrendingPlaces } from '../../lib/home-feed';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';
import { SeeAllSheet } from '../../sheets/SeeAllSheet';
import { ShareSheet } from '../../sheets/ShareSheet';

// ==========================================================================
// HomeTab — editorial landing feed (replaces ThisWeekTab in routing).
//
//   • Conditional "get verified" banner
//   • Count-pill time filter (Today / This Week / This Month / Others)
//     scoping ONLY the activities row below it
//   • Promo rows: Trending places · Moms near you · Groups for you
//   • Saved-spots summary (only when something is saved)
//   • "See all activities" CTA
//
// Activities come from the live event API (thisWeek + recurring). All feed
// math lives in src/lib/home-feed.js.
// ==========================================================================

const FILTERS = [
  { id: 'today',  label: 'Today'      },
  { id: 'week',   label: 'This Week'  },
  { id: 'month',  label: 'This Month' },
  { id: 'others', label: 'Others'     },
];

const SECTION_TITLES = {
  today:  'Happening today',
  week:   'This week',
  month:  'Later this month',
  others: 'Ongoing & weekly',
};

// Empty-state nudge per filter. `to` switches the filter when tapped.
const EMPTY_NUDGE = {
  today:  { text: 'Nothing scheduled today — peek at This Week', to: 'week'   },
  week:   { text: 'No dated events this week — browse ongoing',   to: 'others' },
  month:  { text: 'No dated events this month — browse ongoing',  to: 'others' },
  others: { text: 'No recurring groups yet.',                     to: null     },
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const whenLabel = (item, filter) => {
  if (filter === 'others') return item.recurring || 'Ongoing';
  if (filter === 'today')  return item.time || 'Today';
  if (item.startsAt) {
    const d = new Date(item.startsAt);
    return `${DOW[d.getDay()]} ${d.getDate()}${item.time ? ` · ${item.time}` : ''}`;
  }
  return item.time || '';
};

const placePhoto = (p) => p.hero_photo || p.blob_url || p.url || null;

// -------------------------- shared bits --------------------------

const CountPill = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className="active:scale-[.97] transition-transform"
    style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 11px', borderRadius: 14,
      background: active ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : C.paper,
      color: active ? '#fff' : C.navySoft,
      border: `1px solid ${active ? C.coralDeep : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    {label}
    <span style={{
      fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
      padding: '1px 5px', borderRadius: 8,
      background: active ? 'rgba(255,255,255,.25)' : C.cream,
      color: active ? '#fff' : C.muted,
    }}>
      {count}
    </span>
  </button>
);

const SectionHead = ({ title, link = 'See all', onLink }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 14, marginBottom: 8 }}>
    <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: C.navy, letterSpacing: '-.01em' }}>
      {title}
    </div>
    {onLink && (
      <button
        onClick={onLink}
        className="active:scale-[.98] transition-transform"
        style={{
          background: 'transparent', border: 'none', padding: 0,
          display: 'flex', alignItems: 'center', gap: 1,
          color: C.coralDeep, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {link} <ChevronRight size={11}/>
      </button>
    )}
  </div>
);

const VerifyBanner = ({ onVerify }) => (
  <button
    onClick={onVerify}
    className="text-left active:scale-[.99] transition-transform"
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 14, marginBottom: 4,
      background: `linear-gradient(135deg, ${C.peach}, ${C.coralSoft})`,
      border: `1px solid ${C.coralSoft}`, cursor: 'pointer',
    }}
  >
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ShieldCheck size={17} color={C.coralDeep}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 800, color: C.navy }}>
        Get your verified badge
      </div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.inkSoft, marginTop: 1 }}>
        Connect Instagram + add a real photo
      </div>
    </div>
    <span style={{
      flexShrink: 0, fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800,
      color: '#fff', background: C.coralDeep, padding: '5px 11px', borderRadius: 12,
    }}>
      Verify →
    </span>
  </button>
);

const ActivityCard = ({ item, filter, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    flexShrink: 0, width: 132, background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`, boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
  }}>
    <div style={{ position: 'relative', height: 76 }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: 76, background: item.hue || `linear-gradient(135deg, ${C.coral}, ${C.saffron})` }}/>}
      <div style={{
        position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,.95)',
        padding: '3px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800, color: C.coralDeep, letterSpacing: '.03em',
      }}>
        <Clock size={9}/> {whenLabel(item, filter)}
      </div>
    </div>
    <div style={{ padding: '6px 8px 9px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 26,
      }}>
        {item.name}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 4, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.place}
      </div>
      {item.mi != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 8.5, color: C.muted }}>
          <MapPin size={8}/> {item.mi} mi
        </div>
      )}
    </div>
  </button>
);

const PlaceCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    flexShrink: 0, width: 124, background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`, boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
  }}>
    {placePhoto(item)
      ? <img src={placePhoto(item)} alt="" style={{ width: '100%', height: 66, objectFit: 'cover', display: 'block' }}/>
      : <div style={{ width: '100%', height: 66, background: C.lilac }}/>}
    <div style={{ padding: '6px 8px 9px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 25,
      }}>
        {item.name}
      </div>
      {item.rating != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, color: C.navy }}>
          <Star size={9} fill={C.saffron} color={C.saffron}/>
          {item.rating}
          {item.review_count != null && <span style={{ fontWeight: 500, color: C.muted }}>({item.review_count})</span>}
        </div>
      )}
    </div>
  </button>
);

const MomChip = ({ item, onClick }) => (
  <button onClick={onClick} className="active:scale-[.97] transition-transform" style={{
    flexShrink: 0, width: 78, background: 'transparent', border: 'none', padding: 0, textAlign: 'center', cursor: 'pointer',
  }}>
    <div className="rounded-full overflow-hidden flex items-center justify-center" style={{
      width: 54, height: 54, margin: '0 auto', background: C.coralSoft,
    }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: 54, height: 54, objectFit: 'cover' }}/>
        : <span style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: C.coralDeep }}>
            {(item.firstName || item.name || '?').charAt(0).toUpperCase()}
          </span>}
    </div>
    <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700, color: C.navy, marginTop: 5, lineHeight: 1.15 }}>
      {item.firstName || item.name}
    </div>
    <div style={{ fontFamily: 'Albert Sans', fontSize: 8.5, color: C.sageDark, fontWeight: 700, marginTop: 1 }}>
      {(item.sharedTags && item.sharedTags[0]) || item.kids || item.distance || ''}
    </div>
  </button>
);

const GroupRow = ({ item, onClick }) => {
  const Icon = item.Icon || Users;
  return (
    <button onClick={onClick} className="active:scale-[.99] transition-transform" style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
      background: '#fff', border: `1px solid ${C.line}`, borderRadius: 11, padding: '9px 11px', cursor: 'pointer',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: item.bg || C.sage, color: item.fg || C.sageDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16}/>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800, color: C.navy,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title}
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted, marginTop: 1 }}>
          {item.members} moms{item.online ? ` · ${item.online} online` : ''}
        </div>
      </div>
      <span style={{
        flexShrink: 0, fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
        color: C.sageDark, background: C.sage, padding: '4px 11px', borderRadius: 10,
      }}>
        Join
      </span>
    </button>
  );
};

// -------------------------- screen --------------------------

export const HomeTab = ({
  thisWeek = [], events = [],         // events = recurring list from the API
  places = null, nearbyMoms = [], groups = [],
  savedItems = [], goingItems = [], setGoingItems,
  joinedEvents = [], setJoinedEvents, setSavedItems,
  profile, flash,
  goToPlaces, goToConnect, goToHub, onVerify, openVillage,
}) => {
  const [filter, setFilter] = useState('today');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [seeAll, setSeeAll] = useState(false);

  const buckets = bucketActivities(thisWeek, events, new Date());
  const activities = buckets[filter] || [];
  const trending = pickTrendingPlaces(places, 8);
  const moms = nearbyMoms.slice(0, 8);
  const topGroups = groups.slice(0, 3);

  const v = profile?.verified || {};
  const isVerified = !!(v.photo && (v.instagram || v.facebook));

  const isSaved      = (id) => savedItems.includes(id);
  const isGoing      = (id) => goingItems.includes(id);
  const isJoined     = (id) => joinedEvents.includes(id);
  const toggleSave   = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleGoing  = (id) => setGoingItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleJoined = (id) => setJoinedEvents?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openActivity = (item) => setSelectedEvent({
    id: item.id, title: item.name, photo: item.photo,
    when: whenLabel(item, filter), place: item.place,
    distance: item.mi != null ? `${item.mi} mi` : 'Near you',
    tags: item.tags || [], kind: filter === 'others' ? 'Recurring' : 'Activity',
  });
  const openPlace = (p) => setSelectedPlace({
    id: p.id, title: p.name, photo: placePhoto(p),
    rating: p.rating, reviews: p.review_count,
    tag: p.area || p.city, distance: 'Near you', kind: 'Place',
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 2, paddingBottom: 16 }}>

        {/* Verify banner — only when not yet verified */}
        {!isVerified && <VerifyBanner onVerify={onVerify}/>}

        {/* Time filter — count pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingTop: 8, paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <CountPill
              key={f.id}
              label={f.label}
              count={(buckets[f.id] || []).length}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </div>

        {/* Activities row (scoped by filter) */}
        <SectionHead title={SECTION_TITLES[filter]} onLink={activities.length ? () => setSeeAll(true) : null}/>
        {activities.length ? (
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
            {activities.map(item => (
              <ActivityCard key={item.id} item={item} filter={filter} onClick={() => openActivity(item)}/>
            ))}
          </div>
        ) : (
          <button
            onClick={() => EMPTY_NUDGE[filter].to && setFilter(EMPTY_NUDGE[filter].to)}
            className="text-left active:scale-[.99] transition-transform"
            style={{
              width: '100%', padding: '16px 14px', borderRadius: 12,
              background: C.blush, border: `1px dashed ${C.coralSoft}`, cursor: 'pointer',
              fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600, color: C.inkSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}
          >
            {EMPTY_NUDGE[filter].text}
            {EMPTY_NUDGE[filter].to && <ChevronRight size={14} color={C.coralDeep}/>}
          </button>
        )}

        {/* Trending places near you */}
        {trending.length > 0 && (
          <>
            <SectionHead title="Trending places near you" onLink={goToPlaces}/>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {trending.map(p => <PlaceCard key={p.id} item={p} onClick={() => openPlace(p)}/>)}
            </div>
          </>
        )}

        {/* Moms near you */}
        {moms.length > 0 && (
          <>
            <SectionHead title="Moms near you" onLink={goToConnect}/>
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {moms.map(m => <MomChip key={m.id} item={m} onClick={goToConnect}/>)}
            </div>
          </>
        )}

        {/* Groups for you */}
        {topGroups.length > 0 && (
          <>
            <SectionHead title="Groups for you" onLink={goToHub}/>
            {topGroups.map(g => <GroupRow key={g.id} item={g} onClick={goToHub}/>)}
          </>
        )}

        {/* Saved-spots summary — only when something is saved */}
        {savedItems.length > 0 && (
          <>
            <SectionHead title="Your saved spots" link="My Village" onLink={openVillage}/>
            <button
              onClick={openVillage}
              className="active:scale-[.99] transition-transform"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: C.coralSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bookmark size={16} color={C.coralDeep}/>
              </div>
              <div style={{ flex: 1, textAlign: 'left', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, color: C.navy }}>
                {savedItems.length} saved {savedItems.length === 1 ? 'item' : 'items'}
                <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, marginTop: 1 }}>Open My Village to view them all</div>
              </div>
              <ChevronRight size={16} color={C.muted}/>
            </button>
          </>
        )}

        {/* See all activities CTA */}
        <button
          onClick={() => activities.length && setSeeAll(true)}
          style={{
            marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 14px', borderRadius: 24,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            border: 'none', color: '#fff', fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
            boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)', cursor: 'pointer',
          }}
        >
          See all activities <ChevronRight size={14}/>
        </button>
      </div>

      {seeAll && (
        <SeeAllSheet
          title={SECTION_TITLES[filter]}
          subtitle={`${activities.length} ${activities.length === 1 ? 'idea' : 'ideas'} for you`}
          items={activities}
          renderItem={(item) => (
            <ActivityCard key={item.id} item={item} filter={filter} onClick={() => openActivity(item)}/>
          )}
          columns={2}
          onClose={() => setSeeAll(false)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          saved={isSaved(selectedEvent.id)}
          joined={isJoined(selectedEvent.id)}
          interested={isGoing(selectedEvent.id)}
          onJoin={() => {
            toggleJoined(selectedEvent.id);
            flash?.(isJoined(selectedEvent.id) ? `Removed RSVP · ${selectedEvent.title}` : `✦ You're going · ${selectedEvent.title}`);
          }}
          onInterested={() => {
            toggleGoing(selectedEvent.id);
            flash?.(isGoing(selectedEvent.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onSave={() => {
            toggleSave(selectedEvent.id);
            flash?.(isSaved(selectedEvent.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onShare={() => setShareItem({
            title: selectedEvent.title, kind: selectedEvent.kind || 'Event',
            when: selectedEvent.when, place: selectedEvent.place, photo: selectedEvent.photo,
          })}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          saved={isSaved(selectedPlace.id)}
          interested={isGoing(selectedPlace.id)}
          onSave={() => {
            toggleSave(selectedPlace.id);
            flash?.(isSaved(selectedPlace.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onInterested={() => {
            toggleGoing(selectedPlace.id);
            flash?.(isGoing(selectedPlace.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onShare={() => setShareItem({
            title: selectedPlace.title, kind: selectedPlace.kind || 'Place',
            place: selectedPlace.distance, photo: selectedPlace.photo,
          })}
          onDirections={() => flash?.('Opening directions…')}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {shareItem && (
        <ShareSheet item={shareItem} flash={flash} onClose={() => setShareItem(null)}/>
      )}
    </div>
  );
};
