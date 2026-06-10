// src/screens/MainApp/HomeTab.jsx
import { useState } from 'react';
import {
  MapPin, ChevronRight, Star, Clock, ShieldCheck, Users, Bookmark,
} from 'lucide-react';
import { C } from '../../theme';
import { youngestStageLabel } from '../../data/taxonomy';
import { bucketActivities, pickTrendingPlaces } from '../../lib/home-feed';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';
import { MomDetailSheet } from '../../sheets/MomDetailSheet';
import { GroupDiscussionSheet } from '../../sheets/GroupDiscussionSheet';
import { SeeAllSheet } from '../../sheets/SeeAllSheet';
import { ShareSheet } from '../../sheets/ShareSheet';

// ==========================================================================
// HomeTab — editorial landing feed (replaces ThisWeekTab in routing).
//
//   • Single "Upcoming events" row (all things to do, no time filter) —
//     the first section
//   • Promo rows: Moms near you · Trending places · Groups for you
//   • Conditional "get verified" banner
//   • Saved-spots summary (only when something is saved)
//   • "See all activities" CTA
//
// Activities come from the live event API (thisWeek + recurring). All feed
// math lives in src/lib/home-feed.js.
// ==========================================================================

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Label a single activity — dated events show their day, recurring ones show
// their cadence. No time-filter context needed.
const whenLabel = (item) => {
  if (item.startsAt) {
    const d = new Date(item.startsAt);
    return `${DOW[d.getDay()]} ${d.getDate()}${item.time ? ` · ${item.time}` : ''}`;
  }
  return item.recurring || item.time || 'Ongoing';
};

const placePhoto = (p) => p.hero_photo || p.blob_url || p.url || null;

// -------------------------- shared bits --------------------------

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
      padding: '10px 12px', borderRadius: 14, marginTop: 14, marginBottom: 4,
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

const ActivityCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    flexShrink: 0, width: 220, background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`, boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
  }}>
    <div style={{ position: 'relative', height: 140 }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: 140, background: item.hue || `linear-gradient(135deg, ${C.coral}, ${C.saffron})` }}/>}
      <div style={{
        position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,.95)',
        padding: '3px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800, color: C.coralDeep, letterSpacing: '.03em',
      }}>
        <Clock size={9}/> {whenLabel(item)}
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
    flexShrink: 0, width: 220, background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`, boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
  }}>
    {placePhoto(item)
      ? <img src={placePhoto(item)} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}/>
      : <div style={{ width: '100%', height: 130, background: C.lilac }}/>}
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

const MomChip = ({ item, onClick }) => {
  const hasDistance = item.distanceMi != null;
  const buckets = Array.isArray(item.kidBuckets) && item.kidBuckets.length
    ? item.kidBuckets
    : (item.kids && item.kids !== 'Kids' ? item.kids.replace(/\s*yrs$/, '').split(' · ') : []);
  const sub = (item.sharedTags && item.sharedTags[0]) || (hasDistance ? '' : youngestStageLabel(buckets)) || '';
  return (
    <button onClick={onClick} className="active:scale-[.97] transition-transform" style={{
      flexShrink: 0, width: 90, textAlign: 'center', cursor: 'pointer',
      background: '#fff', borderRadius: 14, border: `1px solid ${C.line}`,
      boxShadow: '0 2px 6px -5px rgba(27,42,78,.18)', padding: '12px 6px 10px',
    }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div className="rounded-full overflow-hidden flex items-center justify-center" style={{
          width: 54, height: 54, background: C.coralSoft,
        }}>
          {item.photo
            ? <img src={item.photo} alt="" style={{ width: 54, height: 54, objectFit: 'cover' }}/>
            : <span style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: C.coralDeep }}>
                {(item.firstName || item.name || '?').charAt(0).toUpperCase()}
              </span>}
        </div>
        {/* Distance marker pill — matches the Connect card. */}
        {hasDistance && (
          <div style={{
            position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 2,
            boxShadow: '0 2px 6px -3px rgba(27,42,78,.3)', whiteSpace: 'nowrap',
          }}>
            <MapPin size={8} color={C.coralDeep} strokeWidth={2.4}/>
            <span style={{ fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800, color: C.navy }}>
              {item.distanceMi.toFixed(1)} mi
            </span>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700, color: C.navy, marginTop: hasDistance ? 11 : 6, lineHeight: 1.15 }}>
        {item.firstName || item.name}
      </div>
      {sub && (
        <div style={{ fontFamily: 'Albert Sans', fontSize: 8.5, color: C.sageDark, fontWeight: 700, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </button>
  );
};

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
  profile, flash, openMessage, openSchedule,
  goToPlaces, goToConnectMoms, goToConnectGroups, onVerify, openVillage,
  city = 'Tampa',
  onDiscuss,
  chatAuthor, myUserId,
}) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedMom, setSelectedMom] = useState(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [joinedDiscussions, setJoinedDiscussions] = useState(new Set());
  const [invited, setInvited] = useState({});
  const [shareItem, setShareItem] = useState(null);
  const [seeAll, setSeeAll] = useState(false);

  // All things to do — dated (this month, which nests today/week) + recurring,
  // deduped. No time filter; one combined "Local Events" list.
  const buckets = bucketActivities(thisWeek, events, new Date());
  const seenActivity = new Set();
  const activities = [...buckets.month, ...buckets.others].filter((a) => {
    if (seenActivity.has(a.id)) return false;
    seenActivity.add(a.id);
    return true;
  });
  const eventsTitle = 'Upcoming events';
  const trending = pickTrendingPlaces(places, 8);
  // Closest moms first (nulls — no shared coords — sink to the end).
  const moms = [...nearbyMoms]
    .sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity))
    .slice(0, 8);
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
    when: whenLabel(item), place: item.place,
    distance: item.mi != null ? `${item.mi} mi` : 'Near you',
    tags: item.tags || [], kind: item.startsAt ? 'Activity' : 'Recurring',
  });
  const openPlace = (p) => setSelectedPlace({
    id: p.id, title: p.name, photo: placePhoto(p),
    rating: p.rating, reviews: p.review_count,
    tag: p.area || p.city, distance: 'Near you', kind: 'Place',
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 2, paddingBottom: 16 }}>

        {/* Local Events — all things to do around the chosen city, no filter */}
        <SectionHead title={eventsTitle} onLink={activities.length ? () => setSeeAll(true) : null}/>
        {activities.length ? (
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
            {activities.map(item => (
              <ActivityCard key={item.id} item={item} onClick={() => openActivity(item)}/>
            ))}
          </div>
        ) : (
          <div style={{
            width: '100%', padding: '16px 14px', borderRadius: 12,
            background: C.blush, border: `1px dashed ${C.coralSoft}`,
            fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600, color: C.inkSoft,
          }}>
            No events found around {city} yet — check back soon.
          </div>
        )}

        {/* Moms near you — tap a mom to open her profile; See all → Connect's
            "Your best matches" drawer (with filters). */}
        {moms.length > 0 && (
          <>
            <SectionHead title="Moms near you" onLink={goToConnectMoms}/>
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {moms.map(m => <MomChip key={m.id} item={m} onClick={() => setSelectedMom(m)}/>)}
            </div>
          </>
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

        {/* Verify banner — only when not yet verified */}
        {!isVerified && <VerifyBanner onVerify={onVerify}/>}

        {/* Groups for you — tap a group to open its discussion; See all →
            Connect's "Popular discussions" drawer (with filters). */}
        {topGroups.length > 0 && (
          <>
            <SectionHead title="Groups for you" onLink={goToConnectGroups}/>
            {topGroups.map(g => <GroupRow key={g.id} item={g} onClick={() => setSelectedDiscussion(g)}/>)}
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

        {/* See all activities CTA — only when there are events to show */}
        {activities.length > 0 && (
          <button
            onClick={() => setSeeAll(true)}
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
        )}
      </div>

      {seeAll && (
        <SeeAllSheet
          title={eventsTitle}
          subtitle={`${activities.length} ${activities.length === 1 ? 'idea' : 'ideas'} for you`}
          items={activities}
          renderItem={(item) => (
            <ActivityCard key={item.id} item={item} onClick={() => openActivity(item)}/>
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
          onDiscuss={() => onDiscuss?.({ type: 'event', id: selectedEvent.id, title: selectedEvent.title })}
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
          onDiscuss={() => onDiscuss?.({ type: 'place', id: selectedPlace.id, title: selectedPlace.title })}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {selectedMom && (
        <MomDetailSheet
          mom={selectedMom}
          saved={isSaved(`mom-${selectedMom.id}`)}
          invited={!!invited[selectedMom.id]}
          onInvite={() => {
            setInvited(i => ({ ...i, [selectedMom.id]: true }));
            flash?.(`✦ Invite sent to ${selectedMom.name}`);
          }}
          onMessage={() => { openMessage?.(selectedMom); setSelectedMom(null); }}
          onSave={() => {
            const key = `mom-${selectedMom.id}`;
            toggleSave(key);
            flash?.(isSaved(key) ? `Removed ${selectedMom.name} from saved` : `✦ Saved ${selectedMom.name}`);
          }}
          onShare={() => setShareItem({
            title: `${selectedMom.name}'s profile`, kind: 'Mom profile',
            place: selectedMom.distance, photo: selectedMom.photo,
          })}
          onClose={() => setSelectedMom(null)}
        />
      )}

      {selectedDiscussion && (
        <GroupDiscussionSheet
          discussion={selectedDiscussion}
          joined={joinedDiscussions.has(selectedDiscussion.id)}
          onToggleJoin={() => {
            setJoinedDiscussions(prev => {
              const next = new Set(prev);
              if (next.has(selectedDiscussion.id)) {
                next.delete(selectedDiscussion.id);
                flash?.(`Left ${selectedDiscussion.title}`);
              } else {
                next.add(selectedDiscussion.id);
                flash?.(`✦ Joined ${selectedDiscussion.title}`);
              }
              return next;
            });
          }}
          onMessageMom={(mom) => { openMessage?.(mom); setSelectedDiscussion(null); }}
          onScheduleMom={(mom) => { openSchedule?.(mom); setSelectedDiscussion(null); }}
          flash={flash}
          author={chatAuthor}
          myUserId={myUserId}
          onClose={() => setSelectedDiscussion(null)}
        />
      )}

      {shareItem && (
        <ShareSheet item={shareItem} flash={flash} onClose={() => setShareItem(null)}/>
      )}
    </div>
  );
};
