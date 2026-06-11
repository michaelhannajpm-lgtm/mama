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

export const currentSectionId = () => {
  const p = window.location.pathname.replace(/\/+$/, '');
  if (p === ADMIN_BASE || p === '') return DEFAULT_SECTION;
  if (p.startsWith(`${ADMIN_BASE}/`)) {
    return p.slice(ADMIN_BASE.length + 1).split('/')[0] || DEFAULT_SECTION;
  }
  return DEFAULT_SECTION;
};

export const sectionPath = (id) => (id === DEFAULT_SECTION ? ADMIN_BASE : `${ADMIN_BASE}/${id}`);

export const navigateSection = (id) => {
  const url = sectionPath(id);
  if (window.location.pathname.replace(/\/+$/, '') !== url) {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new Event('gm-admin-navigate'));
};

// Returns [currentSectionId, navigateSection]. Re-renders on pushState
// navigation, browser back/forward, and external pathname changes.
export const useAdminRoute = () => {
  const [id, setId] = useState(currentSectionId);
  useEffect(() => {
    const update = () => setId(currentSectionId());
    window.addEventListener('popstate', update);
    window.addEventListener('gm-admin-navigate', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('gm-admin-navigate', update);
    };
  }, []);
  return [id, navigateSection];
};
