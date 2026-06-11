// URL → record bridge. Given the current section + record ref, drives the
// existing per-section "open this record" machinery: writes the ref into the
// section's sessionStorage pending-key AND dispatches the gm-admin-open-<entity>
// window event. Managers already listen for both (EventsManager, PlacesManager,
// MomProfilesSection); UsersSection highlights its row. The ref may be an id OR
// a slug/username alias — managers match on id || slug || username.
import { useEffect, useRef } from 'react';

const SECTION_ENTITY = {
  events: 'event',
  places: 'place',
  'mom-profiles': 'mom',
  users: 'user',
};

export const useAdminDeepLink = (section, recordRef) => {
  const lastKey = useRef(null);
  useEffect(() => {
    if (!recordRef) { lastKey.current = null; return; }
    const entity = SECTION_ENTITY[section];
    if (!entity) return;
    const key = `${section}:${recordRef}`;
    if (lastKey.current === key) return; // already dispatched for this ref
    lastKey.current = key;

    const evname = `gm-admin-open-${entity}`;
    try { sessionStorage.setItem(evname, recordRef); } catch { /* ignore */ }
    // detail.id carries the ref (id or alias) — backward compatible with the
    // existing Users → Mom-profiles dispatch which uses { detail: { id } }.
    window.dispatchEvent(new CustomEvent(evname, { detail: { id: recordRef } }));
  }, [section, recordRef]);
};
