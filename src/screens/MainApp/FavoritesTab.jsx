import { Bookmark, MapPin } from 'lucide-react';
import { C } from '../../theme';
import { findPlace } from '../../data/places';
import { SUGGESTED_EVENTS } from '../../data/events';
import { SAMPLE_MOMS } from '../../data/moms';

// ==========================================================================
// Favorites tab — ported from the GoMama Expo prototype.
// Shows everything the user has bookmarked across the app (meetups, places,
// moms). The user toggles favorites via the Bookmark icon on any PhotoCard.
// Backing state: `savedItems` in App.jsx — array of string ids.
// ==========================================================================

const Card = ({ photo, title, sub, meta, onUnsave }) => (
  <div
    className="flex rounded-2xl overflow-hidden mb-2 relative"
    style={{ background: '#fff', border: `1px solid ${C.line}` }}
  >
    {photo
      ? <img src={photo} alt="" style={{ width: 88, height: 88, objectFit: 'cover' }}/>
      : <div style={{ width: 88, height: 88, background: C.coralSoft }}/>}
    <div className="flex-1 px-2.5 py-2 flex flex-col justify-center min-w-0">
      <div className="text-[13px] truncate" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
        {title}
      </div>
      <div className="text-[10.5px] mt-0.5 truncate" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
        {sub}
      </div>
      {meta && (
        <div className="flex items-center gap-1 mt-1">
          <MapPin size={10} color={C.navySoft}/>
          <span className="text-[9.5px]" style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: C.navySoft }}>
            {meta}
          </span>
        </div>
      )}
    </div>
    <button
      onClick={onUnsave}
      style={{
        position: 'absolute', top: 6, right: 6,
        padding: 4, background: 'transparent', border: 'none', cursor: 'pointer',
      }}
      aria-label="Remove from favorites"
    >
      <Bookmark size={14} color={C.coralDeep} fill={C.coralDeep}/>
    </button>
  </div>
);

// Resolve a saved id back to a renderable item by checking each data source.
const resolveItem = (id) => {
  // Group meetups (SUGGESTED_EVENTS)
  const ev = SUGGESTED_EVENTS.find(e => e.id === id);
  if (ev) return {
    photo: ev.photo,
    title: ev.name,
    sub:   `${ev.day} · ${ev.time}`,
    meta:  ev.place,
  };
  // Places — id may be a place id
  const place = findPlace(id);
  if (place) return {
    photo: null,
    title: place.name,
    sub:   place.area,
    meta:  `${place.dist} mi`,
  };
  // Moms — id may be `s1`, `s2` etc. or numeric
  const numericId = typeof id === 'string' && id.startsWith('s') ? Number(id.slice(1)) : Number(id);
  const mom = SAMPLE_MOMS.find(m => m.id === numericId);
  if (mom) return {
    photo: mom.photo,
    title: mom.name,
    sub:   `${mom.type} · ${mom.kids}`,
    meta:  `${mom.distance} · ${mom.overlap}% match`,
  };
  return null;
};

export const FavoritesTab = ({ savedItems = [], setSavedItems }) => {
  const items = savedItems
    .map(id => ({ id, item: resolveItem(id) }))
    .filter(({ item }) => !!item);

  const unsave = (id) => {
    setSavedItems(prev => prev.filter(x => x !== id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-5 pt-3 pb-3" style={{ borderBottom: `1px solid ${C.line}`, background: C.cream }}>
        <div className="flex items-end justify-between">
          <div>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 26, fontWeight: 600,
              color: C.navy, letterSpacing: '-.02em', lineHeight: 1.1,
            }}>
              Favorites
            </div>
            <div className="mt-1 text-[11.5px]" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
              {items.length} saved
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4" style={{ scrollbarWidth: 'none' }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ paddingTop: 60, gap: 8 }}>
            <Bookmark size={32} color={C.line}/>
            <div className="text-[14px]" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
              Nothing saved yet
            </div>
            <div className="text-[11.5px] text-center px-6" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
              Tap the bookmark on any card to save it here.
            </div>
          </div>
        ) : (
          items.map(({ id, item }) => (
            <Card key={id} {...item} onUnsave={() => unsave(id)}/>
          ))
        )}
      </div>
    </div>
  );
};
