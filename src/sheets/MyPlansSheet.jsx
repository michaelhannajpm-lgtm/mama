import { Bookmark, MapPin, Calendar, BookOpen, Users, X } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { findPlace } from '../data/places';
import { SUGGESTED_EVENTS } from '../data/events';
import { SAMPLE_MOMS } from '../data/moms';
import { findResource, RESOURCE_CATEGORIES } from '../data/resources';

// ==========================================================================
// MyPlansSheet — opens from the bookmark icon in every MainApp tab header,
// and from the "My Plans" row in YouTab. Groups savedItems by source.
// ==========================================================================

// Resolve a saved id into { kind, ...display } so we can render + group.
const resolve = (id) => {
  const ev = SUGGESTED_EVENTS.find(e => e.id === id);
  if (ev) return {
    kind: 'meetup',
    photo: ev.photo,
    title: ev.name,
    sub:   `${ev.day} · ${ev.time}`,
    meta:  ev.place,
    accent: C.sageDark,
  };

  const place = findPlace(id);
  if (place) return {
    kind: 'place',
    photo: null,
    title: place.name,
    sub:   place.area,
    meta:  `${place.dist} mi`,
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

  const numericId = typeof id === 'string' && id.startsWith('s') ? Number(id.slice(1)) : Number(id);
  const mom = SAMPLE_MOMS.find(m => m.id === numericId);
  if (mom) return {
    kind: 'mom',
    photo: mom.photo,
    title: mom.name,
    sub:   `${mom.type} · ${mom.kids}`,
    meta:  `${mom.distance} · ${mom.overlap}% match`,
    accent: C.coralDeep,
  };

  return null;
};

// Section eyebrow color follows semantic streams: sage = community
// (group meetups), coral = 1:1 (moms), navy = neutral info (places,
// resources). Keeps the "Coral / sage / saffron" discipline intact.
const SECTION_META = {
  meetup:   { label: "Meetups you've bookmarked", icon: Users,    eyebrow: C.sageDark  },
  place:    { label: 'Activities & places saved', icon: Calendar, eyebrow: C.navy      },
  mom:      { label: 'Moms you want to meet',     icon: Users,    eyebrow: C.coralDeep },
  resource: { label: 'Resources to read later',   icon: BookOpen, eyebrow: C.navy      },
};
const SECTION_ORDER = ['meetup', 'place', 'mom', 'resource'];

const Card = ({ photo, title, sub, meta, accent, onUnsave }) => (
  <div
    className="flex rounded-2xl overflow-hidden mb-2 relative"
    style={{ background: C.paper, border: `1px solid ${C.divider}` }}
  >
    {photo
      ? <img src={photo} alt="" style={{ width: 72, height: 72, objectFit: 'cover' }}/>
      : <div style={{
          width: 72, height: 72, background: C.creamSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bookmark size={18} color={accent} fill={accent}/>
        </div>}
    <div className="flex-1 px-2.5 py-2 flex flex-col justify-center min-w-0">
      <div className="truncate" style={{ fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5, color: C.navy }}>
        {title}
      </div>
      <div className="truncate" style={{ fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted, marginTop: 2 }}>
        {sub}
      </div>
      {meta && (
        <div className="flex items-center gap-1 truncate" style={{ marginTop: 3 }}>
          <MapPin size={9} color={C.navySoft}/>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 600, color: C.navySoft }}>
            {meta}
          </span>
        </div>
      )}
    </div>
    <button
      onClick={onUnsave}
      aria-label="Remove from My Plans"
      style={{
        position: 'absolute', top: 6, right: 6,
        width: 24, height: 24, borderRadius: 12,
        background: C.paper, border: `1px solid ${C.divider}`, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <X size={12} color={C.muted}/>
    </button>
  </div>
);

export const MyPlansSheet = ({ savedItems = [], setSavedItems, onClose }) => {
  const grouped = SECTION_ORDER.reduce((acc, kind) => ({ ...acc, [kind]: [] }), {});
  for (const id of savedItems) {
    const item = resolve(id);
    if (item) grouped[item.kind].push({ id, item });
  }
  const total = savedItems.length;

  const unsave = (id) => setSavedItems(prev => prev.filter(x => x !== id));

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-5">
        <div style={{
          fontFamily: 'Fraunces', fontSize: 24, fontWeight: 600,
          color: C.navy, letterSpacing: '-.02em', lineHeight: 1.15,
        }}>
          My{' '}
          <span style={{ color: C.coral, fontStyle: 'italic', fontWeight: 500 }}>plans</span>
        </div>
        <div className="mt-1" style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted,
        }}>
          {total === 0
            ? "Tap the bookmark on anything you want to come back to — we'll keep it all here."
            : `${total} saved across the app`}
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ paddingTop: 32, paddingBottom: 16, gap: 8 }}>
            <Bookmark size={32} color={C.line}/>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>
              Nothing saved yet
            </div>
          </div>
        ) : (
          SECTION_ORDER.map(kind => {
            const items = grouped[kind];
            if (!items.length) return null;
            const meta = SECTION_META[kind];
            const Icon = meta.icon;
            return (
              <div key={kind} style={{ marginTop: 16 }}>
                <div className="flex items-center gap-1.5 mb-2" style={{
                  fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
                  letterSpacing: '.12em', color: meta.eyebrow,
                }}>
                  <Icon size={11}/>
                  <span>{meta.label.toUpperCase()}</span>
                  <span style={{ color: C.muted, fontWeight: 600 }}>· {items.length}</span>
                </div>
                {items.map(({ id, item }) => (
                  <Card key={id} {...item} onUnsave={() => unsave(id)}/>
                ))}
              </div>
            );
          })
        )}
      </div>
    </Sheet>
  );
};
