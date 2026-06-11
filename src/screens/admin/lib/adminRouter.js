// ============================================================================
// Tiny URL router for the admin console. Each section is a real, deep-linkable
// path under /admin:  /admin → overview, /admin/places, /admin/users, …
//
// Uses History API pushState (no library). `navigateSection` updates the URL
// and broadcasts `gm-admin-navigate`; the shell's `useAdminRoute` hook also
// listens for `popstate` so browser back/forward and refresh all work.
// ============================================================================
import { useEffect, useState } from 'react';

export const ADMIN_BASE = '/admin';
const DEFAULT_SECTION = 'overview';

// Pure: parse an admin pathname into { section, ref }. ref is the decoded
// record segment after the section, or null. Used by the URL→record bridge.
export const parseAdminPath = (pathname) => {
  const p = (pathname || '').replace(/\/+$/, '');
  if (p === ADMIN_BASE || p === '') return { section: DEFAULT_SECTION, ref: null };
  if (p.startsWith(`${ADMIN_BASE}/`)) {
    const parts = p.slice(ADMIN_BASE.length + 1).split('/');
    let ref = null;
    if (parts[1]) { try { ref = decodeURIComponent(parts[1]); } catch { ref = parts[1]; } }
    return { section: parts[0] || DEFAULT_SECTION, ref };
  }
  return { section: DEFAULT_SECTION, ref: null };
};

export const currentSectionId = () => parseAdminPath(window.location.pathname).section;

export const currentRecordRef = () => parseAdminPath(window.location.pathname).ref;

export const sectionPath = (id) => (id === DEFAULT_SECTION ? ADMIN_BASE : `${ADMIN_BASE}/${id}`);

// Build a deep-link path. ref is URL-encoded; omitted when null.
export const recordPath = (section, ref) => {
  const base = section === DEFAULT_SECTION ? ADMIN_BASE : `${ADMIN_BASE}/${section}`;
  return ref ? `${base}/${encodeURIComponent(ref)}` : base;
};

// Navigate to a record deep-link (pushState + broadcast), like navigateSection.
export const navigateRecord = (section, ref) => {
  const url = recordPath(section, ref);
  if (window.location.pathname.replace(/\/+$/, '') !== url.replace(/\/+$/, '')) {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new Event('gm-admin-navigate'));
};

export const navigateSection = (id) => {
  const url = sectionPath(id);
  if (window.location.pathname.replace(/\/+$/, '') !== url) {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new Event('gm-admin-navigate'));
};

// Returns [currentSectionId, navigateSection, currentRecordRef]. Re-renders on
// pushState navigation, browser back/forward, and external pathname changes.
export const useAdminRoute = () => {
  const [state, setState] = useState(() => parseAdminPath(window.location.pathname));
  useEffect(() => {
    const update = () => setState(parseAdminPath(window.location.pathname));
    window.addEventListener('popstate', update);
    window.addEventListener('gm-admin-navigate', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('gm-admin-navigate', update);
    };
  }, []);
  return [state.section, navigateSection, state.ref];
};
